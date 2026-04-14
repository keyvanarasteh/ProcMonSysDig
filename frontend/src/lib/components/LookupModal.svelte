<svelte:options runes={false} />
<script>
    import { lookupModalOpen, lookupType, lookupTargetInput, lookupDataKey, lookupData, filters, treeData } from '../stores.js';
    import { sendWebSocketCommand } from '../websocket.js';
    import TreeNode from './TreeNode.svelte';

    let searchTerm = '';
    let expandedMap = {};

    $: if ($lookupModalOpen) {
        searchTerm = '';
        expandedMap = {};
        if ($lookupType === 'PROCESSES') {
            sendWebSocketCommand({ command: 'GET_PROCESS_TREE' });
        } else {
            lookupData.set([]);
            sendWebSocketCommand({ command: `GET_${$lookupType}` });
        }
    }

    function close() {
        lookupModalOpen.set(false);
    }

    function handleKeydown(event) {
        if (event.key === 'Escape') close();
    }

    function selectRow(value) {
        const target = $lookupTargetInput;
        if (target) {
            filters.update(f => {
                f[target.replace('f_', '')] = value;
                return f;
            });
        }
        close();
    }

    $: filteredData = $lookupData.filter(row => {
        if (!searchTerm) return true;
        return Object.values(row).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()));
    });

    $: isProcessLookup = $lookupType === 'PROCESSES';
    
    $: lookupFilteredTree = computeFilteredTree($treeData, searchTerm);
    $: childrenMapLookup = buildChildrenMap(lookupFilteredTree);
    $: rootsLookup = buildRoots(lookupFilteredTree, childrenMapLookup);

    function computeFilteredTree(data, term) {
        if (!term) return data;
        const lowercaseTerm = term.toLowerCase();
        const matchedPids = new Set();
        data.forEach(p => {
            if (p.comm.toLowerCase().includes(lowercaseTerm) || p.pid.includes(term) || p.user.toLowerCase().includes(lowercaseTerm)) {
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

</script>

<svelte:window on:keydown={handleKeydown} />

<div class="modal" id="lookupModal" class:active={$lookupModalOpen}>
    <div class="modal-content">
        <button class="close-btn" on:click={close}>×</button>
        <h2>
            <span style="color: var(--accent-cyan); display: flex; align-items: center; margin-right: 12px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </span>
            <span>Seçim: {$lookupType}</span>
        </h2>
        
        <input type="text" bind:value={searchTerm} class="lookup-search" placeholder="Listeyi filtrele...">
        
        <div class="lookup-table-wrap">
            {#if isProcessLookup}
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
                </div>
                <div>
                    {#if rootsLookup.length === 0}
                        <div style="padding: 24px; text-align: center; color: var(--text-muted);">Eşleşen süreç bulunamadı. Bağlantı var mı kontrol edin.</div>
                    {/if}
                    {#each rootsLookup as proc, idx}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <div on:click={() => selectRow($lookupDataKey === 'pid' ? proc.pid : proc.comm)}>
                            <TreeNode 
                                {proc} 
                                depth={0} 
                                ancestorIsLast={[]} 
                                childrenMap={childrenMapLookup} 
                                isLast={idx === rootsLookup.length - 1} 
                                bind:expandedMap
                                {searchTerm} 
                            />
                        </div>
                    {/each}
                </div>
            {:else}
                <table class="lookup-table">
                    <thead>
                        <tr>
                            {#if $lookupData.length > 0}
                                {#each Object.keys($lookupData[0]) as k}
                                    <th>{k}</th>
                                {/each}
                            {/if}
                        </tr>
                    </thead>
                    <tbody>
                        {#if $lookupData.length === 0}
                            <tr>
                                <td colspan="4" style="text-align: center; color: var(--text-muted);">Arka plandan veriler çekiliyor (veya tablo boş)...</td>
                            </tr>
                        {/if}
                        {#each filteredData as rowObj}
                            <tr on:click={() => selectRow(rowObj[$lookupDataKey])}>
                                {#each Object.values(rowObj) as val}
                                    <td>{val}</td>
                                {/each}
                            </tr>
                        {/each}
                    </tbody>
                </table>
            {/if}
        </div>
        
        <p style="text-align: right; color: var(--text-muted); font-size: 0.8rem; margin: 0;">
            {isProcessLookup ? lookupFilteredTree.length : filteredData.length} kayıt gösteriliyor.
        </p>
    </div>
</div>
