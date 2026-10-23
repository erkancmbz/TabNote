const fs = require('fs');
const path = require('path');
const assert = require('assert');

const rootDir = path.join(__dirname, '..');
const indexPath = path.join(rootDir, 'index.html');
const advScriptPath = path.join(rootDir, 'scripts', 'devrem_advanced_modules.js');
const cssPath = path.join(rootDir, 'styles', 'modules_extra.css');

const html = fs.readFileSync(indexPath, 'utf8');
const scriptContent = fs.readFileSync(advScriptPath, 'utf8');
const cssContent = fs.readFileSync(cssPath, 'utf8');

console.log('═══════════════════════════════════════════════════════════════');
console.log('    DEVREM STUDIO - YENİ MODÜLLER & ENTEGRASYON TESTLERİ      ');
console.log('═══════════════════════════════════════════════════════════════\n');

let passed = 0;
let total = 0;

function test(description, fn) {
    total++;
    try {
        fn();
        console.log(`✓ ${description}`);
        passed++;
    } catch (err) {
        console.error(`✗ ${description}`);
        console.error('  Hata:', err.message);
    }
}

// 1. Script Sözdizimi
test('1. devrem_advanced_modules.js geçerli JavaScript sözdizimine sahip', () => {
    assert(scriptContent.length > 500, 'Dosya çok kısa');
    new Function(scriptContent);
});

// 2. index.html head içinde yüklü mü
test('2. index.html head içinde devrem_advanced_modules.js script etiketi mevcut', () => {
    assert(html.includes('src="scripts/devrem_advanced_modules.js"'), 'Script tag eksik');
});

// 3. Pinout Hub DOM & CSS
test('3. Donanım Masası & Popüler Entegre Pinout Kılavuzu (#pinoutHubContainer) DOM ve CSS tanımlı', () => {
    assert(html.includes('id="pinoutHubContainer"'), 'pinoutHubContainer DOM içinde yok');
    assert(cssContent.includes('.pinout-hub-wrapper'), 'pinout CSS tanımlı değil');
    assert(scriptContent.includes('NE555'), 'NE555 pinout verisi eksik');
    assert(scriptContent.includes('LM741'), 'LM741 pinout verisi eksik');
    assert(scriptContent.includes('ESP32'), 'ESP32 pinout verisi eksik');
    assert(scriptContent.includes('STM32'), 'STM32 pinout verisi eksik');
});

// 4. Direnç & SMD Çözücü
test('4. 4-Bant Direnç & SMD Kod Çözücü DOM ve mantık tanımlı', () => {
    assert(html.includes('id="resistorValueDisplay"'), 'Direnç görsel göstergesi yok');
    assert(html.includes('id="smdCodeInput"'), 'SMD girdi alanı yok');
    assert(scriptContent.includes('calculateResistor'), 'Direnç hesaplama fonksiyonu yok');
    assert(scriptContent.includes('decodeSmd'), 'SMD çözücü fonksiyonu yok');
});

// 5. Hedef Not Simülatörü ("Finalden Kaç Almalıyım?")
test('5. Vize/Final Hedef Not Simülatörü DOM ve hesaplama algoritması mevcut', () => {
    assert(html.includes('id="gradeInputVize"'), 'Vize not girdisi yok');
    assert(html.includes('id="gradeGoalResultBox"'), 'Hedef not sonuç kutusu yok');
    assert(scriptContent.includes('GradeGoalCalculator'), 'GradeGoalCalculator modülü tanımlı değil');
});

// 6. Hızlı Formül Kağıtları (Cheat-Sheets)
test('6. Vize/Final Hızlı Formül Kağıtları arşivi ve filtre butonları mevcut', () => {
    assert(html.includes('id="quickFormulasList"'), 'quickFormulasList kapsayıcısı yok');
    assert(scriptContent.includes('QUICK_FORMULAS'), 'Formül veri havuzu yok');
    assert(scriptContent.includes('Laplace'), 'Laplace formülleri mevcut');
    assert(scriptContent.includes('Maxwell'), 'Maxwell denklemleri mevcut');
});

// 7. Simülatör Deney Raporu & Grafik İndirme Butonları
test('7. Simülatörlerden Deney Raporu Parametrelerini Kopyalama ve PNG indirme butonları mevcut', () => {
    assert(html.includes('LabExportModule.exportCurrentLabReport'), 'Rapor kopyalama butonu yok');
    assert(html.includes('LabExportModule.downloadCanvasPng'), 'PNG indirme butonu yok');
});

// 8. Kütüphane ⟷ Forum Köprüsü
test('8. Kütüphane kaynakları altından DEVREM Forum\'a yönlendiren tartışma köprüsü mevcut', () => {
    assert(html.includes('goToAcademicForumDiscussion'), 'goToAcademicForumDiscussion butonu yok');
});

// 9. Yol Haritası ⟷ Kariyer Proje Takımları Köprüsü
test('9. Yol Haritası 4. Sınıf Bitirme / TEKNOFEST Takım Arkadaşı İlanı köprüsü mevcut', () => {
    assert(html.includes('goToProjectTeamFinder'), 'goToProjectTeamFinder köprü butonu yok');
});

// 10. Kariyer Portalı - Onaylı Staj Defteri Rehberi & Şablonları
test('10. Kariyer ATS CV paneli altında Onaylı Staj Defteri Kılavuzu & Şablon Arşivi mevcut', () => {
    assert(html.includes('id="internshipGuideContainer"'), 'internshipGuideContainer DOM içinde yok');
    assert(scriptContent.includes('INTERNSHIP_TEMPLATES'), 'Staj şablonları veri seti yok');
    assert(scriptContent.includes('Donanım & Ar-Ge Stajı'), 'Donanım staj şablonu mevcut');
    assert(scriptContent.includes('Gömülü Yazılım Stajı'), 'Gömülü staj şablonu mevcut');
    assert(scriptContent.includes('Yüksek Gerilim & Saha'), 'Yüksek gerilim saha staj şablonu mevcut');
});

// 11. Rozet & CV Entegrasyonu
test('11. Simülatör başarı rozetleri ile CV Teknik Beceriler entegrasyonu tanımlı', () => {
    assert(scriptContent.includes('syncBadgesToCV'), 'syncBadgesToCV köprüsü tanımlı');
});

console.log('\n───────────────────────────────────────────────────────────────');
console.log(`TOPLAM: ${total} | BAŞARILI: ${passed} | BAŞARISIZ: ${total - passed}`);
if (passed === total) {
    console.log('🎉 TÜM YENİ MODÜLLER VE ÇİFT YÖNLÜ ENTEGRASYON TESTLERİ %100 GEÇTİ!\n');
} else {
    process.exit(1);
}
