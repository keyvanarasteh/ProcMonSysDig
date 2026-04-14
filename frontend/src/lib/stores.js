import { writable, derived } from 'svelte/store';

// UI State
export const activeTab = writable('events'); // 'events' | 'tree'
export const isCapturing = writable(false);
export const demoMode = writable(false);
export const setupModalOpen = writable(false);

export const connStatus = writable('Disconnected'); // 'Connected' | 'Disconnected'
export const sysdigVersion = writable('Not Installed');
export const procmonVersion = writable('Not Installed');
export const installLogs = writable([]);

export const treeAutoRefresh = writable(false);
export const treeSearchTerm = writable('');

// Data State
export const eventsData = writable([]); // The real-time events feed
export const treeData = writable([]); // The raw process tree

// Metrics
export const eventCount = writable(0);
export const bytesCount = writable(0);

// Lookup Store
export const lookupModalOpen = writable(false);
export const lookupType = writable(''); // 'PROCESSES', 'USERS', 'PORTS'
export const lookupDataKey = writable('');
export const lookupTargetInput = writable('');
export const lookupData = writable([]); // The data returned for lookups

// Selected Event Detail
export const eventDetailModalOpen = writable(false);
export const selectedEvent = writable(null);

// Filters State
export const filters = writable({
    proc_name: '',
    proc_pid: '',
    proc_exe: '',
    proc_pname: '',
    fd_name: '',
    fd_ip: '',
    fd_port: '',
    fd_type: '',
    evt_type: '',
    evt_dir: '',
    user_name: ''
});

// Generated Filter computed store
export const filterQuery = derived(filters, ($f) => {
    const q = [];
    if($f.proc_name) q.push(`proc.name="${$f.proc_name}"`);
    if($f.proc_pid) q.push(`proc.pid=${$f.proc_pid}`);
    if($f.proc_exe) q.push(`proc.exe="${$f.proc_exe}"`);
    if($f.proc_pname) q.push(`proc.pname="${$f.proc_pname}"`);
    if($f.fd_name) q.push(`fd.name contains "${$f.fd_name}"`);
    if($f.fd_ip) q.push(`fd.ip="${$f.fd_ip}"`);
    if($f.fd_port) q.push(`fd.port=${$f.fd_port}`);
    if($f.fd_type) q.push(`fd.type="${$f.fd_type}"`);
    if($f.evt_type) q.push(`evt.type="${$f.evt_type}"`);
    if($f.evt_dir) q.push(`evt.dir="${$f.evt_dir}"`);
    if($f.user_name) q.push(`user.name="${$f.user_name}"`);
    return q.join(" and ");
});
