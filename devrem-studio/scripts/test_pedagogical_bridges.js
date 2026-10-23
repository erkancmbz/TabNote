const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const indexPath = path.join(rootDir, 'index.html');
const forumPath = path.join(rootDir, 'forum.html');
const bridgesPath = path.join(rootDir, 'scripts', 'pedagogical_bridges.js');
const cssPath = path.join(rootDir, 'styles', 'modules_extra.css');

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✓ ${message}`);
        passed++;
    } else {
        console.error(`  ✗ HATA: ${message}`);
        failed++;
    }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('   PEDAGOJİK KÖPRÜLER & FORUM FIRSAT ENTEGRASYONU TESTİ       ');
console.log('═══════════════════════════════════════════════════════════════');

// 1. Dosya varlık kontrolü
assert(fs.existsSync(bridgesPath), 'scripts/pedagogical_bridges.js dosyası mevcut');
const bridgesContent = fs.readFileSync(bridgesPath, 'utf8');
const indexContent = fs.readFileSync(indexPath, 'utf8');
const forumContent = fs.readFileSync(forumPath, 'utf8');
const cssContent = fs.readFileSync(cssPath, 'utf8');

// 2. index.html head ve init kontrolü
assert(indexContent.includes('scripts/pedagogical_bridges.js'), 'pedagogical_bridges.js index.html head içinde yüklü');
assert(indexContent.includes('PedagogicalBridgesModule.init()'), 'PedagogicalBridgesModule.init() initLabIde içinde çağrılıyor');

// 3. CSS kontrolleri
assert(cssContent.includes('.lab-next-topic-bridge'), 'modules_extra.css içinde .lab-next-topic-bridge sınıfı tanımlı');
assert(cssContent.includes('.btn-next-bridge'), 'modules_extra.css içinde .btn-next-bridge butonu tanımlı');

// 4. Pedagogical Bridges Modülü ve Hedef Doğrulama
const bridgeKeysMatch = bridgesContent.match(/const PEDAGOGICAL_BRIDGES = \{([\s\S]*?)\n\};/);
assert(bridgeKeysMatch, 'PEDAGOGICAL_BRIDGES nesnesi tanımlı');

// Require bridges module
const { PedagogicalBridgesModule, PEDAGOGICAL_BRIDGES } = require(bridgesPath);
const bridges = PEDAGOGICAL_BRIDGES;
assert(bridges && Object.keys(bridges).length >= 15, `Köprü sayısı yeterli (Tespit edilen: ${Object.keys(bridges).length})`);

// Registry kontrolü
const regMatch = indexContent.match(/var LAB_TOOLS_REGISTRY = \[([\s\S]*?)\];/);
assert(regMatch, 'LAB_TOOLS_REGISTRY mevcut');
const registryIds = [...regMatch[1].matchAll(/id:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);

Object.keys(bridges).forEach(sourceId => {
    assert(indexContent.includes(`id="${sourceId}"`) || indexContent.includes(`id='${sourceId}'`), `Kaynak kart DOM'da mevcut: ${sourceId}`);
    const nextId = bridges[sourceId].nextId;
    assert(registryIds.includes(nextId), `Hedef tool LAB_TOOLS_REGISTRY içinde mevcut: ${sourceId} -> ${nextId}`);
});

// 5. Forum Entegrasyonu ve URL Parametre Desteği
assert(forumContent.includes('urlParams.get(\'tab\')') || forumContent.includes('params.get(\'tab\')'), 'forum.html DOMContentLoaded içinde tab parametresini ayrıştırıyor');
assert(forumContent.includes('switchHubTab(\'opps\')'), 'forum.html tab=opps ile fırsatlar sekmesine geçiş yapıyor');
assert(forumContent.includes('setOppCatFilter'), 'forum.html kategori filtresi uyguluyor');

// 6. index.html openForumModal ve Navbar Desteği
assert(indexContent.includes('function openForumModal(e, questionId, tab, filter)'), 'openForumModal fonksiyonu tab ve filter parametrelerini destekliyor');
assert(indexContent.includes("openForumModal(event, null, 'opps', 'external-jobs')"), 'Navbar Kariyer.net & LinkedIn butonu forum fırsatlarına yönlendiriyor');
assert(indexContent.includes("openForumModal(event, null, 'opps', 'team')"), 'Navbar Proje & Takım Panosu butonu forum takım arama sekmesine yönlendiriyor');
assert(indexContent.includes('panel-ilanlar'), 'panel-ilanlar portalı mevcut');

console.log('───────────────────────────────────────────────────────────────');
console.log(`TOPLAM TEST: ${passed + failed} | BAŞARILI: ${passed} | BAŞARISIZ: ${failed}`);

if (failed === 0) {
    console.log('>>> TÜM PEDAGOJİK KÖPRÜ VE FORUM ENTEGRASYON TESTLERİ BAŞARIYLA GEÇTİ! <<<');
    process.exit(0);
} else {
    console.error('>>> BAZI TESTLER BAŞARISIZ OLDU! <<<');
    process.exit(1);
}
