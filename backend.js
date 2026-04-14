const { WebSocketServer } = require('ws');
const { spawn, exec } = require('child_process');
const readline = require('readline');

// Create WebSocket server on port 8091
const wss = new WebSocketServer({ port: 8091 });
let sysdigProcess = null;

console.log("🚀 Sysdig WebSocket Server running on ws://localhost:8091");
console.log("⚠️ Make sure you are running this script with 'sudo' privileges!");

wss.on('connection', (ws) => {
    console.log('[+] Web UI panel connected.');

    const safeSend = (payload) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            try { ws.send(payload); } catch (err) { console.error('WS Send error:', err); }
        }
    };

    ws.on('message', (message) => {
        try {
            const req = JSON.parse(message.toString());
            
            if (req.command === 'START') {
                if (sysdigProcess) {
                    sysdigProcess.kill();
                    sysdigProcess = null;
                }

                console.log(`[*] Starting capture with filter: ${req.filter || "None"}`);
                
                const args = ['-j'];
                if (req.filter && req.filter.trim() !== '') {
                    args.push(req.filter);
                }

                sysdigProcess = spawn('sysdig', args);

                if (sysdigProcess.stdout) {
                    const rl = readline.createInterface({ input: sysdigProcess.stdout });
                    rl.on('line', (line) => {
                        try {
                            const sysdigEvent = JSON.parse(line);
                            const payload = {
                                evt_type: sysdigEvent['evt.type'] || 'unknown',
                                evt_dir: sysdigEvent['evt.dir'] || 'none',
                                proc_name: sysdigEvent['proc.name'] || 'system',
                                proc_pid: sysdigEvent['proc.pid'] || 0,
                                proc_ppid: sysdigEvent['proc.ppid'] || 0,
                                user_name: sysdigEvent['user.name'] || 'root',
                                fd_name: sysdigEvent['fd.name'] || '',
                                evt_args: sysdigEvent['evt.args'] || '',
                                res: sysdigEvent['evt.res'] || '0'
                            };
                            safeSend(JSON.stringify(payload));
                        } catch (e) { }
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
            else if (req.command === 'STOP') {
                console.log('[*] Stopping capture...');
                if (sysdigProcess) {
                    sysdigProcess.kill('SIGINT');
                    sysdigProcess = null;
                }
            }
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
            else if (req.command === 'GET_PORTS') {
                exec("ss -lntu", (err, stdout) => {
                    const list = [];
                    if(stdout) {
                        const lines = stdout.split('\n');
                        lines.shift(); // remove header
                        lines.filter(l => l.trim()).forEach(line => {
                            const parts = line.trim().split(/\s+/);
                            const addr = parts[4] || '';
                            const portMatch = addr.match(/:([0-9]+)$/);
                            if(portMatch) list.push({ protocol: parts[0], address: addr, port: portMatch[1] });
                        });
                    }
                    // Filter uniques by port
                    const uniquePorts = Array.from(new Set(list.map(i => i.port)))
                         .map(p => list.find(l => l.port === p));
                    safeSend(JSON.stringify({ lookup_type: 'PORTS', data: uniquePorts }));
                });
            }
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
            // GET_PROCESS_TREE: Tüm süreçleri PID, PPID ve detaylı bilgilerle döndürür
            else if (req.command === 'GET_PROCESS_TREE') {
                exec("ps -eo pid,ppid,user,%cpu,%mem,stat,tty,start,time,comm,args --no-headers", { maxBuffer: 1024 * 1024 * 5 }, (err, stdout) => {
                    const list = [];
                    if (stdout) {
                        stdout.split('\n').filter(l => l.trim()).forEach(line => {
                            // ps çıktısını parse et: ilk 10 alan sabit genişlikli, son alan (args) kalan her şey
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
                                // Tam komut satırı: 10. indeksten sonraki tüm parçalar
                                const cmdline = parts.slice(10).join(' ') || comm;
                                list.push({ pid, ppid, user, cpu, mem, stat, tty, start, time, comm, cmdline });
                            }
                        });
                    }
                    safeSend(JSON.stringify({ lookup_type: 'PROCESS_TREE', data: list }));
                });
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
