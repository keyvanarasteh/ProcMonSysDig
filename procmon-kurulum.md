# Kali Linux Üzerinde Procmon Kurulum Rehberi

Microsoft'un repository imza politikası (SHA1) Kali Linux / Debian 12 tarafından artık güvenli kabul edilmediği için `apt-get install procmon` komutu hata vermektedir (Unable to locate package procmon). Bu sorunu repository'i düzelterek ve paketleri manuel indirerek çözebiliriz.

## 1. Kaynak Listesi (sources.list) Uyarılarını Düzeltme
`/etc/apt/sources.list` dosyanızda tekrar eden (duplicate) Kali repo satırları bulunuyor. Bunu temizlemek için:

```bash
sudo sed -i 's/^deb http:\/\/http.kali.org/#deb http:\/\/http.kali.org/g' /etc/apt/sources.list
sudo apt-get update
```

## 2. Bağımlılıkları ve Procmon'u Manuel Kurma
Repository çalışmadığı için Microsoft sunucularından `.deb` paketlerini doğrudan indirip kurmamız gerekiyor.

### Adım 2.1: `sysinternalsebpf` Bağımlılığını Kurma
`procmon` çalışabilmek için eBPF altyapısına ihtiyaç duyar, bu yüzden önce bağımlılığını indirip kuruyoruz:

```bash
wget https://packages.microsoft.com/debian/12/prod/pool/main/s/sysinternalsebpf/sysinternalsebpf_1.5.0_amd64.deb
sudo dpkg -i sysinternalsebpf_1.5.0_amd64.deb
```

### Adım 2.2: `procmon` Paketini Kurma
Ardından procmon'un kendisini indirip kuruyoruz:

```bash
wget https://packages.microsoft.com/debian/12/prod/pool/main/p/procmon/procmon_2.2.0_amd64.deb
sudo dpkg -i procmon_2.2.0_amd64.deb
```

## 3. Yarım Kalan Kurulumları Tamamlama
Eğer dpkg hata vermiş veya paketler tam yapılandırılamamışsa, tüm ayarları tamamlamak için son olarak:

```bash
sudo dpkg --configure procmon
```

## 4. Kullanım
Çekirdek seviyesindeki sistem çağrılarını izleyeceği için program `root` yetkisiyle çalıştırılmalıdır:

```bash
sudo procmon
```

---

## 🚀 Otomatik Kurulum ve Raporlama Scripti (`install.sh`)

Tüm bu adımları tek seferde, her aşamanın başarılı olup olmadığını raporlayarak (*loglayarak*) gerçekleştiren otomatik `install.sh` bash betiği aşağıdadır. 

Kullanmak için aşağıdaki kodu `install.sh` olarak kaydedip, `sudo bash install.sh` komutu ile çalıştırın.

```bash
#!/bin/bash

# Renk Tanımlamaları
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}[*] Procmon Otomatik Kurulum ve Onarım Scripti Başlatılıyor...${NC}"

# Root kontrolü
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[!] HATA: Lütfen bu scripti 'sudo' ile çalıştırın!${NC}"
  exit 1
fi

echo -e "\n${YELLOW}[*] 1. Adım: APT sources.list duplicate kayıtları temizleniyor...${NC}"
sed -i 's/^deb http:\/\/http.kali.org/#deb http:\/\/http.kali.org/g' /etc/apt/sources.list
echo -e "${YELLOW}[*] APT paket listeleri güncelleniyor...${NC}"
apt-get update > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}[+] APT güncellemesi başarıyla tamamlandı.${NC}"
else
    echo -e "${RED}[-] APT güncellemesi sırasında bir hata oluştu! Göz ardı edilip devam ediliyor.${NC}"
fi

echo -e "\n${YELLOW}[*] 2. Adım: sysinternalsebpf bağımlılığı indiriliyor (1/2)...${NC}"
wget -q --show-progress https://packages.microsoft.com/debian/12/prod/pool/main/s/sysinternalsebpf/sysinternalsebpf_1.5.0_amd64.deb -O sysinternalsebpf.deb

echo -e "${YELLOW}[*] sysinternalsebpf kuruluyor...${NC}"
dpkg -i sysinternalsebpf.deb > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}[+] sysinternalsebpf (eBPF altyapısı) başarıyla kuruldu.${NC}"
else
    echo -e "${RED}[!] HATA: sysinternalsebpf kurulumu BAŞARISIZ! Çıkış yapılıyor...${NC}"
    exit 1
fi

echo -e "\n${YELLOW}[*] 3. Adım: procmon paketi indiriliyor (2/2)...${NC}"
wget -q --show-progress https://packages.microsoft.com/debian/12/prod/pool/main/p/procmon/procmon_2.2.0_amd64.deb -O procmon.deb

echo -e "${YELLOW}[*] procmon kuruluyor...${NC}"
dpkg -i procmon.deb > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}[+] procmon başarıyla kuruldu.${NC}"
else
    echo -e "${RED}[!] procmon kurulumu sırasında hata oluştu. Yapılandırma deneniyor...${NC}"
    dpkg --configure procmon > /dev/null 2>&1
    if [ $? -eq 0 ]; then
         echo -e "${GREEN}[+] procmon yapılandırması başarıyla tamamlandı.${NC}"
    else
         echo -e "${RED}[!] HATA: procmon yapılandırması BAŞARISIZ! Çıkış yapılıyor...${NC}"
         exit 1
    fi
fi

# Temizlik işlemleri
echo -e "\n${YELLOW}[*] 4. Adım: İndirilen kurulum dosyaları temizleniyor...${NC}"
rm sysinternalsebpf.deb procmon.deb
echo -e "${GREEN}[+] Temizlik tamamlandı.${NC}"

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}[+] KURULUM BAŞARIYLA TAMAMLANDI!${NC}"
echo -e "${GREEN}[+] Çalıştırmak için: ${YELLOW}sudo procmon${NC}"
echo -e "${GREEN}====================================================${NC}"
```

---

## 🎨 Alternatif Masaüstü Uygulaması: Sysdig Inspect (Tam Pencere GUI)

Terminal tabanlı (TUI) çalışan Procmon yerine, izleme dosyalarını incelemek için pencereli gerçek bir Linux masaüstü uygulaması arıyorsanız **Sysdig Inspect** kullanabilirsiniz.

Hemen kurmak için terminalinizde şu komutları sırasıyla çalıştırın:

```bash
# 1. Sysdig Inspect debian paketini indirin
wget -O sysdig-inspect.deb https://github.com/draios/sysdig-inspect/releases/download/0.12.0/sysdig-inspect-linux-x86_64.deb

# 2. Aracı sisteme yükleyin
sudo dpkg -i sysdig-inspect.deb
rm sysdig-inspect.deb
```

Kurulum bittikten sonra tam sayfa arayüzü başlatmak için terminalden `sysdig-inspect` komutunu verebilir veya araç menüsünden arayabilirsiniz.

### Sysdig Inspect Nasıl Kullanılır?

Sysdig Inspect, doğrudan canlı sistemi izlemez; daha çok önceden alınmış bir "sistem kaydını" görsel, büyüteçle inceler gibi detaylı analiz etmenizi sağlar. Süreç şöyledir:

**1. Sistemin Kaydını Alma (`sysdig` CLI ile):**
Eğer yüklü değilse önce `sudo apt install sysdig` ile çekirdek izleme aracını kurun. Daha sonra terminalde şu komutla izlemeyi başlatın:
```bash
sudo sysdig -w sistem_kaydi.scap
```
Kayıt işlemi başlar (sistemdeki her eylem bu dosyaya yazılır). Yeterli veri toplandığını düşündüğünüzde **`Ctrl + C`** basarak durdurun.

**2. Arayüzde Görsel İnceleme:**
Terminalden `sysdig-inspect` komutuyla Tİp arayüzü açıp klasör butonuna tıklayın. Oluşturduğunuz `sistem_kaydi.scap` dosyasını seçip içeri aktardığınızda sistemin zaman çizelgesine ulaşacak ve olayları derinlemesine inceleyebileceksiniz.
