/**
 * aggregator.js — Event İstatistik Toplayıcı
 * 
 * Gelen syscall event'lerini analiz ederek süreç→dosya, süreç→ağ ve
 * süreç→süreç etkileşim istatistiklerini çıkarır. Grafik görselleştirme
 * için düğüm (node) ve kenar (edge) verisi hazırlar.
 * 
 * Kullanım:
 *   const aggregator = new EventAggregator(5000);
 *   aggregator.push(event);
 *   const summary = aggregator.getSummary();
 */

'use strict';

/**
 * Ring Buffer — Sabit boyutlu dairesel tampon
 * Son N event'i bellekte tutar, eski event'ler otomatik silinir.
 */
class RingBuffer {
    /**
     * @param {number} capacity - Tamponun maksimum kapasitesi
     */
    constructor(capacity = 5000) {
        this.capacity = capacity;
        this.buffer = new Array(capacity);
        this.head = 0;     // Sonraki yazma pozisyonu
        this.size = 0;     // Mevcut eleman sayısı
    }

    /**
     * Tampona yeni bir eleman ekler
     * @param {Object} item - Eklenecek event nesnesi
     */
    push(item) {
        this.buffer[this.head] = item;
        this.head = (this.head + 1) % this.capacity;
        if (this.size < this.capacity) {
            this.size++;
        }
    }

    /**
     * Tampondaki tüm elemanları döndürür (en eski → en yeni sıralı)
     * @returns {Object[]} Event listesi
     */
    toArray() {
        if (this.size === 0) return [];

        const result = [];
        // Eğer tampon henüz dolmadıysa, 0'dan başla
        const start = this.size < this.capacity ? 0 : this.head;
        for (let i = 0; i < this.size; i++) {
            const idx = (start + i) % this.capacity;
            result.push(this.buffer[idx]);
        }
        return result;
    }

    /**
     * Son N elemanı döndürür (en yeni → en eski sıralı)
     * @param {number} n - Kaç eleman döndürülecek
     * @returns {Object[]} Son N event
     */
    last(n) {
        const count = Math.min(n, this.size);
        const result = [];
        for (let i = 0; i < count; i++) {
            const idx = (this.head - 1 - i + this.capacity) % this.capacity;
            result.push(this.buffer[idx]);
        }
        return result;
    }

    /**
     * Tamponu temizler
     */
    clear() {
        this.buffer = new Array(this.capacity);
        this.head = 0;
        this.size = 0;
    }

    /**
     * Tampondaki mevcut eleman sayısını döndürür
     * @returns {number}
     */
    getSize() {
        return this.size;
    }
}

/**
 * EventAggregator — Event istatistiklerini toplar ve graf verisi üretir
 */
class EventAggregator {
    /**
     * @param {number} bufferCapacity - Ring buffer kapasitesi (varsayılan: 5000)
     */
    constructor(bufferCapacity = 5000) {
        /** @type {RingBuffer} Son N event'i tutan dairesel tampon */
        this.ringBuffer = new RingBuffer(bufferCapacity);

        /** @type {number} Toplam event sayacı (ring buffer dışı) */
        this.totalEventCount = 0;

        /** @type {number} Monoton artan event ID üreteci */
        this.nextEventId = 1;

        /**
         * Süreç→Dosya etkileşim sayaçları
         * Anahtar: "proc_name:pid→fd_name"
         * @type {Map<string, {count: number, lastEvtType: string, procName: string, procPid: number, fdName: string, types: Object}>}
         */
        this.processFileEdges = new Map();

        /**
         * Süreç→Ağ etkileşim sayaçları
         * Anahtar: "proc_name:pid→ip:port"
         * @type {Map<string, {count: number, lastEvtType: string, procName: string, procPid: number, ip: string, port: string, types: Object}>}
         */
        this.processNetworkEdges = new Map();

        /**
         * Süreç→Süreç etkileşim sayaçları (fork/exec/clone/pipe)
         * Anahtar: "parent_pid→child_pid"
         * @type {Map<string, {count: number, parentName: string, parentPid: number, childName: string, childPid: number, types: Object}>}
         */
        this.processProcessEdges = new Map();

        /**
         * Benzersiz düğüm kaydı
         * Anahtar: "type:identifier" (örn: "process:nginx:1234", "file:/etc/passwd")
         * @type {Map<string, {type: string, id: string, label: string, evtCount: number, firstSeen: number, lastSeen: number, metadata: Object}>}
         */
        this.nodes = new Map();
    }

    /**
     * Yeni bir event ekler, istatistikleri günceller ve benzersiz ID atar.
     * @param {Object} event - Backend'den gelen ham event nesnesi
     * @returns {Object} ID atanmış zenginleştirilmiş event
     */
    push(event) {
        // Benzersiz ID ata
        event.evt_id = this.nextEventId++;
        event.evt_timestamp = Date.now();

        // Ring buffer'a ekle
        this.ringBuffer.push(event);
        this.totalEventCount++;

        // Düğüm kaydı: Süreç
        this._registerProcessNode(event);

        // Etkileşim analizi
        this._analyzeInteraction(event);

        return event;
    }

    /**
     * Süreç düğümünü kaydeder veya günceller
     * @private
     */
    _registerProcessNode(event) {
        const procKey = `process:${event.proc_name}:${event.proc_pid}`;
        const existing = this.nodes.get(procKey);
        
        if (existing) {
            existing.evtCount++;
            existing.lastSeen = event.evt_timestamp;
        } else {
            this.nodes.set(procKey, {
                type: 'process',
                id: procKey,
                label: event.proc_name,
                evtCount: 1,
                firstSeen: event.evt_timestamp,
                lastSeen: event.evt_timestamp,
                metadata: {
                    pid: event.proc_pid,
                    ppid: event.proc_ppid,
                    user: event.user_name,
                    exe: event.proc_exe || ''
                }
            });
        }
    }

    /**
     * Event'in etkileşim türünü analiz eder ve uygun sayaçları günceller
     * @private
     */
    _analyzeInteraction(event) {
        const fdName = event.fd_name || '';
        const evtType = event.evt_type || '';

        // Fork/exec/clone → süreç→süreç etkileşimi
        if (['fork', 'vfork', 'clone', 'execve', 'execveat'].includes(evtType)) {
            this._recordProcessEdge(event);
            return;
        }

        // Ağ etkileşimi tespiti: fd.name IP:port formatında veya fd_typechar='4'/'6'
        if (this._isNetworkFd(fdName, event)) {
            this._recordNetworkEdge(event);
            // Ağ düğümünü kaydet
            this._registerNetworkNode(event, fdName);
            return;
        }

        // Dosya etkileşimi: fd.name bir dosya yolu ise
        if (fdName && fdName.startsWith('/')) {
            this._recordFileEdge(event);
            // Dosya düğümünü kaydet
            this._registerFileNode(event, fdName);
            return;
        }

        // Genel dosya/kaynak etkileşimi (fd.name boş değilse)
        if (fdName && fdName.length > 0) {
            this._recordFileEdge(event);
            this._registerFileNode(event, fdName);
        }
    }

    /**
     * Verilen fd_name'in ağ bağlantısı olup olmadığını kontrol eder
     * @private
     */
    _isNetworkFd(fdName, event) {
        // fd.typechar IPv4='4', IPv6='6' ise ağ
        if (event.fd_typechar === '4' || event.fd_typechar === '6') return true;
        // fd.name IP:port formatındaysa (örn: "192.168.1.1:443" veya "10.0.0.1:80->172.16.0.1:12345")
        if (/\d+\.\d+\.\d+\.\d+:\d+/.test(fdName)) return true;
        // IPv6 notasyonu
        if (/\[.*\]:\d+/.test(fdName)) return true;
        // connect/accept/sendto/recvfrom gibi ağ syscall'ları
        if (['connect', 'accept', 'accept4', 'sendto', 'recvfrom', 'sendmsg', 'recvmsg', 'bind', 'listen'].includes(event.evt_type)) return true;
        return false;
    }

    /**
     * Süreç→Dosya kenarını kaydeder
     * @private
     */
    _recordFileEdge(event) {
        const key = `${event.proc_name}:${event.proc_pid}→${event.fd_name}`;
        const existing = this.processFileEdges.get(key);
        
        if (existing) {
            existing.count++;
            existing.lastEvtType = event.evt_type;
            existing.types[event.evt_type] = (existing.types[event.evt_type] || 0) + 1;
        } else {
            this.processFileEdges.set(key, {
                count: 1,
                lastEvtType: event.evt_type,
                procName: event.proc_name,
                procPid: event.proc_pid,
                fdName: event.fd_name,
                types: { [event.evt_type]: 1 }
            });
        }
    }

    /**
     * Süreç→Ağ kenarını kaydeder
     * @private
     */
    _recordNetworkEdge(event) {
        const target = event.fd_name || `${event.fd_ip || 'unknown'}:${event.fd_port || '?'}`;
        const key = `${event.proc_name}:${event.proc_pid}→${target}`;
        const existing = this.processNetworkEdges.get(key);
        
        if (existing) {
            existing.count++;
            existing.lastEvtType = event.evt_type;
            existing.types[event.evt_type] = (existing.types[event.evt_type] || 0) + 1;
        } else {
            this.processNetworkEdges.set(key, {
                count: 1,
                lastEvtType: event.evt_type,
                procName: event.proc_name,
                procPid: event.proc_pid,
                target: target,
                types: { [event.evt_type]: 1 }
            });
        }
    }

    /**
     * Süreç→Süreç kenarını kaydeder (fork/exec/clone)
     * @private
     */
    _recordProcessEdge(event) {
        const key = `${event.proc_ppid}→${event.proc_pid}`;
        const existing = this.processProcessEdges.get(key);
        
        if (existing) {
            existing.count++;
            existing.types[event.evt_type] = (existing.types[event.evt_type] || 0) + 1;
        } else {
            this.processProcessEdges.set(key, {
                count: 1,
                parentName: '', // Sonradan doldurulabilir
                parentPid: event.proc_ppid,
                childName: event.proc_name,
                childPid: event.proc_pid,
                types: { [event.evt_type]: 1 }
            });
        }
    }

    /**
     * Dosya düğümünü kaydeder
     * @private
     */
    _registerFileNode(event, fdName) {
        const fileKey = `file:${fdName}`;
        const existing = this.nodes.get(fileKey);
        
        if (existing) {
            existing.evtCount++;
            existing.lastSeen = event.evt_timestamp;
        } else {
            this.nodes.set(fileKey, {
                type: 'file',
                id: fileKey,
                label: fdName,
                evtCount: 1,
                firstSeen: event.evt_timestamp,
                lastSeen: event.evt_timestamp,
                metadata: {}
            });
        }
    }

    /**
     * Ağ düğümünü kaydeder
     * @private
     */
    _registerNetworkNode(event, fdName) {
        const target = fdName || `${event.fd_ip || 'unknown'}:${event.fd_port || '?'}`;
        const netKey = `network:${target}`;
        const existing = this.nodes.get(netKey);
        
        if (existing) {
            existing.evtCount++;
            existing.lastSeen = event.evt_timestamp;
        } else {
            this.nodes.set(netKey, {
                type: 'network',
                id: netKey,
                label: target,
                evtCount: 1,
                firstSeen: event.evt_timestamp,
                lastSeen: event.evt_timestamp,
                metadata: {
                    ip: event.fd_ip || '',
                    port: event.fd_port || ''
                }
            });
        }
    }

    /**
     * Grafik verisinin tam özetini döndürür
     * Frontend'in graf çizmesi için gerekli tüm düğüm ve kenarları içerir.
     * @returns {Object} Graf özeti
     */
    getSummary() {
        const nodes = Array.from(this.nodes.values());
        
        const edges = [];

        // Süreç→Dosya kenarları
        for (const [, edge] of this.processFileEdges) {
            edges.push({
                source: `process:${edge.procName}:${edge.procPid}`,
                target: `file:${edge.fdName}`,
                edgeType: 'file_io',
                count: edge.count,
                lastEvtType: edge.lastEvtType,
                types: edge.types
            });
        }

        // Süreç→Ağ kenarları
        for (const [, edge] of this.processNetworkEdges) {
            edges.push({
                source: `process:${edge.procName}:${edge.procPid}`,
                target: `network:${edge.target}`,
                edgeType: 'network_io',
                count: edge.count,
                lastEvtType: edge.lastEvtType,
                types: edge.types
            });
        }

        // Süreç→Süreç kenarları
        for (const [, edge] of this.processProcessEdges) {
            edges.push({
                source: `process:*:${edge.parentPid}`,
                target: `process:${edge.childName}:${edge.childPid}`,
                edgeType: 'process_spawn',
                count: edge.count,
                types: edge.types
            });
        }

        return {
            totalEvents: this.totalEventCount,
            bufferedEvents: this.ringBuffer.getSize(),
            nodeCount: nodes.length,
            edgeCount: edges.length,
            nodes,
            edges
        };
    }

    /**
     * Son N event'i döndürür (snapshot)
     * @param {number} count - Kaç event isteniyor
     * @returns {Object[]} Event listesi
     */
    getSnapshot(count = 500) {
        return this.ringBuffer.last(count);
    }

    /**
     * Tüm istatistikleri sıfırlar
     */
    reset() {
        this.ringBuffer.clear();
        this.totalEventCount = 0;
        this.nextEventId = 1;
        this.processFileEdges.clear();
        this.processNetworkEdges.clear();
        this.processProcessEdges.clear();
        this.nodes.clear();
    }
}

module.exports = { EventAggregator, RingBuffer };
