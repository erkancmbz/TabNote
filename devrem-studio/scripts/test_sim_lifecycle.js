/**
 * EEM REHBER / DEVREM STUDIO - SİMÜLASYON YAŞAM DÖNGÜSÜ & DONANIM HIZLANDIRMA TESTİ
 * 
 * Doğrulanan Maddeler:
 * 1. Başka bir simülasyon açıldığında veya araç değiştirildiğinde önceki simülasyonun otomatik durması (CPU/GPU tasarrufu)
 * 2. Tek Aktif Simülasyon Kuralı (SimManager tekillik garantisi)
 * 3. Modal kapanışında, sekme değişiminde ve arka plana atıldığında (visibilitychange) simülasyonların durması
 * 4. Donanım hızlandırma (transform: translateZ(0), will-change: transform, contain: paint, DPR tavanı ve desynchronized context)
 */
const fs = require('fs');
const assert = require('assert');

console.log('═══════════════════════════════════════════════════════════════');
console.log('   SİMÜLASYON YAŞAM DÖNGÜSÜ & DONANIM HIZLANDIRMA TESTLERİ     ');
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
    hidden: false,
    listeners: {},
    addEventListener(evt, fn) {
        this.listeners[evt] = this.listeners[evt] || [];
        this.listeners[evt].push(fn);
    },
    trigger(evt) {
        (this.listeners[evt] || []).forEach(fn => fn());
    },
    getElementById: (id) => ({
        id,
        value: 10,
        innerText: '',
        innerHTML: '',
        style: {},
        classList: {
            classes: new Set(),
            add(c) { this.classes.add(c); },
            remove(c) { this.classes.delete(c); },
            toggle(c, force) {
                if (force !== undefined) {
                    if (force) this.classes.add(c); else this.classes.delete(c);
                    return force;
                }
                if (this.classes.has(c)) { this.classes.delete(c); return false; }
                this.classes.add(c); return true;
            },
            contains(c) { return this.classes.has(c); }
        },
        parentElement: {
            style: {},
            querySelector: () => null,
            appendChild() {}
        },
        getBoundingClientRect: () => ({ width: 800, height: 320, left: 0, top: 0 }),
        getContext: () => ({
            clearRect() {}, fillRect() {}, strokeRect() {}, beginPath() {}, closePath() {},
            moveTo() {}, lineTo() {}, stroke() {}, fill() {}, arc() {},
            save() {}, restore() {}, rotate() {}, translate() {}, fillText() {},
            createLinearGradient: () => ({ addColorStop() {} }),
            setLineDash() {}, setTransform() {}
        }),
        getAttribute: () => null,
        setAttribute: () => {}
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
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// 1. canvas_enhancements.js yükleme ve SimManager kontrolü
test('1. SimManager Mimarisi & setupHiDpiCanvas Donanım Hızlandırma', () => {
    eval(fs.readFileSync('scripts/canvas_enhancements.js', 'utf8'));
    assert(window.SimManager, 'window.SimManager tanımlı olmalı');
    assert(typeof window.SimManager.register === 'function', 'SimManager.register fonksiyonu olmalı');
    assert(typeof window.SimManager.stopAll === 'function', 'SimManager.stopAll fonksiyonu olmalı');
    assert(typeof window.SimManager.notifyStarted === 'function', 'SimManager.notifyStarted fonksiyonu olmalı');
    assert(typeof window.setupHiDpiCanvas === 'function', 'setupHiDpiCanvas fonksiyonu olmalı');

    const testCanvas = document.getElementById('testCanvas');
    const hi = window.setupHiDpiCanvas(testCanvas);
    assert(hi && hi.dpr <= 2.0, 'DPR tavanı 2.0 ile sınırlandırılmış olmalı');
    assert(testCanvas.classList.contains('hardware-accelerated'), 'Canvas hardware-accelerated sınıfını almalı');
    assert(testCanvas.style.transform === 'translateZ(0)', 'Canvas GPU Compositor katmanına terfi ettirilmeli');
});

// 2. Simülatörlerin Yüklenmesi
test('2. Tüm Simülasyon Motorlarının Stop Metotları & SimManager Entegrasyonu', () => {
    eval(fs.readFileSync('scripts/spwm_sim.js', 'utf8'));
    eval(fs.readFileSync('scripts/fourier_sim.js', 'utf8'));
    eval(fs.readFileSync('scripts/em_waves_sim.js', 'utf8'));
    eval(fs.readFileSync('scripts/pid_controller_sim.js', 'utf8'));
    eval(fs.readFileSync('scripts/logic_timing_sim.js', 'utf8'));
    eval(fs.readFileSync('scripts/rectifier_sim.js', 'utf8'));
    eval(fs.readFileSync('scripts/ac_controller_sim.js', 'utf8'));
    eval(fs.readFileSync('scripts/convolution_lab.js', 'utf8'));
    eval(fs.readFileSync('scripts/dc_motor_sim.js', 'utf8'));

    assert(typeof window.SpwmModule.stop === 'function', 'SpwmModule.stop mevcut olmalı');
    assert(typeof window.FourierModule.stop === 'function', 'FourierModule.stop mevcut olmalı');
    assert(typeof window.EmWavesModule.stop === 'function', 'EmWavesModule.stop mevcut olmalı');
    assert(typeof window.PidSimModule.stop === 'function', 'PidSimModule.stop mevcut olmalı');
    assert(typeof window.LogicTimingModule.stop === 'function', 'LogicTimingModule.stop mevcut olmalı');
    assert(typeof window.RectifierModule.stop === 'function', 'RectifierModule.stop mevcut olmalı');
    assert(typeof window.AcControllerModule.stop === 'function', 'AcControllerModule.stop mevcut olmalı');
    assert(typeof window.ConvolutionLabModule.stop === 'function', 'ConvolutionLabModule.stop mevcut olmalı');
    assert(typeof window.DcMotorModule.stop === 'function', 'DcMotorModule.stop mevcut olmalı');
});

// 3. Başka Simülasyon Açılınca Öncekinin Kapanması (Zincirleme Test)
test('3. Başka Simülasyon Açıldığında Önceki Simülasyonun Durdurulması', () => {
    // A. SPWM Başlat
    window.SpwmModule.togglePlay();
    assert.strictEqual(window.SpwmModule.isRunning, true, 'SPWM çalışıyor olmalı');
    assert.strictEqual(window.SimManager.activeSimId, 'spwm', 'Aktif sim SPWM olmalı');

    // B. Fourier Başlat -> SPWM Otomatik Durmalı
    window.FourierModule.togglePlay();
    assert.strictEqual(window.SpwmModule.isRunning, false, 'SPWM otomatik durdurulmuş olmalı');
    assert.strictEqual(window.FourierModule.isRunning, true, 'Fourier çalışıyor olmalı');
    assert.strictEqual(window.SimManager.activeSimId, 'fourier', 'Aktif sim Fourier olmalı');

    // C. EM Waves Başlat -> Fourier Otomatik Durmalı
    window.EmWavesModule.togglePlay();
    assert.strictEqual(window.FourierModule.isRunning, false, 'Fourier otomatik durdurulmuş olmalı');
    assert.strictEqual(window.EmWavesModule.isRunning, true, 'EM Waves çalışıyor olmalı');
    assert.strictEqual(window.SimManager.activeSimId, 'em_waves', 'Aktif sim EM Waves olmalı');

    // D. DC Motor Başlat -> EM Waves Otomatik Durmalı
    window.DcMotorModule.togglePlay();
    assert.strictEqual(window.EmWavesModule.isRunning, false, 'EM Waves otomatik durdurulmuş olmalı');
    assert.strictEqual(window.DcMotorModule.isRunning, true, 'DC Motor çalışıyor olmalı');
    assert.strictEqual(window.SimManager.activeSimId, 'dc_motor', 'Aktif sim DC Motor olmalı');

    // E. Rectifier Başlat -> DC Motor Otomatik Durmalı
    window.RectifierModule.togglePlay();
    assert.strictEqual(window.DcMotorModule.isRunning, false, 'DC Motor otomatik durdurulmuş olmalı');
    assert.strictEqual(window.RectifierModule.isRunning, true, 'Rectifier çalışıyor olmalı');
    assert.strictEqual(window.SimManager.activeSimId, 'rectifier', 'Aktif sim Rectifier olmalı');

    // F. Convolution Lab Başlat -> Rectifier Otomatik Durmalı
    window.ConvolutionLabModule.togglePlay();
    assert.strictEqual(window.RectifierModule.isRunning, false, 'Rectifier otomatik durdurulmuş olmalı');
    assert.strictEqual(window.ConvolutionLabModule.isPlaying, true, 'Convolution Lab çalışıyor olmalı');
    assert.strictEqual(window.SimManager.activeSimId, 'convolution', 'Aktif sim Convolution olmalı');

    // G. SimManager.stopAll() tüm simülasyonları sıfırlamalı
    window.SimManager.stopAll();
    assert.strictEqual(window.ConvolutionLabModule.isPlaying, false, 'Convolution Lab durdurulmuş olmalı');
    assert.strictEqual(window.SimManager.activeSimId, null, 'Hiçbir simülasyon çalışmıyor olmalı');
});

// 4. Sekme Arka Plana Geçtiğinde (visibilitychange) Otomatik Dondurma
test('4. Sekme Arka Plana Atıldığında Canlı Döngülerin Durdurulması', () => {
    window.SpwmModule.togglePlay();
    assert.strictEqual(window.SpwmModule.isRunning, true, 'SPWM başlamış olmalı');

    // Kullanıcı sekmeyi değiştirdi veya tarayıcıyı küçülttü
    document.hidden = true;
    document.trigger('visibilitychange');

    assert.strictEqual(window.SpwmModule.isRunning, false, 'Sekme gizlendiğinde SPWM otomatik durmalı');
    assert.strictEqual(window.SimManager.activeSimId, null, 'Aktif sim sıfırlanmış olmalı');
});

// 5. CSS Donanım Hızlandırma Kurallarının Varlığı
test('5. modules_extra.css İçinde Donanım Hızlandırma Kuralları', () => {
    const css = fs.readFileSync('styles/modules_extra.css', 'utf8');
    assert(css.includes('.hardware-accelerated'), '.hardware-accelerated sınıfı tanımlı olmalı');
    assert(css.includes('transform: translateZ(0)'), 'transform: translateZ(0) kuralı olmalı');
    assert(css.includes('will-change: transform'), 'will-change: transform kuralı olmalı');
    assert(css.includes('contain: paint'), 'contain: paint kuralı olmalı');
    assert(css.includes('#spwmScopeCanvas'), '#spwmScopeCanvas donanım hızlandırma seçicilerinde yer almalı');
    assert(css.includes('#fourierScopeCanvas'), '#fourierScopeCanvas donanım hızlandırma seçicilerinde yer almalı');
});

// 6. index.html Entegrasyonu: selectLabTool, closeLabModal, switchLabSubTab
test('6. index.html İçinde selectLabTool, closeLabModal & switchLabSubTab Korumaları', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    assert(html.includes('window.SimManager.stopAll()'), 'index.html SimManager.stopAll() çağrılarını içermeli');
    assert(html.includes('stopZigzagSimulation'), 'stopZigzagSimulation fonksiyonu mevcut olmalı');
    assert(html.includes('stopSignalGenAudio'), 'stopSignalGenAudio fonksiyonu mevcut olmalı');
    assert(html.includes('stopPlotter3DAutoRotate'), 'stopPlotter3DAutoRotate fonksiyonu mevcut olmalı');
    assert(html.includes('cancelAllTransientSimFrames'), 'cancelAllTransientSimFrames fonksiyonu mevcut olmalı');
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`SONUÇ: Toplam ${passed + failed} Test | Başarılı: ${passed} | Başarısız: ${failed}`);
console.log('═══════════════════════════════════════════════════════════════\n');

if (failed > 0) process.exit(1);
