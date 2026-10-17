# ✒️ TabNote Studio

**TabNote Studio**, Android tabletler ve dokunmatik kalemli (Stylus) cihazlar için geliştirilmiş, **Samsung Notes** ve **GoodNotes** deneyiminden ilham alan profesyonel bir dijital el yazısı, PDF işaretleme ve satır bazlı sesli not alma uygulamasıdır.

---

## 📲 Hızlı Kurulum (Android Tablet APK)

Depo içerisinde doğrudan imzalanmış ve kuruluma hazır Android APK paketi yer almaktadır:

- 📦 **[`TabNote-Studio.apk`](./TabNote-Studio.apk)** dosyasını tabletinize indirip doğrudan kurabilirsiniz.
- 🌐 Ayrıca tarayıcı üzerinden **PWA (Progressive Web App)** olarak çevrimdışı (offline) çalışabilir.

---

## ✨ Temel Özellikler

### 1. 🖋️ Kalem & Mürekkep Motoru (Stylus Engine)
- **4 Farklı Kalem Ucu:**
  - **Dolma Kalem (Fountain Pen):** Basınç hassasiyetli kaligrafik çizgi kalınlığı.
  - **Tükenmez Kalem (Ballpoint):** Günlük hızlı not alma için dengeli ve pürüzsüz mürekkep akışı.
  - **Kurşun Kalem (Pencil):** Eskiz ve gölgelendirme için dokulu/opaklık duyarlı çizim.
  - **Fosforlu Kalem (Highlighter):** Metinlerin ve PDF'lerin altını kapatmadan yarı saydam vurgulama.
- **Kalem Aktif / Kalem Aktif Değil Modu:** Tek dokunuşla çizim modu ile okuma/kaydırma modu arasında geçiş.
- **Avuç İçi Reddi (Palm Rejection) & Parmakla Kaydırma:** *"👆 Parmak Kaydırır"* modu aktifken kalem yalnızca yazı yazar, parmak dokunuşu ise sayfayı pürüzsüzce kaydırır ve yakınlaştırır (Pinch-to-Zoom).

### 2. 🎙️ Satıra Doğrudan Ses Kaydetme & Satır İçi Ses Oynatıcısı
- **Her Satırda Doğrudan Kayıt (`🎙️`):** Kağıt üzerindeki her satırın sol kenar boşluğunda yer alan **`🎙️`** butonuna dokunarak doğrudan o satıra ses kaydedebilirsiniz.
- **Eşzamanlı Yazım ve Kayıt:** Ses kaydı devam ederken kaleminizle aynı satıra not almaya devam edebilirsiniz.
- **Satır İçi Kompakt Oynatıcı:** Kaydı bitirdiğinizde ilgili satırın üzerine yerleşen oynatıcı ile kaydı dinleyebilir, ileri/geri sarabilir ve **1x / 1.5x / 2x** hızlarında oynatabilirsiniz.

### 3. 📄 Fotoğraf, PDF ve Dosya İçe Aktarma (`➕ İçeri Ekle`)
- **📷 Fotoğraf / Görsel Ekle:** Galeriden bir veya birden fazla görsel seçip sayfa üzerinde istediğiniz yere taşıyabilir ve boyutlandırabilirsiniz.
- **🖼️ Sayfa Arka Planı Görseli:** Ders notu veya taranmış belge fotoğrafını tüm sayfaya sabit arka plan olarak döşeyip üzerine kalemle yazabilirsiniz.
- **📄 Çok Sayfalı PDF İçe Aktarma:** `.pdf` belgelerinin tüm sayfalarını otomatik olarak not defterinize sayfa olarak aktarır; PDF üzerinde kalem, fosforlu kalem ve sesli not kullanabilirsiniz.
- **📎 Dosya Ekleme:** Metin belgelerini (`.txt`, `.md`) doğrudan metin kutusu olarak, diğer dosyaları ise taşınabilir dosya kartı olarak sayfaya iliştirir.

### 4. 📐 Akıllı Çizim Araçları
- **Otomatik Şekil Tanıma (Auto-Shape):** Kalemle çizgi, dikdörtgen, daire veya üçgen çizip çizim sonunda kalemi kısa süre basılı tuttuğunuzda şekli otomatik olarak kusursuz geometrik şekle dönüştürür.
- **Kement Seçimi (Lasso Tool):** El yazısı parçalarını seçip taşıma, yeniden boyutlandırma, çoğaltma veya rengini tek dokunuşla değiştirme.
- **Çizgi Silgisi & Bölgesel Silgi:** Tek dokunuşla tüm harfi/çizgiyi silen *Çizgi Silgisi* veya piksel bazlı *Bölgesel Silgi*.
- **Zengin Metin Kutuları (`T`)** ve **Lazer İşaretçi**.

### 5. 🗒️ 9 Kağıt Şablonu ve 6 Kağıt Rengi
- **Kağıt Şablonları:** Çizgili, Geniş Çizgili, Kareli (Matematik), Noktalı (Bullet), Cornell Not Sistemi, Düz Kağıt, İzometrik Noktalı, Günlük Planlayıcı, Müzik Portesi.
- **Göz Yormayan Kağıt Tonları:** Sıcak Fildişi, Saf Beyaz, Sarı Bloknot, Göz Yormayan Yeşil, OLED Gece Siyahı, Mimari Blueprint.

### 6. 📤 Dışa Aktarma ve Yedekleme
- **Çok Sayfalı PDF İndir (`.pdf`)**
- **Yüksek Çözünürlüklü PNG Görsel İndir (`.png`)**
- **Tam Not Defteri Yedeği (`.tabnote.json` İndir / Geri Yükle)**

---

## 🛠️ Proje Yapısı

```text
TabNote/
├── index.html          # Ana uygulama arayüzü, kalem istasyonu ve modallar
├── styles.css          # Koyu stüdyo teması, tablet ergonomisi ve satır içi bileşen stilleri
├── js/
│   ├── app.js          # Uygulama kontrolcüsü, PDF/Fotoğraf/Dosya aktarımı ve ses kaydı yönetimi
│   ├── canvas-engine.js# 2D Canvas çizim motoru, basınç hesaplama, kement ve satır içi DOM katmanı
│   ├── templates.js    # 9 vektörel kağıt şablonu ve 6 kağıt rengi çizim motoru
│   └── storage.js      # IndexedDB + LocalStorage tabanlı çevrimdışı kayıt sistemi
├── build-apk.js        # Android WebView + Native MediaRecorder köprüsüyle APK kaynak üreticisi
├── manifest.json       # PWA uygulama manifestosu
├── sw.js               # Çevrimdışı çalışma için Service Worker
└── TabNote-Studio.apk  # Kuruluma hazır imzalı Android APK dosyası
```

---

## 💻 Geliştirme ve Çalıştırma

### Web Tarayıcısında Çalıştırma
```bash
npm install
npm start
```
Ardından tarayıcınızda `http://localhost:3000` adresini açabilirsiniz.

### Android APK Paketi Üretme
Bilgisayarınızda Android SDK (`build-tools` ve `platforms`) ile JDK kuruluysa `build-apk.js` betiğini çalıştırarak APK kaynaklarını güncelleyebilir ve derleyebilirsiniz:
```bash
node build-apk.js
```
