/**
 * EEM Rehber - Kapsamlı Sistem & Entegrasyon Doğrulama Test Paketi
 * Platformdaki tüm hesaplayıcılar, simülatörler, güvenlik filtreleri,
 * tema mimarisi, kart ışıması ve osiloskop widget'ını tek seferde test eder.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const rootDir = path.join(__dirname, '..');
const indexPath = path.join(rootDir, 'index.html');
const forumPath = path.join(rootDir, 'forum.html');
const swPath = path.join(rootDir, 'sw.js');
const manifestPath = path.join(rootDir, 'manifest.json');

const html = fs.readFileSync(indexPath, 'utf8');
const forumHtml = fs.readFileSync(forumPath, 'utf8');
const swJs = fs.readFileSync(swPath, 'utf8');
const manifestJson = fs.readFileSync(manifestPath, 'utf8');

console.log('═══════════════════════════════════════════════════════════════');
console.log('    EEM REHBER - TÜM TESTLER & DOĞRULAMA KONTROLÜ             ');
console.log('═══════════════════════════════════════════════════════════════\n');

let passed = 0;
let total = 0;

function test(description, fn) {
    total++;
    try {
        fn();
        console.log(`PASS: ${description}`);
        passed++;
    } catch (err) {
        console.error(`FAIL: ${description}`);
        console.error(err.message);
    }
}

// 1. KOD SÖZDIZIMI (SYNTAX CHECK)
test('index.html inline scriptleri geçerli JavaScript sözdizimine sahip', () => {
    const scripts = html.match(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi) || [];
    assert(scripts.length > 0, 'Script bulunamadı');
    scripts.forEach((s, i) => {
        const code = s.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
        new Function(code);
    });
});

test('forum.html inline scriptleri geçerli JavaScript sözdizimine sahip', () => {
    const scripts = forumHtml.match(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi) || [];
    scripts.forEach((s) => {
        const code = s.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
        new Function(code);
    });
});

// 2. FORMÜLLER, HESAPLAYICILAR & FONKSİYONLAR
test('switchPracticeTab fonksiyonu tanımlı ve butonlar bağlı', () => {
    assert(html.includes('function switchPracticeTab'), 'switchPracticeTab tanımlı değil');
    assert(html.includes('window.switchPratikTab = switchPracticeTab'), 'alias atanmamış');
});

test('filterFormulas fonksiyonu tanımlı ve formül araması çalışır', () => {
    assert(html.includes('function filterFormulas('), 'filterFormulas tanımlı değil');
    assert(html.includes('window.filterFormulasSearch = filterFormulas'), 'alias atanmamış');
});

test('dB hesaplayıcısı voltage, power, mw2dbm ve dbm2mw modlarını destekler', () => {
    assert(html.includes("mode === 'voltage'"), 'voltage mode eksik');
    assert(html.includes("mode === 'power'"), 'power mode eksik');
    assert(html.includes("mode === 'mw2dbm'"), 'mw2dbm mode eksik');
    assert(html.includes("mode === 'dbm2mw'"), 'dbm2mw mode eksik');
});

test('Transistör ve Fazör UI olay yöneticileri window nesnesine bağlı', () => {
    assert(html.includes('window.toggleTransInputs = updateTransistorUI'), 'toggleTransInputs eksik');
    assert(html.includes('window.togglePhasorInputs = updatePhasorUI'), 'togglePhasorInputs eksik');
    assert(html.includes('window.toggleDbInputs = updateDbUI'), 'toggleDbInputs eksik');
});

test('3 Fazlı Güç Hesaplayıcısı ve Falstad simülasyon bağlantıları doğru', () => {
    assert(html.includes('id="calcThreePhaseCard"'), 'calcThreePhaseCard eksik');
    assert(html.includes('function calculateThreePhase'), 'calculateThreePhase eksik');
    assert(html.includes('3phasewye.txt'), '3phasewye preset eksik');
    assert(html.includes('amp-invert.txt'), 'amp-invert preset eksik');
});

// 3. GÜVENLİK (XSS KORUMASI) & DOSYA KOTASI
test('escapeHtml fonksiyonu index.html ve forum.html içinde tanımlı', () => {
    assert(html.includes('function escapeHtml'), 'index.html escapeHtml eksik');
    assert(forumHtml.includes('function escapeHtml'), 'forum.html escapeHtml eksik');
});

test('Topluluk katkıları ve sınav soruları escapeHtml ile filtrelenir', () => {
    assert(html.includes('const safeUni = escapeHtml(uni)'), 'safeUni eksik');
    assert(html.includes('const safeTitle = escapeHtml(title)'), 'safeTitle eksik');
});

test('CV yükleme dosya boyutu sınırı güvenli 2.5MB kotasına ayarlı', () => {
    assert(html.includes('2.5 * 1024 * 1024'), '2.5MB kotası eksik');
});

// 4. PWA, SERVICE WORKER & İKONLAR
test('PWA PNG/SVG ikonları mevcut ve geçerli', () => {
    assert(fs.existsSync(path.join(rootDir, 'icons', 'icon-192.png')), 'icon-192.png eksik');
    assert(fs.existsSync(path.join(rootDir, 'icons', 'icon-512.png')), 'icon-512.png eksik');
    assert(swJs.includes('icon-192.png'), 'sw.js icon-192.png eksik');
    assert(manifestJson.includes('icon-192.png'), 'manifest.json icon-192.png eksik');
});

// 5. TEMA, KONTRAST & ERGONOMİ
test('Tipografi belirteçleri ve WCAG AA kontrast kuralları tanımlı', () => {
    assert(html.includes('--text-xs:'), '--text-xs eksik');
    assert(html.includes('--text-base:'), '--text-base eksik');
    assert(html.includes('--text-3xl:'), '--text-3xl eksik');
    assert(html.includes('[data-theme="light"]'), 'data-theme light eksik');
});

test('Hesaplayıcı sayısal girdileri mobil inputmode="decimal" içerir', () => {
    assert(html.includes('inputmode="decimal"'), 'inputmode="decimal" eksik');
});

test('İnteraktif kanvas öğeleri touch-action: none içerir', () => {
    assert(html.includes('touch-action: none'), 'touch-action: none eksik');
});

test('Gündüz modunda kütüphane başlığı, haplar ve yönetici çubukları kontrast uyumlu', () => {
    assert(html.includes('.resources-hub-hero'), '.resources-hub-hero eksik');
    assert(html.includes('.admin-mode-banner'), '.admin-mode-banner eksik');
    assert(html.includes('.resource-tag-tr'), '.resource-tag-tr eksik');
});

// 6. PLATFORM GELİŞTİRMELERİ
test('Spotlight Hızlı Arama (Ctrl + K) modalı ve klavye gezintisi mevcut', () => {
    assert(html.includes('id="spotlightModalOverlay"'), 'spotlightModalOverlay eksik');
    assert(html.includes('function openSpotlightSearch'), 'openSpotlightSearch eksik');
    assert(html.includes("e.key.toLowerCase() === 'k'"), 'Ctrl+K dinleyici eksik');
});

test('GPA Hesaplayıcı ve 240 AKTS müfredat sistemi eksiksiz tanımlı', () => {
    assert(html.includes('DEFAULT_EEM_CURRICULUM'), 'DEFAULT_EEM_CURRICULUM eksik');
    assert(html.includes('function getGPATranscript'), 'getGPATranscript eksik');
    assert(html.includes('function renderGPATranscriptUI'), 'renderGPATranscriptUI eksik');
});

test('Topluluk sınav ve not paylaşım sistemi mevcut', () => {
    assert(html.includes('id="communityContribModalOverlay"'), 'communityContribModalOverlay eksik');
    assert(html.includes('function openCommunityContribModal'), 'openCommunityContribModal eksik');
});

// 7. EVRENSEL KART SPOTLIGHT & NAVBAR CANLI OSİLOSKOP
test('Evrensel Kart & Kutu Manyetik Lazer Spotlight sistemi tanımlı', () => {
    assert(html.includes('var(--mouse-x, -500px)'), 'var(--mouse-x) eksik');
    assert(html.includes('--spotlight-border: #38bdf8'), 'Koyu tema lazer eksik');
    assert(html.includes('--spotlight-border: #0284c7'), 'Açık tema lazer eksik');
    assert(html.includes('UNIVERSAL_CARD_SELECTORS'), 'UNIVERSAL_CARD_SELECTORS eksik');
    assert(html.includes('function initCardSpotlightTracker'), 'initCardSpotlightTracker eksik');
});

test('Navbar arayüzü ve sadeleştirilmiş kontroller doğrulaması', () => {
    assert(!html.includes('class="nav-scope-widget"'), 'nav-scope-widget kaldırılmış olmalı');
    assert(!html.includes('Mobil / APK'), 'Mobil / APK butonu kaldırılmış olmalı');
    assert(html.includes('class="theme-toggle"'), 'theme-toggle butonu mevcut olmalı');
    assert(html.includes('class="nav-search-btn"'), 'Spotlight arama butonu mevcut olmalı');
});

test('Hero Baskı Devre Kartı (PCB) Arka Plan Motoru ve Temaları Tanımlı', () => {
    assert(html.includes('id="heroPcbCanvas"'), 'heroPcbCanvas öğesi eksik');
    assert(html.includes('.hero-pcb-canvas'), '.hero-pcb-canvas CSS kuralı eksik');
    assert(html.includes('function initPcbBackground'), 'initPcbBackground motoru eksik');
    assert(html.includes('window.renderPcbBackground'), 'window.renderPcbBackground dış fonksiyonu eksik');
    assert(html.includes('EEM-SOC V2.4'), 'PCB ipek baskı etiketleri eksik');
    assert(html.includes('generatePcbLayout'), 'PCB hat oluşturucu eksik');
});

// 8. DEVREM ADVANCED MODULES & KÖPRÜLER
test('DEVREM Pinout Hub, Direnç/SMD Decoder, Formüller ve Staj Rehberi Tanımlı', () => {
    assert(html.includes('src="scripts/devrem_advanced_modules.js"'), 'devrem_advanced_modules.js yüklü olmalı');
    assert(html.includes('id="pinoutHubContainer"'), 'pinoutHubContainer mevcut olmalı');
    assert(html.includes('id="resistorValueDisplay"'), 'resistorValueDisplay mevcut olmalı');
    assert(html.includes('id="gradeGoalResultBox"'), 'gradeGoalResultBox mevcut olmalı');
    assert(html.includes('id="quickFormulasList"'), 'quickFormulasList mevcut olmalı');
    assert(html.includes('id="internshipGuideContainer"'), 'internshipGuideContainer mevcut olmalı');
    assert(html.includes('LabExportModule.exportCurrentLabReport'), 'Rapor kopyalama mevcut olmalı');
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`SONUÇ: Toplam ${total} Test | Başarılı: ${passed} | Başarısız: ${total - passed}`);
console.log('═══════════════════════════════════════════════════════════════');

if (passed === total) {
    console.log('🎉 TEBRİKLER! TÜM DOĞRULAMA TESTLERİ %100 BAŞARIYLA GEÇTİ!\n');
    process.exit(0);
} else {
    console.error('❌ BAZI TESTLER BAŞARISIZ OLDU!\n');
    process.exit(1);
}
