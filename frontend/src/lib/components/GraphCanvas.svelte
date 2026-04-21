<svelte:options runes={false} />
<script>
    /**
     * GraphCanvas.svelte — İnteraktif SVG Graf Canvas Bileşeni
     * 
     * D3.js force-directed layout motoru ile düğüm ve kenarları render eder.
     * Zoom/pan, drag, hover tooltip ve click detay desteği içerir.
     */
    import { onMount, onDestroy } from 'svelte';
    import * as d3 from 'd3';
    import { GraphEngine, computeEdgePath, computeArrowPosition } from '../graph/engine.js';
    import { 
        graphVersion, graphConfig, selectedNode, selectedEdge,
        getFilteredGraphData, graphStats,
        focusedProcess, isIsolationMode,
        setProcessFocus, clearProcessFocus, getAvailableProcesses
    } from '../graph/stores.js';
    import { treeData } from '../stores.js';
    import { NODE_COLORS } from '../graph/theme.js';

    /** @type {SVGElement} SVG DOM referansı */
    let svgEl;
    /** @type {HTMLDivElement} Container referansı */
    let containerEl;
    /** @type {GraphEngine} Motor instance */
    let engine;
    /** @type {Object} D3 zoom transform */
    let transform = { x: 0, y: 0, k: 1 };
    /** @type {Object[]} Render edilecek düğümler */
    let renderNodes = [];
    /** @type {Object[]} Render edilecek kenarlar */
    let renderLinks = [];
    /** @type {Object|null} Hover tooltipte gösterilecek düğüm */
    let hoveredNode = null;
    /** @type {{x:number, y:number}} Tooltip pozisyonu */
    let tooltipPos = { x: 0, y: 0 };
    /** @type {number} Canvas genişliği */
    let width = 800;
    /** @type {number} Canvas yüksekliği */
    let height = 600;
    /** @type {boolean} Süreç seçici açık mı */
    let processPickerOpen = false;
    /** @type {string} Süreç arama metni */
    let processSearch = '';
    /** @type {Object[]} Filtrelenmiş süreç listesi */
    let filteredProcesses = [];
    /** @type {boolean} Alt süreçleri dahil et */
    let includeChildren = true;

    // Reaktif: graphVersion değiştiğinde grafı yeniden yükle
    $: if ($graphVersion > 0 && engine) {
        updateGraph();
    }

    function updateGraph() {
        const data = getFilteredGraphData();
        if (!data || data.nodes.length === 0) {
            renderNodes = [];
            renderLinks = [];
            return;
        }
        
        // Mevcut pozisyonları koru (inkremental güncelleme)
        const existingPositions = {};
        renderNodes.forEach(n => {
            if (n.x !== undefined) existingPositions[n.id] = { x: n.x, y: n.y, fx: n.fx, fy: n.fy };
        });
        
        data.nodes.forEach(n => {
            if (existingPositions[n.id]) {
                n.x = existingPositions[n.id].x;
                n.y = existingPositions[n.id].y;
                n.fx = existingPositions[n.id].fx;
                n.fy = existingPositions[n.id].fy;
            }
        });

        renderNodes = data.nodes;
        renderLinks = data.links;
        
        engine.start(renderNodes, renderLinks, () => {
            // Force ticking — Svelte reaktiviteyi tetikle
            renderNodes = [...renderNodes];
            renderLinks = [...renderLinks];
        });
    }

    onMount(() => {
        // Container boyutu
        if (containerEl) {
            const rect = containerEl.getBoundingClientRect();
            width = rect.width || 800;
            height = rect.height || 600;
        }
        
        // Motor başlat
        const cfg = $graphConfig?.layout || {};
        engine = new GraphEngine(cfg);
        engine.width = width;
        engine.height = height;

        // Zoom kurulumu
        if (svgEl) {
            engine.setupZoom(svgEl, (t) => {
                transform = { x: t.x, y: t.y, k: t.k };
            });
        }
        
        // Resize observer
        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                width = entry.contentRect.width;
                height = entry.contentRect.height;
                if (engine) engine.resize(width, height);
            }
        });
        if (containerEl) resizeObserver.observe(containerEl);

        // İlk yükleme
        if ($graphVersion > 0) updateGraph();

        return () => {
            resizeObserver.disconnect();
        };
    });

    onDestroy(() => {
        if (engine) engine.destroy();
    });

    // ─── Etkileşim Fonksiyonları ─────────────────────────────────

    function handleNodeHover(event, node) {
        hoveredNode = node;
        tooltipPos = { x: event.clientX + 12, y: event.clientY - 8 };
    }

    function handleNodeLeave() {
        hoveredNode = null;
    }

    function handleNodeClick(node) {
        selectedNode.set(node);
        selectedEdge.set(null);
    }

    function handleEdgeClick(link) {
        selectedEdge.set(link);
        selectedNode.set(null);
    }

    function handleNodeDblClick(node) {
        // Çift tık = sabitlemeyi kaldır
        if (engine) engine.releaseNode(node);
        renderNodes = [...renderNodes];
    }

    function handleFitView() {
        if (engine && svgEl) engine.fitToView(svgEl, renderNodes);
    }

    // ─── Süreç İzolasyon Fonksiyonları ────────────────────────────

    let allProcessesForPicker = [];

    function updateFilteredProcesses() {
        const graphProcs = getAvailableProcesses();
        const systemProcs = $treeData || [];
        
        const processMap = new Map();
        
        // Önce çalışan sistem süreçlerini ekle
        systemProcs.forEach(p => {
            const pidNum = parseInt(p.pid, 10);
            if (!isNaN(pidNum)) {
                processMap.set(pidNum, {
                    pid: pidNum,
                    name: p.comm,
                    user: p.user,
                    evtCount: 0,
                    ppid: parseInt(p.ppid, 10) || 0
                });
            }
        });
        
        // Grafikteli süreçleri üzerine yaz (evtCount vb. güncellemek için)
        graphProcs.forEach(p => {
            const pPidNum = parseInt(p.pid, 10);
            if (processMap.has(pPidNum)) {
                const existing = processMap.get(pPidNum);
                existing.evtCount = p.evtCount;
            } else {
                processMap.set(pPidNum, p);
            }
        });
        
        allProcessesForPicker = Array.from(processMap.values());
        allProcessesForPicker.sort((a, b) => b.evtCount - a.evtCount || a.name.localeCompare(b.name));
        
        filterProcessList();
    }

    // Grafa yeni veriler geldiğinde ve seçici açıksa listeyi dinamik olarak güncelle
    $: if ($graphVersion > 0 && processPickerOpen) {
        updateFilteredProcesses();
    }

    function toggleProcessPicker() {
        processPickerOpen = !processPickerOpen;
        if (processPickerOpen) {
            processSearch = '';
            updateFilteredProcesses();
        }
    }

    function filterProcessList() {
        if (!processSearch.trim()) {
            filteredProcesses = allProcessesForPicker;
        } else {
            const q = processSearch.toLowerCase();
            filteredProcesses = allProcessesForPicker.filter(p => 
                p.name.toLowerCase().includes(q) ||
                String(p.pid).includes(q) ||
                (p.user && p.user.toLowerCase().includes(q))
            );
        }
    }

    function selectProcessForFocus(proc) {
        setProcessFocus(proc.pid, proc.name, includeChildren);
        processPickerOpen = false;
        processSearch = '';
    }

    function handleClearIsolation() {
        clearProcessFocus();
    }

    function focusOnClickedNode(node) {
        if (node.type === 'process' && node.metadata?.pid) {
            setProcessFocus(node.metadata.pid, node.label, includeChildren);
        }
    }

    // ─── Render Yardımcıları ─────────────────────────────────────

    function getNodeRadius(node) {
        if (node.type === 'process') return 22;
        if (node.type === 'network') return 18;
        return 14;
    }

    function getNodeColor(node) {
        return node.style?.color || NODE_COLORS[node.type]?.fill || '#00f0ff';
    }

    function getNodeIcon(node) {
        return node.style?.icon || '●';
    }

    function getNodeShape(node) {
        return node.type; // 'process' = daire, 'file' = kare, 'network' = altıgen
    }

    function truncLabel(label, max = 20) {
        if (!label) return '';
        return label.length > max ? label.slice(0, max) + '…' : label;
    }

    function hexagonPath(cx, cy, r) {
        const pts = [];
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
        }
        return `M${pts.join('L')}Z`;
    }
</script>

<div class="graph-container" bind:this={containerEl}>
    <!-- Toolbar -->
    <div class="graph-toolbar">
        <div class="graph-stats-bar">
            <span>Düğüm: <strong>{$graphStats.visibleNodes}</strong></span>
            <span>Kenar: <strong>{$graphStats.visibleEdges}</strong></span>
            <span>Event: <strong>{$graphStats.processedEvents}</strong></span>
        </div>
        <div class="graph-actions">
            <!-- Süreç Seçici -->
            <div class="process-picker-wrap">
                <button class="graph-btn" class:active={processPickerOpen || $isIsolationMode}
                        on:click={toggleProcessPicker} title="Süreç bazlı görselleştir">
                    🔍 Süreç Seç
                </button>
                {#if processPickerOpen}
                    <div class="process-picker">
                        <input type="text" class="process-search"
                               placeholder="PID, isim veya kullanıcı ara..."
                               bind:value={processSearch}
                               on:input={filterProcessList} />
                        <label class="child-toggle">
                            <input type="checkbox" bind:checked={includeChildren} />
                            Alt süreçleri dahil et
                        </label>
                        <div class="process-list">
                            {#each filteredProcesses as proc}
                                <button class="process-item" on:click={() => selectProcessForFocus(proc)}>
                                    <span class="proc-name">{proc.name}</span>
                                    <span class="proc-pid">PID:{proc.pid}</span>
                                    <span class="proc-user">{proc.user}</span>
                                    <span class="proc-count">{proc.evtCount} evt</span>
                                </button>
                            {:else}
                                <div class="process-empty">Süreç bulunamadı</div>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
            <button class="graph-btn" on:click={handleFitView} title="Grafı sığdır">⊞ Sığdır</button>
            <button class="graph-btn" on:click={() => { if(engine && svgEl) d3.select(svgEl).transition().duration(500).call(engine.zoomBehavior.transform, d3.zoomIdentity); }} title="Zoom sıfırla">↺ Sıfırla</button>
        </div>
    </div>

    <!-- İzolasyon Modu Göstergesi -->
    {#if $isIsolationMode}
        <div class="isolation-banner">
            <span>🎯 <strong>{$focusedProcess.name}</strong> (PID: {$focusedProcess.pid}) odaklı görünüm</span>
            {#if $focusedProcess.includeChildren}
                <span class="isolation-tag">+ alt süreçler</span>
            {/if}
            <button class="isolation-clear" on:click={handleClearIsolation}>✕ Tümünü Göster</button>
        </div>
    {/if}

    <!-- SVG Canvas -->
    <svg bind:this={svgEl} {width} {height} class="graph-svg">
        <defs>
            <!-- Ok ucu marker'ı -->
            <marker id="arrowhead" viewBox="0 -5 10 10" refX="8" refY="0"
                    markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0,-4L10,0L0,4" fill="rgba(0,240,255,0.6)" />
            </marker>
            <!-- Glow filtresi -->
            <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>

        <g transform="translate({transform.x},{transform.y}) scale({transform.k})">
            <!-- Kenarlar (linkler) -->
            {#each renderLinks as link}
                {@const src = typeof link.source === 'object' ? link.source : renderNodes.find(n => n.id === link.source)}
                {@const tgt = typeof link.target === 'object' ? link.target : renderNodes.find(n => n.id === link.target)}
                {#if src && tgt && src.x !== undefined && tgt.x !== undefined}
                    <g class="graph-edge" role="button" tabindex="-1" on:click={() => handleEdgeClick(link)} on:keydown={(e) => { if (e.key === 'Enter') handleEdgeClick(link); }}>
                        <path
                            d={computeEdgePath(src, tgt, 0.15)}
                            stroke={link.color || 'rgba(0,240,255,0.4)'}
                            stroke-width={link.width || 1.5}
                            fill="none"
                            stroke-opacity="0.7"
                            marker-end="url(#arrowhead)"
                        />
                        <!-- Kenar etiketi (count) -->
                        {#if link.count > 1}
                            <text
                                x={(src.x + tgt.x) / 2}
                                y={(src.y + tgt.y) / 2 - 6}
                                text-anchor="middle"
                                class="edge-label"
                            >{link.count}</text>
                        {/if}
                    </g>
                {/if}
            {/each}

            <!-- Düğümler -->
            {#each renderNodes as node}
                {#if node.x !== undefined}
                    <g class="graph-node"
                       class:selected={$selectedNode?.id === node.id}
                       role="button"
                       tabindex="-1"
                       on:mouseenter={(e) => handleNodeHover(e, node)}
                       on:mouseleave={handleNodeLeave}
                       on:click={() => handleNodeClick(node)}
                       on:dblclick={() => handleNodeDblClick(node)}
                       on:keydown={(e) => { if (e.key === 'Enter') handleNodeClick(node); }}
                       transform="translate({node.x},{node.y})"
                       style="cursor: grab;"
                    >
                        <!-- Glow efekti (aktif düğümler için) -->
                        {#if node.evtCount > 5}
                            <circle r={getNodeRadius(node) + 6} fill="none"
                                    stroke={getNodeColor(node)} stroke-opacity="0.15"
                                    stroke-width="8" />
                        {/if}

                        <!-- Düğüm şekli -->
                        {#if node.type === 'process'}
                            <circle r={getNodeRadius(node)}
                                    fill="rgba(0,0,0,0.6)"
                                    stroke={getNodeColor(node)}
                                    stroke-width="2" />
                        {:else if node.type === 'file'}
                            <rect x={-12} y={-12} width="24" height="24" rx="4"
                                  fill="rgba(0,0,0,0.6)"
                                  stroke={getNodeColor(node)}
                                  stroke-width="2" />
                        {:else if node.type === 'network'}
                            <path d={hexagonPath(0, 0, getNodeRadius(node))}
                                  fill="rgba(0,0,0,0.6)"
                                  stroke={getNodeColor(node)}
                                  stroke-width="2" />
                        {/if}

                        <!-- İkon -->
                        <text text-anchor="middle" dominant-baseline="central"
                              class="node-icon" fill={getNodeColor(node)}
                              font-size="12">{getNodeIcon(node)}</text>

                        <!-- Etiket -->
                        <text y={getNodeRadius(node) + 14}
                              text-anchor="middle"
                              class="node-label"
                              fill="rgba(248,250,252,0.85)"
                              font-size="10">{truncLabel(node.label)}</text>
                        
                        <!-- Sabitlenme göstergesi -->
                        {#if node.fx !== null && node.fx !== undefined}
                            <circle cx={getNodeRadius(node) - 4} cy={-getNodeRadius(node) + 4}
                                    r="4" fill="#ff2a5f" stroke="none" />
                        {/if}

                        <!-- Odaklanma göstergesi -->
                        {#if node._isFocused}
                            <circle r={getNodeRadius(node) + 10} fill="none"
                                    stroke="#ff2a5f" stroke-opacity="0.5"
                                    stroke-width="3" stroke-dasharray="6,3" />
                        {/if}
                    </g>
                {/if}
            {/each}
        </g>

        <!-- Boş durum mesajı -->
        {#if renderNodes.length === 0}
            <text x={width/2} y={height/2} text-anchor="middle"
                  fill="rgba(148,163,184,0.6)" font-size="16" font-family="Inter, sans-serif">
                Yakalama başlatın — graf otomatik oluşturulacak
            </text>
            <text x={width/2} y={height/2 + 24} text-anchor="middle"
                  fill="rgba(148,163,184,0.4)" font-size="12" font-family="Inter, sans-serif">
                veya Demo modunu kullanarak örnek veri enjekte edin
            </text>
        {/if}
    </svg>

    <!-- Hover Tooltip -->
    {#if hoveredNode}
        <div class="graph-tooltip"
             style="left: {tooltipPos.x}px; top: {tooltipPos.y}px;">
            <div class="tooltip-type" style="color: {getNodeColor(hoveredNode)}">
                {hoveredNode.type.toUpperCase()}
            </div>
            <div class="tooltip-label">{hoveredNode.label}</div>
            {#if hoveredNode.metadata?.pid}
                <div class="tooltip-detail">PID: {hoveredNode.metadata.pid}</div>
            {/if}
            {#if hoveredNode.metadata?.user}
                <div class="tooltip-detail">User: {hoveredNode.metadata.user}</div>
            {/if}
            <div class="tooltip-detail">Events: {hoveredNode.evtCount}</div>
            {#if hoveredNode.type === 'process'}
                <div class="tooltip-action">Tıkla: detay | Sağ tık: odaklan</div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .graph-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: relative;
        border-radius: 8px;
        background: rgba(0,0,0,0.3);
        border: 1px solid rgba(0, 240, 255, 0.15);
    }

    .graph-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: rgba(13, 20, 36, 0.8);
        border-bottom: 1px solid rgba(0, 240, 255, 0.1);
    }

    .graph-stats-bar {
        display: flex;
        gap: 16px;
        font-size: 0.75rem;
        color: rgba(148, 163, 184, 0.8);
    }
    .graph-stats-bar strong {
        color: #00f0ff;
        font-family: 'JetBrains Mono', monospace;
    }

    .graph-actions {
        display: flex;
        gap: 6px;
    }

    .graph-btn {
        background: rgba(0, 240, 255, 0.08);
        border: 1px solid rgba(0, 240, 255, 0.2);
        color: #00f0ff;
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 0.75rem;
        cursor: pointer;
        font-family: 'Inter', sans-serif;
        transition: all 0.2s;
    }
    .graph-btn:hover {
        background: rgba(0, 240, 255, 0.15);
        box-shadow: 0 0 12px rgba(0, 240, 255, 0.2);
    }

    .graph-svg {
        flex: 1;
        width: 100%;
        display: block;
        background: radial-gradient(
            circle at 50% 50%,
            rgba(0, 240, 255, 0.02),
            transparent 70%
        );
    }

    .graph-node {
        transition: opacity 0.2s;
    }
    .graph-node:hover {
        filter: brightness(1.3);
    }
    .graph-node.selected circle,
    .graph-node.selected rect,
    .graph-node.selected path {
        stroke-width: 3;
        filter: url(#glow);
    }

    :global(.node-icon) {
        pointer-events: none;
        user-select: none;
    }
    :global(.node-label) {
        pointer-events: none;
        user-select: none;
        font-family: 'Inter', sans-serif;
    }
    :global(.edge-label) {
        font-size: 9px;
        fill: rgba(148, 163, 184, 0.7);
        font-family: 'JetBrains Mono', monospace;
        pointer-events: none;
    }

    .graph-edge {
        cursor: pointer;
    }
    .graph-edge:hover path {
        stroke-opacity: 1;
        stroke-width: 3;
    }

    .graph-tooltip {
        position: fixed;
        z-index: 100;
        background: rgba(5, 11, 20, 0.95);
        border: 1px solid rgba(0, 240, 255, 0.3);
        border-radius: 8px;
        padding: 10px 14px;
        pointer-events: none;
        backdrop-filter: blur(12px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        min-width: 140px;
    }
    .tooltip-type {
        font-size: 0.65rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-weight: 700;
        margin-bottom: 4px;
    }
    .tooltip-label {
        font-size: 0.9rem;
        font-weight: 600;
        color: #f8fafc;
        margin-bottom: 6px;
        font-family: 'JetBrains Mono', monospace;
    }
    .tooltip-detail {
        font-size: 0.75rem;
        color: rgba(148,163,184,0.8);
        line-height: 1.5;
    }
    .tooltip-action {
        font-size: 0.65rem;
        color: rgba(0, 240, 255, 0.5);
        margin-top: 6px;
        border-top: 1px solid rgba(0,240,255,0.1);
        padding-top: 4px;
    }

    /* ─── Süreç Seçici ─────────────────────────────────────────── */
    .process-picker-wrap {
        position: relative;
    }
    .graph-btn.active {
        background: rgba(255, 42, 95, 0.15);
        border-color: rgba(255, 42, 95, 0.4);
        color: #ff2a5f;
    }
    .process-picker {
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: 6px;
        width: 320px;
        max-height: 400px;
        background: rgba(5, 11, 20, 0.98);
        border: 1px solid rgba(0, 240, 255, 0.2);
        border-radius: 10px;
        padding: 10px;
        z-index: 200;
        backdrop-filter: blur(16px);
        box-shadow: 0 12px 40px rgba(0,0,0,0.6);
        animation: fadeIn 0.15s ease;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-6px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .process-search {
        width: 100%;
        padding: 8px 10px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(0,240,255,0.15);
        border-radius: 6px;
        color: #f8fafc;
        font-size: 0.8rem;
        font-family: 'JetBrains Mono', monospace;
        outline: none;
        box-sizing: border-box;
    }
    .process-search::placeholder {
        color: rgba(148,163,184,0.5);
    }
    .process-search:focus {
        border-color: rgba(0,240,255,0.4);
        box-shadow: 0 0 8px rgba(0,240,255,0.15);
    }
    .child-toggle {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.72rem;
        color: rgba(148,163,184,0.7);
        padding: 6px 0;
        cursor: pointer;
    }
    .child-toggle input[type="checkbox"] {
        accent-color: #00f0ff;
    }
    .process-list {
        max-height: 280px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .process-item {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 7px 8px;
        background: transparent;
        border: none;
        border-radius: 6px;
        color: #f8fafc;
        cursor: pointer;
        font-family: 'Inter', sans-serif;
        font-size: 0.78rem;
        text-align: left;
        transition: background 0.15s;
    }
    .process-item:hover {
        background: rgba(0, 240, 255, 0.08);
    }
    .proc-name {
        flex: 1;
        font-weight: 600;
        color: #00f0ff;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.76rem;
    }
    .proc-pid {
        font-size: 0.7rem;
        color: rgba(148,163,184,0.7);
        font-family: 'JetBrains Mono', monospace;
    }
    .proc-user {
        font-size: 0.7rem;
        color: rgba(148,163,184,0.5);
    }
    .proc-count {
        font-size: 0.68rem;
        color: rgba(0,255,157,0.7);
        font-family: 'JetBrains Mono', monospace;
    }
    .process-empty {
        padding: 16px;
        text-align: center;
        color: rgba(148,163,184,0.5);
        font-size: 0.8rem;
    }

    /* ─── İzolasyon Modu Göstergesi ─────────────────────────────── */
    .isolation-banner {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px 14px;
        background: linear-gradient(90deg, rgba(255,42,95,0.12), rgba(0,240,255,0.06));
        border-bottom: 1px solid rgba(255, 42, 95, 0.2);
        font-size: 0.78rem;
        color: #f8fafc;
        animation: fadeIn 0.2s ease;
    }
    .isolation-banner strong {
        color: #ff2a5f;
        font-family: 'JetBrains Mono', monospace;
    }
    .isolation-tag {
        background: rgba(0, 240, 255, 0.1);
        border: 1px solid rgba(0, 240, 255, 0.2);
        padding: 1px 8px;
        border-radius: 10px;
        font-size: 0.68rem;
        color: #00f0ff;
    }
    .isolation-clear {
        margin-left: auto;
        background: rgba(255, 42, 95, 0.1);
        border: 1px solid rgba(255, 42, 95, 0.3);
        color: #ff2a5f;
        padding: 3px 10px;
        border-radius: 4px;
        font-size: 0.72rem;
        cursor: pointer;
        font-family: 'Inter', sans-serif;
        transition: all 0.2s;
    }
    .isolation-clear:hover {
        background: rgba(255, 42, 95, 0.2);
        box-shadow: 0 0 12px rgba(255, 42, 95, 0.2);
    }
</style>
