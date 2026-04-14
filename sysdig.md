# Sysdig ve Sysdig Inspect Filtreleme Rehberi

Sistemin tamamını izleyip kaydetmek yerine belirli bir sürecin veya dosyanın hareketlerini yakalamak için ince filtreler kullanabilirsiniz. Filtreler hem `sysdig` TUI (Terminal) versiyonunda hem de **Sysdig Inspect (GUI)** arayüzündeki arama çubuğunda birebir aynı şekilde çalışır.

## Temel Sözdizimi (Syntax)

* **Kaydet ve filtrele:** `sudo sysdig -w hedef.scap [FİLTRE]`
* **Canlı izleme ve filtreleme:** `sudo sysdig [FİLTRE]`
* **Sysdig Inspect arayüzünde:** İstediğiniz filtreyi üst arama çubuğuna yazıp Enter'a basın.

---

## 🚀 Filtreleme Seçenekleri (Tüm Kategoriler)

Sysdig eBPF altyapısı sayesinde çekirdek düzeyindeki her detayı görebilir. Cihazınızı tararken kullanabileceğiniz en popüler ve faydalı parametreler şunlardır:

### 1. İşlem (Process) Filtreleri `proc.*`
Bir uygulamaya veya arka plan yazılımına odaklanmak için kullanılır:
* `proc.name` = Sürecin tam adı (Örn: `proc.name=nginx` veya `proc.name!=sshd`)
* `proc.pid`  = Sürecin kimlik numarası (Örn: `proc.pid=1234`)
* `proc.exe`  = Çalıştırılabilir dosyanın diskteki tam yolu (Örn: `proc.exe=/usr/bin/bash`)
* `proc.args` = Uygulamaya parametre olarak verilen komut argümanları (Örn: `proc.args contains "etc/passwd"`)
* `proc.cmdline` = İşlemin tam komut satırı açılımı
* `proc.pname` = Üst (parent) sürecin adı (Örn: `proc.pname=systemd` veya `proc.pname=bash`)
* `proc.ppid` = Üst (parent) sürecin PID numarası
* `proc.cwd` = Sürecin çalıştırıldığı/başlatıldığı dizin konumu.

### 2. Dosya İşlemleri ve Tanımlayıcı Filtreleri `fd.*`
* `fd.name` = Açılan dosyanın veya ağ soketinin tam yolu (Örn: `fd.name=/etc/shadow` veya `fd.name contains ".log"`)
* `fd.directory` = Dosyanın bulunduğu klasör konumu (Örn: `fd.directory=/var/log/`)
* `fd.type` = Hedef çıktı türü (Örn: `file`, `ipv4`, `ipv6`, `unix`, `pipe`, `event`)
* `fd.filename` = Yol (path) olmaksızın sadece dosyanın adı.

### 3. Ağ (Network) Filtreleri `fd.*`
Bilgisayarınızda dönen ağı dinlemek isterseniz de muazzamdır:
* `fd.ip` = Herhangi bir kaynak veya hedef IP adresi (Örn: `fd.ip=192.168.1.1` veya `fd.ip=8.8.8.8`)
* `fd.cip` = Client (İstemci) IP adresi 
* `fd.sip` = Server (Sunucu) IP adresi
* `fd.port` = Herhangi bir port numarası (Örn: `fd.port=80` veya `fd.port=443`)
* `fd.l4proto` = Ağ İletişim Protokolü (Örn: `tcp`, `udp`)

### 4. Olay (Event / Syscall) Filtreleri `evt.*`
Gerçekleşen eyleme odaklanmak içindir:
* `evt.type` = Linux sistem çağrısı tipi (Örn: `evt.type=open` (dosya açma), `evt.type=read` (okuma), `evt.type=connect` (bağlanma), `evt.type=execve` (kod çalıştırma))
* `evt.dir` = Olayın yönü. `>` giriş(çağrı), `<` ise çıkış(yanıt) demektir.
* `evt.res` = Olayın/işlemin durumu. Hata taramak için harikadır (Örn: `evt.res=ENOENT` - bulunamadı hataları atan dosyaları arar)

### 5. Kullanıcı ve Grup Filtreleri `user.*` / `group.*`
Sadece belirli yetkideki veya belirli kullanıcının yaptıklarını loglamak için:
* `user.name` = Sistemdeki kullanıcının adı (Örn: `user.name=root` veya `user.name=drvoid`)
* `user.uid` = Kullanıcının Linux'taki kimlik ID numarası (Örn: `user.uid=0`)
* `group.name` = Sistemdeki grubun adı (Örn: `group.name=sudo`)

---

## 🛠 Karşılaştırma ve Mantık Operatörleri
Bu kelimeleri kullanarak yan yana onlarca kural dizebilir ve çok kompleks takipler gerçekleştirebilirsiniz:

* `=` (Eşittir): `proc.name = apache2`
* `!=` (Eşit Değildir): `proc.name != sshd`
* `> / < / >= / <=` (Büyüktür, Küçüktür): Sadece sayılarda çalışır (Örn: `fd.port > 1024`)
* `contains` (İçerir): `fd.name contains "admin"` (Büyük/küçük harf duyarlıdır)
* `icontains` (İçinde var mı?): `fd.name icontains "PASSWORD"` (Harf büyüklüğünü umursamaz)
* `in` (Dizi İçerisindekilerden Biri mi?): `proc.name in (apache2, bash, python)`
* `startswith / endswith` (Şununla başlar / Şununla Biter): `fd.name endswith ".log"`
* `and / or / not` (Mantıksal operatörler): İki kuralı bağlar. `proc.name=nginx and evt.type=open`

---

## 💡 Pratik Kullanım Senaryoları (Örnekler)

**1. Nginx uygulamasının sistemde sadece okuduğu veya açtığı dosyaları izle:**
```bash
sudo sysdig -w kayit.scap "proc.name=nginx and (evt.type=open or evt.type=openat)"
```

**2. Bilgisayarınızdaki 80 veya 443 numaralı porta (HTTP/HTTPS) gelen bütün verileri kaydet:**
```bash
sudo sysdig -w ag_kaydi.scap "fd.port in (80, 443) and fd.type=ipv4"
```

**3. Root olmayan (Sıradan kullanıcıların) değişiklik yaptığı, yetkisiz girilmiş her yeri kaydet:**
```bash
sudo sysdig -w kullanici.scap "user.name!=root and evt.type=write"
```

**4. Başarısız dosya açma/erişim girişimlerini logla (Zararlı yazılım avcılığı):**
```bash
sudo sysdig -w izole.scap "evt.type=open and evt.res<0"
```

*(Not: Sysdig programında toplam **400'den fazla** alt alan (field) mevcuttur. Eğer özel bir senaryo gerekiyorsa terminalinizden `sysdig -l` yazarak anında tüm listeye İngilizce açıklamalarıyla beraber ulaşabilirsiniz!)*
