<svelte:options runes={false} />
<script>
    import { eventsData, eventCount, bytesCount, eventDetailModalOpen, selectedEvent } from '../stores.js';

    function clearTable() {
        eventsData.set([]);
        eventCount.set(0);
        bytesCount.set(0);
    }

    function openEventDetail(eventObj) {
        selectedEvent.set(eventObj);
        eventDetailModalOpen.set(true);
    }

    function getTagClass(evtType) {
        let typeUpper = String(evtType).toUpperCase();
        if(typeUpper.includes("OPEN") || typeUpper.includes("CONNECT")) return "bg-[rgba(0,240,255,0.1)] text-[var(--accent-cyan)] border border-[rgba(0,240,255,0.3)]";
        if(typeUpper.includes("READ")) return "bg-[rgba(0,255,157,0.1)] text-[var(--accent-green)] border border-[rgba(0,255,157,0.3)]";
        if(typeUpper.includes("WRITE")) return "bg-[rgba(255,176,58,0.1)] text-[var(--accent-orange)] border border-[rgba(255,176,58,0.3)]";
        return "bg-[rgba(255,42,95,0.1)] text-[var(--accent-red)] border border-[rgba(255,42,95,0.3)]";
    }
</script>

<div class="flex-1 overflow-hidden flex flex-col">
    <!-- Controls Bar -->
    <div class="flex justify-between items-center mb-4 flex-shrink-0">
        <div class="flex gap-6">
            <div class="flex flex-col">
                <span class="text-[0.75rem] text-[var(--text-muted)] uppercase tracking-wide">Captured Events</span>
                <span class="text-2xl font-extrabold text-[var(--text-main)] font-mono">{$eventCount.toLocaleString()}</span>
            </div>
            <div class="flex flex-col">
                <span class="text-[0.75rem] text-[var(--text-muted)] uppercase tracking-wide">Bytes Scanned</span>
                <span class="text-2xl font-extrabold text-[var(--text-main)] font-mono">{$bytesCount.toFixed(2)} MB</span>
            </div>
        </div>
        <div class="flex gap-2">
            <button class="bg-transparent border border-[var(--accent-cyan)] text-[var(--accent-cyan)] px-4 py-2 rounded-md font-semibold font-sans hover:bg-[rgba(0,240,255,0.1)] transition-all cursor-pointer" onclick={clearTable}>Clear View</button>
            <button class="bg-transparent border border-[var(--accent-cyan)] text-[var(--accent-cyan)] px-4 py-2 rounded-md font-semibold font-sans hover:bg-[rgba(0,240,255,0.1)] transition-all cursor-pointer hidden md:block">🔌 Trigger Demo</button>
        </div>
    </div>

    <!-- Table Wrapper -->
    <div class="flex-1 overflow-auto rounded-lg bg-[rgba(0,0,0,0.3)] border border-[var(--border-color)] relative">
        <table class="w-full border-collapse text-left">
            <thead>
                <tr>
                    <th class="w-20 sticky top-0 bg-[rgba(13,20,36,0.95)] backdrop-blur-md text-[var(--text-muted)] text-[0.75rem] uppercase tracking-wide p-3 border-b border-[var(--border-color)] z-10">Time</th>
                    <th class="w-12 sticky top-0 bg-[rgba(13,20,36,0.95)] backdrop-blur-md text-[var(--text-muted)] text-[0.75rem] uppercase tracking-wide p-3 border-b border-[var(--border-color)] z-10">Dir</th>
                    <th class="w-20 sticky top-0 bg-[rgba(13,20,36,0.95)] backdrop-blur-md text-[var(--text-muted)] text-[0.75rem] uppercase tracking-wide p-3 border-b border-[var(--border-color)] z-10">Event</th>
                    <th class="w-[150px] sticky top-0 bg-[rgba(13,20,36,0.95)] backdrop-blur-md text-[var(--text-muted)] text-[0.75rem] uppercase tracking-wide p-3 border-b border-[var(--border-color)] z-10">Process</th>
                    <th class="w-20 sticky top-0 bg-[rgba(13,20,36,0.95)] backdrop-blur-md text-[var(--text-muted)] text-[0.75rem] uppercase tracking-wide p-3 border-b border-[var(--border-color)] z-10">PID</th>
                    <th class="w-[90px] sticky top-0 bg-[rgba(13,20,36,0.95)] backdrop-blur-md text-[var(--text-muted)] text-[0.75rem] uppercase tracking-wide p-3 border-b border-[var(--border-color)] z-10">User</th>
                    <th class="sticky top-0 bg-[rgba(13,20,36,0.95)] backdrop-blur-md text-[var(--text-muted)] text-[0.75rem] uppercase tracking-wide p-3 border-b border-[var(--border-color)] z-10">FD / Resource Path / Arguments</th>
                    <th class="w-[100px] sticky top-0 bg-[rgba(13,20,36,0.95)] backdrop-blur-md text-[var(--text-muted)] text-[0.75rem] uppercase tracking-wide p-3 border-b border-[var(--border-color)] z-10">Result</th>
                </tr>
            </thead>
            <tbody>
                {#each $eventsData as ev}
                    <tr class="hover:bg-[rgba(255,255,255,0.02)] cursor-pointer" onclick={() => openEventDetail(ev)} title="Click to view full event & process details">
                        <td class="p-2.5 px-4 border-b border-[rgba(255,255,255,0.03)] text-[0.85rem] font-mono text-[var(--text-muted)]">
                            {new Date().toLocaleTimeString()}
                        </td>
                        <td class="p-2.5 px-4 border-b border-[rgba(255,255,255,0.03)] text-[0.85rem] font-bold font-mono">
                            <span class="{ev.evt_dir === '>' ? 'text-[var(--accent-cyan)]' : 'text-[var(--accent-green)]'}">
                                {ev.evt_dir}
                            </span>
                        </td>
                        <td class="p-2.5 px-4 border-b border-[rgba(255,255,255,0.03)] text-[0.85rem]">
                            <span class="px-1.5 py-0.5 rounded text-[0.75rem] font-semibold uppercase {getTagClass(ev.evt_type)}">
                                {String(ev.evt_type).toUpperCase()}
                            </span>
                        </td>
                        <td class="p-2.5 px-4 border-b border-[rgba(255,255,255,0.03)] text-[0.85rem] font-mono text-[var(--text-main)]">
                            {ev.proc_name}
                        </td>
                        <td class="p-2.5 px-4 border-b border-[rgba(255,255,255,0.03)] text-[0.85rem] font-mono text-[var(--text-muted)]">
                            {ev.proc_pid}
                        </td>
                        <td class="p-2.5 px-4 border-b border-[rgba(255,255,255,0.03)] text-[0.85rem] font-mono text-[var(--text-main)]">
                            {ev.user_name}
                        </td>
                        <td class="p-2.5 px-4 border-b border-[rgba(255,255,255,0.03)] text-[0.85rem] font-mono break-all text-[var(--text-main)]">
                            {ev.fd_name || ev.evt_args}
                        </td>
                        <td class="p-2.5 px-4 border-b border-[rgba(255,255,255,0.03)] text-[0.85rem] font-mono font-bold {String(ev.res).includes('ENOENT') ? 'text-[var(--accent-cyan)]' : 'text-[var(--text-main)]'}">
                            {ev.res || '0'}
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>
