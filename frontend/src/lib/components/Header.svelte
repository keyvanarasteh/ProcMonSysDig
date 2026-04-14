<svelte:options runes={false} />
<script>
    import { isCapturing, connStatus, setupModalOpen } from '../stores.js';
    import { sendWebSocketCommand } from '../websocket.js';

    function toggleCapture() {
        if ($isCapturing) {
            sendWebSocketCommand({ command: 'STOP' });
            isCapturing.set(false);
        } else {
            import('../stores.js').then(({ filterQuery }) => {
                filterQuery.subscribe(q => {
                    sendWebSocketCommand({ command: 'START', filter: q });
                })();
            });
            isCapturing.set(true);
        }
    }
</script>

<header>
    <div class="logo">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
        </svg>
        System<span>Inspector</span>
    </div>
    
    <div class="header-controls">
        <button class="btn" on:click={() => setupModalOpen.set(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            Installation & Setup
        </button>
        <div class="status-badge" id="conn-status">
            <span class="dot {$connStatus === 'Connected' ? 'connected' : ''}" id="conn-indicator"></span>
            Socket: {$connStatus}
        </div>
        <button class="btn {$isCapturing ? '' : 'btn-green'}" style="{$isCapturing ? 'border-color: var(--accent-red); color: var(--accent-red);' : ''}" id="btn-toggle" on:click={toggleCapture}>
            {$isCapturing ? 'Stop Capture' : 'Start Capture'}
        </button>
    </div>
</header>
