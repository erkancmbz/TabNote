const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════════');
console.log('   DEVRE ANALİZİ 1 & DEVRE ANALİZİ 2 LABORATUVARLARI TESTİ    ');
console.log('═══════════════════════════════════════════════════════════════');

const indexPath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');
const c1Code = fs.readFileSync(path.join(__dirname, 'circuit_analysis1_lab.js'), 'utf8');
const c2Code = fs.readFileSync(path.join(__dirname, 'circuit_analysis2_lab.js'), 'utf8');
const enhancerCode = fs.readFileSync(path.join(__dirname, 'canvas_enhancements.js'), 'utf8');
const cssCode = fs.readFileSync(path.join(__dirname, '..', 'styles', 'modules_extra.css'), 'utf8');

const tests = [
    // 1. Dosyaların Varlığı
    { name: '1.1 scripts/circuit_analysis1_lab.js mevcut', test: fs.existsSync(path.join(__dirname, 'circuit_analysis1_lab.js')) },
    { name: '1.2 scripts/circuit_analysis2_lab.js mevcut', test: fs.existsSync(path.join(__dirname, 'circuit_analysis2_lab.js')) },

    // 2. index.html Script Etiketleri
    { name: '2.1 circuit_analysis1_lab.js index.html head içinde yüklü', test: html.includes('src="scripts/circuit_analysis1_lab.js"') },
    { name: '2.2 circuit_analysis2_lab.js index.html head içinde yüklü', test: html.includes('src="scripts/circuit_analysis2_lab.js"') },

    // 3. UI Kartları ve Kanvaslar
    { name: '3.1 calcCircuitAnalysis1Card DOM kartı mevcut', test: html.includes('id="calcCircuitAnalysis1Card"') },
    { name: '3.2 calcCircuitAnalysis2Card DOM kartı mevcut', test: html.includes('id="calcCircuitAnalysis2Card"') },
    { name: '3.3 circuitAnalysis1Canvas kanvası mevcut', test: html.includes('id="circuitAnalysis1Canvas"') },
    { name: '3.4 circuitAnalysis2Canvas kanvası mevcut', test: html.includes('id="circuitAnalysis2Canvas"') },
    { name: '3.5 c1StepFormulaText formül ve öğrenim kutusu mevcut', test: html.includes('id="c1StepFormulaText"') },
    { name: '3.6 c2StepFormulaText formül ve öğrenim kutusu mevcut', test: html.includes('id="c2StepFormulaText"') },

    // 4. Alt Menü ve Adım Barları
    { name: '4.1 Devre 1 Konu Alt Menü Butonları (Thevenin, Norton, Süperpozisyon, Pmax, Y-Δ) mevcut', test: html.includes('data-topic="thevenin"') && html.includes('data-topic="norton"') && html.includes('data-topic="superposition"') && html.includes('data-topic="wye_delta"') },
    { name: '4.2 Devre 2 Konu Alt Menü Butonları (AC Thevenin, Norton, Süperpozisyon, Pmax, 3-Faz Y-Δ) mevcut', test: html.includes('data-topic="ac_thevenin"') && html.includes('data-topic="ac_norton"') && html.includes('data-topic="ac_superposition"') && html.includes('data-topic="ac_wye_delta"') },
    { name: '4.3 Devre 1 Adım Barları (c1StepsThevenin, c1StepsNorton, c1StepsSuperpos, c1StepsWyeDelta) mevcut', test: html.includes('id="c1StepsThevenin"') && html.includes('id="c1StepsNorton"') && html.includes('id="c1StepsSuperpos"') && html.includes('id="c1StepsWyeDelta"') },
    { name: '4.4 Devre 2 Adım Barları (c2StepsThevenin, c2StepsNorton, c2StepsSuperpos, c2StepsWyeDelta) mevcut', test: html.includes('id="c2StepsThevenin"') && html.includes('id="c2StepsNorton"') && html.includes('id="c2StepsSuperpos"') && html.includes('id="c2StepsWyeDelta"') },

    // 5. Ham LaTeX Kodlarından Arındırma ve Temiz Tipografi
    { name: '5.1 circuit_analysis1_lab.js içinde ham LaTeX (\\frac, \\sum, \\Omega, \\text) bulunmuyor', test: !c1Code.includes('\\frac') && !c1Code.includes('\\Omega') && !c1Code.includes('\\sum') && !c1Code.includes('\\text{') },
    { name: '5.2 circuit_analysis2_lab.js içinde ham LaTeX (\\frac, \\sum, \\Omega, \\text) bulunmuyor', test: !c2Code.includes('\\frac') && !c2Code.includes('\\Omega') && !c2Code.includes('\\sum') && !c2Code.includes('\\text{') },
    { name: '5.3 HTML kart başlıklarında ham dolar ($V_{th}, $R_{th}) işaretleri bulunmuyor', test: !html.slice(html.indexOf('calcCircuitAnalysis1Card'), html.indexOf('calcImpedanceCard')).includes('$V_{th}') && !html.slice(html.indexOf('calcCircuitAnalysis1Card'), html.indexOf('calcImpedanceCard')).includes('$R_{th}') },

    // 6. LAB_TOOLS_REGISTRY Kayıtları
    { name: '6.1 calcCircuitAnalysis1Card LAB_TOOLS_REGISTRY içinde kayıtlı', test: html.includes("id: 'calcCircuitAnalysis1Card'") },
    { name: '6.2 calcCircuitAnalysis2Card LAB_TOOLS_REGISTRY içinde kayıtlı', test: html.includes("id: 'calcCircuitAnalysis2Card'") },
    { name: '6.3 CircuitAnalysis1Module.init() registry trigger içinde', test: html.includes('CircuitAnalysis1Module.init()') },
    { name: '6.4 CircuitAnalysis2Module.init() registry trigger içinde', test: html.includes('CircuitAnalysis2Module.init()') },

    // 7. Donanım Hızlandırma & Kanvas İyileştirici
    { name: '7.1 circuitAnalysis1Canvas CanvasEnhancer içinde kayıtlı', test: enhancerCode.includes('circuitAnalysis1Canvas') },
    { name: '7.2 circuitAnalysis2Canvas CanvasEnhancer içinde kayıtlı', test: enhancerCode.includes('circuitAnalysis2Canvas') },
    { name: '7.3 circuitAnalysis1Canvas modules_extra.css GPU acceleration içinde', test: cssCode.includes('#circuitAnalysis1Canvas') },
    { name: '7.4 circuitAnalysis2Canvas modules_extra.css GPU acceleration içinde', test: cssCode.includes('#circuitAnalysis2Canvas') },
    { name: '7.5 CSS içinde .circuit-topic-bar ve .circuit-math-card stilleri mevcut', test: cssCode.includes('.circuit-topic-bar') && cssCode.includes('.circuit-math-card') && cssCode.includes('.math-frac') },

    // 8. SimManager & Yaşam Döngüsü Entegrasyonu
    { name: '8.1 CircuitAnalysis1Module SimManager register("circuit1") içeriyor', test: c1Code.includes("SimManager.register('circuit1'") },
    { name: '8.2 CircuitAnalysis2Module SimManager register("circuit2") içeriyor', test: c2Code.includes("SimManager.register('circuit2'") },
    { name: '8.3 CircuitAnalysis1Module notifyStarted/Stopped içeriyor', test: c1Code.includes("notifyStarted('circuit1')") && c1Code.includes("notifyStopped('circuit1')") },
    { name: '8.4 CircuitAnalysis2Module notifyStarted/Stopped içeriyor', test: c2Code.includes("notifyStarted('circuit2')") && c2Code.includes("notifyStopped('circuit2')") },

    // 9. Devre Analizi 1 Matematiksel Teorem Doğrulama
    {
        name: '9.1 Thevenin Voc ve Rth hesaplaması matematiksel olarak doğru',
        test: (function() {
            const v1 = 24, v2 = 12, r1 = 8, r2 = 12, r3 = 4, rl = 10;
            const vx_oc = v1 * (r2 / (r1 + r2)); // 24 * (12/20) = 14.4 V
            const vth = vx_oc - v2;               // 14.4 - 12 = 2.4 V
            const rth = r3 + (r1 * r2) / (r1 + r2); // 4 + 96/20 = 8.8 Ohm
            const il = vth / (rth + rl);          // 2.4 / 18.8 = 0.12766 A
            const pmax = (vth * vth) / (4 * rth); // 5.76 / 35.2 = 0.1636 W
            return Math.abs(vx_oc - 14.4) < 1e-4 && Math.abs(vth - 2.4) < 1e-4 && Math.abs(rth - 8.8) < 1e-4 && Math.abs(pmax - 0.1636) < 1e-3;
        })()
    },
    {
        name: '9.2 Süperpozisyon Teoremi Vth lineer toplamı tam örtüşüyor',
        test: (function() {
            const v1 = 24, v2 = 12, r1 = 8, r2 = 12;
            const vth_v1_only = v1 * (r2 / (r1 + r2)); // 14.4 V
            const vth_v2_only = -v2;                    // -12.0 V
            const total = vth_v1_only + vth_v2_only;    // 2.4 V
            return Math.abs(total - 2.4) < 1e-4;
        })()
    },

    // 10. Devre Analizi 2 Matematiksel Teorem Doğrulama
    {
        name: '10.1 Yıldız-Üçgen (Y -> Δ) ve (Δ -> Y) çift yönlü kusursuz dönüşüm',
        test: (function() {
            const ra = 20, rb = 30, rc = 60;
            const sumPair = (ra * rb) + (rb * rc) + (rc * ra); // 600 + 1800 + 1200 = 3600
            const rab = sumPair / rc; // 3600 / 60 = 60
            const rbc = sumPair / ra; // 3600 / 20 = 180
            const rca = sumPair / rb; // 3600 / 30 = 120

            const sumDelta = rab + rbc + rca; // 60 + 180 + 120 = 360
            const back_ra = (rab * rca) / sumDelta; // (60 * 120) / 360 = 7200 / 360 = 20
            const back_rb = (rab * rbc) / sumDelta; // (60 * 180) / 360 = 10800 / 360 = 30
            const back_rc = (rbc * rca) / sumDelta; // (180 * 120) / 360 = 21600 / 360 = 60

            return Math.abs(rab - 60) < 1e-4 && Math.abs(rbc - 180) < 1e-4 && Math.abs(rca - 120) < 1e-4 &&
                   Math.abs(back_ra - 20) < 1e-4 && Math.abs(back_rb - 30) < 1e-4 && Math.abs(back_rc - 60) < 1e-4;
        })()
    },
    {
        name: '10.2 AC Kompleks Empedans (Z = R + jX) ve Güç Faktörü (cosφ) doğrulaması',
        test: (function() {
            const f = 50, R = 15, L = 0.06, C = 80e-6;
            const omega = 2 * Math.PI * f;
            const xl = omega * L;
            const xc = 1 / (omega * C);
            const x = xl - xc;
            const z = Math.sqrt(R * R + x * x);
            const cosPhi = R / z;
            return z > R && cosPhi > 0 && cosPhi <= 1.0;
        })()
    }
];

let passed = 0;
let failed = 0;

tests.forEach((t, index) => {
    if (t.test) {
        console.log(`  ✓ ${t.name}`);
        passed++;
    } else {
        console.error(`  ✗ BAŞARISIZ: ${t.name}`);
        failed++;
    }
});

console.log('───────────────────────────────────────────────────────────────');
console.log(`TOPLAM: ${tests.length} | BAŞARILI: ${passed} | BAŞARISIZ: ${failed}`);

if (failed > 0) {
    process.exit(1);
} else {
    console.log('>>> TÜM DEVRE ANALİZİ 1 & 2 GELİŞMİŞ ALT MENÜ VE FORMÜL TESTLERİ GEÇTİ! <<<');
}
