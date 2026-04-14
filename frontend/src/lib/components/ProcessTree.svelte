<svelte:options runes={false} />
<script>
    import { treeData, treeAutoRefresh, treeSearchTerm } from '../stores.js';
    import { sendWebSocketCommand } from '../websocket.js';
    import TreeNode from './TreeNode.svelte';
    import { onDestroy } from 'svelte';

    let treeAutoRefreshId = null;
    let expandedMap = {}; 

    $: filtered = computeFilteredTree($treeData, $treeSearchTerm);
    $: childrenMap = buildChildrenMap(filtered);
    $: roots = buildRoots(filtered, childrenMap);
    
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
                
                while (current) {
                    matchedPids.add(current.pid);
                    current = data.find(x => x.pid === current.ppid);
                    if (current && matchedPids.has(current.pid)) break;
                }
            }
        });
        
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

<div style="flex: 1; overflow: hidden; display: flex; flex-direction: column;">
    <div class="tree-toolbar">
        <input type="text" bind:value={$treeSearchTerm} placeholder="🔍 Süreç ara... (isim, PID, kullanıcı)">
        <button class="btn" on:click={loadProcessTree}>⟳ Yenile</button>
        <button class="btn {$treeAutoRefresh ? 'btn-green' : ''}" style="{$treeAutoRefresh ? '' : 'border-color: rgba(255,255,255,0.3); color: var(--text-muted);'}" on:click={toggleTreeAutoRefresh}>
            {$treeAutoRefresh ? '⏸ Durdur' : '▶ Otomatik'}
        </button>
    </div>

    <div class="tree-stats">
        <span>Toplam: <strong>{statTotal}</strong></span>
        <span>Running: <strong>{statRunning}</strong></span>
        <span>Sleeping: <strong>{statSleeping}</strong></span>
        <span>Zombie: <strong>{statZombie}</strong></span>
    </div>

    <div class="tree-scroll-area">
        <div class="tree-header">
            <span class="col-tree">PROCESS (COMMAND)</span>
            <span class="col-pid">PID</span>
            <span class="col-ppid">PPID</span>
            <span class="col-user">USER</span>
            <span class="col-cpu">%CPU</span>
            <span class="col-mem">%MEM</span>
            <span class="col-stat">STAT</span>
            <span class="col-tty">TTY</span>
            <span class="col-start">START</span>
            <span class="col-time">TIME</span>
            <span class="col-cmdline">CMDLINE</span>
        </div>
        <div id="tree-body">
            {#if roots.length === 0}
                <div class="tree-loading">
                    {#if $treeData.length === 0}
                        <div class="spinner"></div> Process Tree yükleniyor...
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
