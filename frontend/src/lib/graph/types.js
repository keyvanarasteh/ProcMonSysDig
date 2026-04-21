/**
 * types.js — Grafik Veri Modeli Tanımları
 * 
 * Graf görselleştirmesi için kullanılan düğüm (GraphNode) ve kenar (GraphEdge)
 * veri yapılarını tanımlar. Bu dosya hem frontend transformer hem de 
 * D3.js render motoru tarafından kullanılır.
 * 
 * Düğüm Türleri:
 *   - process: Bir süreç (PID, isim, kullanıcı ile)
 *   - file:    Bir dosya veya dosya tanımlayıcı (fd)
 *   - network: Bir ağ bağlantısı (IP:port)
 * 
 * Kenar Türleri:
 *   - file_io:       Süreç → Dosya (read, write, open, close, stat...)
 *   - network_io:    Süreç → Ağ (connect, accept, send, recv...)
 *   - process_spawn: Süreç → Süreç (fork, clone, exec...)
 */

/**
 * Düğüm türleri sabitleri
 * @enum {string}
 */
export const NODE_TYPES = {
    PROCESS: 'process',
    FILE: 'file',
    NETWORK: 'network'
};

/**
 * Kenar türleri sabitleri
 * @enum {string}
 */
export const EDGE_TYPES = {
    FILE_IO: 'file_io',
    NETWORK_IO: 'network_io',
    PROCESS_SPAWN: 'process_spawn'
};

/**
 * Syscall event türleri ve kategorileri
 * @type {Object<string, string>}
 */
export const EVENT_CATEGORIES = {
    // Dosya I/O
    open: 'file_io',
    openat: 'file_io',
    openat2: 'file_io',
    read: 'file_io',
    write: 'file_io',
    close: 'file_io',
    stat: 'file_io',
    fstat: 'file_io',
    lstat: 'file_io',
    unlink: 'file_io',
    rename: 'file_io',
    mkdir: 'file_io',
    rmdir: 'file_io',
    chmod: 'file_io',
    chown: 'file_io',
    mmap: 'file_io',
    mmap2: 'file_io',
    
    // Ağ I/O
    connect: 'network_io',
    accept: 'network_io',
    accept4: 'network_io',
    bind: 'network_io',
    listen: 'network_io',
    sendto: 'network_io',
    recvfrom: 'network_io',
    sendmsg: 'network_io',
    recvmsg: 'network_io',
    socket: 'network_io',
    
    // Süreç yaşam döngüsü
    fork: 'process_spawn',
    vfork: 'process_spawn',
    clone: 'process_spawn',
    clone3: 'process_spawn',
    execve: 'process_spawn',
    execveat: 'process_spawn',
    exit: 'process_spawn',
    exit_group: 'process_spawn',
    wait4: 'process_spawn',
    waitpid: 'process_spawn'
};

/**
 * Varsayılan graf yapılandırması
 * @type {Object}
 */
export const DEFAULT_GRAPH_CONFIG = {
    /** Force-directed layout parametreleri */
    layout: {
        chargeStrength: -300,       // Düğümler arası itme kuvveti
        linkDistance: 120,          // Kenar uzunluğu
        centerGravity: 0.05,       // Merkeze çekim
        collisionRadius: 40,       // Çarpışma yarıçapı
        alphaDecay: 0.02,          // Simülasyon sönümleme hızı
        velocityDecay: 0.4         // Hız sönümleme
    },
    
    /** Düğüm görsel ayarları */
    nodes: {
        processRadius: 24,          // Süreç düğümü yarıçapı
        fileSize: 18,               // Dosya düğümü kare boyutu
        networkRadius: 20,          // Ağ düğümü yarıçapı
        labelFontSize: 11,          // Etiket yazı boyutu
        labelMaxLength: 25,         // Etiket maksimum karakter
        minOpacity: 0.3,            // Soluk düğüm opaklığı
        maxOpacity: 1.0             // Aktif düğüm opaklığı
    },
    
    /** Kenar görsel ayarları */
    edges: {
        minWidth: 1,                // Minimum kenar kalınlığı
        maxWidth: 8,                // Maksimum kenar kalınlığı
        arrowSize: 6,               // Ok ucu boyutu
        curvature: 0.2,             // Kenar eğriliği
        animationSpeed: 2           // Parçacık animasyon hızı (px/frame)
    },
    
    /** Filtreleme ayarları */
    filter: {
        minEdgeWeight: 1,           // Minimum kenar ağırlığı (göster)
        showProcesses: true,
        showFiles: true,
        showNetwork: true,
        noiseThreshold: 1,          // Gürültü eşiği (bu kadar ve altı etkileşimin düğümünü gizle)
        pathDepth: 0                // 0 = tam yol, 3 = ilk 3 segment
    },
    
    /** Zaman çizelgesi ayarları */
    timeline: {
        windowSeconds: 30,          // Canlı modda pencere genişliği (saniye)
        playbackSpeed: 1,           // Oynatma hızı çarpanı
        histogramBins: 60           // Timeline histogram sütun sayısı
    }
};

/**
 * Boş bir GraphNode nesnesi oluşturur
 * @param {string} type - Düğüm türü (NODE_TYPES)
 * @param {string} id - Benzersiz tanımlayıcı
 * @param {string} label - Görüntüleme etiketi
 * @param {Object} [metadata={}] - Ek veri
 * @returns {Object} GraphNode
 */
export function createNode(type, id, label, metadata = {}) {
    return {
        type,
        id,
        label,
        evtCount: 0,
        firstSeen: 0,
        lastSeen: 0,
        metadata,
        // D3 force layout tarafından doldurulacak
        x: undefined,
        y: undefined,
        fx: null,   // Sabitlenmiş X (null = serbest)
        fy: null    // Sabitlenmiş Y (null = serbest)
    };
}

/**
 * Boş bir GraphEdge nesnesi oluşturur
 * @param {string} source - Kaynak düğüm ID
 * @param {string} target - Hedef düğüm ID
 * @param {string} edgeType - Kenar türü (EDGE_TYPES)
 * @returns {Object} GraphEdge
 */
export function createEdge(source, target, edgeType) {
    return {
        source,
        target,
        edgeType,
        count: 0,
        types: {},          // { "read": 5, "write": 3 } gibi
        lastEvtType: '',
        firstSeen: 0,
        lastSeen: 0
    };
}
