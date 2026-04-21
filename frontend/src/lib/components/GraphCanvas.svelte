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
        getFilteredGraphData, graphStats
    } from '../graph/stores.js';
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
            <button class="graph-btn" on:click={handleFitView} title="Grafı sığdır">⊞ Sığdır</button>
            <button class="graph-btn" on:click={() => { if(engine && svgEl) d3.select(svgEl).transition().duration(500).call(engine.zoomBehavior.transform, d3.zoomIdentity); }} title="Zoom sıfırla">↺ Sıfırla</button>
        </div>
    </div>

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
</style>
