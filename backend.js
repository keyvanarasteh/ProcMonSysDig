const { WebSocketServer } = require('ws');
const { spawn, exec } = require('child_process');
const readline = require('readline');

// Create WebSocket server on port 8080
const wss = new WebSocketServer({ port: 8080 });
let sysdigProcess = null;

console.log("🚀 Sysdig WebSocket Server running on ws://localhost:8080");
console.log("⚠️ Make sure you are running this script with 'sudo' privileges!");

wss.on('connection', (ws) => {
    console.log('[+] Web UI panel connected.');

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
                                user_name: sysdigEvent['user.name'] || 'root',
                                fd_name: sysdigEvent['fd.name'] || '',
                                evt_args: sysdigEvent['evt.args'] || '',
                                res: sysdigEvent['evt.res'] || '0'
                            };
                            ws.send(JSON.stringify(payload));
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
                        ws.send(JSON.stringify({ 
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
                installProcess.stdout.on('data', (data) => ws.send(JSON.stringify({ install_log: data.toString() })));
                installProcess.stderr.on('data', (data) => ws.send(JSON.stringify({ install_log: `[ERR] ${data.toString()}` })));
                installProcess.on('close', (code) => ws.send(JSON.stringify({ install_log: `\n[--- Installation complete with code ${code} ---]\n` })));
            }
            else if (req.command === 'STOP') {
                console.log('[*] Stopping capture...');
                if (sysdigProcess) {
                    sysdigProcess.kill('SIGINT');
                    sysdigProcess = null;
                }
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
