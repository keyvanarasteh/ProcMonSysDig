<svelte:options runes={false} />
<script>
    import { eventDetailModalOpen, selectedEvent, treeData } from '../stores.js';
    import TreeNode from './TreeNode.svelte';

    $: ev = $selectedEvent || {};
    $: procInfo = $treeData.find(p => p.pid === String(ev.proc_pid));
    $: parentInfo = $treeData.find(p => p.pid === String(ev.proc_ppid));

    // For mock rendering in modal since we don't want to parse full children map again uniquely here
    // Just a basic visual render of the target node and its parent.
    function closeModal() {
        eventDetailModalOpen.set(false);
    }

    function handleKeydown(event) {
        if (event.key === 'Escape') closeModal();
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="modal" id="eventDetailModal" class:active={$eventDetailModalOpen}>
    <div class="modal-content" style="max-width: 1000px; padding: 32px;">
        <button class="close-btn" on:click={closeModal}>×</button>
        <h2 style="margin-bottom: 24px;">🔬 Event In-Depth Execution Analysis</h2>

        {#if Object.keys(ev).length > 0}
            <div style="display: flex; gap: 30px; flex-wrap: wrap;">
                
                <!-- Left Column -->
                <div style="flex: 1; min-width: 400px; display: flex; flex-direction: column; gap: 20px;">
                    <!-- Event Details -->
                    <div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 8px;">
                        <h3 style="color: var(--accent-cyan); font-size: 0.9rem; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid rgba(0,240,255,0.1); padding-bottom: 8px; text-transform: uppercase;">1. System Event Triggers</h3>
                        <div class="detail-row">
                            <span class="detail-label">Event Type (evt.type)</span>
                            <span class="detail-value">{ev.evt_type}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Direction (evt.dir)</span>
                            <span class="detail-value">{ev.evt_dir === '>' ? '> (Enter/Call)' : '< (Exit/Return)'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Resource (fd.name)</span>
                            <span class="detail-value" style="color: var(--text-main);">{ev.fd_name || ev.evt_args || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Return Value (res)</span>
                            <span class="detail-value" style="color: {String(ev.res).includes('ENOENT') ? 'var(--accent-red)' : ''}">{ev.res || 0}</span>
                        </div>
                    </div>

                    <!-- Process Info -->
                    <div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 8px;">
                        <h3 style="color: var(--accent-cyan); font-size: 0.9rem; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid rgba(0,240,255,0.1); padding-bottom: 8px; text-transform: uppercase;">2. Active Process Environment</h3>
                        <div class="detail-row">
                            <span class="detail-label">Process ID / Name</span>
                            <span class="detail-value">{ev.proc_pid} - {ev.proc_name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Invoking User</span>
                            <span class="detail-value">{ev.user_name}</span>
                        </div>
                        {#if procInfo}
                            <div class="detail-row">
                                <span class="detail-label">Command Line (cmdline)</span>
                                <span class="detail-value mono" style="font-size: 0.8rem; line-height: 1.4; word-break: break-all; color: var(--accent-green);">{procInfo.cmdline}</span>
                            </div>
                        {/if}
                    </div>
                </div>

                <!-- Right Column -->
                <div style="flex: 1; min-width: 400px;">
                    <div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; height: 100%; box-sizing: border-box;">
                        <h3 style="color: var(--accent-cyan); font-size: 0.9rem; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid rgba(0,240,255,0.1); padding-bottom: 8px; text-transform: uppercase;">3. Parent Hierarchy Visualization</h3>
                        <div class="tree-scroll-area" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); padding: 10px; flex: 1; margin: 0; padding-top: 5px;">
                            
                            <!-- Static mockup using HTML to mimic tree exactly for these 1-2 nodes -->
                            {#if parentInfo}
                                <div class="tree-node" style="padding-left:0;">
                                    <div class="tree-cell col-tree flex" style="display: flex; align-items: center; white-space: nowrap;">
                                        <span class="tree-toggle leaf">·</span>
                                        <span class="tree-proc-name">{parentInfo.comm}</span>
                                    </div>
                                </div>
                            {/if}
                            {#if procInfo}
                                <div class="tree-node" style="padding-left:0; background: rgba(0,240,255,0.05); border: 1px solid rgba(0,240,255,0.2);">
                                    <div class="tree-cell col-tree flex" style="display: flex; align-items: center; white-space: nowrap;">
                                        <span class="tree-indent"><span class="tree-indent-unit last-branch" style="position:relative;"></span></span>
                                        <span class="tree-toggle leaf">·</span>
                                        <span class="tree-proc-name">{procInfo.comm}</span>
                                    </div>
                                </div>
                            {:else}
                                <div class="tree-node" style="padding-left:0; background: rgba(0,240,255,0.05); border: 1px solid rgba(0,240,255,0.2);">
                                    <div class="tree-cell col-tree flex" style="display: flex; align-items: center; white-space: nowrap;">
                                        <span class="tree-indent"><span class="tree-indent-unit last-branch" style="position:relative;"></span></span>
                                        <span class="tree-toggle leaf">·</span>
                                        <span class="tree-proc-name">{ev.proc_name}</span> 
                                    </div>
                                    <span style="color:var(--text-muted); font-size:0.75rem; margin-left: 10px;">(Process exited, limited info)</span>
                                </div>
                            {/if}

                        </div>
                    </div>
                </div>

            </div>
        {/if}
    </div>
</div>
