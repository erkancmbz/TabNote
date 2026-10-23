/**
 * DEVREM STUDIO - 2-PORTAL MİMARİSİ VE SADELEŞTİRİLMİŞ NAVBAR & SVG ARKA PLAN TESTLERİ
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('═══════════════════════════════════════════════════════════════');
console.log('   DEVREM STUDIO - SADELEŞTİRİLMİŞ MİMARİ & SVG TESTLERİ       ');
console.log('═══════════════════════════════════════════════════════════════');

const indexPath = path.join(__dirname, '..', 'index.html');
const cssPath = path.join(__dirname, '..', 'styles', 'modules_extra.css');
const portalJsPath = path.join(__dirname, '..', 'scripts', 'devrem_portal.js');

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const cssContent = fs.readFileSync(cssPath, 'utf8');
const portalJsContent = fs.readFileSync(portalJsPath, 'utf8');

let passCount = 0;
let failCount = 0;

function it(desc, fn) {
    try {
        fn();
        console.log(`  ✓ ${desc}`);
        passCount++;
    } catch (e) {
        console.error(`  ✗ ${desc}`);
        console.error(`    HATA: ${e.message}`);
        failCount++;
    }
}

// 1. LOGO SWITCHER & 3D DÖNÜŞÜM TESTLERİ
it('1.1 Sol üst logo switcher kapsayıcısı (#portalSwitcherBtn) mevcut', () => {
    assert(indexHtml.includes('id="portalSwitcherBtn"'), 'id="portalSwitcherBtn" bulunamadı');
    assert(indexHtml.includes('onclick="toggleDevremPortal()"'), 'toggleDevremPortal tetikleyicisi bulunamadı');
});

it('1.2 3D Dönen Kutu (#logo3dBox) ve her iki yüz (#logoFaceAkademi, #logoFaceKariyer) tanımlı', () => {
    assert(indexHtml.includes('id="logo3dBox"'), 'id="logo3dBox" bulunamadı');
    assert(indexHtml.includes('id="logoFaceAkademi"'), 'id="logoFaceAkademi" bulunamadı');
    assert(indexHtml.includes('id="logoFaceKariyer"'), 'id="logoFaceKariyer" bulunamadı');
});

it('1.3 Akademi Yüzü: D-Çip SVG grafiği ve 🎓 Akademi etiketi içeriyor', () => {
    assert(indexHtml.includes('navDGradAkademi'), 'navDGradAkademi gradienti eksik');
    assert(indexHtml.includes('badge-akademi'), 'badge-akademi sınıfı eksik');
    assert(indexHtml.includes('🎓 Akademi'), '🎓 Akademi metni eksik');
});

it('1.4 Kariyer Yüzü: D-Yükseliş Oku SVG grafiği ve 💼 Kariyer & Forum etiketi içeriyor', () => {
    assert(indexHtml.includes('navDGradKariyer'), 'navDGradKariyer gradienti eksik');
    assert(indexHtml.includes('badge-kariyer'), 'badge-kariyer sınıfı eksik');
    assert(indexHtml.includes('💼 Kariyer & Forum'), '💼 Kariyer & Forum metni eksik');
});

it('1.5 Logo yanında "(Değiştirmek için tıkla 🔄)" rozeti tamamen kaldırılmış ve yalnızca logo tıklanabilir', () => {
    assert(!indexHtml.includes('(Değiştirmek için tıkla 🔄)'), 'Rozet metni kaldırılmamış');
    assert(indexHtml.includes('id="portalSwitcherBtn"'), 'Logo switcher butonu bulunamadı');
});

it('1.6 CSS içinde 3D Flip dönüşüm stilleri tanımlı', () => {
    assert(cssContent.includes('.logo-3d-box'), '.logo-3d-box CSS kuralı eksik');
    assert(cssContent.includes('transform-style: preserve-3d'), 'preserve-3d eksik');
    assert(cssContent.includes('.logo-3d-box.flipped'), '.logo-3d-box.flipped kuralı eksik');
    assert(cssContent.includes('rotateY(180deg)'), 'rotateY(180deg) eksik');
});

// 2. 2-PORTAL İZOLASYON & PERFORMANS TESTLERİ
it('2.1 1. Portal (#portal-akademi) DOM içinde mevcut', () => {
    assert(indexHtml.includes('id="portal-akademi"'), 'id="portal-akademi" bulunamadı');
});

it('2.2 2. Portal (#portal-kariyer) DOM içinde mevcut', () => {
    assert(indexHtml.includes('id="portal-kariyer"'), 'id="portal-kariyer" bulunamadı');
});

it('2.3 Pasif olan portalın içeriği CSS/JS ile gizlenir (display:none !important)', () => {
    assert(portalJsContent.includes("portalAkademi.style.setProperty('display', 'none', 'important')") || portalJsContent.includes("display = 'none'"), 'Akademi portalı gizleme kuralı eksik');
    assert(portalJsContent.includes("portalKariyer.style.setProperty('display', 'none', 'important')") || portalJsContent.includes("display = 'none'"), 'Kariyer portalı gizleme kuralı eksik');
    assert(indexHtml.includes('id="portal-kariyer" class="devrem-portal-view" style="display:none;"'), 'Başlangıçta pasif portal display:none olmalı');
});

// 3. 1. PORTAL (AKADEMİ & LAB) İÇERİK DOĞRULAMA
it('3.1 Akademi portalında Mühendislik Ders Notları, Araçları ve Yol Haritası mevcut', () => {
    assert(indexHtml.includes('id="dallar"'), 'id="dallar" eksik');
    assert(indexHtml.includes('id="kaynaklar"'), 'id="kaynaklar" eksik');
    assert(indexHtml.includes('id="araclar"'), 'id="araclar" eksik');
    assert(indexHtml.includes('id="yolharitasi"'), 'id="yolharitasi" eksik');
});

it('3.2 Akademi hero içinde gezinme butonları (.hero-buttons) mevcut ve korunuyor', () => {
    assert(indexHtml.includes('class="hero-buttons"'), 'hero-buttons eksik');
    assert(indexHtml.includes('href="#dallar"'), 'Alanları Keşfet butonu eksik');
    assert(indexHtml.includes('href="#yolharitasi"'), 'Yol Haritası butonu eksik');
    assert(indexHtml.includes('href="#kaynaklar"'), 'Kaynaklar butonu eksik');
    assert(indexHtml.includes("openLabModal('hesaplayicilar')"), 'Mühendislik Lab butonu eksik');
});

it('3.3 Mühendislik Laboratuvarı ve 38 simülatör kartı erişilebilir', () => {
    assert(indexHtml.includes('id="labModalOverlay"'), 'id="labModalOverlay" eksik');
    assert(indexHtml.includes('id="labSubpanelsContainer"'), 'id="labSubpanelsContainer" eksik');
    assert(indexHtml.includes('id="calcCircuitAnalysis1Card"'), 'calcCircuitAnalysis1Card eksik');
    assert(indexHtml.includes('id="calcTransformerCard"'), 'calcTransformerCard eksik');
    assert(indexHtml.includes('id="calcDcDcCard"'), 'calcDcDcCard eksik');
    assert(indexHtml.includes('id="calcSpwmCard"'), 'calcSpwmCard eksik');
});

// 4. 2. PORTAL (KARİYER & TOPLULUK) İÇERİK DOĞRULAMA
it('4.1 Kariyer Hero ve AI Canlı Ticker mevcut; hero içi 4 tekrar butonu kaldırılmış', () => {
    assert(indexHtml.includes('class="career-hero"'), 'career-hero eksik');
    assert(indexHtml.includes('id="aiTickerBar"'), 'id="aiTickerBar" eksik');
    assert(indexHtml.includes('id="aiTickerContent"'), 'id="aiTickerContent" eksik');
    assert(!indexHtml.includes('class="career-quick-actions"'), 'career-quick-actions hero butonları kaldırılmalı');
});

it('4.2 Kariyer Alt Sekmeler Barı (.career-nav-tabs-bar) 6 ana sekmeyi tek gezinme merkezi olarak içeriyor', () => {
    assert(indexHtml.includes('class="career-nav-tabs-bar"'), 'career-nav-tabs-bar eksik');
    assert(indexHtml.includes('data-tab="ilanlar"'), 'data-tab="ilanlar" eksik');
    assert(indexHtml.includes('data-tab="profil"'), 'data-tab="profil" eksik');
    assert(indexHtml.includes('data-tab="cv"'), 'data-tab="cv" eksik');
    assert(indexHtml.includes('data-tab="forum"'), 'data-tab="forum" eksik');
    assert(indexHtml.includes('data-tab="mulakat"'), 'data-tab="mulakat" eksik');
    assert(indexHtml.includes('data-tab="takim"'), 'data-tab="takim" eksik');
});

it('4.3 6 Alt Panel (#careerSubpanel-...) DOM içinde tanımlı', () => {
    assert(indexHtml.includes('id="careerSubpanel-ilanlar"'), 'careerSubpanel-ilanlar eksik');
    assert(indexHtml.includes('id="careerSubpanel-profil"'), 'careerSubpanel-profil eksik');
    assert(indexHtml.includes('id="careerSubpanel-cv"'), 'careerSubpanel-cv eksik');
    assert(indexHtml.includes('id="careerSubpanel-forum"'), 'careerSubpanel-forum eksik');
    assert(indexHtml.includes('id="careerSubpanel-mulakat"'), 'careerSubpanel-mulakat eksik');
    assert(indexHtml.includes('id="careerSubpanel-takim"'), 'careerSubpanel-takim eksik');
});

it('4.4 Otomatik CV Oluşturucu ve ATS A4 Canlı Önizleme mevcut', () => {
    assert(indexHtml.includes('cv-builder-layout'), 'cv-builder-layout eksik');
    assert(indexHtml.includes('cv-preview-panel'), 'cv-preview-panel eksik');
    assert(indexHtml.includes('downloadCV()'), 'downloadCV() butonu eksik');
});

it('4.5 DEVREM Soru-Cevap Forumu (#careerForumFeedGrid) ve interaktif işlemler tanımlı', () => {
    assert(indexHtml.includes('id="careerForumFeedGrid"'), 'careerForumFeedGrid eksik');
    assert(portalJsContent.includes('renderCareerForumFeed'), 'renderCareerForumFeed eksik');
    assert(portalJsContent.includes('voteQuestion'), 'voteQuestion eksik');
    assert(portalJsContent.includes('openNewQuestionModal'), 'openNewQuestionModal eksik');
});

// 5. SADELEŞTİRİLMİŞ NAVBAR TESTLERİ
it('5.1 Navbar SADECE DEVREM logosu, arama kutusu ve profil/auth menüsünü içerir', () => {
    const navMatch = indexHtml.match(/<nav class="navbar" id="navbar">([\s\S]*?)<\/nav>/);
    assert(navMatch, 'mainNavbar bulunamadı');
    const navHtml = navMatch[1];
    
    // Logo ve portal switcher mevcut
    assert(navHtml.includes('class="nav-portal-switcher"'), 'nav-portal-switcher eksik');
    
    // Arama butonu mevcut
    assert(navHtml.includes('class="nav-search-btn"'), 'nav-search-btn eksik');
    
    // Profil menüsü / auth butonları mevcut
    assert(navHtml.includes('id="userMenu"'), 'userMenu eksik');
    assert(navHtml.includes('id="navAuthBtns"'), 'navAuthBtns eksik');
    
    // Tüm menü linkleri kaldırılmış
    assert(!navHtml.includes('class="nav-links"'), 'nav-links navbar içinde olmamalı');
    assert(!navHtml.includes('class="nav-item"'), 'nav-item navbar içinde olmamalı');
    assert(!navHtml.includes('class="nav-item-dropdown"'), 'nav-item-dropdown navbar içinde olmamalı');
});

it('5.2 Navbar içinde eski menü bağlantıları ve dropdown metinleri yer almıyor', () => {
    const navMatch = indexHtml.match(/<nav class="navbar" id="navbar">([\s\S]*?)<\/nav>/);
    const navHtml = navMatch[1];
    
    const forbiddenTexts = [
        'Formüller &amp; Cheat Sheet',
        'Staj &amp; İş İlanları',
        'CV Oluşturucu',
        'Soru-Cevap Forumu',
        'TEKNOFEST &amp; Proje Takımları'
    ];
    
    for (const text of forbiddenTexts) {
        assert(!navHtml.includes(`<span>${text}</span>`), `Navbar içinde menü linki bulundu: ${text}`);
    }
});

// 6. KARİYER ARKA PLANI (YEŞİL/TURKUAZ SVG AĞ DÜĞÜMLERİ) TESTLERİ
it('6.1 Kariyer hero içinde .career-network-svg yeşil/turkuaz SVG arka planı tanımlı', () => {
    assert(indexHtml.includes('class="career-network-svg"'), 'career-network-svg bulunamadı');
    assert(indexHtml.includes('netGradTeal') && indexHtml.includes('netGradCyan'), 'SVG teal ve cyan gradientleri eksik');
    assert(indexHtml.includes('#10b981') && indexHtml.includes('#06b6d4'), 'Yeşil ve Turkuaz renk kodları eksik');
});

it('6.2 SVG arka planı düğüm çemberleri (<circle>), bağlantı yolları (<path>) ve sinyal darbeleri (<animateMotion>) içeriyor', () => {
    const careerHeroMatch = indexHtml.match(/<section class="career-hero">([\s\S]*?)<\/section>/);
    assert(careerHeroMatch, 'career-hero bulunamadı');
    const heroContent = careerHeroMatch[1];
    
    assert(heroContent.includes('<circle'), 'SVG ağ düğüm çemberleri eksik');
    assert(heroContent.includes('<path'), 'SVG ağ bağlantı yolları eksik');
    assert(heroContent.includes('<animateMotion'), 'SVG sinyal darbesi animasyonu eksik');
});

it('6.3 CSS içinde .career-network-svg stilleri ve radyal maskeleme tanımlı', () => {
    assert(cssContent.includes('.career-network-svg'), '.career-network-svg CSS kuralı eksik');
    assert(cssContent.includes('radial-gradient'), 'Radyal maskeleme eksik');
});

// 7. METİN DÜZELTMELERİ TESTLERİ
it('7.1 Akademi hero açıklamasında "kariyer tavsiyeleri" ifadesi BULUNMUYOR', () => {
    const heroMatch = indexHtml.match(/<section class="hero" id="hero">([\s\S]*?)<\/section>/);
    assert(heroMatch, 'hero bölümü bulunamadı');
    assert(!heroMatch[1].includes('kariyer tavsiyeleri'), 'Akademi hero içinde halen "kariyer tavsiyeleri" bulunuyor!');
});

it('7.2 Kariyer sekmesinde "Teknik Mülakat Simülatörü" yerine "Mülakat Hazırlığı" yazıyor', () => {
    assert(indexHtml.includes('Mülakat Hazırlığı'), 'Mülakat Hazırlığı bulunamadı');
});

// 8. ARAMA VE BİLDİRİM AYRIMI TESTLERİ
it('8.1 Spotlight arama motoru aktif portala göre filtreleniyor', () => {
    assert(portalJsContent.includes('setupPortalSearchHook'), 'setupPortalSearchHook eksik');
    assert(portalJsContent.includes('updateSpotlightSearchPlaceholder'), 'updateSpotlightSearchPlaceholder eksik');
});

it('8.2 Bildirimler aktif portala göre (Akademi vs Kariyer) filtreleniyor', () => {
    assert(indexHtml.includes('// Portala göre bildirimleri filtrele (Akademi vs Kariyer)'), 'Bildirim portal filtreleme kuralı eksik');
});

// 9. KALICILIK (LOCALSTORAGE) TESTLERİ
it('9.1 Portal seçimi localStorage üzerinde saklanıyor ve sayfa açılışında yükleniyor', () => {
    assert(portalJsContent.includes("localStorage.setItem('devrem_active_portal', portalName)"), 'localStorage kaydetme eksik');
    assert(portalJsContent.includes("localStorage.getItem('devrem_active_portal')"), 'localStorage okuma eksik');
});

console.log('───────────────────────────────────────────────────────────────');
console.log(`TOPLAM: ${passCount + failCount} | BAŞARILI: ${passCount} | BAŞARISIZ: ${failCount}`);
if (failCount === 0) {
    console.log('🎉 TÜM SADELEŞTİRİLMİŞ NAVBAR, SVG VE PORTAL TESTLERİ %100 GEÇTİ!');
} else {
    process.exit(1);
}
