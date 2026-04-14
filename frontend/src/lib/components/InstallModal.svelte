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

    function handleKeydown(event) {
        if (event.key === 'Escape') close();
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="modal" id="setupModal" class:active={$setupModalOpen}>
    <div class="modal-content">
        <button class="close-btn" on:click={close}>×</button>
        <h2>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 12px; color: var(--accent-cyan);"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span>Kurulum ve Sistem Yönetimi</span>
        </h2>
        
        <div class="setup-instruction">
            <h4>Mevcut Sistem Durumu</h4>
            <div style="display: flex; gap: 20px; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; margin-bottom: 20px;">
                <div style="flex: 1; min-width: 0; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">Sysdig Engine</div>
                    <div style="color: var(--accent-green); white-space: pre-wrap; font-weight: bold;">{$sysdigVersion}</div>
                </div>
                <div style="flex: 1; min-width: 0; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">eBPF Procmon Module</div>
                    <div style="color: var(--accent-cyan); white-space: pre-wrap; font-weight: bold;">{$procmonVersion}</div>
                </div>
            </div>
            <div style="display: flex; gap: 12px;">
                <button class="btn btn-green" on:click={checkStatus}>Durumu Sorgula</button>
                <button class="btn" style="border-color: var(--accent-orange); color: var(--accent-orange);" on:click={runInstall}>Otomatik Kurulum Başlat</button>
            </div>
        </div>

        <div class="setup-instruction">
            <h4>Kurulum Çıktıları (Logs)</h4>
            <pre style="max-height: 200px;">
{#if $installLogs.length === 0}
Çıktı bekleniyor... İşlem başlattığınızda burada görünecektir.
{/if}
{#each $installLogs as log}
{log}
{/each}
            </pre>
        </div>
        
        <div class="setup-instruction">
            <h4>Manuel Başlatma</h4>
            <p>Eğer socket arayüzde çalışmıyorsa yetkiyle backend'i başlatın:</p>
            <pre>sudo ./run.sh</pre>
        </div>

    </div>
</div>
