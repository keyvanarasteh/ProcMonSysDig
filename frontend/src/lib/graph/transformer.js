/**
 * transformer.js — Grafik Veri Dönüştürücü
 * 
 * Ham syscall event dizisini graf düğüm (node) ve kenar (edge) yapısına
 * dönüştürür. Frontend'de D3.js force-directed layout motoru tarafından
 * doğrudan tüketilebilecek format üretir.
 * 
 * Akış: Raw events[] → { nodes: Map, edges: Map } → { nodes[], edges[] }
 */

import { NODE_TYPES, EDGE_TYPES, EVENT_CATEGORIES, createNode, createEdge } from './types.js';
import { extractNetworkTarget } from './network-parser.js';
import { normalizePath, getShortLabel, guessFileType } from './path-normalizer.js';
import { getProcessStyle, getFileStyle, getEdgeColor, getEdgeWidth } from './theme.js';

/**
 * GraphTransformer — Raw event listesinden graf verisi üreten jeneratör.
 * Inkremental destekli: tekrar tekrar push() ile event eklenebilir.
 */
export class GraphTransformer {
    constructor() {
        /** @type {Map<string, Object>} Düğüm haritası (id → GraphNode) */
        this.nodes = new Map();
        
        /** @type {Map<string, Object>} Kenar haritası (key → GraphEdge) */
        this.edges = new Map();
        
        /** @type {number} İşlenmiş event sayısı */
        this.processedCount = 0;

        /** @type {number} Yol kısaltma derinliği (0 = yok) */
        this.pathDepth = 0;
    }

    /**
     * Tek bir event'i grafa ekler (inkremental güncelleme)
     * @param {Object} event - Zenginleştirilmiş event nesnesi
     */
    pushEvent(event) {
        if (!event || !event.evt_type) return;
        
        this.processedCount++;
        const now = event.evt_timestamp || Date.now();

        // 1. Süreç düğümünü kaydet/güncelle
        const procId = this._ensureProcessNode(event, now);

        // 2. Event kategorisine göre kenar ve hedef düğüm oluştur
        const category = EVENT_CATEGORIES[event.evt_type];
        
        if (category === 'process_spawn') {
            this._handleProcessSpawn(event, procId, now);
        } else if (this._isNetworkEvent(event)) {
            this._handleNetworkIO(event, procId, now);
        } else if (event.fd_name && event.fd_name.length > 0) {
            this._handleFileIO(event, procId, now);
        }
    }

    /**
     * Birden fazla event'i toplu olarak ekler
     * @param {Object[]} events - Event dizisi
     */
    pushEvents(events) {
        if (!Array.isArray(events)) return;
        for (const event of events) {
            this.pushEvent(event);
        }
    }

    /**
     * Backend'den gelen hazır graf verisini doğrudan yükler
     * (GET_GRAPH_DATA komutu ile dönen veri)
     * @param {Object} graphData - { nodes[], edges[], totalEvents, ... }
     */
    loadFromBackend(graphData) {
        if (!graphData) return;

        this.nodes.clear();
        this.edges.clear();

        // Düğümleri yükle
        if (graphData.nodes) {
            for (const node of graphData.nodes) {
                this.nodes.set(node.id, {
                    ...node,
                    // D3 layout alanları
                    x: node.x || undefined,
                    y: node.y || undefined,
                    fx: null,
                    fy: null
                });
            }
        }

        // Kenarları yükle
        if (graphData.edges) {
            for (const edge of graphData.edges) {
                const key = `${edge.source}→${edge.target}`;
                this.edges.set(key, { ...edge });
            }
        }

        this.processedCount = graphData.totalEvents || 0;
    }

    /**
     * D3.js force layout için hazır { nodes[], links[] } döndürür
     * focusedProcess varsa sadece o süreç ve komşuları gösterilir (izolasyon modu)
     * @param {Object} filterConfig - Filtre ayarları + focusedProcess
     * @returns {Object} { nodes: Object[], links: Object[], stats: Object }
     */
    getGraphData(filterConfig = {}) {
        const {
            showProcesses = true,
            showFiles = true,
            showNetwork = true,
            minEdgeWeight = 1,
            noiseThreshold = 0,
            focusedProcess = null
        } = filterConfig;

        // ─── İzolasyon Modu: Sadece odaklanan süreç ve komşuları ────
        let isolatedNodeIds = null; // null = izolasyon yok
        if (focusedProcess && focusedProcess.pid !== undefined) {
            isolatedNodeIds = this._buildIsolationSet(focusedProcess);
        }

        // Filtrelenmiş düğümleri topla
        const visibleNodeIds = new Set();
        const filteredNodes = [];

        for (const [id, node] of this.nodes) {
            // İzolasyon filtresi: eğer aktifse, sadece izole edilen düğümler
            if (isolatedNodeIds && !isolatedNodeIds.has(id)) continue;

            // Tür filtreleri
            if (node.type === 'process' && !showProcesses) continue;
            if (node.type === 'file' && !showFiles) continue;
            if (node.type === 'network' && !showNetwork) continue;
            // Gürültü filtresi (izolasyon modunda devre dışı)
            if (!isolatedNodeIds && noiseThreshold > 0 && node.evtCount <= noiseThreshold && node.type !== 'process') continue;

            visibleNodeIds.add(id);
            
            // Tema bilgilerini ekle
            const styledNode = this._applyNodeStyle(node);
            // Odaklanan süreç ise vurgula
            if (focusedProcess && node.type === 'process' && node.metadata?.pid === focusedProcess.pid) {
                styledNode._isFocused = true;
            }
            filteredNodes.push(styledNode);
        }

        // Filtrelenmiş kenarları topla
        const filteredEdges = [];
        for (const [, edge] of this.edges) {
            // Her iki ucu da görünür olmalı
            const sourceId = typeof edge.source === 'string' ? edge.source : edge.source?.id;
            const targetId = typeof edge.target === 'string' ? edge.target : edge.target?.id;
            
            if (!visibleNodeIds.has(sourceId) || !visibleNodeIds.has(targetId)) continue;
            // Minimum ağırlık filtresi
            if (edge.count < minEdgeWeight) continue;

            filteredEdges.push({
                ...edge,
                source: sourceId,
                target: targetId,
                color: getEdgeColor(edge.edgeType, edge.lastEvtType),
                width: getEdgeWidth(edge.count)
            });
        }

        return {
            nodes: filteredNodes,
            links: filteredEdges,
            stats: {
                totalNodes: this.nodes.size,
                totalEdges: this.edges.size,
                visibleNodes: filteredNodes.length,
                visibleEdges: filteredEdges.length,
                processedEvents: this.processedCount,
                isolationActive: !!isolatedNodeIds,
                focusedPid: focusedProcess?.pid || null
            }
        };
    }

    /**
     * İzolasyon kümesini oluşturur: odaklanan süreç + doğrudan bağlı tüm düğümler
     * @private
     * @param {Object} focus - { pid, name, includeChildren }
     * @returns {Set<string>} İzole edilecek düğüm ID'leri
     */
    _buildIsolationSet(focus) {
        const isolatedIds = new Set();
        const targetPid = focus.pid;

        // 1. Odaklanan süreci bul (PID veya isim eşleşmesi)
        const focusedProcIds = [];
        for (const [id, node] of this.nodes) {
            if (node.type === 'process' && node.metadata?.pid === targetPid) {
                focusedProcIds.push(id);
                isolatedIds.add(id);
            }
        }

        // İsim bazlı arama (PID bulunamazsa)
        if (focusedProcIds.length === 0 && focus.name) {
            for (const [id, node] of this.nodes) {
                if (node.type === 'process' && node.label === focus.name) {
                    focusedProcIds.push(id);
                    isolatedIds.add(id);
                }
            }
        }

        // 2. Alt süreç ağacı (includeChildren = true)
        if (focus.includeChildren) {
            this._collectChildProcesses(targetPid, isolatedIds);
        }

        // 3. Kenarlar üzerinden doğrudan bağlı düğümleri bul
        for (const [, edge] of this.edges) {
            const sourceId = typeof edge.source === 'string' ? edge.source : edge.source?.id;
            const targetId = typeof edge.target === 'string' ? edge.target : edge.target?.id;

            // Odaklanan süreç kaynak veya hedef ise, karşı tarafı da dahil et
            if (isolatedIds.has(sourceId)) {
                isolatedIds.add(targetId);
            }
            if (isolatedIds.has(targetId)) {
                isolatedIds.add(sourceId);
            }
        }

        // 4. İkinci geçiş: child process'lerin dosya/ağ bağlantılarını da dahil et
        const childProcIds = new Set(isolatedIds);
        for (const [, edge] of this.edges) {
            const sourceId = typeof edge.source === 'string' ? edge.source : edge.source?.id;
            const targetId = typeof edge.target === 'string' ? edge.target : edge.target?.id;

            if (childProcIds.has(sourceId)) {
                isolatedIds.add(targetId);
            }
            if (childProcIds.has(targetId)) {
                isolatedIds.add(sourceId);
            }
        }

        return isolatedIds;
    }

    /**
     * Belirli bir PID'nin alt süreçlerini rekürsif olarak toplar
     * @private
     * @param {number} parentPid - Ebeveyn PID
     * @param {Set<string>} collected - Toplanan düğüm ID'leri
     */
    _collectChildProcesses(parentPid, collected) {
        for (const [id, node] of this.nodes) {
            if (node.type === 'process' && node.metadata?.ppid === parentPid && !collected.has(id)) {
                collected.add(id);
                // Rekürsif: bu çocuğun çocuklarını da topla
                if (node.metadata?.pid) {
                    this._collectChildProcesses(node.metadata.pid, collected);
                }
            }
        }
    }

    /**
     * Grafı temizler
     */
    reset() {
        this.nodes.clear();
        this.edges.clear();
        this.processedCount = 0;
    }

    // ─── Private Metotlar ─────────────────────────────────────────

    /**
     * Süreç düğümünü oluşturur veya günceller
     * @private
     */
    _ensureProcessNode(event, now) {
        const procId = `process:${event.proc_name}:${event.proc_pid}`;
        const existing = this.nodes.get(procId);

        if (existing) {
            existing.evtCount++;
            existing.lastSeen = now;
        } else {
            const node = createNode(NODE_TYPES.PROCESS, procId, event.proc_name, {
                pid: event.proc_pid,
                ppid: event.proc_ppid,
                user: event.user_name,
                exe: event.proc_exe || '',
                tid: event.thread_tid || 0
            });
            node.evtCount = 1;
            node.firstSeen = now;
            node.lastSeen = now;
            this.nodes.set(procId, node);
        }

        return procId;
    }

    /**
     * fork/exec/clone event'lerini işler → süreç→süreç kenarı
     * @private
     */
    _handleProcessSpawn(event, procId, now) {
        // Eventı üreten süreç parent, hedef çocuk
        // Sysdig'de fork olayında proc_pid çocuğun PID'si, proc_ppid parent'ın PID'si
        if (event.proc_ppid && event.proc_ppid !== 0) {
            // Parent düğümünü de kaydet (henüz yoksa basit bir placeholder)
            const parentId = this._findOrCreateParentNode(event, now);
            
            // Kenar: parent → child
            const edgeKey = `${parentId}→${procId}`;
            this._upsertEdge(edgeKey, parentId, procId, EDGE_TYPES.PROCESS_SPAWN, event, now);
        }
    }

    /**
     * Ağ I/O event'lerini işler → süreç→ağ kenarı
     * @private
     */
    _handleNetworkIO(event, procId, now) {
        const target = extractNetworkTarget(event);
        const netId = `network:${target}`;

        // Ağ düğümünü kaydet
        if (!this.nodes.has(netId)) {
            const node = createNode(NODE_TYPES.NETWORK, netId, target, {
                ip: event.fd_dip || event.fd_sip || '',
                port: event.fd_dport || event.fd_sport || ''
            });
            node.firstSeen = now;
            node.lastSeen = now;
            node.evtCount = 1;
            this.nodes.set(netId, node);
        } else {
            const node = this.nodes.get(netId);
            node.evtCount++;
            node.lastSeen = now;
        }

        // Kenar: process → network
        const edgeKey = `${procId}→${netId}`;
        this._upsertEdge(edgeKey, procId, netId, EDGE_TYPES.NETWORK_IO, event, now);
    }

    /**
     * Dosya I/O event'lerini işler → süreç→dosya kenarı
     * @private
     */
    _handleFileIO(event, procId, now) {
        const fdName = event.fd_name;
        const normalizedPath = this.pathDepth > 0 ? normalizePath(fdName, this.pathDepth) : fdName;
        const fileId = `file:${normalizedPath}`;

        // Dosya düğümünü kaydet
        if (!this.nodes.has(fileId)) {
            const fileType = guessFileType(fdName);
            const node = createNode(NODE_TYPES.FILE, fileId, getShortLabel(normalizedPath), {
                fullPath: fdName,
                normalizedPath,
                fileType
            });
            node.firstSeen = now;
            node.lastSeen = now;
            node.evtCount = 1;
            this.nodes.set(fileId, node);
        } else {
            const node = this.nodes.get(fileId);
            node.evtCount++;
            node.lastSeen = now;
        }

        // Kenar: process → file
        const edgeKey = `${procId}→${fileId}`;
        this._upsertEdge(edgeKey, procId, fileId, EDGE_TYPES.FILE_IO, event, now);
    }

    /**
     * Event'in ağ olayı olup olmadığını kontrol eder
     * @private
     */
    _isNetworkEvent(event) {
        // fd.typechar IPv4/IPv6 ise
        if (event.fd_typechar === '4' || event.fd_typechar === '6') return true;
        // Bilinen ağ syscall'ları
        const netSyscalls = ['connect', 'accept', 'accept4', 'bind', 'listen', 
                             'sendto', 'recvfrom', 'sendmsg', 'recvmsg'];
        if (netSyscalls.includes(event.evt_type)) return true;
        // fd.name IP:port formatında
        if (event.fd_name && /\d+\.\d+\.\d+\.\d+:\d+/.test(event.fd_name)) return true;
        return false;
    }

    /**
     * Parent süreç düğümünü bulur veya placeholder oluşturur
     * @private
     */
    _findOrCreateParentNode(event, now) {
        // Mevcut düğümler arasında PPID ile eşleşen süreci ara
        for (const [id, node] of this.nodes) {
            if (node.type === 'process' && node.metadata?.pid === event.proc_ppid) {
                return id;
            }
        }
        // Bulunamazsa placeholder oluştur
        const parentId = `process:parent_${event.proc_ppid}:${event.proc_ppid}`;
        if (!this.nodes.has(parentId)) {
            const node = createNode(NODE_TYPES.PROCESS, parentId, `PID:${event.proc_ppid}`, {
                pid: event.proc_ppid,
                ppid: 0,
                user: '',
                exe: ''
            });
            node.firstSeen = now;
            node.lastSeen = now;
            node.evtCount = 0;
            this.nodes.set(parentId, node);
        }
        return parentId;
    }

    /**
     * Kenar oluşturur veya günceller (upsert)
     * @private
     */
    _upsertEdge(key, source, target, edgeType, event, now) {
        const existing = this.edges.get(key);
        if (existing) {
            existing.count++;
            existing.lastEvtType = event.evt_type;
            existing.lastSeen = now;
            existing.types[event.evt_type] = (existing.types[event.evt_type] || 0) + 1;
        } else {
            const edge = createEdge(source, target, edgeType);
            edge.count = 1;
            edge.lastEvtType = event.evt_type;
            edge.firstSeen = now;
            edge.lastSeen = now;
            edge.types = { [event.evt_type]: 1 };
            this.edges.set(key, edge);
        }
    }

    /**
     * Düğüme tema/stil bilgisi ekler
     * @private
     */
    _applyNodeStyle(node) {
        const styled = { ...node };
        
        if (node.type === 'process') {
            const style = getProcessStyle({
                name: node.label,
                pid: node.metadata?.pid,
                user: node.metadata?.user,
                exe: node.metadata?.exe
            });
            styled.style = style;
        } else if (node.type === 'file') {
            const style = getFileStyle(node.metadata?.fileType || 'generic');
            styled.style = style;
        } else if (node.type === 'network') {
            styled.style = {
                category: 'network',
                color: '#ffb03a',
                icon: '🌐',
                shape: 'hexagon'
            };
        }

        return styled;
    }
}
