<script>
    import { isCapturing, connStatus, setupModalOpen } from '../stores.js';
    import { sendWebSocketCommand } from '../websocket.js';

    function toggleCapture() {
        if ($isCapturing) {
            sendWebSocketCommand({ command: 'STOP' });
            isCapturing.set(false);
        } else {
            // Active filters will be compiled and sent here or handled in the store
            import('../stores.js').then(({ filterQuery }) => {
                filterQuery.subscribe(q => {
                    sendWebSocketCommand({ command: 'START', filter: q });
                })(); // Run once correctly by getting the value
            });
            isCapturing.set(true);
        }
    }
</script>

<header class="flex justify-between items-center px-8 py-4 border-b border-[rgba(0,240,255,0.15)] bg-[rgba(5,11,20,0.8)] z-10 w-full">
    <div class="flex items-center gap-3 text-2xl font-extrabold tracking-wide text-[var(--text-main)]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
        </svg>
        <span>System<span class="text-[var(--accent-cyan)] shadow-[0_0_10px_rgba(0,240,255,0.4)]">Inspector</span></span>
    </div>
    
    <div class="flex items-center gap-5">
        <button class="bg-transparent border border-[var(--accent-cyan)] text-[var(--accent-cyan)] px-4 py-2 rounded-md font-semibold font-sans flex items-center gap-2 hover:bg-[rgba(0,240,255,0.1)] hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all cursor-pointer" on:click={() => setupModalOpen.set(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            Installation & Setup
        </button>
        
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold bg-[rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.1)]">
            <span class="w-2.5 h-2.5 rounded-full shadow-[0_0_8px] transition-colors duration-300 md {$connStatus === 'Connected' ? 'bg-[var(--accent-green)] shadow-[var(--accent-green)]' : 'bg-[var(--accent-red)] shadow-[var(--accent-red)]'}"></span>
            Socket: {$connStatus}
        </div>
        
        <button class="px-4 py-2 rounded-md font-semibold font-sans flex items-center gap-2 transition-all cursor-pointer border bg-transparent 
            {$isCapturing ? 'border-[var(--accent-red)] text-[var(--accent-red)] hover:bg-[rgba(255,42,95,0.1)] hover:shadow-[0_0_15px_rgba(255,42,95,0.3)]' 
                          : 'border-[var(--accent-green)] text-[var(--accent-green)] hover:bg-[rgba(0,255,157,0.1)] hover:shadow-[0_0_15px_rgba(0,255,157,0.3)]'}" 
            on:click={toggleCapture}>
            {$isCapturing ? 'Stop Capture' : 'Start Capture'}
        </button>
    </div>
</header>
