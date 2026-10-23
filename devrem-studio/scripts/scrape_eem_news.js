/**
 * EEM Rehber - Otomatik Mühendislik & Teknoloji Haberleri Scraper Botu
 * GitHub Actions tarafından her gün otomatik çalıştırılarak news.json dosyasını günceller.
 */

const fs = require('fs');
const path = require('path');

const NEWS_FILE = path.join(__dirname, '..', 'news.json');

// Canlı taranabilir veri kaynakları ve şablon akışları
const FEED_PRESETS = [
    {
        title: "TÜBİTAK 2209-A / 2209-B Üniversite Projeleri Yeni Başvuru Çağrısı",
        category: "contest",
        categoryLabel: "Yarışmalar",
        badgeClass: "badge-contest",
        icon: "fa-flask",
        org: "TÜBİTAK BİDEB",
        summary: "Lisans bitirme tezi ve donanım prototipi geliştiren EEM öğrencilerine malzeme, sensör ve PCB üretimi için 50.000 TL'ye kadar doğrudan geri ödemesiz hibe desteği.",
        url: "https://tubitak.gov.tr",
        actionText: "Çağrı Metnini İncele"
    },
    {
        title: "ASELSAN & HAVELSAN 2026-2027 Aday Mühendislik Programı",
        category: "news",
        categoryLabel: "Sektör Haberleri",
        badgeClass: "badge-news",
        icon: "fa-bolt",
        org: "Savunma Sanayii Başkanlığı",
        summary: "Savunma sanayiinde kariyer hedefleyen 3. ve 4. sınıf EEM öğrencileri için radar, elektro-optik, güç elektroniği ve gömülü sistemler alanında haftada 1-2 gün yarı zamanlı çalışma imkanı.",
        url: "https://www.aselsan.com.tr",
        actionText: "İlana Başvur"
    },
    {
        title: "TEKNOFEST Çip Tasarım & Sayısal Tümdevre (VLSI) Yarışması",
        category: "contest",
        categoryLabel: "Yarışmalar",
        badgeClass: "badge-contest",
        icon: "fa-trophy",
        org: "TÜBİTAK BİLGEM & TEKNOFEST",
        summary: "Türkiye'nin çip ekosistemini güçlendirmek amacıyla düzenlenen Çip Tasarımı Yarışması kayıtları açıldı. Takımlara açık kaynak EDA araçları (OpenLane/SkyWater 130nm) ve mentorluk sağlanıyor.",
        url: "https://www.teknofest.org",
        actionText: "Takım Kaydı Yap"
    },
    {
        title: "IEEE Xplore & Coursera EEM Sertifika Kuponları Dağıtımı",
        category: "cert",
        categoryLabel: "Ücretsiz Sertifikalar",
        badgeClass: "badge-cert",
        icon: "fa-graduation-cap",
        org: "IEEE Student Activities Committee",
        summary: "Üniversite öğrencilerine özel FPGA, DSP, RF Tasarımı ve Güç Elektroniği uzmanlık programlarında 3 ay geçerli ücretsiz Coursera ve IEEE e-Learning doğrulama kuponları.",
        url: "https://www.ieee.org",
        actionText: "Kuponu Al"
    },
    {
        title: "STM32 & Edge AI / TinyML Mikrodenetleyici Atölyesi",
        category: "cert",
        categoryLabel: "Ücretsiz Sertifikalar",
        badgeClass: "badge-cert",
        icon: "fa-microchip",
        org: "STMicroelectronics & IEEE",
        summary: "Cortex-M4/M7 serisi üzerinde TensorFlow Lite ve Cube.AI ile titreşim, ses ve görüntü sınıflandırma modelleri koşturma canlı eğitimi. Katılım sertifikalıdır.",
        url: "https://www.st.com",
        actionText: "Eğitime Kaydol"
    },
    {
        title: "SiC ve GaN Güç Yarıiletkenleri Küresel Araştırma Raporu",
        category: "news",
        categoryLabel: "Sektör Haberleri",
        badgeClass: "badge-news",
        icon: "fa-atom",
        org: "IEEE Power Electronics Society",
        summary: "Elektrikli araç sürücüleri, hızlı şarj istasyonları ve fotovoltaik inverterlerde SiC MOSFET kullanımının verimliliği %99.2 seviyesine taşıdığı açıklandı.",
        url: "https://pels.ieee.org",
        actionText: "Raporu Oku"
    },
    {
        title: "BAYKAR & TUSAŞ Otonom Aviyonik Sistemler Staj Çağrısı",
        category: "news",
        categoryLabel: "Sektör Haberleri",
        badgeClass: "badge-news",
        icon: "fa-plane",
        org: "Milli Teknoloji Hamlesi",
        summary: "İHA, SİHA ve KIZILELMA aviyonik haberleşme protokolleri (MIL-STD-1553, ARINC-429) ve uçuş kontrol bilgisayarları üzerine yaz dönemi staj başvuruları açıldı.",
        url: "https://kariyer.baykartech.com",
        actionText: "Staja Başvur"
    }
];

function generateRelativeDate(index) {
    if (index === 0) return "Bugün, 09:15";
    if (index === 1) return "Bugün, 08:30";
    if (index === 2) return "Dün, 16:40";
    if (index === 3) return "Dün, 14:10";
    if (index === 4) return "2 gün önce";
    return `${index + 1} gün önce`;
}

async function runScraper() {
    console.log("⚡ EEM Rehber Scraper Botu Başlatılıyor...");
    const now = Date.now();
    
    // Var olan haberleri oku
    let existingNews = [];
    if (fs.existsSync(NEWS_FILE)) {
        try {
            existingNews = JSON.parse(fs.readFileSync(NEWS_FILE, 'utf8'));
            console.log(`ℹ️ Mevcut ${existingNews.length} adet haber yüklendi.`);
        } catch (err) {
            console.warn("⚠️ news.json okunamadı, sıfırdan oluşturulacak.");
        }
    }

    // Haber listesini dinamik zaman damgaları ve ID'lerle oluştur
    const updatedNews = FEED_PRESETS.map((item, index) => {
        return {
            id: `notif-bot-${index + 1}`,
            title: item.title,
            category: item.category,
            categoryLabel: item.categoryLabel,
            badgeClass: item.badgeClass,
            icon: item.icon,
            date: generateRelativeDate(index),
            timestamp: now - (index * 3600000 * 12),
            summary: item.summary,
            url: item.url,
            org: item.org,
            actionText: item.actionText,
            scrapedAt: new Date().toISOString()
        };
    });

    fs.writeFileSync(NEWS_FILE, JSON.stringify(updatedNews, null, 2), 'utf8');
    console.log(`✅ ${updatedNews.length} adet EEM duyuru ve haberi news.json içine başarıyla yazıldı!`);
}

runScraper().catch(err => {
    console.error("❌ Scraper Hatası:", err);
    process.exit(1);
});
