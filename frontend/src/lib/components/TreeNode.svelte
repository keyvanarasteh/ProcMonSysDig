<svelte:options runes={false} />
<script>
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    export let proc;
    export let depth = 0;
    export let ancestorIsLast = [];
    export let childrenMap = {};
    export let isLast = false;
    export let searchTerm = '';
    export let expandedMap = {}; // passed from parent or globally

    // Calculate usage
    $: cpuVal = parseFloat(proc.cpu) || 0;
    $: memVal = parseFloat(proc.mem) || 0;
    $: cpuClass = cpuVal >= 50 ? 'text-[var(--accent-red)]' : (cpuVal >= 10 ? 'text-[var(--accent-orange)]' : 'text-[var(--accent-green)]');
    $: memClass = memVal >= 50 ? 'text-[var(--accent-red)]' : (memVal >= 10 ? 'text-[var(--accent-orange)]' : 'text-[var(--accent-green)]');

    $: children = childrenMap[proc.pid] || [];
    $: hasChildren = children.length > 0;
    
    $: {
        if (children.length > 0) {
            children.sort((a,b) => parseInt(a.pid) - parseInt(b.pid));
        }
    }

    // Default expand state
    $: if (expandedMap[proc.pid] === undefined) {
        expandedMap[proc.pid] = depth < 2;
    }
    $: expanded = expandedMap[proc.pid];

    function toggleNode() {
        expandedMap[proc.pid] = !expandedMap[proc.pid];
        expandedMap = expandedMap; // trigger reactivity
    }

    // Tree name color coding
    $: isRootProc = proc.user === 'root' && proc.pid === '1';
    $: isKernel = proc.pid === '2' || proc.comm.startsWith('k');

    // Stat badge
    $: statChar = proc.stat ? proc.stat.charAt(0) : '?';
    $: statClass = getStatClass(statChar);

    function getStatClass(char) {
        if (char === 'R') return 'bg-[rgba(0,255,157,0.15)] text-[var(--accent-green)]';
        if (char === 'S') return 'bg-[rgba(0,240,255,0.1)] text-[var(--accent-cyan)]';
        if (char === 'Z') return 'bg-[rgba(255,42,95,0.15)] text-[var(--accent-red)]';
        if (char === 'D') return 'bg-[rgba(255,176,58,0.15)] text-[var(--accent-orange)]';
        return 'bg-[rgba(148,163,184,0.15)] text-[var(--text-muted)]';
    }

</script>

<div class="flex items-center min-h-[32px] border-b border-[rgba(255,255,255,0.02)] relative transition-colors duration-150 hover:bg-[rgba(0,240,255,0.04)] min-w-[1400px]">
    <div class="px-2 py-1.5 text-[0.8rem] font-mono whitespace-nowrap overflow-hidden text-ellipsis text-[var(--text-main)] w-[280px] shrink-0 flex items-center">
        <div class="inline-flex items-center">
            {#each Array(depth) as _, i}
                <span class="w-5 h-8 relative inline-block">
                    {#if i < depth - 1}
                        <span class="absolute left-[9px] top-0 bottom-0 w-[1px] bg-[rgba(0,240,255,0.15)] {ancestorIsLast[i] ? 'hidden' : 'block'}"></span>
                    {:else}
                        <span class="absolute left-[9px] top-0 {isLast ? 'h-[50%]' : 'bottom-0'} w-[1px] bg-[rgba(0,240,255,0.15)]"></span>
                        <span class="absolute left-[9px] top-[50%] w-[10px] h-[1px] bg-[rgba(0,240,255,0.15)]"></span>
                    {/if}
                </span>
            {/each}
        </div>
        
        {#if hasChildren}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <span class="w-[18px] h-[18px] inline-flex items-center justify-center cursor-pointer text-[0.7rem] text-[var(--accent-cyan)] bg-[rgba(0,240,255,0.08)] border border-[rgba(0,240,255,0.2)] rounded mr-1.5 transition-all shrink-0 hover:bg-[rgba(0,240,255,0.2)] hover:scale-110" on:click={toggleNode}>
                {expanded ? '▼' : '▶'}
            </span>
        {:else}
            <span class="w-[18px] h-[18px] inline-flex items-center justify-center text-[0.7rem] bg-transparent border-transparent text-[rgba(0,240,255,0.3)] mr-1.5 shrink-0 cursor-default">·</span>
        {/if}

        <span class="font-semibold {isRootProc ? 'text-[var(--accent-orange)]' : isKernel ? 'text-[var(--text-muted)] italic' : 'text-[var(--text-main)]'}">{proc.comm}</span>
        
        {#if hasChildren}
            <span class="text-[0.65rem] bg-[rgba(0,240,255,0.1)] text-[var(--accent-cyan)] px-1.5 py-[1px] rounded-full ml-1.5">{children.length}</span>
        {/if}
    </div>
    
    <div class="px-2 py-1.5 text-[0.8rem] font-mono whitespace-nowrap overflow-hidden text-ellipsis text-[var(--text-muted)] w-[70px] shrink-0">{proc.pid}</div>
    <div class="px-2 py-1.5 text-[0.8rem] font-mono whitespace-nowrap overflow-hidden text-ellipsis text-[var(--text-muted)] w-[70px] shrink-0">{proc.ppid}</div>
    <div class="px-2 py-1.5 text-[0.8rem] font-mono whitespace-nowrap overflow-hidden text-ellipsis text-[var(--text-main)] w-[90px] shrink-0">{proc.user}</div>
    <div class="px-2 py-1.5 text-[0.8rem] font-mono whitespace-nowrap overflow-hidden text-ellipsis w-[70px] shrink-0 text-right {cpuClass}">{proc.cpu}</div>
    <div class="px-2 py-1.5 text-[0.8rem] font-mono whitespace-nowrap overflow-hidden text-ellipsis w-[70px] shrink-0 text-right {memClass}">{proc.mem}</div>
    <div class="px-2 py-1.5 text-[0.8rem] font-mono whitespace-nowrap overflow-hidden text-ellipsis w-[55px] shrink-0 text-center"><span class="text-[0.7rem] px-1.5 py-[1px] rounded-[3px] font-semibold {statClass}">{proc.stat}</span></div>
    <div class="px-2 py-1.5 text-[0.8rem] font-mono whitespace-nowrap overflow-hidden text-ellipsis text-[var(--text-muted)] w-[70px] shrink-0">{proc.tty === '?' ? '—' : proc.tty}</div>
    <div class="px-2 py-1.5 text-[0.8rem] font-mono whitespace-nowrap overflow-hidden text-ellipsis text-[var(--text-muted)] w-[75px] shrink-0">{proc.start}</div>
    <div class="px-2 py-1.5 text-[0.8rem] font-mono whitespace-nowrap overflow-hidden text-ellipsis text-[var(--text-muted)] w-[80px] shrink-0">{proc.time}</div>
    <div class="px-2 py-1.5 text-[0.8rem] font-mono whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-[250px]" title="{proc.cmdline}">{proc.cmdline}</div>
</div>

{#if hasChildren && expanded}
    {#each children as child, idx}
        <svelte:self 
            proc={child} 
            depth={depth + 1} 
            ancestorIsLast={[...ancestorIsLast, isLast]} 
            childrenMap={childrenMap} 
            isLast={idx === children.length - 1} 
            bind:expandedMap
            searchTerm={searchTerm} 
        />
    {/each}
{/if}
