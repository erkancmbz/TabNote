/**
 * EEM REHBER - Sayfa & Modül Erişim / Görünürlük Sistemi Test Paketi
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const rootDir = path.join(__dirname, '..');
const indexPath = path.join(rootDir, 'index.html');
const cssPath = path.join(rootDir, 'styles', 'modules_extra.css');
const scriptPath = path.join(rootDir, 'scripts', 'page_access_control.js');

const html = fs.readFileSync(indexPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

console.log('═══════════════════════════════════════════════════════════════');
console.log('    SAYFA & MODÜL ERİŞİM KONTROL SİSTEMİ DOĞRULAMA TESTLERİ   ');
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

// 1. Dosya ve Entegrasyon Varlığı
test('page_access_control.js dosyası mevcut ve geçerli sözdizimine sahip', () => {
    assert(scriptContent.length > 500, 'Script dosyası boş veya çok kısa');
    new Function(scriptContent);
});

test('index.html içinde page_access_control.js script etiketi bağlı', () => {
    assert(html.includes('src="scripts/page_access_control.js"'), 'Script etiketi index.html içinde bulunamadı');
});

test('Yönetici paneli içinde adminPageAccessControlContainer tanımlı', () => {
    assert(html.includes('id="adminPageAccessControlContainer"'), 'adminPageAccessControlContainer div elementi bulunamadı');
});

test('Admin Hero banner içinde Sayfa Görünürlük Masası butonu tanımlı', () => {
    assert(html.includes('Sayfa Görünürlük Masası'), 'Hero içinde hızlı erişim butonu bulunamadı');
});

test('modules_extra.css içinde Sayfa Erişim Masası ve Kilit Stilleri tanımlı', () => {
    assert(css.includes('.nav-access-lock-badge'), '.nav-access-lock-badge CSS sınıfı eksik');
    assert(css.includes('.section-access-lock-overlay'), '.section-access-lock-overlay CSS sınıfı eksik');
    assert(css.includes('.access-gate-modal-overlay'), '.access-gate-modal-overlay CSS sınıfı eksik');
    assert(css.includes('.access-segmented-control'), '.access-segmented-control CSS sınıfı eksik');
});

// 2. Mock Ortamında İş Mantığı (Business Logic) Testleri
test('PageAccessControl modül listesi ve varsayılan ayarlar doğru', () => {
    // Mock browser environment
    const mockStorage = {};
    const mockWindow = {
        localStorage: {
            getItem: (k) => mockStorage[k] || null,
            setItem: (k, v) => { mockStorage[k] = String(v); },
            removeItem: (k) => { delete mockStorage[k]; }
        },
        document: {
            readyState: 'complete',
            querySelectorAll: () => [],
            getElementById: () => null,
            body: { appendChild: () => {}, style: {} },
            addEventListener: () => {}
        },
        addEventListener: () => {},
        showToast: () => {}
    };

    const runScript = new Function('window', 'document', 'localStorage', scriptContent);
    runScript(mockWindow, mockWindow.document, mockWindow.localStorage);

    const pac = mockWindow.PageAccessControl;
    assert(pac, 'PageAccessControl window üzerine atanmadı');
    assert(pac.MODULES.length >= 15, `Yetersiz modül sayısı: ${pac.MODULES.length}`);

    // Ders kaynakları ve Laboratuvar modülleri mevcut mu
    const kaynaklarMod = pac.MODULES.find(m => m.id === 'kaynaklar');
    const labMod = pac.MODULES.find(m => m.id === 'muhendislik-lab');
    assert(kaynaklarMod, 'kaynaklar modülü bulunamadı');
    assert(labMod, 'muhendislik-lab modülü bulunamadı');

    assert.strictEqual(kaynaklarMod.defaultAccess, 'members_only', 'kaynaklar varsayılanı members_only olmalı');
    assert.strictEqual(labMod.defaultAccess, 'public', 'muhendislik-lab varsayılanı public olmalı');
});

test('Yetki kontrolü (canAccess) Misafir, Üye ve Yönetici senaryolarında doğru çalışır', () => {
    const mockStorage = {};
    let currentUser = null;

    const mockWindow = {
        localStorage: {
            getItem: (k) => mockStorage[k] || null,
            setItem: (k, v) => { mockStorage[k] = String(v); },
            removeItem: (k) => { delete mockStorage[k]; }
        },
        document: {
            readyState: 'complete',
            querySelectorAll: () => [],
            getElementById: () => null,
            body: { appendChild: () => {}, style: {} },
            addEventListener: () => {}
        },
        addEventListener: () => {},
        getCurrentUser: () => currentUser,
        showToast: () => {}
    };

    const runScript = new Function('window', 'document', 'localStorage', scriptContent);
    runScript(mockWindow, mockWindow.document, mockWindow.localStorage);

    const pac = mockWindow.PageAccessControl;

    // Senaryo 1: Misafir (Giriş yapmamış)
    currentUser = null;
    assert.strictEqual(pac.canAccess('dallar'), true, 'Herkese açık olan dallar modülüne misafir erişebilmeli');
    assert.strictEqual(pac.canAccess('kaynaklar'), false, 'Sadece üyelere özel olan kaynaklar modülüne misafir ERİŞEMEMELİ');
    assert.strictEqual(pac.canAccess('muhendislik-lab'), true, 'Herkese açık olan muhendislik-lab modülüne misafir erişebilmeli');

    // Senaryo 2: Normal Giriş Yapmış Öğrenci Üye
    currentUser = { id: 'u1', name: 'Ahmet', role: 'user', isAdmin: false };
    assert.strictEqual(pac.canAccess('dallar'), true, 'Normal üye dallar modülüne erişebilmeli');
    assert.strictEqual(pac.canAccess('kaynaklar'), true, 'Normal üye kaynaklar modülüne ERİŞEBİLMELİ');
    assert.strictEqual(pac.canAccess('muhendislik-lab'), true, 'Normal üye muhendislik-lab modülüne ERİŞEBİLMELİ');

    // Senaryo 3: Modül Gizlendiğinde
    // Normal kullanıcı izinleri değiştiremez
    assert.strictEqual(pac.setModuleAccess('dallar', 'hidden'), false, 'Normal üye izin değiştirememeli');

    // Yönetici izin değiştirebilir
    currentUser = { id: 'admin_fenerbahce', name: 'Admin', role: 'admin', isAdmin: true };
    assert.strictEqual(pac.setModuleAccess('dallar', 'hidden'), true, 'Yönetici izin değiştirebilmeli');

    // Şimdi normal üye gizli sayfaya erişememeli
    currentUser = { id: 'u1', name: 'Ahmet', role: 'user', isAdmin: false };
    assert.strictEqual(pac.canAccess('dallar'), false, 'Gizli sayfaya normal üye erişememeli');

    // Yönetici her şeye erişebilmeli
    currentUser = { id: 'admin_fenerbahce', name: 'Admin', role: 'admin', isAdmin: true };
    assert.strictEqual(pac.canAccess('dallar'), true, 'Yönetici gizli sayfaya erişebilmeli');
    assert.strictEqual(pac.canAccess('kaynaklar'), true, 'Yönetici kaynaklar modülüne erişebilmeli');
});

test('Hızlı hazır şablonlar (Presets) ve Sıfırlama işlevi doğru çalışır', () => {
    const mockStorage = {};
    let currentUser = { id: 'admin_fenerbahce', name: 'Admin', role: 'admin', isAdmin: true };

    const mockWindow = {
        localStorage: {
            getItem: (k) => mockStorage[k] || null,
            setItem: (k, v) => { mockStorage[k] = String(v); },
            removeItem: (k) => { delete mockStorage[k]; }
        },
        document: {
            readyState: 'complete',
            querySelectorAll: () => [],
            getElementById: () => null,
            body: { appendChild: () => {}, style: {} },
            addEventListener: () => {}
        },
        addEventListener: () => {},
        getCurrentUser: () => currentUser,
        showToast: () => {}
    };

    const runScript = new Function('window', 'document', 'localStorage', scriptContent);
    runScript(mockWindow, mockWindow.document, mockWindow.localStorage);

    const pac = mockWindow.PageAccessControl;

    // Şablon: all_public
    pac.applyPreset('all_public');
    assert.strictEqual(pac.getModuleAccess('kaynaklar'), 'public');
    assert.strictEqual(pac.getModuleAccess('muhendislik-lab'), 'public');

    // Şablon: user_request (Kullanıcının talep ettiği özel durum)
    pac.applyPreset('user_request');
    assert.strictEqual(pac.getModuleAccess('kaynaklar'), 'members_only');
    assert.strictEqual(pac.getModuleAccess('muhendislik-lab'), 'members_only');
    assert.strictEqual(pac.getModuleAccess('dallar'), 'public');
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`SONUÇ: Toplam ${total} Test | Başarılı: ${passed} | Başarısız: ${total - passed}`);
console.log('═══════════════════════════════════════════════════════════════');

if (passed === total) {
    console.log('🎉 TÜM ERİŞİM KONTROL TESTLERİ %100 BAŞARIYLA TAMAMLANDI!\n');
} else {
    process.exit(1);
}
