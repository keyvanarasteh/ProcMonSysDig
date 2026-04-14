<svelte:options runes={false} />
<script>
    import { eventDetailModalOpen, selectedEvent, treeData } from '../stores.js';

    function closeModal() {
        eventDetailModalOpen.set(false);
    }
    
    // Subscribe to selectedEvent directly
    $: ev = $selectedEvent || {};
    $: procInfo = $treeData.find(p => p.pid === String(ev.proc_pid));
    $: parentInfo = $treeData.find(p => p.pid === String(ev.proc_ppid));

    // Keyboard support for closing modal
    function handleKeydown(event) {
        if (event.key === 'Escape') {
            closeModal();
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if $eventDetailModalOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="fixed inset-0 bg-[rgba(0,0,0,0.85)] backdrop-blur-md z-[1000] flex items-center justify-center animate-[modalFade_0.3s_ease]" on:click|self={closeModal}>
        <div class="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl w-[90vw] max-w-[1000px] max-h-[90vh] p-8 relative shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-y-auto">
            <button class="absolute top-6 right-6 bg-transparent border-none text-[var(--text-muted)] text-2xl cursor-pointer hover:text-[var(--accent-red)] hover:scale-110 transition-transform" on:click={closeModal}>×</button>
            <h2 class="text-[var(--text-main)] mb-6 flex items-center gap-3 text-xl font-bold">
                <span class="text-[var(--accent-cyan)]">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </span>
                Detailed Event Info
            </h2>
            
            <div class="text-[var(--text-main)] text-[0.9rem]">
                <!-- System Event Data -->
                <div class="flex gap-5 mb-5">
                    <div class="flex-1 bg-[rgba(0,255,157,0.05)] border border-[rgba(0,255,157,0.2)] p-5 rounded-lg">
                        <h4 class="text-[var(--accent-green)] m-0 mb-4 flex items-center gap-2 font-bold text-[1rem]">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> 
                            System Event Data
                        </h4>
                        <div class="grid grid-cols-[130px_1fr] gap-3 text-[0.95rem]">
                            <span class="text-[var(--text-muted)] font-semibold">Syscall:</span> 
                            <strong class="text-[var(--text-main)] text-[1.1rem] capitalize">{ev.evt_type}</strong>
                            
                            <span class="text-[var(--text-muted)] font-semibold">Direction:</span> 
                            <strong class="font-mono">
                                {#if ev.evt_dir === '>'}
                                    <span class="text-[var(--accent-cyan)]">Input (&gt;)</span>
                                {:else}
                                    <span class="text-[var(--accent-green)]">Output (&lt;)</span>
                                {/if}
                            </strong>
                            
                            <span class="text-[var(--text-muted)] font-semibold">Result:</span> 
                            <strong class="font-mono {String(ev.res).includes('ENOENT') ? 'text-[var(--accent-red)]' : 'text-[var(--accent-green)]'}">{ev.res}</strong>
                            
                            <span class="text-[var(--text-muted)] font-semibold">Resource:</span> 
                            <span class="font-mono break-all text-[var(--accent-cyan)]">{ev.fd_name || '-'}</span>
                            
                            <span class="text-[var(--text-muted)] font-semibold">Arguments:</span> 
                            <div class="font-mono bg-[rgba(0,0,0,0.4)] p-3 rounded-md max-h-[120px] overflow-y-auto border border-[rgba(255,255,255,0.05)]">{ev.evt_args || '-'}</div>
                        </div>
                    </div>
                </div>

                <!-- Process & Parent Info -->
                <div class="flex flex-col md:flex-row gap-5">
                    <!-- Process Info -->
                    <div class="flex-1 bg-[rgba(0,240,255,0.05)] border border-[rgba(0,240,255,0.2)] p-5 rounded-lg">
                        <h4 class="text-[var(--accent-cyan)] m-0 mb-4 flex items-center gap-2 font-bold text-[1rem]">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line></svg> 
                            Process Info (PID: {ev.proc_pid})
                        </h4>
                        <div class="grid grid-cols-[100px_1fr] gap-2.5 text-[0.9rem]">
                            <span class="text-[var(--text-muted)] font-semibold">Exec Name:</span> 
                            <strong class="text-[var(--text-main)] text-[1.05rem]">{ev.proc_name}</strong>
                            
                            <span class="text-[var(--text-muted)] font-semibold">User:</span> 
                            <strong>{ev.user_name}</strong>

                            {#if procInfo}
                                <span class="text-[var(--text-muted)] font-semibold">Status:</span> 
                                <strong><span class="text-[0.7rem] px-1.5 py-0.5 rounded-[3px] font-semibold bg-[rgba(0,255,157,0.15)] text-[var(--accent-green)]">{procInfo.stat}</span></strong>
                                
                                <span class="text-[var(--text-muted)] font-semibold">Usage:</span> 
                                <strong><span class="text-[var(--accent-cyan)]">CPU:</span> {procInfo.cpu}%  /  <span class="text-[var(--accent-cyan)]">MEM:</span> {procInfo.mem}%</strong>
                                
                                <span class="text-[var(--text-muted)] font-semibold">Start Time:</span> 
                                <strong>{procInfo.start}</strong>
                                
                                <span class="text-[var(--text-muted)] font-semibold">Time spent:</span> 
                                <strong>{procInfo.time}</strong>
                                
                                <span class="text-[var(--text-muted)] font-semibold">Cmdline:</span> 
                                <span class="font-mono bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.05)] p-2.5 rounded-md break-all text-xs">{procInfo.cmdline}</span>
                            {:else}
                                <span class="col-span-2 text-[var(--accent-orange)] italic text-[0.85rem] mt-2 p-2 bg-[rgba(255,176,58,0.1)] rounded">
                                    Arka planda süreç metadatası yok (Ölü bir süreç veya henüz tarama bitmedi). Event bilgisiyle yetinildi.
                                </span>
                            {/if}
                        </div>
                    </div>

                    <!-- Parent Info -->
                    <div class="flex-1 bg-[rgba(255,176,58,0.05)] border border-[rgba(255,176,58,0.2)] p-5 rounded-lg">
                        <h4 class="text-[var(--accent-orange)] m-0 mb-4 flex items-center gap-2 font-bold text-[1rem]">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg> 
                            Parent Info (PPID: {ev.proc_ppid})
                        </h4>
                        <div class="grid grid-cols-[100px_1fr] gap-2.5 text-[0.9rem]">
                            {#if parentInfo}
                                <span class="text-[var(--text-muted)] font-semibold">Exec Name:</span> 
                                <strong class="text-[var(--text-main)] text-[1.05rem]">{parentInfo.comm}</strong>
                                
                                <span class="text-[var(--text-muted)] font-semibold">User:</span> 
                                <strong>{parentInfo.user}</strong>
                                
                                <span class="text-[var(--text-muted)] font-semibold">Status:</span> 
                                <strong><span class="text-[0.7rem] px-1.5 py-0.5 rounded-[3px] font-semibold bg-[rgba(255,176,58,0.15)] text-[var(--accent-orange)]">{parentInfo.stat}</span></strong>
                                
                                <span class="text-[var(--text-muted)] font-semibold">Usage:</span> 
                                <strong><span class="text-[var(--accent-orange)]">CPU:</span> {parentInfo.cpu}%  /  <span class="text-[var(--accent-orange)]">MEM:</span> {parentInfo.mem}%</strong>
                                
                                <span class="text-[var(--text-muted)] font-semibold">Start Time:</span> 
                                <strong>{parentInfo.start}</strong>
                                
                                <span class="text-[var(--text-muted)] font-semibold">Cmdline:</span> 
                                <span class="font-mono bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.05)] p-2.5 rounded-md break-all text-xs">{parentInfo.cmdline}</span>
                            {:else}
                                <span class="col-span-2 text-[var(--text-muted)] italic">
                                    Ağaçta parent süreç yakalanamadı ({ev.proc_ppid}).
                                </span>
                            {/if}
                        </div>
                    </div>
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
