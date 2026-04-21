<svelte:options runes={false} />
<script>
    import { activeTab } from '../stores.js';
    import { sendWebSocketCommand } from '../websocket.js';

    function setTab(tabName) {
        activeTab.set(tabName);
        if (tabName === 'tree') {
            sendWebSocketCommand({ command: 'GET_PROCESS_TREE' });
        }
        if (tabName === 'graph') {
            sendWebSocketCommand({ command: 'GET_GRAPH_DATA' });
        }
    }
</script>

<div class="tab-bar">
    <button class="tab-btn {$activeTab === 'events' ? 'active' : ''}" on:click={() => setTab('events')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
        </svg>
        Event Table
    </button>
    <button class="tab-btn {$activeTab === 'tree' ? 'active' : ''}" on:click={() => setTab('tree')}>
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
    <button class="tab-btn {$activeTab === 'graph' ? 'active' : ''}" on:click={() => setTab('graph')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="6" cy="6" r="3"></circle>
            <circle cx="18" cy="6" r="3"></circle>
            <circle cx="12" cy="18" r="3"></circle>
            <line x1="8.5" y1="7.5" x2="10.5" y2="16"></line>
            <line x1="15.5" y1="7.5" x2="13.5" y2="16"></line>
            <line x1="9" y1="6" x2="15" y2="6"></line>
        </svg>
        Graph View
    </button>
</div>
