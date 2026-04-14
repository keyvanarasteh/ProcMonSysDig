<svelte:options runes={false} />
<script>
    import { activeTab } from '../stores.js';
    import { sendWebSocketCommand } from '../websocket.js';

    function setTab(tabName) {
        activeTab.set(tabName);
        if (tabName === 'tree') {
            sendWebSocketCommand({ command: 'GET_PROCESS_TREE' });
        }
    }
</script>

<div class="flex gap-1 mb-4 bg-[rgba(0,0,0,0.3)] p-1 rounded-lg border border-[rgba(255,255,255,0.05)] w-full">
    <button 
        class="flex-1 py-2.5 px-5 bg-transparent border-none text-[var(--text-muted)] font-semibold text-[0.85rem] cursor-pointer rounded-md transition-all flex items-center justify-center gap-2 hover:text-[var(--text-main)] hover:bg-[rgba(255,255,255,0.03)] {$activeTab === 'events' ? 'bg-[rgba(0,240,255,0.1)] !text-[var(--accent-cyan)] shadow-[0_0_12px_rgba(0,240,255,0.15)] outline outline-1 outline-[rgba(0,240,255,0.25)] hover:!bg-[rgba(0,240,255,0.1)] hover:!text-[var(--accent-cyan)]' : ''}" 
        on:click={() => setTab('events')}
    >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
        </svg>
        Event Table
    </button>
    <button 
        class="flex-1 py-2.5 px-5 bg-transparent border-none text-[var(--text-muted)] font-semibold text-[0.85rem] cursor-pointer rounded-md transition-all flex items-center justify-center gap-2 hover:text-[var(--text-main)] hover:bg-[rgba(255,255,255,0.03)] {$activeTab === 'tree' ? 'bg-[rgba(0,240,255,0.1)] !text-[var(--accent-cyan)] shadow-[0_0_12px_rgba(0,240,255,0.15)] outline outline-1 outline-[rgba(0,240,255,0.25)] hover:!bg-[rgba(0,240,255,0.1)] hover:!text-[var(--accent-cyan)]' : ''}" 
        on:click={() => setTab('tree')}
    >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="5" r="3"></circle>
            <line x1="12" y1="8" x2="12" y2="14"></line>
            <line x1="6" y1="18" x2="12" y2="14"></line>
            <line x1="18" y1="18" x2="12" y2="14"></line>
            <circle cx="6" cy="19" r="2"></circle>
            <circle cx="18" cy="19" r="2"></circle>
        </svg>
        Process Tree
    </button>
</div>
