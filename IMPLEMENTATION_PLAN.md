# SvelteKit Migration Feature

## Amaç
Şu anki tek dosyalı `sysdig.html` arayüzünü daha modüler, genişletilebilir ve bakımı kolay olması için modern bir **SvelteKit** uygulamasına dönüştürmek.
`sysdig.html` içinde bulunan Event Table, Process Tree, WebSocket haberleşmesi, modal pencereleri, vb. tüm yapı taşları SvelteKit komponentleri (`.svelte` dosyaları) ve state yönetim (Svelte stores) yapılarına bölünecek.

## Proposed Changes

### Frontend (`frontend/`)
#### [NEW] [frontend/](file:///home/drvoid/Documents/ProcMonSysDig/frontend)

SvelteKit uygulaması oluşturulacak. İçerisinde aşağıdaki modüller yer alacak:

1. **State Yönetimi (`src/lib/stores.js`)**: 
   - WebSocket bağlantı durumu (Svelte store)
   - `treeData` ve Event verileri
   - Filtreler ve UI (modal) state yönetimi

2. **WebSocket Servisi (`src/lib/websocket.js`)**:
   - `connectSocket`, reconnect mantığı ve backend'den gelen mesajları store'lara aktarma mantığı.

3. **Ana Bileşenler (`src/lib/components/`)**:
   - `ControlSidebar.svelte` - Filtre girişlerinin yapıldığı yan çubuk.
   - `TabBar.svelte` - Tree ve Table arası geçiş butonları.
   - `EventTable.svelte` - Event verilerinin grid formatında gösterildiği tablo bileşeni.
   - `ProcessTree.svelte` - Backend'den gelen `GET_PROCESS_TREE` verilerinin render edildiği ağaç komponenti.
   - `InstallModal.svelte` - Sistem statüsünün ve backend kurulum durumunun gösterildiği modal.
   - `LookupModal.svelte` - Dinamik veri seçme ekranı modalı.
   - `EventDetailModal.svelte` - Tıklanan bir event'in detaylarını (Process ve PPID) gösteren detay ekranı.

4. **Kök Sayfa (`src/routes/+page.svelte`)**:
   - Ana yerleşim düzeni (layout). Sidebar ve ana çalışma alanını (EventTable ve ProcessTree) barındıracak.
   - Açılan modalları yönlendirecek.
   - `onMount` üzerinde WebSocket servisini başlatacak.

5. **Stil Aktarımı (`src/app.css`)**:
   - `sysdig.html` içindeki Cyberpunk/Glassmorphism stili `app.css` içerisine taşınacak ve Svelte scope izolasyonu sayesinde gerekirse komponent seviyesinde bölünecek.

## Task Checklist
- [/] **Planlama**: Svelte projesini planla ve `IMPLEMENTATION_PLAN.md`'ye aktar
- [ ] **SvelteKit Init**: `frontend` dizini altında `npx create-svelte` kullanarak iskeleti oluştur
- [ ] **Bağımlılıklar**: Proje bağımlılıklarını kur ve global stilleri aktar
- [ ] **WebSocket Store**: WebSocket alt yapısını `stores.js` içerisine yaz
- [ ] **Components - Layouts**: Uygulama çerçevesini ve Sidebar filtrelerini oluştur
- [ ] **Components - Table**: Event table sayfasını taşı
- [ ] **Components - Tree**: Process tree ekranını component'leştir
- [ ] **Components - Modals**: Modal pencerelerini Svelte componentlerine çevir
- [ ] **Entegrasyon Testi**: Uygulamayı ayağa kaldır ve gerçek websocket verileri ile test et

## Verification Plan

### Manuel Onay
1. Frontend projesi oluşturulduktan sonra backend açıkken `npm run dev` çalıştırılır.
2. Ekrana `http://localhost:5173` adresi üzerinden gidilir.
3. Eventlerin ve process tree'nin mevcut versiyon gibi çalıştığı doğrulanır.
4. "sysdig.html" deki şık tasarım SvelteKit içerisinde aynen korunmuş olmalıdır.
