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
        if(typeUpper.includes("OPEN") || typeUpper.includes("CONNECT")) return "evt-open";
        if(typeUpper.includes("READ")) return "evt-read";
        if(typeUpper.includes("WRITE")) return "evt-write";
        return "evt-err";
    }
</script>

<div class="controls-bar">
    <div class="metrics">
        <div class="metric">
            <span class="label">Captured Events</span>
            <span class="value" id="stat-events">{$eventCount}</span>
        </div>
        <div class="metric">
            <span class="label">Bytes Scanned</span>
            <span class="value" id="stat-bytes">{$bytesCount.toFixed(2)} MB</span>
        </div>
    </div>
    <div style="display: flex; gap: 12px;">
        <button class="btn" on:click={clearTable}>Clear View</button>
    </div>
</div>

<div class="table-wrapper">
    <table>
        <thead>
            <tr>
                <th style="width: 80px;">Time</th>
                <th style="width: 50px;">Dir</th>
                <th style="width: 100px;">Event</th>
                <th style="width: 150px;">Process</th>
                <th style="width: 80px;">PID</th>
                <th style="width: 100px;">User</th>
                <th>FD / Resource Path / Arguments</th>
                <th style="width: 120px;">Result</th>
            </tr>
        </thead>
        <tbody id="events-table-body">
            {#each $eventsData as ev}
                <tr class="new-row" on:click={() => openEventDetail(ev)} title="Click to view full event & process details" style="cursor: pointer;">
                    <td class="mono" style="color: var(--text-muted);">{new Date().toLocaleTimeString()}</td>
                    <td class={ev.evt_dir === '>' ? 'dir-in mono' : 'dir-out mono'}>{ev.evt_dir}</td>
                    <td><span class="tag {getTagClass(ev.evt_type)}">{String(ev.evt_type).toUpperCase()}</span></td>
                    <td class="mono">{ev.proc_name}</td>
                    <td class="mono" style="color: var(--text-muted);">{ev.proc_pid}</td>
                    <td class="mono">{ev.user_name}</td>
                    <td class="mono">{ev.fd_name || ev.evt_args}</td>
                    <td class="mono" style="color: {String(ev.res).includes('ENOENT') ? 'var(--accent-red)' : 'var(--text-main)'}">{ev.res || 0}</td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>
