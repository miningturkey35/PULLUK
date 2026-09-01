# PULLUK — Mert Güventürk Koleksiyonu

Kişisel pul, Matchbox ve diğer koleksiyonların dijital arşiv sitesi.

🔗 **Canlı Site:** https://miningturkey35.github.io/PULLUK/
📁 **Drive Arşivi:** https://drive.google.com/drive/folders/11AeW1GWpmhOk28Xt-AD65e6eH12Bk4t8

---

## 📦 Proje Yapısı

```
PULLUK/
├── index.html    # Ana sayfa
├── style.css     # Stiller (suya.info ilhamlı)
├── app.js        # JavaScript (Drive API, arama, tema)
├── README.md     # Bu dosya
└── .gitignore
```

---

## 🚀 Kurulum

### 1. Google API Key (Canlı Drive Entegrasyonu)

Gerçek Drive dosyalarını göstermek için:

1. [Google Cloud Console](https://console.cloud.google.com/)'a gidin
2. Yeni proje oluşturun
3. **APIs & Services → Library → "Google Drive API"** aktif edin
4. **APIs & Services → Credentials → Create Credentials → API Key** oluşturun
5. `app.js` dosyasını açın, şu satırı bulun:
   ```js
   GOOGLE_API_KEY: '',
   ```
   API key'inizi tırnak içine yapıştırın:
   ```js
   GOOGLE_API_KEY: 'YOUR_API_KEY_HERE',
   ```

> **Not:** API key olmadan site demo verileriyle çalışır.

### 2. GitHub Pages ile Yayınlama

Aşağıdaki adımları takip edin:

```bash
# Proje dizinine gidin
cd "C:\Users\mertg\Desktop\MERT PERSONAL PROJECTS\PULLUK"

# Git başlat (eğer henüz yapılmadıysa)
git init

# Tüm dosyaları ekle
git add .

# İlk commit
git commit -m "feat: PULLUK koleksiyon sitesi başlangıç"

# Remote ekle
git remote add origin https://github.com/miningturkey35/PULLUK.git

# Ana branch'e geç ve push et
git branch -M main
git push -u origin main
```

Ardından GitHub'da **Settings → Pages → Source: main branch** seçin.
Site birkaç dakika içinde `https://miningturkey35.github.io/PULLUK/` adresinde yayına girer.

### 3. Sonraki Pushlar

```bash
git add .
git commit -m "güncelleme mesajı"
git push
```

---

## ✨ Özellikler

- 🎨 **suya.info ilhamlı tasarım** — Bricolage Grotesque, Plus Jakarta Sans
- 🌙 **Dark / Light mode** — Otomatik sistem tercihi + manuel toggle
- 📱 **Mobil uyumlu** — Tam responsive tasarım
- 🔍 **Canlı arama & filtreleme** — PDF dosyaları arasında anlık arama
- ☁️ **Google Drive entegrasyonu** — API key ile canlı dosya listesi
- ♿ **Erişilebilirlik** — ARIA etiketleri, semantic HTML5
- 🚀 **Performans** — Scroll reveal, lazy rendering, animated counters

---

## 📮 Koleksiyonlar

| Koleksiyon | Durum | Açıklama |
|---|---|---|
| Pul Koleksiyonu | ✅ Aktif | 2000+ parça, PDF arşivli |
| Matchbox | ✅ Aktif | Minyatür araç modelleri |
| Plak Arşivi | ✅ Aktif | Nadir ve koleksiyonluk plaklar |

---

© 2025 **Mert Güventürk** — PULLUK Koleksiyon Arşivi
