/**
 * DEVREM STUDIO - AKADEMİ & KARİYER TAM AYRIŞTIRMA DOĞRULAMA TESTİ
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('═══════════════════════════════════════════════════════════════');
console.log('   DEVREM STUDIO - AKADEMİ & KARİYER TAM AYRIŞTIRMA TESTLERİ   ');
console.log('═══════════════════════════════════════════════════════════════');

const indexPath = path.join(__dirname, '..', 'index.html');
const portalJsPath = path.join(__dirname, '..', 'scripts', 'devrem_portal.js');

const indexHtml = fs.readFileSync(indexPath, 'utf8');
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

it('1. #uye-paneli section etiketi #portal-kariyer div bloğu içerisinde yer alıyor', () => {
    const startKariyer = indexHtml.indexOf('<div id="portal-kariyer"');
    const endKariyer = indexHtml.indexOf('<!-- ═══════════════ /PORTAL 2: KARİYER ═══════════════ -->');
    const idxUye = indexHtml.indexOf('<section class="section" id="uye-paneli"');
    assert(startKariyer !== -1, 'portal-kariyer bulunamadı');
    assert(endKariyer !== -1, 'portal-kariyer kapanış yorumu bulunamadı');
    assert(idxUye > startKariyer && idxUye < endKariyer, 'uye-paneli portal-kariyer sınırları içinde olmalıdır');
});

it('2. #portal-akademi div bloğu içerisinde kariyer bileşenleri (#uye-paneli, Zeynep Demir, careerSubpanel) bulunmuyor', () => {
    const startAkademi = indexHtml.indexOf('<div id="portal-akademi"');
    const endAkademi = indexHtml.indexOf('<!-- ═══════════════ /PORTAL 1: AKADEMİ & LAB ═══════════════ -->');
    const akademiChunk = indexHtml.substring(startAkademi, endAkademi);
    assert(!akademiChunk.includes('id="uye-paneli"'), 'Akademi içinde uye-paneli bulunamaz');
    assert(!akademiChunk.includes('Zeynep Demir'), 'Akademi içinde Zeynep Demir profil kartı bulunamaz');
    assert(!akademiChunk.includes('careerSubpanel'), 'Akademi içinde careerSubpanel bulunamaz');
    assert(!akademiChunk.includes('Canlı EEM Staj & İş İlanları Panosu'), 'Akademi içinde Staj Panosu bulunamaz');
});

it('3. CSS portal izolasyonunda body.portal-akademi-active durumunda #uye-paneli kesinlikle gizleniyor', () => {
    assert(indexHtml.includes('body.portal-akademi-active #uye-paneli'), 'CSS kuralı eksik: body.portal-akademi-active #uye-paneli');
});

it('4. devrem_portal.js setDevremPortal fonksiyonu akademiye geçerken uye-paneli öğesini display:none yapıyor', () => {
    assert(portalJsContent.includes("uyePaneli.style.setProperty('display', 'none', 'important')"), 'setDevremPortal akademiye geçişte uyePaneli gizlenmiyor');
});

it('5. devrem_portal.js setDevremPortal fonksiyonu kariyere geçerken uye-paneli öğesini gösteriyor', () => {
    assert(portalJsContent.includes("uyePaneli.style.display = 'block'") || portalJsContent.includes('uyePaneli.style.removeProperty'), 'setDevremPortal kariyere geçişte uyePaneli gösterilmiyor');
});

it('6. updateAuthUI fonksiyonu portal aktifliğini denetleyerek Akademi modundayken uye-paneli açılmasını engelliyor', () => {
    assert(indexHtml.includes("const isKariyerActive = (window.currentDevremPortal === 'kariyer' || document.body.classList.contains('portal-kariyer-active'))"), 'updateAuthUI içinde isKariyerActive kontrolü eksik');
});

console.log('───────────────────────────────────────────────────────────────');
console.log(`TOPLAM: ${passCount + failCount} | BAŞARILI: ${passCount} | BAŞARISIZ: ${failCount}`);
if (failCount === 0) {
    console.log('🎉 TÜM AKADEMİ & KARİYER AYRIŞTIRMA TESTLERİ %100 GEÇTİ!');
} else {
    process.exit(1);
}
