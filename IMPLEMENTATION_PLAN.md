# Process Tree (Süreç Ağacı) Feature

## Amaç
Dashboard'a **Process Tree** (süreç ağacı) görünümü eklemek. Hangi sürecin hangi sürecin altında çalıştığını hiyerarşik ağaç yapısıyla göstermek. Her süreç satırında erişilebilen tüm veriler (PID, PPID, User, CPU%, MEM%, Command, Executable Path, vb.) sütun olarak gösterilecek.

## Proposed Changes

### Backend (`backend.js`)
#### [MODIFY] [backend.js](file:///home/drvoid/Documents/ProcMonSysDig/backend.js)

1. **`GET_PROCESS_TREE` komutu ekle** — `ps -eo pid,ppid,user,%cpu,%mem,stat,tty,start,time,comm,args --no-headers` çalıştırarak tüm süreç bilgilerini topla.
2. Sysdig event payload'a `proc.ppid` alanını ekle (parent PID bilgisi).

---

### Frontend (`sysdig.html`)
#### [MODIFY] [sysdig.html](file:///home/drvoid/Documents/ProcMonSysDig/sysdig.html)

**CSS Eklemeleri:**
- [/] Tree view container, tree node, expand/collapse toggle, indentation, connector line stilleri
- [/] Tab bar CSS (Event Table / Process Tree arası geçiş)

**HTML Eklemeleri:**
- [/] Ana kontrol alanına **Tab Bar** (Event Table | Process Tree) ekle
- [/] Process Tree container div (`#process-tree-container`) ekle
- [/] Tree içinde: arama kutusu + yenile butonu + kolon başlıkları + ağaç gövdesi

**JavaScript Eklemeleri:**
- [/] `switchTab(tabName)` — Tab geçişi (Event Table / Process Tree)
- [/] `loadProcessTree()` — Backend'den `GET_PROCESS_TREE` verisini çek
- [/] `buildTreeStructure(flatList)` — Düz listeyi parent-child ağaç yapısına dönüştür (PPID → children map)
- [/] `renderTree(treeNodes, container, depth)` — Recursive rendering: indent + connector çizgileri + expand/collapse toggle
- [/] `toggleTreeNode(pid)` — Alt süreçleri aç/kapa
- [/] `filterTree(searchTerm)` — Ağaç üzerinde arama
- [/] Tree verisini WebSocket `onmessage` handler'a entegre et (`lookup_type === 'PROCESS_TREE'`)

**Gösterilecek Sütunlar:**
| Sütun | Açıklama |
|-------|----------|
| PID | Process ID |
| PPID | Parent PID |
| USER | Çalıştıran kullanıcı |
| %CPU | CPU kullanım yüzdesi |
| %MEM | Bellek kullanım yüzdesi |
| STAT | Süreç durumu (R/S/Z/D) |
| TTY | Terminal |
| START | Başlangıç zamanı |
| TIME | CPU zamanı |
| COMMAND | Kısa komut adı |
| CMDLINE | Tam komut satırı |

---

## Task Checklist

- [ ] **Backend:** `GET_PROCESS_TREE` komutunu `backend.js`'e ekle
- [ ] **Backend:** Sysdig event payload'a `proc.ppid` ekle
- [ ] **Frontend CSS:** Tree view ve tab bar stilleri
- [ ] **Frontend HTML:** Tab bar + Process Tree container
- [ ] **Frontend JS:** Tab geçiş, tree build, recursive render, expand/collapse, search
- [ ] **Test:** Demo mode'da ve gerçek sysdig bağlantıda test et

---

## Verification Plan

### Browser Test
1. `sudo ./run.sh` ile backend ve frontend'i başlat
2. Tarayıcıda `http://localhost:3000` (veya ilgili port) açarak dashboard'u görüntüle
3. **Process Tree** tabına tıkla, ağaç yapısının doğru hiyerarşik göründüğünü doğrula
4. Bir parent node'u tıklayarak expand/collapse çalıştığını kontrol et
5. Arama kutusuna bir süreç adı yaz, filtrelemenin çalıştığını doğrula
6. Tüm 11 sütunun gösterildiğini kontrol et
7. Event Table tabına geri dön, mevcut işlevselliğin bozulmadığını kontrol et
