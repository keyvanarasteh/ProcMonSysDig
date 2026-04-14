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
    export let expandedMap = {};

    $: cpuVal = parseFloat(proc.cpu) || 0;
    $: memVal = parseFloat(proc.mem) || 0;
    $: cpuClass = cpuVal >= 50 ? 'usage-high' : (cpuVal >= 10 ? 'usage-mid' : 'usage-low');
    $: memClass = memVal >= 50 ? 'usage-high' : (memVal >= 10 ? 'usage-mid' : 'usage-low');

    $: children = childrenMap[proc.pid] || [];
    $: hasChildren = children.length > 0;
    
    $: {
        if (children.length > 0) {
            children.sort((a,b) => parseInt(a.pid) - parseInt(b.pid));
        }
    }

    $: if (expandedMap[proc.pid] === undefined) {
        expandedMap[proc.pid] = depth < 2;
    }
    $: expanded = expandedMap[proc.pid];

    function toggleNode() {
        expandedMap[proc.pid] = !expandedMap[proc.pid];
        expandedMap = expandedMap; 
    }

    $: isRootProc = proc.user === 'root' && proc.pid === '1';
    $: isKernel = proc.pid === '2' || proc.comm.startsWith('k');

    $: statChar = proc.stat ? proc.stat.charAt(0) : '?';
</script>

<div class="tree-node">
    <div class="tree-cell col-tree flex" style="display: flex; align-items: center;">
        <span class="tree-indent">
            {#each Array(depth) as _, i}
                <span class="tree-indent-unit {ancestorIsLast[i] ? '' : 'line'}">
                    {#if i === depth - 1}
                        <span class="tree-indent-unit {isLast ? 'last-branch' : 'branch'}" style="position:absolute; left:0;"></span>
                    {/if}
                </span>
            {/each}
        </span>
        
        {#if hasChildren}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <span class="tree-toggle" on:click={toggleNode}>
                {expanded ? '▼' : '▶'}
            </span>
        {:else}
            <span class="tree-toggle leaf">·</span>
        {/if}

        <span class="tree-proc-name {isRootProc ? 'root-proc' : isKernel ? 'kernel-proc' : ''}">{proc.comm}</span>
        
        {#if hasChildren}
            <span class="tree-count-badge">{children.length}</span>
        {/if}
    </div>
    
    <div class="tree-cell col-pid" style="color: var(--text-muted);">{proc.pid}</div>
    <div class="tree-cell col-ppid" style="color: var(--text-muted);">{proc.ppid}</div>
    <div class="tree-cell col-user">{proc.user}</div>
    <div class="tree-cell col-cpu {cpuClass}">{proc.cpu}</div>
    <div class="tree-cell col-mem {memClass}">{proc.mem}</div>
    <div class="tree-cell col-stat"><span class="stat-badge stat-{statChar}">{proc.stat}</span></div>
    <div class="tree-cell col-tty" style="color: var(--text-muted);">{proc.tty === '?' ? '—' : proc.tty}</div>
    <div class="tree-cell col-start" style="color: var(--text-muted);">{proc.start}</div>
    <div class="tree-cell col-time" style="color: var(--text-muted);">{proc.time}</div>
    <div class="tree-cell col-cmdline" title="{proc.cmdline}">{proc.cmdline}</div>
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
