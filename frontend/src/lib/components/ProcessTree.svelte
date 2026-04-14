<svelte:options runes={false} />
<script>
    import { treeData, treeAutoRefresh, treeSearchTerm } from '../stores.js';
    import { sendWebSocketCommand } from '../websocket.js';
    import TreeNode from './TreeNode.svelte';
    import { onDestroy } from 'svelte';

    let treeAutoRefreshId = null;
    let expandedMap = {}; // State tracking for tree expansion

    // Reactive computation of filtered & structure tree
    $: filtered = computeFilteredTree($treeData, $treeSearchTerm);
    $: childrenMap = buildChildrenMap(filtered);
    $: roots = buildRoots(filtered, childrenMap);
    
    // Stats
    $: statTotal = $treeData.length;
    $: statRunning = $treeData.filter(p => p.stat && p.stat.startsWith('R')).length;
    $: statSleeping = $treeData.filter(p => p.stat && p.stat.startsWith('S')).length;
    $: statZombie = $treeData.filter(p => p.stat && p.stat.startsWith('Z')).length;

    function computeFilteredTree(data, term) {
        if (!term) return data;
        const lowercaseTerm = term.toLowerCase();
        const matchedPids = new Set();
        
        data.forEach(p => {
            if (p.comm.toLowerCase().includes(lowercaseTerm) ||
                p.pid.includes(term) ||
                p.user.toLowerCase().includes(lowercaseTerm) ||
                (p.cmdline && p.cmdline.toLowerCase().includes(lowercaseTerm))) {
                
                matchedPids.add(p.pid);
                let current = p;
                
                // Add ancestors
                while (current) {
                    matchedPids.add(current.pid);
                    current = data.find(x => x.pid === current.ppid);
                    if (current && matchedPids.has(current.pid)) break;
                }
            }
        });
        
        // Auto expand all when searching
        data.forEach(p => { expandedMap[p.pid] = true; });
        return data.filter(p => matchedPids.has(p.pid));
    }

    function buildChildrenMap(filteredData) {
        const map = {};
        for (const p of filteredData) {
            if (!map[p.ppid]) map[p.ppid] = [];
            map[p.ppid].push(p);
        }
        return map;
    }

    function buildRoots(filteredData, map) {
        const pidSet = new Set(filteredData.map(p => p.pid));
        const rootNodes = filteredData.filter(p => !pidSet.has(p.ppid) || p.ppid === '0');
        return rootNodes.sort((a,b) => parseInt(a.pid) - parseInt(b.pid));
    }

    function loadProcessTree() {
        sendWebSocketCommand({ command: 'GET_PROCESS_TREE' });
    }

    function toggleTreeAutoRefresh() {
        if (treeAutoRefreshId) {
            clearInterval(treeAutoRefreshId);
            treeAutoRefreshId = null;
            treeAutoRefresh.set(false);
        } else {
            treeAutoRefreshId = setInterval(loadProcessTree, 3000);
            treeAutoRefresh.set(true);
        }
    }

    onDestroy(() => {
        if (treeAutoRefreshId) clearInterval(treeAutoRefreshId);
    });
</script>

<div class="flex-1 overflow-hidden flex flex-col">
    <div class="flex items-center gap-3 mb-3">
        <input type="text" bind:value={$treeSearchTerm} placeholder="🔍 Süreç ara... (isim, PID, kullanıcı)" class="flex-1 bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.1)] text-white px-4 py-2.5 rounded-md font-sans text-[0.85rem] outline-none focus:border-[var(--accent-cyan)] focus:shadow-[0_0_0_2px_rgba(0,240,255,0.15)] transition-colors" />
        <button class="bg-transparent border border-[var(--accent-cyan)] text-[var(--accent-cyan)] px-4 py-2.5 rounded-md font-semibold font-sans hover:bg-[rgba(0,240,255,0.1)] transition-all cursor-pointer whitespace-nowrap" on:click={loadProcessTree}>⟳ Yenile</button>
        <button class="bg-transparent border px-4 py-2.5 rounded-md font-semibold font-sans transition-all cursor-pointer whitespace-nowrap {$treeAutoRefresh ? 'border-[var(--accent-green)] text-[var(--accent-green)]' : 'border-[rgba(255,255,255,0.3)] text-[var(--text-muted)] hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]'}" on:click={toggleTreeAutoRefresh}>
            {$treeAutoRefresh ? '⏸ Durdur' : '▶ Otomatik'}
        </button>
    </div>

    <div class="flex gap-4 text-[0.75rem] text-[var(--text-muted)] py-2">
        <span>Toplam: <strong class="text-[var(--accent-cyan)]">{statTotal}</strong></span>
        <span>Running: <strong class="text-[var(--accent-cyan)]">{statRunning}</strong></span>
        <span>Sleeping: <strong class="text-[var(--accent-cyan)]">{statSleeping}</strong></span>
        <span>Zombie: <strong class="text-[var(--accent-cyan)]">{statZombie}</strong></span>
    </div>

    <div class="flex-1 overflow-auto rounded-lg bg-[rgba(0,0,0,0.3)] border border-[var(--border-color)]">
        <div class="flex sticky top-0 bg-[rgba(13,20,36,0.95)] backdrop-blur-md z-10 border-b border-[var(--border-color)] min-w-[1400px]">
            <span class="px-2 py-2.5 text-[0.7rem] text-[var(--text-muted)] uppercase tracking-wide font-semibold w-[280px] shrink-0">PROCESS (COMMAND)</span>
            <span class="px-2 py-2.5 text-[0.7rem] text-[var(--text-muted)] uppercase tracking-wide font-semibold w-[70px] shrink-0">PID</span>
            <span class="px-2 py-2.5 text-[0.7rem] text-[var(--text-muted)] uppercase tracking-wide font-semibold w-[70px] shrink-0">PPID</span>
            <span class="px-2 py-2.5 text-[0.7rem] text-[var(--text-muted)] uppercase tracking-wide font-semibold w-[90px] shrink-0">USER</span>
            <span class="px-2 py-2.5 text-[0.7rem] text-[var(--text-muted)] uppercase tracking-wide font-semibold w-[70px] shrink-0 text-right">%CPU</span>
            <span class="px-2 py-2.5 text-[0.7rem] text-[var(--text-muted)] uppercase tracking-wide font-semibold w-[70px] shrink-0 text-right">%MEM</span>
            <span class="px-2 py-2.5 text-[0.7rem] text-[var(--text-muted)] uppercase tracking-wide font-semibold w-[55px] shrink-0 text-center">STAT</span>
            <span class="px-2 py-2.5 text-[0.7rem] text-[var(--text-muted)] uppercase tracking-wide font-semibold w-[70px] shrink-0">TTY</span>
            <span class="px-2 py-2.5 text-[0.7rem] text-[var(--text-muted)] uppercase tracking-wide font-semibold w-[75px] shrink-0">START</span>
            <span class="px-2 py-2.5 text-[0.7rem] text-[var(--text-muted)] uppercase tracking-wide font-semibold w-[80px] shrink-0">TIME</span>
            <span class="px-2 py-2.5 text-[0.7rem] text-[var(--text-muted)] uppercase tracking-wide font-semibold flex-1 min-w-[250px]">CMDLINE</span>
        </div>

        <div>
            {#if roots.length === 0}
                <div class="flex items-center justify-center p-[60px] text-[var(--text-muted)] text-[0.9rem] gap-3">
                    {#if $treeData.length === 0}
                        <div class="w-5 h-5 border-2 border-[rgba(0,240,255,0.1)] border-t-[var(--accent-cyan)] rounded-full animate-spin"></div>
                        Process Tree yükleniyor...
                    {:else}
                        Eşleşen süreç bulunamadı.
                    {/if}
                </div>
            {:else}
                {#each roots as proc, idx}
                    <TreeNode 
                        {proc} 
                        depth={0} 
                        ancestorIsLast={[]} 
                        childrenMap={childrenMap} 
                        isLast={idx === roots.length - 1} 
                        bind:expandedMap
                        searchTerm={$treeSearchTerm} 
                    />
                {/each}
            {/if}
        </div>
    </div>
</div>
