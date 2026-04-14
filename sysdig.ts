import { WebSocketServer } from 'ws';
import { spawn, ChildProcess } from 'child_process';
import * as readline from 'readline';

// Create WebSocket server on port 8080
const wss = new WebSocketServer({ port: 8080 });
let sysdigProcess: ChildProcess | null = null;

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
                
                // Construct command arguments
                const args = ['-j'];
                if (req.filter && req.filter.trim() !== '') {
                    args.push(req.filter);
                }

                // Spawn Sysdig
                // Sysdig must be installed and this TS process must be ran as root.
                sysdigProcess = spawn('sysdig', args);

                if (sysdigProcess.stdout) {
                    const rl = readline.createInterface({ input: sysdigProcess.stdout });
                    rl.on('line', (line) => {
                        try {
                            const sysdigEvent = JSON.parse(line);
                            // Map sysdig flat schema to our Web UI expectation
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
                        } catch (e) {
                            // Ignored (unparseable line)
                        }
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
