<svelte:options runes={false} />
<script>
    import { filters, filterQuery, lookupModalOpen, lookupType, lookupTargetInput, lookupDataKey } from '../stores.js';

    function triggerLookup(type, inputKey, dataKey) {
        lookupType.set(type);
        lookupTargetInput.set(inputKey);
        lookupDataKey.set(dataKey);
        lookupModalOpen.set(true);
    }
</script>

<aside>
    <div class="sidebar-header">
        <h2>Filters <span>100% Coverage</span></h2>
    </div>

    <!-- Process Filters -->
    <div class="filter-category">
        <h3>Process (proc.*)</h3>
        
        <div class="input-group">
            <label>Process Name (proc.name)</label>
            <input type="text" bind:value={$filters.proc_name} placeholder="e.g. nginx, sshd" style="padding-right: 60px;">
            <button class="btn-lookup" on:click={() => triggerLookup('PROCESSES', 'proc_name', 'name')}>🔍 Seç</button>
        </div>
        <div class="input-group">
            <label>Process ID (proc.pid)</label>
            <input type="text" bind:value={$filters.proc_pid} placeholder="e.g. 1234" style="padding-right: 60px;">
            <button class="btn-lookup" on:click={() => triggerLookup('PROCESSES', 'proc_pid', 'pid')}>🔍 Seç</button>
        </div>
        <div class="input-group">
            <label>Executable (proc.exe)</label>
            <input type="text" bind:value={$filters.proc_exe} placeholder="/usr/bin/bash">
        </div>
        <div class="input-group">
            <label>Parent Name (proc.pname)</label>
            <input type="text" bind:value={$filters.proc_pname} placeholder="systemd">
        </div>
    </div>

    <!-- File / Network Filters -->
    <div class="filter-category">
        <h3>File & Socket (fd.*)</h3>
        
        <div class="input-group">
            <label>Descriptor Path (fd.name)</label>
            <input type="text" bind:value={$filters.fd_name} placeholder="/etc/passwd or .log">
        </div>
        <div class="input-group">
            <label>IP Address (fd.ip)</label>
            <input type="text" bind:value={$filters.fd_ip} placeholder="192.168.1.1">
        </div>
        <div class="input-group">
            <label>Port (fd.port)</label>
            <input type="number" bind:value={$filters.fd_port} placeholder="80, 443" style="padding-right: 60px;">
            <button class="btn-lookup" on:click={() => triggerLookup('PORTS', 'fd_port', 'port')}>🔍 Seç</button>
        </div>
        <div class="input-group">
            <label>FD Type (fd.type)</label>
            <select bind:value={$filters.fd_type}>
                <option value="">Any Type</option>
                <option value="file">File (file)</option>
                <option value="ipv4">Network (IPv4)</option>
                <option value="ipv6">Network (IPv6)</option>
                <option value="unix">Unix Socket (unix)</option>
                <option value="pipe">Pipe (pipe)</option>
            </select>
        </div>
    </div>

    <!-- Event Filters -->
    <div class="filter-category">
        <h3>Syscall Events (evt.*)</h3>
        
        <div class="input-group">
            <label>Event Type (evt.type)</label>
            <input type="text" bind:value={$filters.evt_type} placeholder="open, read, connect">
        </div>
        <div class="input-group">
            <label>Direction (evt.dir)</label>
            <select bind:value={$filters.evt_dir}>
                <option value="">Both (&lt; &gt;)</option>
                <option value=">">Input Call (&gt;)</option>
                <option value="<">Output Reply (&lt;)</option>
            </select>
        </div>
    </div>

    <!-- User & Group -->
    <div class="filter-category">
        <h3>User & Group</h3>
        <div class="input-group">
            <label>User Name (user.name)</label>
            <input type="text" bind:value={$filters.user_name} placeholder="root, drvoid" style="padding-right: 60px;">
            <button class="btn-lookup" on:click={() => triggerLookup('USERS', 'user_name', 'user')}>🔍 Seç</button>
        </div>
    </div>

    <!-- Filter Query Monitor -->
    {#if $filterQuery === ''}
        <div id="generated-filter" style="color: var(--text-muted); font-style: italic;">No active filters. Capturing all data.</div>
    {:else}
        <div id="generated-filter">{$filterQuery}</div>
    {/if}
</aside>
