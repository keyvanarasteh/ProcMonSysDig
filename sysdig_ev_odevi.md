# 🎓 Siber Güvenlik / Sistem İzleme Ev Ödevi: Sysdig Olay Türleri (Event Types)

## 📌 Ödevin Amacı
Bu ödevin temel amacı, Linux işletim sistem çekirdeği (Kernel) seviyesinde gerçekleşen sistem çağrılarının (System Calls) **Sysdig** eBPF yetenekleriyle nasıl yakalandığını öğrenmektir. Teorik olarak bildiğiniz Linux komutlarının, hacker araçlarının veya zararlı yazılımların arkaplanda işletim sistemiyle nasıl konuştuğunu doğrudan gözlemleyeceksiniz.

## 📝 Görev Tanımı
Her bir öğrencinin, kendi geliştirdiğimiz "Sysdig Web Dashboard" arayüzünü kullanarak Linux sistem çağrılarından **5 ila 10 tanesini** seçip analiz etmesi ve bunların sonuçlarını sınıfa sunması beklenmektedir. 

### 🔍 İstenen Analiz Formatı
Seçtiğiniz her bir olay (event) türü için sunumunuzda şu başlıklar yer almalıdır:
1. **Olayın Adı (Event Type):** Örneğin `execve`, `connect`, `openat` vb.
2. **Çalışma Mantığı:** Bu olay işletim sisteminde tam olarak hangi komuta veya aksiyona karşılık gelir?
3. **Filtreleme Kuralı:** Uygulama üzerinde bu olayı canlı yakalamak için kullandığınız `Sysdig` arayüz filtreleri.
4. **Log Analizi ve Test:** Dashboard'a düşen canlı kaydın ekran görüntüsü. (Örn: Siz terminalde bir şey yazdınız ve anında panele hangi parametrelerle düştü?)
5. **Saldırı / Güvenlik Boyutu:** Hedef sistemde bulunan sinsi bir hacker (örneğin bir Truva atı) bu sistem çağrısını nasıl suistimal eder?

---

## 🎯 Analiz Edebileceğiniz Örnek Olay Türleri Havuzu
Çalışmanıza yardımcı olması adına incelenebilecek sistem eylemleri kategorilere ayrılmıştır. Bunlar arasından seçim yapabilirsiniz:

### 📁 Dosya ve Klasör Eylemleri (File System)
* `open` / `openat` : Dosyaları okumak veya içine bir şey yazmak üzere açma eylemi. (Sistemdeki hassas dizinler için kritik)
* `read` / `write` : Açık bir dosyadan okuma veya dosyaya veri yazma.
* `unlink` / `unlinkat` : Bir dosyayı silme. (Zararlı yazılımlar geride log ve iz bırakmamak için sıkça kullanır).
* `chmod` / `fchmod` : Dosya veya klasör izinlerini manipüle etme.

### 🌐 Ağ (Network) Eylemleri
* `socket` : Yeni bir ağ bağlantısı veya tüneli oluşturma.
* `connect` : Dışarıdaki uzak bir sunucuya veya IP'ye ağ bağlantısı sağlama. (C2 Command&Control merkezlerine dönen bağlantıları tespit etmekte kullanılır).
* `accept` : Dışarıdan veya içeriden gelen bir ağ bağlantısını kabul etme (Örn: sisteme açılmış bir arka kapı dinlemesi).
* `sendto` / `recvfrom` : Gerçekleşen ağ bağlantısı içinden zararlı paketlerin sızdırılması.

### ⚙️ Süreç (Process) Eylemleri
* `execve` : İşletim sisteminde doğrudan yeni bir program, komut veya betik (script) başlatma. **(En Kritik Olay)**
* `clone` / `fork` : Çalışan bir işlemin kendisini kopyalayarak (çoğalma) hafızada yeni bir süreç oluşturması.
* `kill` : Çalışan başka bir programı sonlandırmak veya sinyal göndermek. (Savunma araçlarını devre dışı bırakmak için kullanılabilir)
* `ptrace` : Başka bir işlemin hafızasına (memory) müdahale etme veya izleme. (Zararlı yazılımlar Memory Injection için kullanır).

### 👤 Yetkilendirme (Privilege) Eylemleri
* `setuid` / `setgid` : Mevcut sürecin kullanıcı kimliğini değiştirme. (Yetki yükseltme - Privilege Escalation saldırıları burada yakalanır).
* `chown` : Kritik dosyaların sahipliğini zorla üzerine alma.

---

## 🚀 Pratik İpuçları
- Dashboard arayüzünde "Start Capture" (Yakalamayı Başlat) dedikten sonra, bilgisayarınızda farklı bir terminal açıp `curl google.com`, `touch deneme.txt` veya `ping 1.1.1.1` gibi normal komutlar vererek bu komutların siber panelinize arka planda hangi *Event Type*'lar olarak düştüğünü bizzat izleyin.

Kolay gelsin! Siber dünyada hiçbir işlem kernel'den (çekirdekten) kaçamaz!
