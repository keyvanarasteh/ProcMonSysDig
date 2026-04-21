/**
 * backend.js — Sysdig WebSocket Bridge Server
 * 
 * Linux çekirdek düzeyinde syscall olaylarını yakalayan sysdig aracını
 * child_process ile başlatıp, JSON çıktısını WebSocket üzerinden
 * frontend dashboard'a ileten köprü sunucusu.
 * 
 * Port: 8091 (WebSocket)
 * Gereksinim: sudo (sysdig eBPF için root yetki)
 * 
 * Komutlar: START, STOP, CHECK_STATUS, INSTALL_DEPS,
 *           GET_PROCESSES, GET_PORTS, GET_USERS, GET_PROCESS_TREE,
 *           GET_EVENT_SNAPSHOT, GET_GRAPH_DATA
 */

'use strict';

const { WebSocketServer } = require('ws');
const { spawn, exec } = require('child_process');
const readline = require('readline');
const { EventAggregator } = require('./lib/aggregator');

// ─── Aggregator Başlat ────────────────────────────────────────────
const aggregator = new EventAggregator(5000);

// ─── WebSocket Sunucusu ───────────────────────────────────────────
const wss = new WebSocketServer({ port: 8091 });
let sysdigProcess = null;

console.log("🚀 Sysdig WebSocket Server running on ws://localhost:8091");
console.log("⚠️  Make sure you are running this script with 'sudo' privileges!");
console.log("📊 Aggregator initialized with 5000 event ring buffer");

wss.on('connection', (ws) => {
    console.log('[+] Web UI panel connected.');

    /**
     * Güvenli WebSocket mesajı gönderici
     * Bağlantı durumunu kontrol ederek hata yakalar
     */
    const safeSend = (payload) => {
        if (ws && ws.readyState === ws.OPEN) {
            try { ws.send(payload); } catch (err) { console.error('WS Send error:', err); }
        }
    };

    ws.on('message', (message) => {
        try {
            const req = JSON.parse(message.toString());
            
            // ─── START: Sysdig yakalama başlat ────────────────
            if (req.command === 'START') {
                if (sysdigProcess) {
                    sysdigProcess.kill();
                    sysdigProcess = null;
                }

                // Yeni yakalama başlarken aggregator'ı sıfırla
                aggregator.reset();

                console.log(`[*] Starting capture with filter: ${req.filter || "None"}`);
                
                // Zenginleştirilmiş sysdig JSON formatı:
                // Orijinal alanlar + evt.rawtime, thread.tid, proc.exe,
                // fd.typechar, fd.sip, fd.sport, fd.dip, fd.dport
                const sysdigFormat = [
                    'evt.type', 'evt.dir', 'evt.rawtime',
                    'proc.name', 'proc.pid', 'proc.ppid', 'proc.exe',
                    'user.name', 'thread.tid',
                    'fd.name', 'fd.typechar', 'fd.sip', 'fd.sport', 'fd.dip', 'fd.dport',
                    'evt.args', 'evt.res'
                ];

                const args = ['-j', '-p', sysdigFormat.map(f => `%${f}`).join(' ')];
                if (req.filter && req.filter.trim() !== '') {
                    args.push(req.filter);
                }

                sysdigProcess = spawn('sysdig', ['-j']);
                // Filtre varsa ayrıca ekle (sysdig -j <filter>)
                if (req.filter && req.filter.trim() !== '') {
                    sysdigProcess.kill();
                    sysdigProcess = spawn('sysdig', ['-j', req.filter]);
                }

                if (sysdigProcess.stdout) {
                    const rl = readline.createInterface({ input: sysdigProcess.stdout });
                    rl.on('line', (line) => {
                        try {
                            const sysdigEvent = JSON.parse(line);
                            
                            // Zenginleştirilmiş event payload'ı oluştur
                            const payload = {
                                // Temel event bilgileri
                                evt_type: sysdigEvent['evt.type'] || 'unknown',
                                evt_dir: sysdigEvent['evt.dir'] || 'none',
                                evt_rawtime: sysdigEvent['evt.rawtime'] || 0,
                                evt_args: sysdigEvent['evt.args'] || '',
                                res: sysdigEvent['evt.res'] || '0',
                                
                                // Süreç bilgileri (genişletilmiş)
                                proc_name: sysdigEvent['proc.name'] || 'system',
                                proc_pid: sysdigEvent['proc.pid'] || 0,
                                proc_ppid: sysdigEvent['proc.ppid'] || 0,
                                proc_exe: sysdigEvent['proc.exe'] || '',
                                user_name: sysdigEvent['user.name'] || 'root',
                                thread_tid: sysdigEvent['thread.tid'] || 0,
                                
                                // Dosya/soket bilgileri (genişletilmiş)
                                fd_name: sysdigEvent['fd.name'] || '',
                                fd_typechar: sysdigEvent['fd.typechar'] || '',
                                
                                // Ağ bilgileri (yeni)
                                fd_sip: sysdigEvent['fd.sip'] || '',
                                fd_sport: sysdigEvent['fd.sport'] || '',
                                fd_dip: sysdigEvent['fd.dip'] || '',
                                fd_dport: sysdigEvent['fd.dport'] || ''
                            };

                            // Aggregator'a besle (ID ataması + istatistik)
                            const enrichedPayload = aggregator.push(payload);

                            // Frontend'e gönder
                            safeSend(JSON.stringify(enrichedPayload));
                        } catch (e) { /* JSON parse hatası — atla */ }
                    });
                }
                
                if (sysdigProcess.stderr) {
                    sysdigProcess.stderr.on('data', (d) => {
                        console.log(`[sysdig error/log] ${d}`);
                    });
                }
                sysdigProcess.on('close', (code) => {
                    console.log(`[-] Sysdig process exited with code ${code}`);
                });
            }

            // ─── CHECK_STATUS: Araç sürüm bilgilerini kontrol et ──
            else if (req.command === 'CHECK_STATUS') {
                let sysdigInfo = "Not Installed";
                let procmonInfo = "Not Installed";
                
                exec("sysdig --version", (err, stdout) => {
                    if (!err && stdout) sysdigInfo = stdout.trim().split('\n')[0];
                    exec("dpkg -s procmon | grep Version", (err2, stdout2) => {
                        if (!err2 && stdout2) procmonInfo = "Installed: " + stdout2.trim();
                        safeSend(JSON.stringify({ 
                            sys_status: { sysdig: sysdigInfo, procmon: procmonInfo } 
                        }));
                    });
                });
            }

            // ─── INSTALL_DEPS: Otomatik bağımlılık kurulumu ──────
            else if (req.command === 'INSTALL_DEPS') {
                console.log('[*] UI Triggered automated dependency installation...');
                const cmd = `
                    echo "[+] Starting automated installation..."
                    if ! command -v sysdig > /dev/null 2>&1; then 
                        echo "[*] Installing sysdig..."
                        sudo apt-get update -y && sudo apt-get install sysdig linux-headers-$(uname -r) -y
                    else 
                        echo "[+] Sysdig is already installed!"
                    fi
                    echo "[*] Checking Microsoft eBPF dependencies..."
                    if ! dpkg -s sysinternalsebpf >/dev/null 2>&1; then
                        echo "[-] Fetching Microsoft ProcMon packages..."
                        wget -qO sysinternalsebpf.deb https://packages.microsoft.com/debian/12/prod/pool/main/s/sysinternalsebpf/sysinternalsebpf_1.5.0_amd64.deb
                        sudo dpkg -i sysinternalsebpf.deb || true
                        wget -qO procmon.deb https://packages.microsoft.com/debian/12/prod/pool/main/p/procmon/procmon_2.2.0_amd64.deb
                        sudo dpkg -i procmon.deb || true
                        sudo dpkg --configure procmon || true
                        rm -f sysinternalsebpf.deb procmon.deb
                    else
                        echo "[+] Microsoft eBPF dependencies already present."
                    fi
                    echo "[+] All dependencies verified!"
                `;

                const installProcess = exec(cmd);
                installProcess.stdout.on('data', (data) => safeSend(JSON.stringify({ install_log: data.toString() })));
                installProcess.stderr.on('data', (data) => safeSend(JSON.stringify({ install_log: `[ERR] ${data.toString()}` })));
                installProcess.on('close', (code) => safeSend(JSON.stringify({ install_log: `\n[--- Installation complete with code ${code} ---]\n` })));
            }

            // ─── STOP: Yakalamayı durdur ──────────────────────────
            else if (req.command === 'STOP') {
                console.log('[*] Stopping capture...');
                if (sysdigProcess) {
                    sysdigProcess.kill('SIGINT');
                    sysdigProcess = null;
                }
            }

            // ─── GET_PROCESSES: Çalışan süreçleri listele ─────────
            else if (req.command === 'GET_PROCESSES') {
                exec("ps -eo pid,ppid,user,comm --no-headers", (err, stdout) => {
                    const list = [];
                    if(stdout) {
                        stdout.split('\n').filter(l => l.trim()).forEach(line => {
                            const parts = line.trim().split(/\s+/);
                            if (parts.length >= 4) {
                                const pid = parts[0];
                                const ppid = parts[1];
                                const user = parts[2];
                                const name = parts.slice(3).join(' ');
                                list.push({ pid, ppid, user, name });
                            }
                        });
                    }
                    safeSend(JSON.stringify({ lookup_type: 'PROCESSES', data: list }));
                });
            }

            // ─── GET_PORTS: Açık portları listele ─────────────────
            else if (req.command === 'GET_PORTS') {
                exec("ss -lntu", (err, stdout) => {
                    const list = [];
                    if(stdout) {
                        const lines = stdout.split('\n');
                        lines.shift(); // Başlığı kaldır
                        lines.filter(l => l.trim()).forEach(line => {
                            const parts = line.trim().split(/\s+/);
                            const addr = parts[4] || '';
                            const portMatch = addr.match(/:([0-9]+)$/);
                            if(portMatch) list.push({ protocol: parts[0], address: addr, port: portMatch[1] });
                        });
                    }
                    // Port bazında tekilleştir
                    const uniquePorts = Array.from(new Set(list.map(i => i.port)))
                         .map(p => list.find(l => l.port === p));
                    safeSend(JSON.stringify({ lookup_type: 'PORTS', data: uniquePorts }));
                });
            }

            // ─── GET_USERS: Sistem kullanıcılarını listele ────────
            else if (req.command === 'GET_USERS') {
                exec("getent passwd", (err, stdout) => {
                    const list = [];
                    if(stdout) {
                        stdout.split('\n').filter(l => l.trim()).forEach(line => {
                            const parts = line.split(':');
                            if(parts.length > 2) list.push({ user: parts[0], uid: parts[2] });
                        });
                    }
                    safeSend(JSON.stringify({ lookup_type: 'USERS', data: list }));
                });
            }

            // ─── GET_PROCESS_TREE: Detaylı süreç ağacı ───────────
            else if (req.command === 'GET_PROCESS_TREE') {
                exec("ps -eo pid,ppid,user,%cpu,%mem,stat,tty,start,time,comm,args --no-headers", { maxBuffer: 1024 * 1024 * 5 }, (err, stdout) => {
                    const list = [];
                    if (stdout) {
                        stdout.split('\n').filter(l => l.trim()).forEach(line => {
                            const trimmed = line.trim();
                            const parts = trimmed.split(/\s+/);
                            if (parts.length >= 10) {
                                const pid   = parts[0];
                                const ppid  = parts[1];
                                const user  = parts[2];
                                const cpu   = parts[3];
                                const mem   = parts[4];
                                const stat  = parts[5];
                                const tty   = parts[6];
                                const start = parts[7];
                                const time  = parts[8];
                                const comm  = parts[9];
                                const cmdline = parts.slice(10).join(' ') || comm;
                                list.push({ pid, ppid, user, cpu, mem, stat, tty, start, time, comm, cmdline });
                            }
                        });
                    }
                    safeSend(JSON.stringify({ lookup_type: 'PROCESS_TREE', data: list }));
                });
            }

            // ─── GET_EVENT_SNAPSHOT: Son N event'i toplu gönder ───
            else if (req.command === 'GET_EVENT_SNAPSHOT') {
                const count = req.count || 500;
                const snapshot = aggregator.getSnapshot(count);
                safeSend(JSON.stringify({
                    snapshot_type: 'EVENT_SNAPSHOT',
                    data: snapshot,
                    totalEvents: aggregator.totalEventCount,
                    bufferedEvents: aggregator.ringBuffer.getSize()
                }));
            }

            // ─── GET_GRAPH_DATA: Grafik verisi (düğümler + kenarlar) ─
            else if (req.command === 'GET_GRAPH_DATA') {
                const summary = aggregator.getSummary();
                safeSend(JSON.stringify({
                    graph_type: 'GRAPH_DATA',
                    data: summary
                }));
            }

        } catch(e) {
            console.error("Error processing message:", e);
        }
    });

    ws.on('close', () => {
        console.log('[-] Web UI panel disconnected.');
        if (sysdigProcess) {
            sysdigProcess.kill();
            sysdigProcess = null;
        }
    });
});
