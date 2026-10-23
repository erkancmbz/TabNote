const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════════');
console.log('   EEM REHBER - TÜM İLERİ DÜZEY SİMÜLATÖRLER & ARAÇLAR TESTİ    ');
console.log('═══════════════════════════════════════════════════════════════');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const tests = [
    // 1. Dosya Varlığı
    { name: '1.1 scripts/spwm_sim.js mevcut', test: fs.existsSync(path.join(__dirname, 'spwm_sim.js')) },
    { name: '1.2 scripts/fourier_sim.js mevcut', test: fs.existsSync(path.join(__dirname, 'fourier_sim.js')) },
    { name: '1.3 scripts/em_waves_sim.js mevcut', test: fs.existsSync(path.join(__dirname, 'em_waves_sim.js')) },
    { name: '1.4 scripts/pid_controller_sim.js mevcut', test: fs.existsSync(path.join(__dirname, 'pid_controller_sim.js')) },
    { name: '1.5 scripts/logic_timing_sim.js mevcut', test: fs.existsSync(path.join(__dirname, 'logic_timing_sim.js')) },
    { name: '1.6 scripts/rectifier_sim.js mevcut', test: fs.existsSync(path.join(__dirname, 'rectifier_sim.js')) },
    { name: '1.7 scripts/ac_controller_sim.js mevcut', test: fs.existsSync(path.join(__dirname, 'ac_controller_sim.js')) },
    { name: '1.8 scripts/convolution_lab.js mevcut', test: fs.existsSync(path.join(__dirname, 'convolution_lab.js')) },
    { name: '1.9 scripts/fsm_designer.js mevcut', test: fs.existsSync(path.join(__dirname, 'fsm_designer.js')) },
    { name: '1.10 scripts/protocol_analyzer_sim.js mevcut', test: fs.existsSync(path.join(__dirname, 'protocol_analyzer_sim.js')) },
    { name: '1.11 scripts/diode_lab_sim.js mevcut', test: fs.existsSync(path.join(__dirname, 'diode_lab_sim.js')) },
    { name: '1.12 scripts/dsp_zplane_sim.js mevcut', test: fs.existsSync(path.join(__dirname, 'dsp_zplane_sim.js')) },
    { name: '1.13 scripts/solar_mppt_sim.js mevcut', test: fs.existsSync(path.join(__dirname, 'solar_mppt_sim.js')) },
    { name: '1.14 scripts/extra_calculators.js mevcut', test: fs.existsSync(path.join(__dirname, 'extra_calculators.js')) },

    // 2. HTML Entegrasyonu
    { name: '2.1 calcSpwmCard HTML içinde mevcut', test: html.includes('id="calcSpwmCard"') },
    { name: '2.2 calcFourierHarmonicsCard HTML içinde mevcut', test: html.includes('id="calcFourierHarmonicsCard"') },
    { name: '2.3 calcEmWavesCard HTML içinde mevcut', test: html.includes('id="calcEmWavesCard"') },
    { name: '2.4 calcPidControllerCard HTML içinde mevcut', test: html.includes('id="calcPidControllerCard"') },
    { name: '2.5 calcLogicTimingCard HTML içinde mevcut', test: html.includes('id="calcLogicTimingCard"') },
    { name: '2.6 calcRectifierCard HTML içinde mevcut', test: html.includes('id="calcRectifierCard"') },
    { name: '2.7 calcAcControllerCard HTML içinde mevcut', test: html.includes('id="calcAcControllerCard"') },
    { name: '2.8 calcConvolutionLabCard HTML içinde mevcut', test: html.includes('id="calcConvolutionLabCard"') },
    { name: '2.9 calcFsmDesignerCard HTML içinde mevcut', test: html.includes('id="calcFsmDesignerCard"') },
    { name: '2.10 calcProtocolAnalyzerCard HTML içinde mevcut', test: html.includes('id="calcProtocolAnalyzerCard"') },
    { name: '2.11 calcDiodeLabCard HTML içinde mevcut', test: html.includes('id="calcDiodeLabCard"') },
    { name: '2.12 calcDspZplaneCard HTML içinde mevcut', test: html.includes('id="calcDspZplaneCard"') },
    { name: '2.13 calcSolarMpptCard HTML içinde mevcut', test: html.includes('id="calcSolarMpptCard"') },
    { name: '2.14 calcBatteryLifeCard HTML içinde mevcut', test: html.includes('id="calcBatteryLifeCard"') },
    { name: '2.15 calcThermalHeatsinkCard HTML içinde mevcut', test: html.includes('id="calcThermalHeatsinkCard"') },

    // 3. Kanvaslar
    { name: '3.1 spwmScopeCanvas mevcut', test: html.includes('id="spwmScopeCanvas"') },
    { name: '3.2 fourierScopeCanvas mevcut', test: html.includes('id="fourierScopeCanvas"') },
    { name: '3.3 emWavesCanvas mevcut', test: html.includes('id="emWavesCanvas"') },
    { name: '3.4 pidScopeCanvas mevcut', test: html.includes('id="pidScopeCanvas"') },
    { name: '3.5 logicScopeCanvas mevcut', test: html.includes('id="logicScopeCanvas"') },
    { name: '3.6 rectifierScopeCanvas mevcut', test: html.includes('id="rectifierScopeCanvas"') },
    { name: '3.7 acControllerCanvas mevcut', test: html.includes('id="acControllerCanvas"') },
    { name: '3.8 convLabCanvas mevcut', test: html.includes('id="convLabCanvas"') },
    { name: '3.9 fsmCanvas mevcut', test: html.includes('id="fsmCanvas"') },
    { name: '3.10 protocolScopeCanvas mevcut', test: html.includes('id="protocolScopeCanvas"') },
    { name: '3.11 diodeScopeCanvas mevcut', test: html.includes('id="diodeScopeCanvas"') },
    { name: '3.12 dspZplaneCanvas mevcut', test: html.includes('id="dspZplaneCanvas"') },
    { name: '3.13 solarMpptCanvas mevcut', test: html.includes('id="solarMpptCanvas"') },

    // 4. LAB_TOOLS_REGISTRY Kayıtları
    { name: '4.1 calcSpwmCard LAB_TOOLS_REGISTRY içinde kayıtlı', test: html.includes("id: 'calcSpwmCard'") },
    { name: '4.2 calcFourierHarmonicsCard LAB_TOOLS_REGISTRY içinde kayıtlı', test: html.includes("id: 'calcFourierHarmonicsCard'") },
    { name: '4.3 calcEmWavesCard LAB_TOOLS_REGISTRY içinde kayıtlı', test: html.includes("id: 'calcEmWavesCard'") },
    { name: '4.4 calcPidControllerCard LAB_TOOLS_REGISTRY içinde kayıtlı', test: html.includes("id: 'calcPidControllerCard'") },
    { name: '4.5 calcLogicTimingCard LAB_TOOLS_REGISTRY içinde kayıtlı', test: html.includes("id: 'calcLogicTimingCard'") },
    { name: '4.6 calcRectifierCard LAB_TOOLS_REGISTRY içinde kayıtlı', test: html.includes("id: 'calcRectifierCard'") },
    { name: '4.7 calcAcControllerCard LAB_TOOLS_REGISTRY içinde kayıtlı', test: html.includes("id: 'calcAcControllerCard'") },
    { name: '4.8 calcConvolutionLabCard LAB_TOOLS_REGISTRY içinde kayıtlı', test: html.includes("id: 'calcConvolutionLabCard'") },
    { name: '4.9 calcFsmDesignerCard LAB_TOOLS_REGISTRY içinde kayıtlı', test: html.includes("id: 'calcFsmDesignerCard'") },
    { name: '4.10 calcProtocolAnalyzerCard LAB_TOOLS_REGISTRY içinde kayıtlı', test: html.includes("id: 'calcProtocolAnalyzerCard'") },
    { name: '4.11 calcDiodeLabCard LAB_TOOLS_REGISTRY içinde kayıtlı', test: html.includes("id: 'calcDiodeLabCard'") },
    { name: '4.12 calcDspZplaneCard LAB_TOOLS_REGISTRY içinde kayıtlı', test: html.includes("id: 'calcDspZplaneCard'") },
    { name: '4.13 calcSolarMpptCard LAB_TOOLS_REGISTRY içinde kayıtlı', test: html.includes("id: 'calcSolarMpptCard'") },
    { name: '4.14 calcBatteryLifeCard LAB_TOOLS_REGISTRY içinde kayıtlı', test: html.includes("id: 'calcBatteryLifeCard'") },
    { name: '4.15 calcThermalHeatsinkCard LAB_TOOLS_REGISTRY içinde kayıtlı', test: html.includes("id: 'calcThermalHeatsinkCard'") },

    // 5. Kanvas İyileştiricisi (CanvasEnhancer)
    { 
        name: '5.1 CanvasEnhancer tüm 13 gelişmiş kanvası kapsıyor',
        test: ['spwmScopeCanvas', 'fourierScopeCanvas', 'emWavesCanvas', 'pidScopeCanvas', 'logicScopeCanvas', 'rectifierScopeCanvas', 'acControllerCanvas', 'convLabCanvas', 'fsmCanvas', 'protocolScopeCanvas', 'diodeScopeCanvas', 'dspZplaneCanvas', 'solarMpptCanvas']
            .every(id => html.includes(id) && fs.readFileSync(path.join(__dirname, 'canvas_enhancements.js'), 'utf8').includes(id))
    },

    // 6. Yeni EEM Dalları
    { name: '6.1 Elektrikli Araçlar & BMS dalı tanımlı', test: html.includes("id: 'ev_bms'") },
    { name: '6.2 Yenilenebilir Enerji & Akıllı Şebekeler dalı tanımlı', test: html.includes("id: 'yenilenebilir_smartgrid'") }
];

let passCount = 0;
tests.forEach(t => {
    if (t.test) {
        console.log('PASS: ' + t.name);
        passCount++;
    } else {
        console.error('FAIL: ' + t.name);
    }
});

console.log('═══════════════════════════════════════════════════════════════');
console.log(`SONUÇ: Toplam ${tests.length} Test | Başarılı: ${passCount} | Başarısız: ${tests.length - passCount}`);
console.log('═══════════════════════════════════════════════════════════════');

if (passCount === tests.length) {
    console.log('🎉 TÜM YENİ SİMÜLATÖRLER %100 BAŞARIYLA ENTEGRE EDİLDİ!');
    process.exit(0);
} else {
    process.exit(1);
}
