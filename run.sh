#!/bin/bash

# Renkler
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}     Sysdig Inspect Web GUI Launcher & Auto-Setup   ${NC}"
echo -e "${CYAN}================================================${NC}"

# Root (Sudo) Kontrolü (Sysdig Kernel eBPF için root ister)
if [ "$EUID" -ne 0 ]; then
  echo -e "\n${RED}[!] HATA: Çekirdek olaylarını izleyebilmek için root yetkisi şarttır.${NC}"
  echo -e "${YELLOW}[*] Lütfen programı şu komutla başlatın: sudo bash run.sh${NC}\n"
  exit 1
fi

echo -e "${YELLOW}[*] Sistem bağımlılıkları kontrol ediliyor...${NC}"

# 1. Sysdig kontrolü ve otomatik kurulum
if ! command -v sysdig &> /dev/null; then
    echo -e "${RED}[!] 'sysdig' sistemde bulunamadı. Otomatik olarak kuruluyor...${NC}"
    apt-get update -y > /dev/null 2>&1
    apt-get install sysdig linux-headers-$(uname -r) -y
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[+] Sysdig başarıyla kuruldu!${NC}"
    else
        echo -e "${RED}[!] Sysdig kurulamadı. İnternet bağlantınızı veya depolarınızı kontrol edin.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}[+] Sysdig (Kernel eBPF aracı) kurulu durumda.${NC}"
fi

# 2. NPM ve Paketlerin Kontrolü
if [ ! -d "node_modules" ] || [ ! -f "package.json" ]; then
    echo -e "${YELLOW}[*] Node.js backend bağımlılıkları bulunamadı. Kuruluyor (ws, typescript, vs)...${NC}"
    npm init -y > /dev/null 2>&1
    npm install ws @types/ws typescript ts-node > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[+] NPM paketleri kuruldu.${NC}"
    else
        echo -e "${RED}[!] Paketler indirilemedi. Lütfen internetinizi kontrol edin.${NC}"
    fi
else
    echo -e "${GREEN}[+] Backend NodeJS modülleri hazır.${NC}"
fi

echo -e "\n${GREEN}[*] Adım 1: TypeScript WebSocket Sunucusu Derlenip Başlatılıyor...${NC}"
npx tsc sysdig.ts
node sysdig.js &
TS_PID=$!

# Sunucunun bağlanması ve Node'un dinlemeye geçmesi için 5 saniye bekliyoruz
sleep 5

echo -e "${GREEN}[*] Adım 2: Web Arayüzü Tarayıcıda Açılıyor...${NC}"
if [ -n "$SUDO_USER" ]; then
    sudo -u $SUDO_USER xdg-open "sysdig.html" &>/dev/null &
else
    xdg-open "sysdig.html" &>/dev/null &
fi

echo -e "\n${YELLOW}[+] Sistem Tamamen Devrede! Soket sunucusu logları aşağıdadır:${NC}"
echo -e "${RED}[!] Kapatmak ve arka plan uygulamasını sonlandırmak için CTRL+C tuşlarına basınız.${NC}\n"

# CTRL+C yakalama işlemi (Script kapatıldığında arkada nodejs sunucusunu temiz şekilde öldürür)
trap "echo -e '\n\n${RED}[!] Sinyal Alındı! Sunucu güvenli bir şekilde kapatılıyor...${NC}'; kill $TS_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait $TS_PID
