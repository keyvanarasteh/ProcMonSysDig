/**
 * engine.js — D3.js Force-Directed Layout Motoru
 * 
 * Graf düğümlerini ve kenarlarını fizik simülasyonu ile yerleştirir.
 * Svelte bileşenleri tarafından kullanılır.
 * 
 * Özellikler:
 *   - Force-directed layout (çekim/itme)
 *   - Düğüm sabitleme (pin)
 *   - Zoom/pan desteği
 *   - İnkremental güncelleme (yeni düğüm/kenar eklerken simülasyonu yeniden başlat)
 */

import * as d3 from 'd3';

/**
 * GraphEngine — D3 force simülasyonunu yöneten motor sınıfı
 */
export class GraphEngine {
    /**
     * @param {Object} config - Layout yapılandırması (types.js/DEFAULT_GRAPH_CONFIG.layout)
     */
    constructor(config = {}) {
        /** @type {Object} Layout yapılandırması */
        this.config = {
            chargeStrength: config.chargeStrength || -300,
            linkDistance: config.linkDistance || 120,
            centerGravity: config.centerGravity || 0.05,
            collisionRadius: config.collisionRadius || 40,
            alphaDecay: config.alphaDecay || 0.02,
            velocityDecay: config.velocityDecay || 0.4
        };

        /** @type {d3.Simulation|null} D3 force simülasyonu */
        this.simulation = null;

        /** @type {d3.ZoomBehavior|null} D3 zoom davranışı */
        this.zoomBehavior = null;

        /** @type {Object} Mevcut zoom transformu */
        this.currentTransform = d3.zoomIdentity;

        /** @type {Function|null} Tick callback (her frame'de çağrılır) */
        this.onTick = null;

        /** @type {number} Canvas genişliği */
        this.width = 800;

        /** @type {number} Canvas yüksekliği */
        this.height = 600;
    }

    /**
     * Simülasyonu başlatır veya günceller
     * @param {Object[]} nodes - Düğüm dizisi
     * @param {Object[]} links - Kenar dizisi (source/target ID'li)
     * @param {Function} tickCallback - Her frame'de çağrılacak fonksiyon
     */
    start(nodes, links, tickCallback) {
        this.onTick = tickCallback;

        if (this.simulation) {
            // Mevcut simülasyonu güncelle (inkremental)
            this.simulation.nodes(nodes);
            this.simulation
                .force('link')
                .links(links);
            this.simulation.alpha(0.3).restart();
        } else {
            // Yeni simülasyon oluştur
            this.simulation = d3.forceSimulation(nodes)
                .force('link', d3.forceLink(links)
                    .id(d => d.id)
                    .distance(d => {
                        // Kenar türüne göre mesafe
                        if (d.edgeType === 'process_spawn') return this.config.linkDistance * 0.8;
                        if (d.edgeType === 'network_io') return this.config.linkDistance * 1.3;
                        return this.config.linkDistance;
                    })
                    .strength(0.5)
                )
                .force('charge', d3.forceManyBody()
                    .strength(d => {
                        // Süreç düğümleri daha güçlü iter
                        if (d.type === 'process') return this.config.chargeStrength * 1.2;
                        return this.config.chargeStrength;
                    })
                )
                .force('center', d3.forceCenter(this.width / 2, this.height / 2)
                    .strength(this.config.centerGravity)
                )
                .force('collision', d3.forceCollide()
                    .radius(d => {
                        if (d.type === 'process') return this.config.collisionRadius;
                        if (d.type === 'network') return this.config.collisionRadius * 0.8;
                        return this.config.collisionRadius * 0.6;
                    })
                )
                .alphaDecay(this.config.alphaDecay)
                .velocityDecay(this.config.velocityDecay)
                .on('tick', () => {
                    if (this.onTick) this.onTick();
                });
        }
    }

    /**
     * SVG elementine zoom/pan davranışı ekler
     * @param {SVGElement} svgElement - SVG DOM elementi
     * @param {Function} onZoom - Zoom değiştiğinde çağrılacak cb (transform)
     */
    setupZoom(svgElement, onZoom) {
        this.zoomBehavior = d3.zoom()
            .scaleExtent([0.1, 8])
            .on('zoom', (event) => {
                this.currentTransform = event.transform;
                if (onZoom) onZoom(event.transform);
            });

        d3.select(svgElement).call(this.zoomBehavior);
    }

    /**
     * Programatik olarak belirli bir noktayı merkeze getir ve zoom yap
     * @param {SVGElement} svgElement - SVG elementi
     * @param {number} x - Hedef X koordinatı
     * @param {number} y - Hedef Y koordinatı
     * @param {number} scale - Zoom ölçeği
     * @param {number} duration - Animasyon süresi (ms)
     */
    zoomTo(svgElement, x, y, scale = 1.5, duration = 750) {
        if (!this.zoomBehavior) return;

        const transform = d3.zoomIdentity
            .translate(this.width / 2, this.height / 2)
            .scale(scale)
            .translate(-x, -y);

        d3.select(svgElement)
            .transition()
            .duration(duration)
            .call(this.zoomBehavior.transform, transform);
    }

    /**
     * Zoom'u sıfırla (tüm grafı sığdır)
     * @param {SVGElement} svgElement
     * @param {Object[]} nodes - Düğüm dizisi (extent hesabı için)
     */
    fitToView(svgElement, nodes) {
        if (!this.zoomBehavior || !nodes || nodes.length === 0) return;

        const xExtent = d3.extent(nodes, d => d.x);
        const yExtent = d3.extent(nodes, d => d.y);
        const dx = (xExtent[1] || 0) - (xExtent[0] || 0);
        const dy = (yExtent[1] || 0) - (yExtent[0] || 0);
        const cx = ((xExtent[0] || 0) + (xExtent[1] || 0)) / 2;
        const cy = ((yExtent[0] || 0) + (yExtent[1] || 0)) / 2;

        const padding = 60;
        const scale = Math.min(
            (this.width - padding * 2) / (dx || 1),
            (this.height - padding * 2) / (dy || 1),
            4
        );
        const clampedScale = Math.max(0.1, Math.min(scale, 4));

        this.zoomTo(svgElement, cx, cy, clampedScale);
    }

    /**
     * Drag davranışını oluşturur (D3 drag)
     * @returns {d3.DragBehavior} Svelte bileşenine uygulanabilir drag davranışı
     */
    createDragBehavior() {
        const sim = this.simulation;
        return d3.drag()
            .on('start', (event, d) => {
                if (!event.active && sim) sim.alphaTarget(0.1).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (!event.active && sim) sim.alphaTarget(0);
                // Kullanıcı düğümü sürüklediyse sabitlenmiş bırak
                // (çift tıkla serbest bırakma ayrıca yapılabilir)
            });
    }

    /**
     * Bir düğümü sabitlenmiş pozisyondan serbest bırakır
     * @param {Object} node - Düğüm nesnesi
     */
    releaseNode(node) {
        node.fx = null;
        node.fy = null;
        if (this.simulation) {
            this.simulation.alpha(0.1).restart();
        }
    }

    /**
     * Canvas boyutlarını günceller
     * @param {number} width
     * @param {number} height
     */
    resize(width, height) {
        this.width = width;
        this.height = height;
        if (this.simulation) {
            this.simulation.force('center', d3.forceCenter(width / 2, height / 2)
                .strength(this.config.centerGravity));
            this.simulation.alpha(0.1).restart();
        }
    }

    /**
     * Simülasyonu durdurur ve kaynakları temizler
     */
    destroy() {
        if (this.simulation) {
            this.simulation.stop();
            this.simulation = null;
        }
        this.zoomBehavior = null;
        this.onTick = null;
    }
}

/**
 * D3 eğri yol hesaplayıcı — iki nokta arası eğri kenar çizer
 * @param {Object} source - Kaynak { x, y }
 * @param {Object} target - Hedef { x, y }
 * @param {number} curvature - Eğrilik (0 = düz, 0.5 = çok eğri)
 * @returns {string} SVG path 'd' özelliği
 */
export function computeEdgePath(source, target, curvature = 0.2) {
    if (!source || !target) return '';
    const sx = source.x || 0;
    const sy = source.y || 0;
    const tx = target.x || 0;
    const ty = target.y || 0;

    if (curvature === 0) {
        return `M${sx},${sy}L${tx},${ty}`;
    }

    // Kontrol noktası hesabı
    const dx = tx - sx;
    const dy = ty - sy;
    const dr = Math.sqrt(dx * dx + dy * dy);

    // Orta noktadan dik açıyla offset
    const mx = (sx + tx) / 2;
    const my = (sy + ty) / 2;
    const offset = dr * curvature;
    // Normal vektör
    const nx = -dy / (dr || 1);
    const ny = dx / (dr || 1);

    const cx = mx + nx * offset;
    const cy = my + ny * offset;

    return `M${sx},${sy}Q${cx},${cy},${tx},${ty}`;
}

/**
 * Ok ucu pozisyonunu hesaplar (kenarın hedef ucuna doğru)
 * @param {Object} source - Kaynak { x, y }
 * @param {Object} target - Hedef { x, y }
 * @param {number} nodeRadius - Hedef düğüm yarıçapı
 * @returns {Object} { x, y, angle } ok ucu pozisyonu ve açısı
 */
export function computeArrowPosition(source, target, nodeRadius = 24) {
    if (!source || !target) return { x: 0, y: 0, angle: 0 };

    const dx = (target.x || 0) - (source.x || 0);
    const dy = (target.y || 0) - (source.y || 0);
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Düğüm sınırına kadar offset
    const offsetX = (target.x || 0) - (dx / dist) * nodeRadius;
    const offsetY = (target.y || 0) - (dy / dist) * nodeRadius;

    return { x: offsetX, y: offsetY, angle };
}
