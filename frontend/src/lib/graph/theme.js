/**
 * theme.js — Süreç Renk/İkon Haritası ve Görsel Tema
 * 
 * Graf görselleştirmesinde kullanılacak renk paletleri, ikon atamaları
 * ve düğüm/kenar görsel stillerini tanımlar. Mevcut cyberpunk/glassmorphism
 * temasıyla uyumlu neon renkler kullanır.
 */

/**
 * Düğüm türüne göre temel renkler
 * @type {Object<string, Object>}
 */
export const NODE_COLORS = {
    process: {
        fill: '#00f0ff',          // Cyan neon
        stroke: 'rgba(0, 240, 255, 0.6)',
        glow: 'rgba(0, 240, 255, 0.3)',
        text: '#f8fafc'
    },
    file: {
        fill: '#00ff9d',          // Yeşil neon
        stroke: 'rgba(0, 255, 157, 0.6)',
        glow: 'rgba(0, 255, 157, 0.3)',
        text: '#f8fafc'
    },
    network: {
        fill: '#ffb03a',          // Turuncu neon
        stroke: 'rgba(255, 176, 58, 0.6)',
        glow: 'rgba(255, 176, 58, 0.3)',
        text: '#f8fafc'
    }
};

/**
 * Kenar türüne göre renkler
 * @type {Object<string, Object>}
 */
export const EDGE_COLORS = {
    file_io: {
        read: '#00ff9d',          // Yeşil — okuma
        write: '#ffb03a',         // Turuncu — yazma
        open: '#00f0ff',          // Cyan — açma
        close: '#94a3b8',         // Gri — kapama
        delete: '#ff2a5f',        // Kırmızı — silme
        default: '#00ff9d'
    },
    network_io: {
        connect: '#ffb03a',       // Turuncu — bağlantı
        accept: '#00f0ff',        // Cyan — kabul
        send: '#00ff9d',          // Yeşil — gönderim
        recv: '#a78bfa',          // Mor — alım
        default: '#ffb03a'
    },
    process_spawn: {
        fork: '#ff2a5f',          // Kırmızı — fork
        exec: '#f472b6',          // Pembe — exec
        clone: '#a78bfa',         // Mor — clone
        default: '#ff2a5f'
    }
};

/**
 * Süreç türüne göre stil ataması
 * Süreç ismini ve kullanıcısını analiz ederek kategori belirler.
 * @param {Object} proc - Süreç bilgisi { name, pid, user, exe }
 * @returns {Object} Stil bilgisi { category, color, icon, priority }
 */
export function getProcessStyle(proc) {
    const name = (proc.name || proc.label || '').toLowerCase();
    const user = (proc.user || '').toLowerCase();
    const pid = parseInt(proc.pid, 10) || 0;

    // Kernel thread'leri (PID 2 veya kthread alt süreçleri, ismi k ile başlar)
    if (pid === 2 || (name.startsWith('k') && pid < 100)) {
        return {
            category: 'kernel',
            color: '#64748b',
            icon: '⚙',
            priority: 1,
            opacity: 0.5
        };
    }

    // init/systemd (PID 1)
    if (pid === 1 || name === 'systemd' || name === 'init') {
        return {
            category: 'system',
            color: '#f59e0b',
            icon: '🛡',
            priority: 10,
            opacity: 1.0
        };
    }

    // Web sunucuları
    if (['nginx', 'apache', 'apache2', 'httpd', 'caddy', 'lighttpd'].includes(name)) {
        return {
            category: 'webserver',
            color: '#10b981',
            icon: '🌐',
            priority: 8,
            opacity: 1.0
        };
    }

    // Veritabanları
    if (['mysql', 'mysqld', 'postgres', 'postgresql', 'mongod', 'redis-server', 'redis'].includes(name)) {
        return {
            category: 'database',
            color: '#3b82f6',
            icon: '🗄',
            priority: 8,
            opacity: 1.0
        };
    }

    // SSH/uzak erişim
    if (['sshd', 'ssh', 'telnetd', 'ftpd', 'vsftpd'].includes(name)) {
        return {
            category: 'remote',
            color: '#ef4444',
            icon: '🔑',
            priority: 9,
            opacity: 1.0
        };
    }

    // Shell/terminal
    if (['bash', 'sh', 'zsh', 'fish', 'dash', 'csh', 'ksh'].includes(name)) {
        return {
            category: 'shell',
            color: '#a78bfa',
            icon: '💻',
            priority: 7,
            opacity: 1.0
        };
    }

    // Node.js/Python/interpreter
    if (['node', 'python', 'python3', 'ruby', 'perl', 'java', 'php'].includes(name)) {
        return {
            category: 'runtime',
            color: '#06b6d4',
            icon: '⚡',
            priority: 6,
            opacity: 1.0
        };
    }

    // Güvenlik araçları
    if (['sysdig', 'procmon', 'wireshark', 'tcpdump', 'nmap', 'masscan'].includes(name)) {
        return {
            category: 'security',
            color: '#f43f5e',
            icon: '🔍',
            priority: 9,
            opacity: 1.0
        };
    }

    // Root süreçleri (bilinmeyen ama root olarak çalışan)
    if (user === 'root') {
        return {
            category: 'root',
            color: '#f59e0b',
            icon: '⭐',
            priority: 5,
            opacity: 0.9
        };
    }

    // Genel kullanıcı süreçleri
    return {
        category: 'user',
        color: '#00f0ff',
        icon: '●',
        priority: 3,
        opacity: 0.8
    };
}

/**
 * Dosya türüne göre stil ataması
 * @param {string} fileType - guessFileType() çıktısı
 * @returns {Object} Stil bilgisi { color, icon, shape }
 */
export function getFileStyle(fileType) {
    const styles = {
        config:  { color: '#fbbf24', icon: '⚙', shape: 'rect' },
        log:     { color: '#34d399', icon: '📄', shape: 'rect' },
        library: { color: '#60a5fa', icon: '📚', shape: 'rect' },
        binary:  { color: '#f472b6', icon: '⚡', shape: 'rect' },
        socket:  { color: '#a78bfa', icon: '🔌', shape: 'rect' },
        pipe:    { color: '#94a3b8', icon: '🔗', shape: 'rect' },
        device:  { color: '#fb923c', icon: '💾', shape: 'rect' },
        proc:    { color: '#64748b', icon: '📊', shape: 'rect' },
        sys:     { color: '#64748b', icon: '🔧', shape: 'rect' },
        temp:    { color: '#94a3b8', icon: '📎', shape: 'rect' },
        generic: { color: '#00ff9d', icon: '📁', shape: 'rect' }
    };

    return styles[fileType] || styles.generic;
}

/**
 * Kenar rengi seçer (event türüne göre)
 * @param {string} edgeType - Kenar ana türü (file_io, network_io, process_spawn)
 * @param {string} evtType - Son event türü (read, write, connect, fork...)
 * @returns {string} CSS renk değeri
 */
export function getEdgeColor(edgeType, evtType) {
    const palette = EDGE_COLORS[edgeType];
    if (!palette) return '#94a3b8';

    // Belirli event türü için renk ara
    for (const [key, color] of Object.entries(palette)) {
        if (key !== 'default' && evtType && evtType.toLowerCase().includes(key)) {
            return color;
        }
    }

    return palette.default || '#94a3b8';
}

/**
 * Etkileşim sayısına göre kenar kalınlığı hesaplar
 * Logaritmik ölçekleme kullanır
 * @param {number} count - Etkileşim sayısı
 * @param {number} minWidth - Minimum kalınlık
 * @param {number} maxWidth - Maksimum kalınlık
 * @returns {number} Kenar kalınlığı (px)
 */
export function getEdgeWidth(count, minWidth = 1, maxWidth = 8) {
    if (count <= 1) return minWidth;
    // log2 ölçekleme: 1→1, 2→2, 4→3, 8→4, 16→5, 32→6, 64→7, 128→8
    const logWidth = minWidth + Math.log2(count);
    return Math.min(logWidth, maxWidth);
}
