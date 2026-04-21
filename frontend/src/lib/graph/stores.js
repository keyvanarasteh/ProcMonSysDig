/**
 * stores.js — Grafik Svelte Store'ları
 * 
 * Graf görselleştirmesi için gerekli reaktif state yönetimi.
 * GraphTransformer'ı sarmalayan store'lar aracılığıyla
 * Svelte bileşenleri gerçek zamanlı grafik verisine erişir.
 */

import { writable, derived, get } from 'svelte/store';
import { GraphTransformer } from './transformer.js';
import { DEFAULT_GRAPH_CONFIG } from './types.js';

// ─── Transformer Instance ──────────────────────────────────────
const transformer = new GraphTransformer();

// ─── Grafik Düğüm ve Kenar Store'ları ──────────────────────────

/**
 * Grafik verisi yenileme tetikleyicisi (her push'ta artar)
 * Derived store'lar bu değer değiştiğinde yeniden hesaplanır
 */
export const graphVersion = writable(0);

/**
 * Grafik yapılandırması — layout, filtre, timeline ayarları
 */
export const graphConfig = writable({ ...DEFAULT_GRAPH_CONFIG });

/**
 * Aktif sekme: 'events' | 'tree' | 'graph'
 */
export const activeGraphTab = writable('events');

/**
 * Graf görünümünün aktif olup olmadığı
 */
export const isGraphActive = derived(activeGraphTab, ($tab) => $tab === 'graph');

/**
 * Zaman aralığı filtresi (timeline seçimi)
 * null = tüm zamanlar, { start, end } = belirli aralık
 */
export const timeRange = writable(null);

/**
 * Animasyon durumu
 */
export const animationState = writable({
    isPlaying: false,
    currentTime: 0,
    speed: 1,
    currentEventIndex: 0
});

/**
 * Seçili düğüm (detay paneli için)
 */
export const selectedNode = writable(null);

/**
 * Seçili kenar (edge popup için)
 */
export const selectedEdge = writable(null);

/**
 * Graf istatistikleri
 */
export const graphStats = writable({
    totalNodes: 0,
    totalEdges: 0,
    visibleNodes: 0,
    visibleEdges: 0,
    processedEvents: 0
});

/**
 * Odaklanılan süreç (izolasyon modu)
 * null = tüm süreçler gösterilir
 * { pid, name, includeChildren } = sadece bu süreç ve etkileşimleri
 */
export const focusedProcess = writable(null);

/**
 * İzolasyon modu aktif mi
 */
export const isIsolationMode = derived(focusedProcess, ($fp) => $fp !== null);

// ─── Transformer API Fonksiyonları ─────────────────────────────

/**
 * Tek bir event'i grafa ekler
 * @param {Object} event - Backend'den gelen zenginleştirilmiş event
 */
export function pushGraphEvent(event) {
    transformer.pushEvent(event);
    graphVersion.update(v => v + 1);
}

/**
 * Birden fazla event'i toplu ekler
 * @param {Object[]} events - Event dizisi
 */
export function pushGraphEvents(events) {
    transformer.pushEvents(events);
    graphVersion.update(v => v + 1);
}

/**
 * Backend'den gelen hazır graf verisini yükler
 * @param {Object} graphData - GET_GRAPH_DATA komutu çıktısı
 */
export function loadGraphFromBackend(graphData) {
    transformer.loadFromBackend(graphData);
    graphVersion.update(v => v + 1);
}

/**
 * D3.js için filtrelenmiş graf verisini döndürür
 * İzolasyon modu aktifse sadece odaklanılan sürece ait veriler döner
 * @returns {Object} { nodes[], links[], stats }
 */
export function getFilteredGraphData() {
    const config = get(graphConfig);
    const focused = get(focusedProcess);
    
    const filterOpts = {
        ...(config.filter || {}),
        focusedProcess: focused
    };
    
    const data = transformer.getGraphData(filterOpts);
    
    // İstatistikleri güncelle
    graphStats.set(data.stats);
    
    return data;
}

/**
 * Grafı tamamen temizler
 */
export function resetGraph() {
    transformer.reset();
    graphVersion.set(0);
    selectedNode.set(null);
    selectedEdge.set(null);
    graphStats.set({
        totalNodes: 0,
        totalEdges: 0,
        visibleNodes: 0,
        visibleEdges: 0,
        processedEvents: 0
    });
}

/**
 * Yol normalleştirme derinliğini ayarlar
 * @param {number} depth - 0 = tam yol, N = ilk N segment
 */
export function setPathDepth(depth) {
    transformer.pathDepth = depth;
    graphVersion.update(v => v + 1);
}

/**
 * Transformer referansını döndürür (ileri seviye kullanım)
 * @returns {GraphTransformer}
 */
export function getTransformer() {
    return transformer;
}

/**
 * Belirli bir sürece odaklanır (izolasyon modu)
 * @param {number} pid - Süreç PID'si
 * @param {string} name - Süreç adı
 * @param {boolean} includeChildren - Alt süreçleri de dahil et
 */
export function setProcessFocus(pid, name, includeChildren = true) {
    focusedProcess.set({ pid, name, includeChildren });
    graphVersion.update(v => v + 1);
}

/**
 * İzolasyon modunu kapat (tüm süreçleri göster)
 */
export function clearProcessFocus() {
    focusedProcess.set(null);
    graphVersion.update(v => v + 1);
}

/**
 * Mevcut graf verisindeki tüm benzersiz süreçleri döndürür
 * Süreç seçici UI'ı için kullanılır
 * @returns {Object[]} [{ pid, name, evtCount, user }]
 */
export function getAvailableProcesses() {
    const processes = [];
    for (const [, node] of transformer.nodes) {
        if (node.type === 'process' && node.metadata?.pid) {
            processes.push({
                pid: node.metadata.pid,
                name: node.label,
                evtCount: node.evtCount || 0,
                user: node.metadata.user || '',
                ppid: node.metadata.ppid || 0
            });
        }
    }
    // Event sayısına göre sırala (en aktif ilk)
    return processes.sort((a, b) => b.evtCount - a.evtCount);
}
