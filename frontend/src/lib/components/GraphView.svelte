<svelte:options runes={false} />
<script>
    /**
     * GraphView.svelte — Graf Görcelleştirme Ana Bileşeni
     * 
     * GraphCanvas'ı monte eder ve yan detay panelini yönetir.
     * TabBar'dan "Graph View" sekmesi seçildiğinde görünür.
     */
    import GraphCanvas from './GraphCanvas.svelte';
    import { selectedNode, selectedEdge, resetGraph, graphStats } from '../graph/stores.js';
    import { sendWebSocketCommand } from '../websocket.js';

    /** Detay çekmecesi açık mı */
    let drawerOpen = false;

    $: if ($selectedNode || $selectedEdge) {
        drawerOpen = true;
    }

    function closeDrawer() {
        drawerOpen = false;
        selectedNode.set(null);
        selectedEdge.set(null);
    }

    function handleReset() {
        resetGraph();
    }

    function requestGraphData() {
        sendWebSocketCommand({ command: 'GET_GRAPH_DATA' });
    }

    function requestSnapshot() {
        sendWebSocketCommand({ command: 'GET_EVENT_SNAPSHOT', count: 1000 });
    }
</script>

<div class="graph-view">
    <!-- Ana graf alanı -->
    <div class="graph-main" class:drawer-open={drawerOpen}>
        <GraphCanvas />
    </div>

    <!-- Detay Çekmecesi (Sağdan açılır) -->
    {#if drawerOpen}
        <div class="graph-drawer">
            <div class="drawer-header">
                <h3>
                    {#if $selectedNode}
                        <span class="drawer-type" style="color: {$selectedNode.style?.color || '#00f0ff'}">
                            {$selectedNode.type?.toUpperCase()}
                        </span>
                        {$selectedNode.label || 'Bilinmeyen'}
                    {:else if $selectedEdge}
                        <span class="drawer-type">KENAR</span>
                        Etkileşim Detayı
                    {/if}
                </h3>
                <button class="drawer-close" on:click={closeDrawer}>×</button>
            </div>
            
            <div class="drawer-body">
                {#if $selectedNode}
                    <!-- DÜĞÜM DETAYLARI -->
                    <div class="detail-section">
                        <div class="detail-grid">
                            <span class="detail-key">Tür</span>
                            <span class="detail-val">{$selectedNode.type}</span>

                            <span class="detail-key">ID</span>
                            <span class="detail-val mono">{$selectedNode.id}</span>
                            
                            <span class="detail-key">Event Sayısı</span>
                            <span class="detail-val accent">{$selectedNode.evtCount || 0}</span>

                            {#if $selectedNode.metadata?.pid}
                                <span class="detail-key">PID</span>
                                <span class="detail-val mono">{$selectedNode.metadata.pid}</span>
                            {/if}

                            {#if $selectedNode.metadata?.ppid}
                                <span class="detail-key">PPID</span>
                                <span class="detail-val mono">{$selectedNode.metadata.ppid}</span>
                            {/if}

                            {#if $selectedNode.metadata?.user}
                                <span class="detail-key">Kullanıcı</span>
                                <span class="detail-val">{$selectedNode.metadata.user}</span>
                            {/if}

                            {#if $selectedNode.metadata?.exe}
                                <span class="detail-key">Executable</span>
                                <span class="detail-val mono small">{$selectedNode.metadata.exe}</span>
                            {/if}

                            {#if $selectedNode.metadata?.fullPath}
                                <span class="detail-key">Tam Yol</span>
                                <span class="detail-val mono small">{$selectedNode.metadata.fullPath}</span>
                            {/if}

                            {#if $selectedNode.metadata?.fileType}
                                <span class="detail-key">Dosya Türü</span>
                                <span class="detail-val">{$selectedNode.metadata.fileType}</span>
                            {/if}

                            {#if $selectedNode.metadata?.ip}
                                <span class="detail-key">IP</span>
                                <span class="detail-val mono">{$selectedNode.metadata.ip}</span>
                            {/if}

                            {#if $selectedNode.metadata?.port}
                                <span class="detail-key">Port</span>
                                <span class="detail-val mono">{$selectedNode.metadata.port}</span>
                            {/if}

                            {#if $selectedNode.style?.category}
                                <span class="detail-key">Kategori</span>
                                <span class="detail-val">{$selectedNode.style.category}</span>
                            {/if}
                        </div>
                    </div>
                {:else if $selectedEdge}
                    <!-- KENAR DETAYLARI -->
                    <div class="detail-section">
                        <div class="detail-grid">
                            <span class="detail-key">Kaynak</span>
                            <span class="detail-val mono small">{$selectedEdge.source}</span>

                            <span class="detail-key">Hedef</span>
                            <span class="detail-val mono small">{$selectedEdge.target}</span>

                            <span class="detail-key">Tür</span>
                            <span class="detail-val">{$selectedEdge.edgeType}</span>

                            <span class="detail-key">Toplam Etkileşim</span>
                            <span class="detail-val accent">{$selectedEdge.count}</span>

                            <span class="detail-key">Son Event</span>
                            <span class="detail-val mono">{$selectedEdge.lastEvtType}</span>
                        </div>

                        {#if $selectedEdge.types && Object.keys($selectedEdge.types).length > 0}
                            <h4 class="sub-title">Event Türleri Dağılımı</h4>
                            <div class="type-breakdown">
                                {#each Object.entries($selectedEdge.types) as [evtType, count]}
                                    <div class="type-bar">
                                        <span class="type-name">{evtType}</span>
                                        <div class="type-progress">
                                            <div class="type-fill" style="width: {Math.min(100, (count / $selectedEdge.count) * 100)}%"></div>
                                        </div>
                                        <span class="type-count">{count}</span>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>

<style>
    .graph-view {
        flex: 1;
        display: flex;
        overflow: hidden;
    }

    .graph-main {
        flex: 1;
        display: flex;
        transition: margin-right 0.3s ease;
    }
    .graph-main.drawer-open {
        margin-right: 0;
    }

    .graph-drawer {
        width: 320px;
        background: rgba(5, 11, 20, 0.95);
        border-left: 1px solid rgba(0, 240, 255, 0.15);
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        backdrop-filter: blur(12px);
        animation: slideIn 0.25s ease;
    }

    @keyframes slideIn {
        from { transform: translateX(40px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }

    .drawer-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 16px 12px;
        border-bottom: 1px solid rgba(0, 240, 255, 0.1);
    }
    .drawer-header h3 {
        margin: 0;
        font-size: 0.95rem;
        color: #f8fafc;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .drawer-type {
        font-size: 0.65rem;
        letter-spacing: 1px;
        font-weight: 700;
        text-transform: uppercase;
    }
    .drawer-close {
        background: none;
        border: none;
        color: rgba(148,163,184,0.6);
        font-size: 20px;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
        transition: 0.2s;
    }
    .drawer-close:hover {
        color: #ff2a5f;
        background: rgba(255,42,95,0.1);
    }

    .drawer-body {
        padding: 16px;
        flex: 1;
    }

    .detail-section {
        margin-bottom: 16px;
    }

    .detail-grid {
        display: grid;
        grid-template-columns: 100px 1fr;
        gap: 8px;
        font-size: 0.82rem;
    }
    .detail-key {
        color: rgba(148,163,184,0.7);
        font-weight: 600;
    }
    .detail-val {
        color: #f8fafc;
        word-break: break-all;
    }
    .detail-val.mono {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.78rem;
    }
    .detail-val.small {
        font-size: 0.72rem;
    }
    .detail-val.accent {
        color: #00f0ff;
        font-weight: 700;
        font-family: 'JetBrains Mono', monospace;
    }

    .sub-title {
        color: rgba(148,163,184,0.7);
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin: 16px 0 8px;
    }

    .type-breakdown {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .type-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.75rem;
    }
    .type-name {
        width: 70px;
        color: rgba(148,163,184,0.8);
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
    }
    .type-progress {
        flex: 1;
        height: 6px;
        background: rgba(255,255,255,0.05);
        border-radius: 3px;
        overflow: hidden;
    }
    .type-fill {
        height: 100%;
        background: linear-gradient(90deg, #00f0ff, #00ff9d);
        border-radius: 3px;
        transition: width 0.3s;
    }
    .type-count {
        color: #00f0ff;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        min-width: 24px;
        text-align: right;
    }
</style>
