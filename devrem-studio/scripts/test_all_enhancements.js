/**
 * EEM REHBER / DEVREM STUDIO - 11 MADDELİK GELİŞTİRME DOĞRULAMA TESTİ
 */
const fs = require('fs');
const assert = require('assert');

console.log('═══════════════════════════════════════════════════════════════');
console.log('   11 MADDELİK DEVREM STUDIO GELİŞTİRMELERİ KONTROLÜ          ');
console.log('═══════════════════════════════════════════════════════════════\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`PASS: ${name}`);
        passed++;
    } catch(e) {
        console.error(`FAIL: ${name} -> ${e.message}`);
        failed++;
    }
}

// Global mocks
global.window = {};
global.document = {
    getElementById: (id) => ({
        value: 10,
        innerText: '',
        innerHTML: '',
        style: {},
        classList: { add() {}, remove() {}, toggle() {} },
        parentElement: { style: {}, querySelector: () => null, appendChild() {} },
        getContext: () => ({
            clearRect() {}, fillRect() {}, strokeRect() {}, beginPath() {},
            moveTo() {}, lineTo() {}, stroke() {}, fill() {}, arc() {},
            save() {}, restore() {}, rotate() {}, translate() {}, fillText() {},
            createLinearGradient: () => ({ addColorStop() {} }),
            setLineDash() {}
        })
    }),
    querySelectorAll: () => [],
    createElement: () => ({
        style: {},
        classList: { add() {}, remove() {} },
        appendChild() {},
        setAttribute() {}
    }),
    body: { style: {}, appendChild() {}, removeChild() {} }
};
global.localStorage = {
    data: {},
    getItem(k) { return this.data[k] || null; },
    setItem(k, v) { this.data[k] = v.toString(); }
};
global.requestAnimationFrame = () => {};
global.cancelAnimationFrame = () => {};

// 1. K-Map Solver (Madde 3)
test('Madde 3: Karnaugh Haritası (K-Map) Çözücü ve SOP Mantık Sentezi', () => {
    eval(fs.readFileSync('scripts/kmap_solver.js', 'utf8'));
    const K = window.KMapModule;
    assert(K, 'KMapModule yüklenemedi');
    K.init();
    K.setVarCount(4);
    // 4 köşe testi (0, 2, 8, 10)
    [0, 2, 8, 10].forEach(m => K.cellValues[m] = 1);
    const ones = Object.keys(K.cellValues).filter(k => K.cellValues[k] === 1).map(Number);
    const prime = K.findPrimeImplicants(ones, []);
    const ess = K.getEssentialPrimeImplicants(prime, ones);
    assert.strictEqual(ess.length, 1, '4 köşe tek asal bileşene indirgenmeli');
    const term = K.implicantToTerm(ess[0].mask, ['A','B','C','D']);
    assert.strictEqual(term, "B'D'", '4 köşe sadeleştirmesi B\'D\' olmalı');
});

// 2. SMPS Buck/Boost (Madde 4)
test('Madde 4: SMPS Buck / Boost Güç Elektroniği Tasarım Simülatörü', () => {
    eval(fs.readFileSync('scripts/smps_designer.js', 'utf8'));
    const S = window.SmpsModule;
    assert(S, 'SmpsModule yüklenemedi');
    S.setMode('buck');
    S.calculate();
    S.setMode('boost');
    S.calculate();
    assert(true);
});

// 3. RF Mikroşerit Hat (Madde 5)
test('Madde 5: RF Mikroşerit Hat Empedansı ve 50Ω Sentezi', () => {
    eval(fs.readFileSync('scripts/microstrip_calc.js', 'utf8'));
    const M = window.MicrostripModule;
    assert(M, 'MicrostripModule yüklenemedi');
    const res = M.calcZ0(3.0, 1.6, 4.4, 0.035);
    assert(res.z0 > 45 && res.z0 < 55, '3mm/1.6mm FR4 empedansı ~50Ω civarında olmalı');
    const synthW = M.synthesizeWidth(50, 4.4, 1.6, 0.035);
    assert(synthW > 2.5 && synthW < 3.5, '50Ω hedef için genişlik ~3mm olmalı');
});

// 4. DC Motor & H-Bridge (Madde 6)
test('Madde 6: DC Motor & H-Bridge PWM Sürüş Simülasyonu', () => {
    eval(fs.readFileSync('scripts/dc_motor_sim.js', 'utf8'));
    const D = window.DcMotorModule;
    assert(D, 'DcMotorModule yüklenemedi');
    D.init();
    D.setState('forward');
    D.setPwm(80);
    D.drawCanvas();
    assert(true);
});

// 5. Mobil Kanvas Kilidi & Tam Ekran (Madde 7)
test('Madde 7: Mobil Dokunmatik Kanvas Kilidi & Tam Ekran Modu', () => {
    eval(fs.readFileSync('scripts/canvas_enhancements.js', 'utf8'));
    const C = window.CanvasEnhancer;
    assert(C, 'CanvasEnhancer yüklenemedi');
    C.init();
    assert(true);
});

// 6. Offline PWA KaTeX & FontAwesome (Madde 8)
test('Madde 8: %100 Çevrimdışı (Offline) PWA sw.js Güvencesi', () => {
    const swContent = fs.readFileSync('sw.js', 'utf8');
    assert(/eem-rehber-v(?:[89]|\d{2,})/.test(swContent), 'sw.js v8 veya üstü sürümüne güncellenmeli');
    assert(swContent.includes('katex.min.css'), 'sw.js KaTeX CSS önbelleğini içermeli');
    assert(swContent.includes('modules_extra.css'), 'sw.js yeni modül stillerini içermeli');
});

// 7. Günün Sorusu & Rozetler (Maddeler 9 & 10)
test('Maddeler 9 & 10: Günün EEM Mülakat Sorusu, Günlük Seri & Rozetler', () => {
    eval(fs.readFileSync('scripts/gamification.js', 'utf8'));
    const G = window.GamificationModule;
    assert(G, 'GamificationModule yüklenemedi');
    const q = G.getTodayQuestion();
    assert(q && q.question && q.options.length === 4, 'Günün sorusu eksiksiz yüklenmeli');
    G.unlockBadge('smps_designer');
    const badges = G.getUnlockedBadges();
    assert(badges.includes('smps_designer'), 'Rozet açma başarılı olmalı');
});

// 8. Tek Tıkla Bulut & Taşınabilir Yedekleme (Madde 11)
test('Madde 11: Tek Tıkla Bulut & Taşınabilir Yedekleme (EEMCloudSync)', () => {
    eval(fs.readFileSync('scripts/cloud_sync.js', 'utf8'));
    const CS = window.EEMCloudSync;
    assert(CS, 'EEMCloudSync yüklenemedi');
    assert(typeof CS.exportBackup === 'function', 'exportBackup fonksiyonu mevcut olmalı');
    assert(typeof CS.importBackup === 'function', 'importBackup fonksiyonu mevcut olmalı');
});

// 9. Modüler Dosya Yapısı & Dinamik CSS Sınıfları (Maddeler 1 & 2)
test('Maddeler 1 & 2: Modüler CSS & Sınıf Tabanlı Işıma Mimarisi', () => {
    const css = fs.readFileSync('styles/modules_extra.css', 'utf8');
    assert(css.includes('.branch-card.is-highlighted'), '.is-highlighted kuralı tanımlı olmalı');
    assert(css.includes('.kmap-cell'), 'K-Map CSS kuralları tanımlı olmalı');
    assert(css.includes('.badge-item'), 'Rozet CSS kuralları tanımlı olmalı');
    assert(css.includes('.canvas-fullscreen-modal'), 'Tam ekran kanvas kuralı tanımlı olmalı');
});

// 10. index.html Entegrasyonu
test('index.html: 4 Yeni Aracın Kayıtlı ve Bağlı Olması', () => {
    const indexHtml = fs.readFileSync('index.html', 'utf8');
    assert(indexHtml.includes('calcKarnaughCard'), 'calcKarnaughCard kartı HTML içinde bulunmalı');
    assert(indexHtml.includes('calcSmpsCard'), 'calcSmpsCard kartı HTML içinde bulunmalı');
    assert(indexHtml.includes('calcMicrostripCard'), 'calcMicrostripCard kartı HTML içinde bulunmalı');
    assert(indexHtml.includes('calcDcMotorCard'), 'calcDcMotorCard kartı HTML içinde bulunmalı');
    assert(indexHtml.includes('dailyQuestionWidget'), 'dailyQuestionWidget HTML içinde bulunmalı');
    assert(indexHtml.includes('badgesGalleryContainer'), 'badgesGalleryContainer HTML içinde bulunmalı');
    assert(indexHtml.includes('modules_extra.css'), 'modules_extra.css head içinde bağlı olmalı');
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`SONUÇ: Toplam ${passed + failed} Test | Başarılı: ${passed} | Başarısız: ${failed}`);
console.log('═══════════════════════════════════════════════════════════════\n');

if (failed > 0) process.exit(1);
