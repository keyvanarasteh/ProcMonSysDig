/**
 * path-normalizer.js — Dosya Yolu Normalleştirici
 * 
 * Uzun dosya yollarını grafikte okunabilir hale getirmek için kısaltır.
 * ProcDot'un "path depth" özelliğine benzer şekilde, kullanıcının belirlediği
 * derinlikte dosya yollarını keser.
 * 
 * Örnekler:
 *   normalizePath("/usr/lib/x86_64-linux-gnu/libssl.so.3", 3) 
 *     → "/usr/lib/.../libssl.so.3"
 *   
 *   normalizePath("/home/user/projects/app/src/index.js", 0)
 *     → "/home/user/projects/app/src/index.js"  (değiştirmez)
 */

/**
 * Dosya yolunu belirtilen derinliğe göre normalleştirir
 * @param {string} path - Ham dosya yolu
 * @param {number} depth - Maksimum derinlik (0 = kısaltma yok)
 * @returns {string} Normalleştirilmiş yol
 */
export function normalizePath(path, depth = 0) {
    if (!path || typeof path !== 'string') return path || '';
    if (depth <= 0) return path;

    const parts = path.split('/').filter(p => p.length > 0);
    
    // Yol yeterince kısa ise dokunma
    if (parts.length <= depth + 1) return path;

    // İlk N segment + dosya adı
    const head = parts.slice(0, depth);
    const tail = parts[parts.length - 1];

    return '/' + head.join('/') + '/.../' + tail;
}

/**
 * Dosya yolundan kısa etiket üretir (sadece dosya adı)
 * @param {string} path - Tam dosya yolu
 * @returns {string} Kısa etiket
 */
export function getShortLabel(path) {
    if (!path || typeof path !== 'string') return path || '';
    
    // Son segment
    const lastSlash = path.lastIndexOf('/');
    if (lastSlash === -1) return path;
    
    return path.substring(lastSlash + 1) || path;
}

/**
 * Dosya yolunun türünü tahmin eder
 * @param {string} path - Dosya yolu
 * @returns {string} Dosya türü: 'binary', 'config', 'log', 'socket', 'pipe', 'device', 'library', 'generic'
 */
export function guessFileType(path) {
    if (!path) return 'generic';

    // Cihaz dosyaları
    if (path.startsWith('/dev/')) return 'device';
    // /proc dosya sistemi
    if (path.startsWith('/proc/')) return 'proc';
    // /sys dosya sistemi
    if (path.startsWith('/sys/')) return 'sys';
    // Soket dosyaları
    if (path.includes('.sock') || path.includes('socket')) return 'socket';
    // Pipe/FIFO
    if (path.startsWith('pipe:') || path.includes('fifo')) return 'pipe';
    // Log dosyaları
    if (path.includes('/log/') || path.endsWith('.log')) return 'log';
    // Yapılandırma dosyaları
    if (path.startsWith('/etc/') || path.endsWith('.conf') || path.endsWith('.cfg') || path.endsWith('.ini')) return 'config';
    // Paylaşımlı kütüphaneler
    if (path.endsWith('.so') || path.includes('.so.')) return 'library';
    // Çalıştırılabilir
    if (path.startsWith('/usr/bin/') || path.startsWith('/usr/sbin/') || path.startsWith('/bin/') || path.startsWith('/sbin/')) return 'binary';
    // Geçici dosyalar
    if (path.startsWith('/tmp/') || path.startsWith('/var/tmp/')) return 'temp';
    
    return 'generic';
}

/**
 * İki dosya yolunun aynı gruba ait olup olmadığını kontrol eder
 * Clustering için kullanılır.
 * @param {string} path1 - İlk dosya yolu
 * @param {string} path2 - İkinci dosya yolu
 * @param {number} groupDepth - Karşılaştırma derinliği
 * @returns {boolean} Aynı gruba mı ait
 */
export function isSameGroup(path1, path2, groupDepth = 3) {
    if (!path1 || !path2) return false;
    
    const parts1 = path1.split('/').slice(0, groupDepth + 1);
    const parts2 = path2.split('/').slice(0, groupDepth + 1);
    
    return parts1.join('/') === parts2.join('/');
}
