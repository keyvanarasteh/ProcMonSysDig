#!/bin/bash

# Renkler
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}         Sysdig Inspect Web GUI Launcher        ${NC}"
echo -e "${CYAN}================================================${NC}"

# Root (Sudo) Kontrolü (Sysdig Kernel eBPF için root ister)
if [ "$EUID" -ne 0 ]; then
  echo -e "\n${RED}[!] HATA: Çekirdek (kernel) olaylarını izleyebilmek için root yetkisi şarttır.${NC}"
  echo -e "${YELLOW}[*] Lütfen programı şu komutla başlatın: sudo bash run.sh${NC}\n"
  exit 1
fi

echo -e "${GREEN}[*] Adım 1: TypeScript WebSocket Sunucusu Başlatılıyor...${NC}"
# ts-node ile arka planda sysdig köprüsünü başlatıyoruz
npx ts-node sysdig.ts &
TS_PID=$!

# Sunucunun bağlanması için hafif bir süre tanıyalım
sleep 3

echo -e "${GREEN}[*] Adım 2: Web Arayüzü Tarayıcıda Açılıyor...${NC}"

# Sudo kullanıldığında tarayıcıyı asıl kullanıcı (root olmayan) adına açmamız gerekiyor
# Aksi takdirde root hesabında chrome arayüzü bozulabilir.
if [ -n "$SUDO_USER" ]; then
    sudo -u $SUDO_USER xdg-open "sysdig.html" &>/dev/null &
else
    # Doğrudan root logini yapılmışsa normal xdg-open
    xdg-open "sysdig.html" &>/dev/null &
fi

echo -e "\n${YELLOW}[+] Sistem Tamamen Devrede! Soket sunucusu logları aşağıdadır:${NC}"
echo -e "${RED}[!] Kapatmak ve arka plan uygulamasını sonlandırmak için CTRL+C tuşlarına basınız.${NC}\n"

# CTRL+C yakalama işlemi (Script kapatıldığında arkada nodejs sunucusunu bırakmasın)
trap "echo -e '\n\n${RED}[!] Sinyal Alındı! Sunucu güvenli bir şekilde kapatılıyor...${NC}'; kill $TS_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Scriptin kapanmaması ve logları basmaya devam etmesi için arkaplan servisini bekle
wait $TS_PID
