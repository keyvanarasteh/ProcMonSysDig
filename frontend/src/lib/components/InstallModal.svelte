<svelte:options runes={false} />
<script>
    import { setupModalOpen, sysdigVersion, procmonVersion, installLogs } from '../stores.js';
    import { sendWebSocketCommand } from '../websocket.js';

    function close() {
        setupModalOpen.set(false);
    }

    function checkStatus() {
        sendWebSocketCommand({ command: "CHECK_STATUS" });
    }

    function runInstall() {
        installLogs.set([]);
        sendWebSocketCommand({ command: "RUN_INSTALL" });
    }

    // Keyboard support for closing
    function handleKeydown(event) {
        if (event.key === 'Escape') close();
    }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if $setupModalOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="fixed inset-0 bg-[rgba(0,0,0,0.85)] backdrop-blur-md z-[1000] flex items-center justify-center animate-[modalFade_0.3s_ease]" onclick|self={close}>
        <div class="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl w-[800px] max-w-[90%] max-h-[85vh] p-8 relative shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-y-auto">
            <button class="absolute top-6 right-6 bg-transparent border-none text-[var(--text-muted)] text-2xl cursor-pointer hover:text-[var(--accent-red)] hover:scale-110 transition-transform" onclick={close}>×</button>
            <h2 class="text-[var(--text-main)] mb-6 flex items-center gap-3 text-xl font-bold">
                <span class="text-[var(--accent-cyan)]">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </span>
                Setup & Initialization
            </h2>
            
            <div class="mb-6 bg-[rgba(255,255,255,0.02)] p-4 rounded-lg border-l-4 border-l-[var(--accent-cyan)]">
                <h4 class="m-0 mb-3 text-[var(--text-main)] text-[1.05rem] font-bold">Current System Status</h4>
                <div class="flex gap-4">
                    <div class="flex-1 bg-[rgba(0,0,0,0.3)] p-3 rounded border border-[rgba(255,255,255,0.05)]">
                        <div class="text-[var(--text-muted)] text-[0.8rem] mb-1">Sysdig Engine</div>
                        <div class="text-[var(--accent-green)] font-mono font-bold">{$sysdigVersion}</div>
                    </div>
                    <div class="flex-1 bg-[rgba(0,0,0,0.3)] p-3 rounded border border-[rgba(255,255,255,0.05)]">
                        <div class="text-[var(--text-muted)] text-[0.8rem] mb-1">eBPF Procmon Module</div>
                        <div class="text-[var(--accent-cyan)] font-mono font-bold">{$procmonVersion}</div>
                    </div>
                </div>
                <div class="mt-4 flex gap-3">
                    <button class="px-4 py-2 border border-[var(--accent-cyan)] text-[var(--accent-cyan)] bg-transparent rounded font-semibold cursor-pointer transition-colors hover:bg-[rgba(0,240,255,0.1)]" onclick={checkStatus}>Check Status</button>
                    <button class="px-4 py-2 border border-[var(--accent-orange)] text-[var(--accent-orange)] bg-transparent rounded font-semibold cursor-pointer transition-colors hover:bg-[rgba(255,176,58,0.1)]" onclick={runInstall}>Run Installer Script</button>
                </div>
            </div>

            <div class="mb-6 bg-[rgba(255,255,255,0.02)] p-4 rounded-lg border-l-4 border-l-[var(--accent-cyan)]">
                <h4 class="m-0 mb-3 text-[var(--text-main)] text-[1.05rem] font-bold">Installation Logs</h4>
                <pre class="bg-[rgba(0,0,0,0.5)] p-4 rounded border border-[rgba(255,255,255,0.1)] text-[var(--accent-green)] font-mono overflow-auto min-h-[150px] max-h-[300px] text-[0.85rem] m-0">
{#if $installLogs.length === 0}
Waiting for output...
{/if}
{#each $installLogs as log}
{log}
{/each}
                </pre>
            </div>
            
            <div class="mb-0 bg-[rgba(255,255,255,0.02)] p-4 rounded-lg border-l-4 border-l-[var(--accent-cyan)]">
                <h4 class="m-0 mb-3 text-[var(--text-main)] text-[1.05rem] font-bold">Manual Startup Guide</h4>
                <p class="m-0 mb-3 text-[0.9rem] text-[var(--text-muted)] leading-relaxed">
                    This dashboard requires root access to hook into the kernel via eBPF. 
                    Ensure the backend is running with sudo privileges:
                </p>
                <div class="bg-[rgba(0,0,0,0.5)] p-4 rounded border border-[rgba(255,255,255,0.1)] text-[var(--accent-cyan)] font-mono text-[0.85rem] overflow-x-auto">
                    sudo ./run.sh
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    @keyframes modalFade {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>
