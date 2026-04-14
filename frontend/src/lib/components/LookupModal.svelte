<svelte:options runes={false} />
<script>
    import { lookupModalOpen, lookupType, lookupTargetInput, lookupDataKey, lookupData, filters, treeData } from '../stores.js';
    import { sendWebSocketCommand } from '../websocket.js';
    import TreeNode from './TreeNode.svelte';

    let searchTerm = '';
    let expandedMap = {}; // Lookup specific expand map

    // Fetch data if lookup opens
    $: if ($lookupModalOpen) {
        searchTerm = '';
        expandedMap = {};
        if ($lookupType === 'PROCESSES') {
            sendWebSocketCommand({ command: 'GET_PROCESS_TREE' });
            // Uses global treeData
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

    // Generic list filter
    $: filteredData = $lookupData.filter(row => {
        if (!searchTerm) return true;
        return Object.values(row).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()));
    });

    // Process Tree special logic for lookup
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

</script>

<svelte:window on:keydown={handleKeydown} />

{#if $lookupModalOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="fixed inset-0 bg-[rgba(0,0,0,0.85)] backdrop-blur-md z-[1000] flex items-center justify-center animate-[modalFade_0.3s_ease]" onclick|self={close}>
        <div class="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl w-[95vw] max-w-[1600px] h-[85vh] p-6 flex flex-col relative shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <button class="absolute top-6 right-6 bg-transparent border-none text-[var(--text-muted)] text-2xl cursor-pointer hover:text-[var(--accent-red)] hover:scale-110 transition-transform" onclick={close}>×</button>
            <h2 class="text-[var(--text-main)] mb-6 flex items-center gap-3 text-xl font-bold">
                <span class="text-[var(--accent-cyan)]">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </span>
                Select {$lookupType}
            </h2>
            
            <input type="text" bind:value={searchTerm} placeholder="Listeyi filtrele..." class="w-full p-2.5 mb-3 bg-[rgba(0,0,0,0.5)] border border-[var(--accent-cyan)] text-white rounded-md outline-none focus:shadow-[0_0_0_2px_rgba(0,240,255,0.15)] transition-shadow" />
            
            <div class="flex-1 overflow-auto bg-[rgba(13,20,36,0.6)] border border-[var(--border-color)] rounded-lg mb-4">
                {#if isProcessLookup}
                    <!-- Special Process Tree Render -->
                    <div class="flex sticky top-0 bg-[rgba(13,20,36,0.95)] backdrop-blur-md z-10 border-b border-[var(--border-color)] min-w-[1000px]">
                        <span class="px-3 py-3 text-[0.75rem] text-[var(--text-muted)] uppercase tracking-wide font-semibold w-[280px] shrink-0">PROCESS (COMMAND)</span>
                        <span class="px-3 py-3 text-[0.75rem] text-[var(--text-muted)] uppercase tracking-wide font-semibold w-[70px] shrink-0">PID</span>
                        <span class="px-3 py-3 text-[0.75rem] text-[var(--text-muted)] uppercase tracking-wide font-semibold w-[70px] shrink-0">PPID</span>
                        <span class="px-3 py-3 text-[0.75rem] text-[var(--text-muted)] uppercase tracking-wide font-semibold w-[90px] shrink-0">USER</span>
                        <span class="px-3 py-3 text-[0.75rem] text-[var(--text-muted)] uppercase tracking-wide font-semibold w-[70px] shrink-0 text-right">%CPU</span>
                        <span class="px-3 py-3 text-[0.75rem] text-[var(--text-muted)] uppercase tracking-wide font-semibold w-[70px] shrink-0 text-right">%MEM</span>
                        <span class="px-3 py-3 text-[0.75rem] text-[var(--text-muted)] uppercase tracking-wide font-semibold w-[55px] shrink-0 text-center">STAT</span>
                        <span class="px-3 py-3 text-[0.75rem] text-[var(--text-muted)] uppercase tracking-wide font-semibold w-[70px] shrink-0">TTY</span>
                        <span class="px-3 py-3 text-[0.75rem] text-[var(--text-muted)] uppercase tracking-wide font-semibold w-[75px] shrink-0">START</span>
                    </div>
                    <div>
                        {#if rootsLookup.length === 0}
                            <div class="p-6 text-center text-[var(--text-muted)]">Eşleşen süreç bulunamadı. Bağlantı var mı kontrol edin.</div>
                        {/if}
                        {#each rootsLookup as proc, idx}
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <!-- svelte-ignore a11y-no-static-element-interactions -->
                            <div onclick={() => selectRow($lookupDataKey === 'pid' ? proc.pid : proc.comm)} class="cursor-pointer hover:bg-[rgba(0,255,157,0.05)]">
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
                    <!-- Generic Table Render -->
                    <table class="w-full border-collapse text-left">
                        <thead>
                            <tr>
                                {#if $lookupData.length > 0}
                                    {#each Object.keys($lookupData[0]) as k}
                                        <th class="sticky top-0 bg-[rgba(13,20,36,0.95)] backdrop-blur-md text-[var(--text-muted)] text-[0.75rem] uppercase tracking-wide p-3 border-b border-[var(--border-color)] z-10">{k}</th>
                                    {/each}
                                {/if}
                            </tr>
                        </thead>
                        <tbody>
                            {#if $lookupData.length === 0}
                                <tr><td colspan="4" class="text-center p-6 text-[var(--text-muted)]">Arka plandan veriler çekiliyor...</td></tr>
                            {/if}
                            {#each filteredData as rowObj}
                                <tr class="hover:bg-[rgba(0,255,157,0.15)] hover:text-[var(--accent-green)] cursor-pointer transition-colors" onclick={() => selectRow(rowObj[$lookupDataKey])}>
                                    {#each Object.values(rowObj) as val}
                                        <td class="p-2 px-4 border-b border-[rgba(255,255,255,0.03)] font-mono text-[0.85rem]">{val}</td>
                                    {/each}
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                {/if}
            </div>
            
            <p class="text-[0.8rem] text-[var(--text-muted)] text-right m-0">
                {isProcessLookup ? lookupFilteredTree.length : filteredData.length} kayıt gösteriliyor.
            </p>
        </div>
    </div>
{/if}

<style>
    @keyframes modalFade {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>
