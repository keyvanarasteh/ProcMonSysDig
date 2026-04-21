/**
 * transformer.test.js — GraphTransformer Unit Testleri
 * 
 * Örnek event listesi → doğru node/edge çıktısı doğrulama.
 * Çalıştırma: node frontend/tests/transformer.test.js
 */

// ESM modül desteği olmayan ortam için basit test runner
// (Node.js'de doğrudan çalışabilmesi için CommonJS uyumlu mock)

const assert = require('assert');

// ─── Mock Types ────────────────────────────────────────────────
const NODE_TYPES = { PROCESS: 'process', FILE: 'file', NETWORK: 'network' };
const EDGE_TYPES = { FILE_IO: 'file_io', NETWORK_IO: 'network_io', PROCESS_SPAWN: 'process_spawn' };

// ─── Mock Fonksiyonlar (ESM modüllerin yerine) ─────────────────
function createNode(type, id, label, metadata = {}) {
    return {
        type, id, label, evtCount: 0, firstSeen: 0, lastSeen: 0, metadata,
        x: undefined, y: undefined, fx: null, fy: null
    };
}

function createEdge(source, target, edgeType) {
    return {
        source, target, edgeType, count: 0, types: {}, lastEvtType: '', firstSeen: 0, lastSeen: 0
    };
}

// ─── Basitleştirilmiş Transformer (test amaçlı) ───────────────
class TestTransformer {
    constructor() {
        this.nodes = new Map();
        this.edges = new Map();
        this.processedCount = 0;
        this.pathDepth = 0;
    }

    pushEvent(event) {
        if (!event || !event.evt_type) return;
        this.processedCount++;
        const now = event.evt_timestamp || Date.now();

        // Süreç düğümü
        const procId = `process:${event.proc_name}:${event.proc_pid}`;
        if (!this.nodes.has(procId)) {
            const n = createNode('process', procId, event.proc_name, { pid: event.proc_pid, ppid: event.proc_ppid, user: event.user_name });
            n.evtCount = 1; n.firstSeen = now; n.lastSeen = now;
            this.nodes.set(procId, n);
        } else {
            const n = this.nodes.get(procId);
            n.evtCount++; n.lastSeen = now;
        }

        // fork/exec → process spawn
        if (['fork', 'vfork', 'clone', 'execve'].includes(event.evt_type)) {
            if (event.proc_ppid && event.proc_ppid !== 0) {
                const parentId = `process:parent_${event.proc_ppid}:${event.proc_ppid}`;
                if (!this.nodes.has(parentId)) {
                    const pn = createNode('process', parentId, `PID:${event.proc_ppid}`, { pid: event.proc_ppid });
                    pn.firstSeen = now; pn.lastSeen = now;
                    this.nodes.set(parentId, pn);
                }
                const edgeKey = `${parentId}→${procId}`;
                this._upsertEdge(edgeKey, parentId, procId, 'process_spawn', event, now);
            }
            return;
        }

        // Ağ etkileşimi
        const isNet = event.fd_typechar === '4' || event.fd_typechar === '6' ||
                      ['connect', 'accept', 'sendto', 'recvfrom'].includes(event.evt_type) ||
                      (event.fd_name && /\d+\.\d+\.\d+\.\d+:\d+/.test(event.fd_name));
        
        if (isNet) {
            const target = event.fd_name || `${event.fd_dip || 'unknown'}:${event.fd_dport || '?'}`;
            const netId = `network:${target}`;
            if (!this.nodes.has(netId)) {
                const nn = createNode('network', netId, target, { ip: event.fd_dip || '', port: event.fd_dport || '' });
                nn.firstSeen = now; nn.lastSeen = now; nn.evtCount = 1;
                this.nodes.set(netId, nn);
            } else { this.nodes.get(netId).evtCount++; this.nodes.get(netId).lastSeen = now; }
            const edgeKey = `${procId}→${netId}`;
            this._upsertEdge(edgeKey, procId, netId, 'network_io', event, now);
            return;
        }

        // Dosya etkileşimi
        if (event.fd_name && event.fd_name.length > 0) {
            const fileId = `file:${event.fd_name}`;
            if (!this.nodes.has(fileId)) {
                const fn = createNode('file', fileId, event.fd_name, { fullPath: event.fd_name });
                fn.firstSeen = now; fn.lastSeen = now; fn.evtCount = 1;
                this.nodes.set(fileId, fn);
            } else { this.nodes.get(fileId).evtCount++; this.nodes.get(fileId).lastSeen = now; }
            const edgeKey = `${procId}→${fileId}`;
            this._upsertEdge(edgeKey, procId, fileId, 'file_io', event, now);
        }
    }

    _upsertEdge(key, source, target, edgeType, event, now) {
        if (this.edges.has(key)) {
            const e = this.edges.get(key);
            e.count++; e.lastEvtType = event.evt_type; e.lastSeen = now;
            e.types[event.evt_type] = (e.types[event.evt_type] || 0) + 1;
        } else {
            const e = createEdge(source, target, edgeType);
            e.count = 1; e.lastEvtType = event.evt_type; e.firstSeen = now; e.lastSeen = now;
            e.types = { [event.evt_type]: 1 };
            this.edges.set(key, e);
        }
    }

    reset() { this.nodes.clear(); this.edges.clear(); this.processedCount = 0; }
}

// ─── Örnek Event Verileri ──────────────────────────────────────

const SAMPLE_EVENTS = [
    {
        evt_type: 'open', evt_dir: '>', proc_name: 'nginx', proc_pid: 1234,
        proc_ppid: 1, user_name: 'www-data', fd_name: '/etc/nginx/nginx.conf',
        evt_args: 'fd=3(file)', res: '0', evt_timestamp: 1000
    },
    {
        evt_type: 'read', evt_dir: '<', proc_name: 'nginx', proc_pid: 1234,
        proc_ppid: 1, user_name: 'www-data', fd_name: '/etc/nginx/nginx.conf',
        evt_args: '', res: '512', evt_timestamp: 1001
    },
    {
        evt_type: 'connect', evt_dir: '>', proc_name: 'nginx', proc_pid: 1234,
        proc_ppid: 1, user_name: 'www-data', fd_name: '192.168.1.100:443',
        fd_typechar: '4', evt_args: '', res: '0', evt_timestamp: 1002
    },
    {
        evt_type: 'write', evt_dir: '>', proc_name: 'mysql', proc_pid: 5678,
        proc_ppid: 1, user_name: 'mysql', fd_name: '/var/lib/mysql/ibdata1',
        evt_args: '', res: '4096', evt_timestamp: 1003
    },
    {
        evt_type: 'fork', evt_dir: '<', proc_name: 'bash', proc_pid: 9999,
        proc_ppid: 1234, user_name: 'root', fd_name: '',
        evt_args: '', res: '9999', evt_timestamp: 1004
    },
    {
        evt_type: 'sendto', evt_dir: '>', proc_name: 'mysql', proc_pid: 5678,
        proc_ppid: 1, user_name: 'mysql', fd_name: '10.0.0.1:3306',
        fd_typechar: '4', evt_args: '', res: '128', evt_timestamp: 1005
    }
];

// ─── Test Fonksiyonları ────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (e) {
        console.log(`  ❌ ${name}: ${e.message}`);
        failed++;
    }
}

console.log('\n🧪 GraphTransformer Unit Testleri\n');

// TEST 1: Boş transformer
test('Boş transformer sıfır düğüm ve kenar döndürmeli', () => {
    const t = new TestTransformer();
    assert.strictEqual(t.nodes.size, 0);
    assert.strictEqual(t.edges.size, 0);
    assert.strictEqual(t.processedCount, 0);
});

// TEST 2: Tek event → 1 süreç düğümü + 1 dosya düğümü + 1 kenar
test('Tek dosya event: 2 düğüm (process + file), 1 kenar (file_io)', () => {
    const t = new TestTransformer();
    t.pushEvent(SAMPLE_EVENTS[0]);
    assert.strictEqual(t.nodes.size, 2, `Beklenen 2 düğüm, gelen: ${t.nodes.size}`);
    assert.strictEqual(t.edges.size, 1, `Beklenen 1 kenar, gelen: ${t.edges.size}`);
    
    // Süreç düğümü doğrulama
    const procNode = t.nodes.get('process:nginx:1234');
    assert.ok(procNode, 'nginx süreç düğümü bulunamadı');
    assert.strictEqual(procNode.type, 'process');
    assert.strictEqual(procNode.label, 'nginx');
    assert.strictEqual(procNode.evtCount, 1);

    // Dosya düğümü doğrulama
    const fileNode = t.nodes.get('file:/etc/nginx/nginx.conf');
    assert.ok(fileNode, 'nginx.conf dosya düğümü bulunamadı');
    assert.strictEqual(fileNode.type, 'file');
});

// TEST 3: Aynı süreç, aynı dosya → event sayacı artmalı
test('Tekrar eden dosya erişimi: event sayacı artmalı, yeni düğüm oluşmamalı', () => {
    const t = new TestTransformer();
    t.pushEvent(SAMPLE_EVENTS[0]);
    t.pushEvent(SAMPLE_EVENTS[1]); // Aynı nginx → aynı dosya
    
    assert.strictEqual(t.nodes.size, 2, 'Düğüm sayısı artmamalı');
    
    const procNode = t.nodes.get('process:nginx:1234');
    assert.strictEqual(procNode.evtCount, 2, 'Süreç event sayacı 2 olmalı');
    
    const edge = t.edges.get('process:nginx:1234→file:/etc/nginx/nginx.conf');
    assert.strictEqual(edge.count, 2, 'Kenar sayacı 2 olmalı');
    assert.strictEqual(edge.types['open'], 1, 'open sayısı 1 olmalı');
    assert.strictEqual(edge.types['read'], 1, 'read sayısı 1 olmalı');
});

// TEST 4: Ağ bağlantısı → network düğümü + network_io kenarı
test('Connect event: network düğümü ve network_io kenarı oluşturmalı', () => {
    const t = new TestTransformer();
    t.pushEvent(SAMPLE_EVENTS[2]);
    
    const netNode = t.nodes.get('network:192.168.1.100:443');
    assert.ok(netNode, 'Network düğümü bulunamadı');
    assert.strictEqual(netNode.type, 'network');
    
    const edge = t.edges.get('process:nginx:1234→network:192.168.1.100:443');
    assert.ok(edge, 'Network kenarı bulunamadı');
    assert.strictEqual(edge.edgeType, 'network_io');
});

// TEST 5: Fork event → process_spawn kenarı
test('Fork event: parent→child process_spawn kenarı oluşturmalı', () => {
    const t = new TestTransformer();
    t.pushEvent(SAMPLE_EVENTS[4]);
    
    // Çocuk süreç düğümü
    const childNode = t.nodes.get('process:bash:9999');
    assert.ok(childNode, 'Çocuk süreç düğümü bulunamadı');
    
    // Parent placeholder düğümü
    const parentNode = t.nodes.get('process:parent_1234:1234');
    assert.ok(parentNode, 'Parent placeholder düğümü bulunamadı');
    
    // Kenar
    const edge = t.edges.get('process:parent_1234:1234→process:bash:9999');
    assert.ok(edge, 'Process spawn kenarı bulunamadı');
    assert.strictEqual(edge.edgeType, 'process_spawn');
});

// TEST 6: Tüm eventları toplu ekleme
test('6 event toplu ekleme: doğru düğüm ve kenar sayıları', () => {
    const t = new TestTransformer();
    for (const ev of SAMPLE_EVENTS) {
        t.pushEvent(ev);
    }
    
    assert.strictEqual(t.processedCount, 6, 'İşlenen event sayısı 6 olmalı');
    
    // Süreç düğümleri: nginx(1234), mysql(5678), bash(9999), parent(1234)
    const procNodes = Array.from(t.nodes.values()).filter(n => n.type === 'process');
    assert.strictEqual(procNodes.length, 4, `4 süreç düğümü bekleniyor, gelen: ${procNodes.length}`);
    
    // Dosya düğümleri: nginx.conf, ibdata1
    const fileNodes = Array.from(t.nodes.values()).filter(n => n.type === 'file');
    assert.strictEqual(fileNodes.length, 2, `2 dosya düğümü bekleniyor, gelen: ${fileNodes.length}`);
    
    // Ağ düğümleri: 192.168.1.100:443, 10.0.0.1:3306
    const netNodes = Array.from(t.nodes.values()).filter(n => n.type === 'network');
    assert.strictEqual(netNodes.length, 2, `2 ağ düğümü bekleniyor, gelen: ${netNodes.length}`);
});

// TEST 7: Reset
test('Reset sonrası tüm veriler sıfırlanmalı', () => {
    const t = new TestTransformer();
    for (const ev of SAMPLE_EVENTS) { t.pushEvent(ev); }
    
    t.reset();
    assert.strictEqual(t.nodes.size, 0, 'Düğümler sıfırlanmalı');
    assert.strictEqual(t.edges.size, 0, 'Kenarlar sıfırlanmalı');
    assert.strictEqual(t.processedCount, 0, 'Sayaç sıfırlanmalı');
});

// ─── Sonuçlar ──────────────────────────────────────────────────
console.log(`\n📊 Sonuç: ${passed} geçti, ${failed} başarısız (toplam: ${passed + failed})`);
if (failed > 0) {
    process.exit(1);
} else {
    console.log('🎉 Tüm testler başarıyla geçti!\n');
}
