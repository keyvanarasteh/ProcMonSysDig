import { get } from 'svelte/store';
import { 
    connStatus, sysdigVersion, procmonVersion, installLogs,
    treeData, lookupData, eventsData, eventCount, bytesCount,
    isCapturing, demoMode
} from './stores';

let ws = null;
let treeAutoRefreshInterval = null;

export function connectWebSocket() {
    // If running in browser and not connected
    if (typeof window !== 'undefined' && (!ws || ws.readyState === WebSocket.CLOSED)) {
        // ws://localhost:8091 for local node test, or auto-detect
        ws = new WebSocket('ws://localhost:8091');

        ws.onopen = () => {
            console.log("WebSocket connection established");
            connStatus.set('Connected');
            
            // Request version info when connected
            sendWebSocketCommand({ command: "CHECK_STATUS" });
            
            // Initial Process Tree Grab
            setTimeout(() => {
                sendWebSocketCommand({ command: 'GET_PROCESS_TREE' });
            }, 1000);
            
            // We'll manage the interval logic within Svelte components using reactive statements, 
            // but we can initialize data fetching here safely.
        };

        ws.onclose = () => {
            if (!get(demoMode)) {
                connStatus.set('Disconnected');
            }
            setTimeout(connectWebSocket, 3000);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.install_log) {
                    installLogs.update(logs => [...logs, data.install_log]);
                    return;
                }
                
                if (data.sys_status) {
                    sysdigVersion.set(data.sys_status.sysdig);
                    procmonVersion.set(data.sys_status.procmon);
                    return;
                }
                
                if (data.lookup_type) {
                    if (data.lookup_type === 'PROCESS_TREE') {
                        treeData.set(data.data);
                    } else {
                        // For generic lookups (USERS, PORTS, PROCESSES abstractly)
                        lookupData.set(data.data);
                    }
                    return;
                }

                // If not tracking AND it's not a demo placeholder, ignore
                if (!get(isCapturing) && data.placeholder !== true) return;

                // Push to events list (simulate prepend, keeping length small)
                eventsData.update(list => {
                    const newList = [data, ...list];
                    if (newList.length > 200) {
                        newList.pop();
                    }
                    return newList;
                });
                
                eventCount.update(n => n + 1);
                bytesCount.update(n => n + Math.random() * 0.1);

            } catch (e) {
                console.error("WebSocket payload error:", e);
            }
        };
    }
}

export function sendWebSocketCommand(payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
    }
}
