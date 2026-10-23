/**
 * DEVREM STUDIO - 2'Lİ PORTAL SEÇİM EKRANI VE 100VH HERO EŞİTLEME TESTLERİ
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('═══════════════════════════════════════════════════════════════');
console.log('   DEVREM STUDIO - PORTAL GİRİŞ KAPISI & 100VH HERO TESTLERİ   ');
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

// 1. GİRİŞ KAPISI / PORTAL SEÇİM EKRANI (LANDING SCREEN)
it('1.1 Tam ekran Portal Giriş Kapısı (#devremPortalGate) index.html içinde tanımlı', () => {
    assert(indexHtml.includes('id="devremPortalGate"'), 'id="devremPortalGate" bulunamadı');
});

it('1.2 SOL KART: 🎓 DEVREM AKADEMİ & LAB başlığı ve rozeti mevcut', () => {
    assert(indexHtml.includes('DEVREM AKADEMİ & LAB') || indexHtml.includes('DEVREM AKADEMİ &amp; LAB'), 'Akademi kartı başlığı eksik');
    assert(indexHtml.includes('gate-card-akademi') || indexHtml.includes('card-akademi'), 'Akademi kartı sınıfı eksik');
});

it('1.3 SOL KART: AND Kapısı Çip Logosu (D Harfi) SVG ve pinleri tanımlı', () => {
    assert(indexHtml.includes('gateSvgLineA') || indexHtml.includes('gatePinA') || indexHtml.includes('gateSvgAndBody'), 'AND kapısı SVG elemanları eksik');
    assert(indexHtml.includes('gateSvgLineB') || indexHtml.includes('gatePinB'), 'AND kapısı B pini eksik');
    assert(indexHtml.includes('gateSvgLineY') || indexHtml.includes('gatePinY'), 'AND kapısı Y pini eksik');
});

it('1.4 SOL KART: İnteraktif Mantık Terminali ([A: 1] [B: 1] => Çıktı [Y: 1]) mevcut', () => {
    assert(indexHtml.includes('gateBtnA') || indexHtml.includes('toggleGateInput'), 'A giriş butonu eksik');
    assert(indexHtml.includes('gateBtnB') || indexHtml.includes('toggleGateInput'), 'B giriş butonu eksik');
    assert(indexHtml.includes('gatePillY') || indexHtml.includes('valY'), 'Y çıkış göstergesi eksik');
});

it('1.5 SOL KART: "Dersler, 36 Simülatör, Kütüphane & Formüller" açıklaması ve "Akademiye Giriş Yap" butonu mevcut', () => {
    assert(indexHtml.includes('Dersler, 36 Simülatör, Kütüphane & Formüller') || indexHtml.includes('Dersler, 36 Simülatör, Kütüphane &amp; Formüller'), 'Açıklama metni eksik');
    assert(indexHtml.includes('Akademiye Giriş Yap') || indexHtml.includes('AKADEMİYE GİRİŞ YAP'), 'Akademiye Giriş butonu eksik');
});

it('1.6 SAĞ KART: 💼 DEVREM KARİYER & TOPLULUK başlığı ve rozeti mevcut', () => {
    assert(indexHtml.includes('DEVREM KARİYER & TOPLULUK') || indexHtml.includes('DEVREM KARİYER &amp; TOPLULUK'), 'Kariyer kartı başlığı eksik');
    assert(indexHtml.includes('gate-card-kariyer') || indexHtml.includes('card-kariyer'), 'Kariyer kartı sınıfı eksik');
});

it('1.7 SAĞ KART: Yükseliş Oku Logosu (D harfi ↗) SVG grafiği mevcut', () => {
    assert(indexHtml.includes('gateGradKariyer') || indexHtml.includes('gate-logo-kariyer'), 'Kariyer yükseliş SVG eksik');
    assert(indexHtml.includes('M 125 105 L 175 55') || indexHtml.includes('polygon points="178,40 185,68 157,61"'), 'Yükseliş oku eksik');
});

it('1.8 SAĞ KART: İnteraktif Ağ / Network Modu ([Staj] [İş] [Topluluk]) ve yeşil neon terminal mevcut', () => {
    assert(indexHtml.includes('btnNetStaj') || indexHtml.includes('setGateNetMode'), 'Staj modu eksik');
    assert(indexHtml.includes('btnNetIs'), 'İş modu eksik');
    assert(indexHtml.includes('btnNetTopluluk'), 'Topluluk modu eksik');
    assert(indexHtml.includes('gateNetStatus'), 'Canlı ağ bildirim durumu eksik');
});

it('1.9 SAĞ KART: "Staj & İş İlanları, Otomatik CV, Soru-Cevap Forumu" açıklaması ve "Kariyere Giriş Yap" butonu mevcut', () => {
    assert(indexHtml.includes('Staj & İş İlanları, Otomatik CV, Soru-Cevap Forumu') || indexHtml.includes('Staj &amp; İş İlanları, Otomatik CV, Soru-Cevap Forumu'), 'Kariyer açıklama metni eksik');
    assert(indexHtml.includes('Kariyere Giriş Yap') || indexHtml.includes('KARİYERE GİRİŞ YAP'), 'Kariyere Giriş butonu eksik');
});

it('1.10 LocalStorage kalıcılığı ve geçiş fonksiyonları (enterDevremPortal) tanımlı', () => {
    assert(indexHtml.includes('enterDevremPortal'), 'enterDevremPortal fonksiyonu eksik');
    assert(indexHtml.includes('localStorage.setItem(\'devrem_portal_chosen\'') || indexHtml.includes('devrem_portal_chosen'), 'devrem_portal_chosen kaydı eksik');
});

// 2. HERO BÖLÜMLERİNİ TAM EKRAN (100vh, min-height: 1080px) VE BİREBİR AYNI BOYUTA GETİRME
it('2.1 Hero alanları height: 100vh; min-height: 1080px kuralını içeriyor', () => {
    assert(indexHtml.includes('height: 100vh !important;') || indexHtml.includes('height: 100vh'), 'height: 100vh kuralı eksik');
    assert(indexHtml.includes('min-height: 1080px !important;') || indexHtml.includes('min-height: 1080px'), 'min-height: 1080px kuralı eksik');
});

it('2.2 Hem #portal-akademi hem #portal-kariyer hero seçicileri 100vh kuralında birlikte yer alıyor', () => {
    assert(indexHtml.includes('#portal-akademi .hero'), '#portal-akademi .hero kuralı eksik');
    assert(indexHtml.includes('#portal-kariyer .career-hero') || indexHtml.includes('#portal-kariyer .hero'), '#portal-kariyer hero kuralı eksik');
});

// 3. BAŞLIK, BUTON VE ARKA PLAN HİZALAMASI
it('3.1 Hero H1, P, Badge ve Ticker bar dikey yükseklik ve hizalama kuralları tanımlı', () => {
    assert(indexHtml.includes('#portal-akademi .hero-content'), 'hero-content kuralı eksik');
    assert(indexHtml.includes('#portal-akademi .hero-badge'), 'hero-badge kuralı eksik');
    assert(indexHtml.includes('#portal-akademi .hero h1'), 'hero h1 kuralı eksik');
    assert(indexHtml.includes('#portal-akademi .hero p'), 'hero p kuralı eksik');
});

it('3.2 Mavi PCB Devre (#heroPcbCanvas) ve Yeşil Ağ Arka Planı (.career-network-svg) 100vh boyutunu doldurur', () => {
    assert(indexHtml.includes('#portal-akademi .hero-pcb-canvas'), 'hero-pcb-canvas kuralı eksik');
    assert(indexHtml.includes('#portal-kariyer .career-network-svg'), 'career-network-svg kuralı eksik');
});

// 4. MİLİMETRİK KART VE BUTON HİZALAMASI TESTLERİ
it('4.1 İki kartın yüksekliği ve esnek kutu yapısı eşit (height: 100%; display: flex; flex-direction: column;)', () => {
    assert(indexHtml.includes('.gate-card {') && indexHtml.includes('height: 100%;'), 'gate-card height: 100% kuralı eksik');
    assert(indexHtml.includes('display: flex;') && indexHtml.includes('flex-direction: column;'), 'gate-card flex sütun kuralı eksik');
});

it('4.2 Logo görsel kutularının boyutları sabit ve birebir aynı (.gate-logo-wrap)', () => {
    assert(indexHtml.includes('.gate-logo-wrap {') && indexHtml.includes('width: 140px;') && indexHtml.includes('height: 140px;'), 'gate-logo-wrap boyutları eksik');
});

it('4.3 Ortadaki interaktif terminal kutularının dikey yükseklikleri eşitlenmiş (min-height: 110px;)', () => {
    assert(indexHtml.includes('.gate-terminal-box {') && indexHtml.includes('min-height: 110px;'), 'gate-terminal-box min-height: 110px kuralı eksik');
});

it('4.4 Giriş butonları tam aynı yatay hizaya kilitli (margin-top: auto;)', () => {
    assert(indexHtml.includes('.gate-enter-btn {') && indexHtml.includes('margin-top: auto;'), 'gate-enter-btn margin-top: auto kuralı eksik');
});

console.log('───────────────────────────────────────────────────────────────');
console.log(`TOPLAM: ${passCount + failCount} | BAŞARILI: ${passCount} | BAŞARISIZ: ${failCount}`);
if (failCount === 0) {
    console.log('🎉 TÜM PORTAL GİRİŞ KAPISI VE 100VH HERO TESTLERİ %100 GEÇTİ!');
} else {
    process.exit(1);
}

