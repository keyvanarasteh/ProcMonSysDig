# ProcMon & Sysdig Inspect Web Dashboard

Bu proje, Linux sistemler üzerinde `sysdig` ve `procmon` araçlarını kullanarak çekirdek (eBPF) düzeyindeki işlem ve ağ aktivitelerini izlemek için modern, karanlık mod (Glassmorphism) destekli bir **Web Arayüzü (GUI)** sunar. 

Normalde tamamen Terminal (TUI) üzerinden siyah ekranda çalışan bu analiz araçlarını, WebSocket teknolojisiyle birleştirerek doğrudan tarayıcınıza taşır.

## 🌟 Özellikler
- **Gerçek Zamanlı Veri Akışı:** Terminalde dönen logları canlı canlı görselliğe ve tablolara dönüştürür.
- **100% Filtreleme Kapsamı:** `proc.name`, `proc.pid`, `fd.ip`, `fd.port`, `evt.type`, `user.name` gibi aklınıza gelebilecek tüm Sysdig yeteneklerini form elemanlarına bağlar ve arkaplan (backend) sorgularını otomatik yazar.
- **TypeScript Soket Köprüsü:** Sistemin eBPF modüllerini arka planda `child_process` ile başlatıp tüm JSON akışını yerel web sunucusuna (ws://) yönlendiren `sysdig.ts` mekanizması.
- **Sahte Veri (Demo) Modu:** Root yetkisi olmadan UI tasarımlarını denemek isteyenler için arayüzde yerleşik "Fake Injector".
- **Türkçe Belgeler:** Kurulum ve taktikler için `procmon-kurulum.md` ve `sysdig.md` dosyalarını inceleyebilirsiniz.

## 🚀 Başlangıç & Çalıştırma

Çekirdek düzeyinde izleme yapmak Linux'ta üst düzey yetki gerektirdiği için köprü sistemini **sudo** ile başlatmalısınız. Her şeyi sizin yerinize halleden otomatik betiği kullanmanız yeterlidir:

```bash
sudo ./run.sh
```

Bu betik sırasıyla WebSocket sunucusunu ayağa kaldıracak, arka planda dinlemeye başlayacak ve arayüz dosyası olan `sysdig.html`'i tarayıcınızda otomatik açacaktır. Dilediğiniz zaman `CTRL+C` yaparak tüm sunucuları güvenle temizleyerek (graceful shutdown) kapatabilirsiniz.

## 📁 Dosya Yapısı
- `run.sh` - Tüm sistemi başlatan otomatik tetikleyici.
- `sysdig.ts` - İşletim sistemiyle iletişim kurup JSON yollayan Node.JS WebSocket backend'i.
- `sysdig.html` - Premium tasarıma sahip Vanilla Front-End siber arayüzünüz.

İyi izlemeler ve analizler! 🕵️‍
