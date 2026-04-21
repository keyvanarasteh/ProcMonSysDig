/**
 * network-parser.js — Ağ Bilgisi Ayrıştırıcı
 * 
 * Sysdig event verilerinden ağ bilgilerini (IP, port, protokol) çıkarır.
 * fd.name alanını parse ederek kaynak ve hedef adresleri ayırır.
 * 
 * Desteklenen formatlar:
 *   - "192.168.1.1:443"                     → tek endpoint
 *   - "192.168.1.1:443->10.0.0.1:80"        → kaynak→hedef
 *   - "[::1]:8080"                           → IPv6
 *   - "[2001:db8::1]:443->[::1]:80"          → IPv6 kaynak→hedef
 */

/**
 * fd.name alanından ağ bağlantı bilgilerini çıkarır
 * @param {string} fdName - Sysdig fd.name değeri
 * @returns {Object|null} Ayrıştırılmış ağ bilgisi veya null
 */
export function parseNetworkFd(fdName) {
    if (!fdName || typeof fdName !== 'string') return null;

    // Kaynak → Hedef formatı: "src_ip:port->dst_ip:port"
    const arrowIdx = fdName.indexOf('->');
    if (arrowIdx !== -1) {
        const srcPart = fdName.substring(0, arrowIdx);
        const dstPart = fdName.substring(arrowIdx + 2);

        const src = _parseEndpoint(srcPart);
        const dst = _parseEndpoint(dstPart);

        if (src || dst) {
            return {
                raw: fdName,
                source: src,
                destination: dst,
                direction: 'bidirectional',
                label: _buildLabel(src, dst)
            };
        }
    }

    // Tek endpoint formatı
    const endpoint = _parseEndpoint(fdName);
    if (endpoint) {
        return {
            raw: fdName,
            source: null,
            destination: endpoint,
            direction: 'outbound',
            label: `${endpoint.ip}:${endpoint.port}`
        };
    }

    return null;
}

/**
 * Tek bir IP:port endpoint'ini ayrıştırır
 * @private
 * @param {string} str - Endpoint metni
 * @returns {Object|null} { ip, port, isIPv6 }
 */
function _parseEndpoint(str) {
    if (!str) return null;
    const trimmed = str.trim();

    // IPv6 formatı: [2001:db8::1]:443
    const ipv6Match = trimmed.match(/^\[([^\]]+)\]:(\d+)$/);
    if (ipv6Match) {
        return {
            ip: ipv6Match[1],
            port: parseInt(ipv6Match[2], 10),
            isIPv6: true
        };
    }

    // IPv4 formatı: 192.168.1.1:443
    const ipv4Match = trimmed.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+)$/);
    if (ipv4Match) {
        return {
            ip: ipv4Match[1],
            port: parseInt(ipv4Match[2], 10),
            isIPv6: false
        };
    }

    // Sadece port numarası (bazen unix domain socket olabilir)
    const portOnly = trimmed.match(/^:(\d+)$/);
    if (portOnly) {
        return {
            ip: '0.0.0.0',
            port: parseInt(portOnly[1], 10),
            isIPv6: false
        };
    }

    return null;
}

/**
 * Kaynak ve hedef bilgilerinden okunabilir bir etiket üretir
 * @private
 * @param {Object|null} src - Kaynak endpoint
 * @param {Object|null} dst - Hedef endpoint
 * @returns {string} Etiket
 */
function _buildLabel(src, dst) {
    const srcStr = src ? `${src.ip}:${src.port}` : '?';
    const dstStr = dst ? `${dst.ip}:${dst.port}` : '?';
    return `${srcStr} → ${dstStr}`;
}

/**
 * Event verisinden en iyi ağ hedef tanımlayıcısını çıkarır
 * fd.name, fd_sip/sport, fd_dip/dport alanlarından en zengin olanı seçer
 * @param {Object} event - Zenginleştirilmiş event nesnesi
 * @returns {string} Ağ hedefi tanımlayıcısı (graf düğüm ID'si için)
 */
export function extractNetworkTarget(event) {
    // Önce fd.name'den parse etmeyi dene
    const parsed = parseNetworkFd(event.fd_name);
    if (parsed && parsed.destination) {
        return `${parsed.destination.ip}:${parsed.destination.port}`;
    }

    // fd.dip ve fd.dport varsa kullan
    if (event.fd_dip && event.fd_dport) {
        return `${event.fd_dip}:${event.fd_dport}`;
    }

    // fd.sip ve fd.sport varsa (dinleme tarafı)
    if (event.fd_sip && event.fd_sport) {
        return `${event.fd_sip}:${event.fd_sport}`;
    }

    // Hiçbir şey çıkarılamadıysa ham fd.name döndür
    return event.fd_name || 'unknown:0';
}

/**
 * Verilen IP adresinin özel (private) ağda olup olmadığını kontrol eder
 * @param {string} ip - IPv4 adresi
 * @returns {boolean} Özel ağda mı
 */
export function isPrivateIP(ip) {
    if (!ip) return false;
    // RFC 1918 özel ağ aralıkları
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return false;
    
    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 127.0.0.0/8 (loopback)
    if (parts[0] === 127) return true;
    
    return false;
}
