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

<aside class="w-[320px] h-full overflow-y-auto border-r border-[var(--border-color)] bg-[rgba(5,11,20,0.4)] p-6 box-border flex-shrink-0">
    <div class="mb-6 flex justify-between items-center text-[var(--text-main)] font-semibold text-[1.1rem]">
        <h2>Filters</h2>
        <span class="text-sm font-normal text-[var(--accent-cyan)]">100% Coverage</span>
    </div>

    <!-- Process Filters -->
    <div class="mb-5 bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] rounded-lg p-4">
        <h3 class="text-[0.85rem] text-[var(--accent-cyan)] uppercase tracking-wide mb-3 border-b border-[rgba(0,240,255,0.2)] pb-1.5">Process (proc.*)</h3>
        
        <div class="relative flex flex-col gap-1 mb-3">
            <label class="text-[0.8rem] text-[var(--text-muted)] font-semibold">Process Name (proc.name)</label>
            <input type="text" bind:value={$filters.proc_name} placeholder="e.g. nginx, sshd" class="w-full bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.1)] text-white px-3 py-2 rounded focus:border-[var(--accent-cyan)] focus:shadow-[0_0_0_2px_rgba(0,240,255,0.15)] outline-none font-mono text-sm pr-[60px]" />
            <button class="absolute right-1 top-[22px] bg-[rgba(0,240,255,0.1)] border border-[var(--accent-cyan)] text-[var(--accent-cyan)] px-2 py-1 rounded text-[0.7rem] cursor-pointer hover:bg-[var(--accent-cyan)] hover:text-black transition-colors" onclick={() => triggerLookup('PROCESSES', 'proc_name', 'name')}>🔍 Seç</button>
        </div>

        <div class="relative flex flex-col gap-1 mb-3">
            <label class="text-[0.8rem] text-[var(--text-muted)] font-semibold">Process ID (proc.pid)</label>
            <input type="text" bind:value={$filters.proc_pid} placeholder="e.g. 1234" class="w-full bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.1)] text-white px-3 py-2 rounded focus:border-[var(--accent-cyan)] focus:shadow-[0_0_0_2px_rgba(0,240,255,0.15)] outline-none font-mono text-sm pr-[60px]" />
            <button class="absolute right-1 top-[22px] bg-[rgba(0,240,255,0.1)] border border-[var(--accent-cyan)] text-[var(--accent-cyan)] px-2 py-1 rounded text-[0.7rem] cursor-pointer hover:bg-[var(--accent-cyan)] hover:text-black transition-colors" onclick={() => triggerLookup('PROCESSES', 'proc_pid', 'pid')}>🔍 Seç</button>
        </div>

        <div class="relative flex flex-col gap-1 mb-3">
            <label class="text-[0.8rem] text-[var(--text-muted)] font-semibold">Executable (proc.exe)</label>
            <input type="text" bind:value={$filters.proc_exe} placeholder="/usr/bin/bash" class="w-full bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.1)] text-white px-3 py-2 rounded focus:border-[var(--accent-cyan)] focus:shadow-[0_0_0_2px_rgba(0,240,255,0.15)] outline-none font-mono text-sm" />
        </div>

        <div class="relative flex flex-col gap-1 mb-1">
            <label class="text-[0.8rem] text-[var(--text-muted)] font-semibold">Parent Name (proc.pname)</label>
            <input type="text" bind:value={$filters.proc_pname} placeholder="systemd" class="w-full bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.1)] text-white px-3 py-2 rounded focus:border-[var(--accent-cyan)] focus:shadow-[0_0_0_2px_rgba(0,240,255,0.15)] outline-none font-mono text-sm" />
        </div>
    </div>

    <!-- File / Network Filters -->
    <div class="mb-5 bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] rounded-lg p-4">
        <h3 class="text-[0.85rem] text-[var(--accent-cyan)] uppercase tracking-wide mb-3 border-b border-[rgba(0,240,255,0.2)] pb-1.5">File & Socket (fd.*)</h3>
        
        <div class="relative flex flex-col gap-1 mb-3">
            <label class="text-[0.8rem] text-[var(--text-muted)] font-semibold">Descriptor Path (fd.name)</label>
            <input type="text" bind:value={$filters.fd_name} placeholder="/etc/passwd or .log" class="w-full bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.1)] text-white px-3 py-2 rounded focus:border-[var(--accent-cyan)] focus:shadow-[0_0_0_2px_rgba(0,240,255,0.15)] outline-none font-mono text-sm" />
        </div>

        <div class="relative flex flex-col gap-1 mb-3">
            <label class="text-[0.8rem] text-[var(--text-muted)] font-semibold">IP Address (fd.ip)</label>
            <input type="text" bind:value={$filters.fd_ip} placeholder="192.168.1.1" class="w-full bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.1)] text-white px-3 py-2 rounded focus:border-[var(--accent-cyan)] focus:shadow-[0_0_0_2px_rgba(0,240,255,0.15)] outline-none font-mono text-sm" />
        </div>

        <div class="relative flex flex-col gap-1 mb-3">
            <label class="text-[0.8rem] text-[var(--text-muted)] font-semibold">Port (fd.port)</label>
            <input type="number" bind:value={$filters.fd_port} placeholder="80, 443" class="w-full bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.1)] text-white px-3 py-2 rounded focus:border-[var(--accent-cyan)] focus:shadow-[0_0_0_2px_rgba(0,240,255,0.15)] outline-none font-mono text-sm pr-[60px]" />
            <button class="absolute right-1 top-[22px] bg-[rgba(0,240,255,0.1)] border border-[var(--accent-cyan)] text-[var(--accent-cyan)] px-2 py-1 rounded text-[0.7rem] cursor-pointer hover:bg-[var(--accent-cyan)] hover:text-black transition-colors" onclick={() => triggerLookup('PORTS', 'fd_port', 'port')}>🔍 Seç</button>
        </div>

        <div class="relative flex flex-col gap-1 mb-1">
            <label class="text-[0.8rem] text-[var(--text-muted)] font-semibold">FD Type (fd.type)</label>
            <select bind:value={$filters.fd_type} class="w-full bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.1)] text-white px-3 py-2 rounded focus:border-[var(--accent-cyan)] focus:shadow-[0_0_0_2px_rgba(0,240,255,0.15)] outline-none font-mono text-sm">
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
    <div class="mb-5 bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] rounded-lg p-4">
        <h3 class="text-[0.85rem] text-[var(--accent-cyan)] uppercase tracking-wide mb-3 border-b border-[rgba(0,240,255,0.2)] pb-1.5">Syscall Events (evt.*)</h3>
        
        <div class="relative flex flex-col gap-1 mb-3">
            <label class="text-[0.8rem] text-[var(--text-muted)] font-semibold">Event Type (evt.type)</label>
            <input type="text" bind:value={$filters.evt_type} placeholder="open, read, connect" class="w-full bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.1)] text-white px-3 py-2 rounded focus:border-[var(--accent-cyan)] focus:shadow-[0_0_0_2px_rgba(0,240,255,0.15)] outline-none font-mono text-sm" />
        </div>

        <div class="relative flex flex-col gap-1 mb-1">
            <label class="text-[0.8rem] text-[var(--text-muted)] font-semibold">Direction (evt.dir)</label>
            <select bind:value={$filters.evt_dir} class="w-full bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.1)] text-white px-3 py-2 rounded focus:border-[var(--accent-cyan)] focus:shadow-[0_0_0_2px_rgba(0,240,255,0.15)] outline-none font-mono text-sm">
                <option value="">Both (&lt; &gt;)</option>
                <option value=">">Input Call (&gt;)</option>
                <option value="<">Output Reply (&lt;)</option>
            </select>
        </div>
    </div>

    <!-- User Filters -->
    <div class="mb-5 bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] rounded-lg p-4">
        <h3 class="text-[0.85rem] text-[var(--accent-cyan)] uppercase tracking-wide mb-3 border-b border-[rgba(0,240,255,0.2)] pb-1.5">User & Group</h3>
        
        <div class="relative flex flex-col gap-1 mb-1">
            <label class="text-[0.8rem] text-[var(--text-muted)] font-semibold">User Name (user.name)</label>
            <input type="text" bind:value={$filters.user_name} placeholder="root, drvoid" class="w-full bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.1)] text-white px-3 py-2 rounded focus:border-[var(--accent-cyan)] focus:shadow-[0_0_0_2px_rgba(0,240,255,0.15)] outline-none font-mono text-sm pr-[60px]" />
            <button class="absolute right-1 top-[22px] bg-[rgba(0,240,255,0.1)] border border-[var(--accent-cyan)] text-[var(--accent-cyan)] px-2 py-1 rounded text-[0.7rem] cursor-pointer hover:bg-[var(--accent-cyan)] hover:text-black transition-colors" onclick={() => triggerLookup('USERS', 'user_name', 'user')}>🔍 Seç</button>
        </div>
    </div>

    <!-- Filter Query Monitor -->
    <h3 class="text-[var(--text-muted)] text-[0.8rem] mt-5">GENERATED SYSIDG FILTER</h3>
    <div class="bg-black text-[var(--accent-green)] p-3 rounded-md text-[0.8rem] mt-3 break-all border border-[rgba(0,255,157,0.3)] shadow-[inset_0_0_10px_rgba(0,255,157,0.05)] min-h-[40px] font-mono">
        {#if $filterQuery === ''}
            <span class="text-[var(--text-muted)] italic">No active filters. Capturing all data.</span>
        {:else}
            {$filterQuery}
        {/if}
    </div>
</aside>
