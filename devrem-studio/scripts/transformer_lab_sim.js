/**
 * EEM REHBER / DEVREM STUDIO - TRANSFORMATÖR ÇALIŞMA PRENSİBİ & 4-MOD GÜÇ DÖNÜŞÜM LABORATUVARI
 * 
 * Elektrik Makineleri ve Güç Elektroniği Dersi İçin İleri Düzey Simülasyon:
 * 1. Temel Manyetik İlkeler & Faraday İndüksiyon Kanunu (e = -N dΦ/dt, 90° Akı Faz Farkı)
 * 2. Sarım Sayıları (N1, N2), Akı (Φ_max), Akı Yoğunluğu (B_max), Çekirdek Alanı (Ac) ve Nüve Doyumu (Saturation)
 * 3. DÖRT TEMEL DÖNÜŞÜM TOPOLOJİSİ:
 *    - AC ➔ AC: Klasik Transformatör (Adım Yükseltici / Düşürücü / İzolasyon)
 *    - DC ➔ AC: Transformatörde DC Deneyi (Saf DC Doyumu/Alarmı + H-Köprüsü İnvertör Anahtarlaması)
 *    - AC ➔ DC: Şebeke Trafosu + Graetz Köprü Doğrultucu + Kondansatör Filtresi & Dalgalanma (Ripple)
 *    - DC ➔ DC: Yüksek Frekanslı İzoleli SMPS (HF Ferrit Trafo, PWM Duty Cycle ve Nüve Minyatürleşmesi)
 * 
 * Çift HiDPI Retina Kanvas:
 * - Kanvas 1 (transCoreCanvas): Transformatör Fiziksel Nüvesi, Dinamik Sarımlar, Manyetik Akı Çizgileri & Isınma
 * - Kanvas 2 (transScopeCanvas): 4-Kanallı Dijital Laboratuvar Osiloskopu (v1, v2, Φ, i) + HUD Crosshairs
 * 
 * SimManager & Yaşam Döngüsü Uyumlu (CPU Tasarruflu)
 */
(function(window) {
    'use strict';

    const TransformerLabModule = {
        // --- 1. SİMÜLASYON PARAMETRELERİ ---
        mode: 'ac_ac',          // 'ac_ac', 'dc_ac', 'ac_dc', 'dc_dc'
        n1: 400,                // Primer sarım sayısı (10 - 2000)
        n2: 80,                 // Sekonder sarım sayısı (10 - 2000)
        vIn: 230,               // Giriş Gerilimi (V - RMS veya DC)
        freq: 50,               // Frekans (Hz - AC için 50Hz, SMPS için kHz)
        coreArea: 25,           // Çekirdek Kesit Alanı Ac (cm²)
        coreMaterial: 'steel',  // 'steel' (1.6T), 'ferrite' (0.4T), 'amorphous' (1.8T)
        rLoad: 20,              // Yük Direnci (Ohm)
        loadType: 'lamp',       // 'lamp', 'resistor', 'motor'
        
        // Mod Özel Parametreleri
        dcInverterActive: false,// DC->AC modunda H-Bridge invertör aktif mi? (false ise Saf DC tehlike deneyi)
        filterCap: 470,         // AC->DC modunda filtre kondansatörü (µF)
        dutyCycle: 50,          // DC->DC modunda PWM görev oranı (%)

        // Simülasyon Durumu
        isRunning: true,
        animFrameId: null,
        timePhase: 0,
        simSpeed: 1.0,          // 0.25x, 0.5x, 1x, 2x
        hoverCoreInfo: null,
        hoverScopeInfo: null,
        eventsBound: false,

        // Çekirdek Malzeme Limitleri (B_sat)
        materialBsat: {
            steel: 1.6,         // Silisli Sac (1.6 Tesla)
            ferrite: 0.4,       // Ferrit Nüve (0.4 Tesla)
            amorphous: 1.8      // Amorf Alaşım (1.8 Tesla)
        },

        // Manyetik Parçacık Sistemi (Akı çizgileri boyunca dans eden partiküller)
        particles: [],

        // --- 2. BAŞLATMA & OLAYLAR ---
        init: function() {
            this.initParticles();
            this.bindEvents();
            this.updateModeUI();
            this.calculate();
            this.render();
            this.updatePlayButton();

            if (this.isRunning) {
                this.startAnimation();
            }
        },

        initParticles: function() {
            this.particles = [];
            const count = 36;
            for (let i = 0; i < count; i++) {
                this.particles.push({
                    progress: i / count, // 0.0 - 1.0 (Kapalı demir nüve etrafındaki konum)
                    trackOffset: (Math.random() - 0.5) * 16,
                    speedVar: 0.8 + Math.random() * 0.4
                });
            }
        },

        bindEvents: function() {
            if (this.eventsBound || typeof document === 'undefined') return;

            const coreCanvas = document.getElementById('transCoreCanvas');
            if (coreCanvas) {
                coreCanvas.addEventListener('mousemove', (e) => {
                    this.hoverCoreInfo = window.getCanvasLogicalCoords 
                        ? window.getCanvasLogicalCoords(e, coreCanvas) 
                        : { x: e.clientX, y: e.clientY };
                    if (!this.isRunning) this.render();
                });
                coreCanvas.addEventListener('mouseleave', () => {
                    this.hoverCoreInfo = null;
                    if (!this.isRunning) this.render();
                });
            }

            const scopeCanvas = document.getElementById('transScopeCanvas');
            if (scopeCanvas) {
                scopeCanvas.addEventListener('mousemove', (e) => {
                    this.hoverScopeInfo = window.getCanvasLogicalCoords 
                        ? window.getCanvasLogicalCoords(e, scopeCanvas) 
                        : { x: e.clientX, y: e.clientY };
                    if (!this.isRunning) this.render();
                });
                scopeCanvas.addEventListener('mouseleave', () => {
                    this.hoverScopeInfo = null;
                    if (!this.isRunning) this.render();
                });
            }

            this.eventsBound = true;
        },

        // --- 3. KULLANICI KONTROLLERİ & PARAMETRELER ---
        setMode: function(m) {
            this.mode = m;
            // Mod geçişlerinde akıllı varsayılanlar
            if (m === 'dc_dc') {
                this.freq = 50000; // 50 kHz SMPS
                this.coreMaterial = 'ferrite';
                this.coreArea = 3.5;
                this.vIn = 48;
            } else if (m === 'dc_ac') {
                this.freq = 50;
                this.coreMaterial = 'steel';
                this.coreArea = 25;
                this.vIn = 24;
            } else {
                this.freq = 50;
                this.coreMaterial = 'steel';
                this.coreArea = 25;
                this.vIn = 230;
            }
            this.updateModeUI();
            this.syncInputElements();
            this.calculate();
            this.render();
        },

        setParam: function(param, val) {
            const num = parseFloat(val);
            if (isNaN(num)) return;

            switch (param) {
                case 'n1':
                    this.n1 = Math.max(10, Math.min(2500, Math.round(num)));
                    break;
                case 'n2':
                    this.n2 = Math.max(10, Math.min(2500, Math.round(num)));
                    break;
                case 'vIn':
                    this.vIn = Math.max(1, Math.min(1000, num));
                    break;
                case 'freq':
                    this.freq = Math.max(1, Math.min(150000, num));
                    break;
                case 'coreArea':
                    this.coreArea = Math.max(0.5, Math.min(150, num));
                    break;
                case 'rLoad':
                    this.rLoad = Math.max(1, Math.min(2000, num));
                    break;
                case 'filterCap':
                    this.filterCap = Math.max(10, Math.min(5000, num));
                    break;
                case 'dutyCycle':
                    this.dutyCycle = Math.max(5, Math.min(95, num));
                    break;
            }
            this.syncInputElements();
            this.calculate();
            if (!this.isRunning) this.render();
        },

        setCoreMaterial: function(mat) {
            if (this.materialBsat[mat]) {
                this.coreMaterial = mat;
                this.calculate();
                if (!this.isRunning) this.render();
            }
        },

        setLoadType: function(lt) {
            this.loadType = lt;
            if (!this.isRunning) this.render();
        },

        toggleDcInverter: function() {
            this.dcInverterActive = !this.dcInverterActive;
            const btn = document.getElementById('btnTransInverterToggle');
            if (btn) {
                btn.classList.toggle('active', this.dcInverterActive);
                btn.innerHTML = this.dcInverterActive 
                    ? '<i class="fas fa-toggle-on"></i> İnvertör Anahtarlama AKTİF (AC Üretiliyor)' 
                    : '<i class="fas fa-toggle-off"></i> Saf DC Girişi (Tehlike / Doyum Deneyi)';
            }
            this.calculate();
            if (!this.isRunning) this.render();
        },

        setSimSpeed: function(spd) {
            this.simSpeed = parseFloat(spd);
            document.querySelectorAll('.trans-speed-btn').forEach(b => {
                b.classList.toggle('active', parseFloat(b.dataset.speed) === this.simSpeed);
            });
        },

        togglePlay: function() {
            this.isRunning = !this.isRunning;
            this.updatePlayButton();
            if (this.isRunning) {
                this.startAnimation();
            } else {
                if (this.animFrameId) {
                    cancelAnimationFrame(this.animFrameId);
                    this.animFrameId = null;
                }
                if (window.SimManager) window.SimManager.notifyStopped('transformer_lab');
                this.render();
            }
        },

        stop: function() {
            if (this.isRunning) {
                this.isRunning = false;
                if (this.animFrameId) {
                    cancelAnimationFrame(this.animFrameId);
                    this.animFrameId = null;
                }
                this.updatePlayButton();
                this.render();
            }
            if (window.SimManager) window.SimManager.notifyStopped('transformer_lab');
        },

        resume: function() {
            if (!this.isRunning) {
                this.isRunning = true;
                this.updatePlayButton();
                this.startAnimation();
            }
        },

        startAnimation: function() {
            if (window.SimManager) window.SimManager.notifyStarted('transformer_lab');
            if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

            const loop = () => {
                if (this.isRunning) {
                    // Simülasyon zaman adımı
                    let baseRate = 0.04;
                    if (this.mode === 'dc_dc') baseRate = 0.08;
                    this.timePhase += baseRate * this.simSpeed;
                }
                this.render();
                if (this.isRunning) {
                    this.animFrameId = requestAnimationFrame(loop);
                }
            };
            this.animFrameId = requestAnimationFrame(loop);
        },

        updatePlayButton: function() {
            const btn = document.getElementById('transPlayBtn');
            const pill = document.getElementById('transStatusPill');
            const text = document.getElementById('transStatusText');
            if (btn) {
                btn.innerHTML = this.isRunning 
                    ? '<i class="fas fa-pause"></i> <span>Durdur (Pause)</span>' 
                    : '<i class="fas fa-play"></i> <span>Canlı Simülasyonu Başlat</span>';
                btn.classList.toggle('is-running', this.isRunning);
            }
            if (pill) pill.classList.toggle('running', this.isRunning);
            if (text) text.innerText = this.isRunning ? 'Canlı İndüksiyon Simülasyonu' : 'Durduruldu (CPU Tasarrufu)';
        },

        updateModeUI: function() {
            // Mod butonları
            document.querySelectorAll('.trans-mode-chip').forEach(b => {
                b.classList.toggle('active', b.dataset.mode === this.mode);
            });

            // Mod özel ayar satırları
            const dcInverterRow = document.getElementById('transDcInverterRow');
            const filterCapRow = document.getElementById('transFilterCapRow');
            const dutyCycleRow = document.getElementById('transDutyCycleRow');
            const freqUnit = document.getElementById('transFreqUnit');

            if (dcInverterRow) dcInverterRow.style.display = this.mode === 'dc_ac' ? 'flex' : 'none';
            if (filterCapRow) filterCapRow.style.display = this.mode === 'ac_dc' ? 'flex' : 'none';
            if (dutyCycleRow) dutyCycleRow.style.display = this.mode === 'dc_dc' ? 'flex' : 'none';
            if (freqUnit) freqUnit.innerText = this.mode === 'dc_dc' ? 'kHz' : 'Hz';

            // Kılavuz / Teori Metnini Güncelle
            this.updateTheoryBlock();
        },

        syncInputElements: function() {
            const updateField = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val;
            };
            const updateText = (id, txt) => {
                const el = document.getElementById(id);
                if (el) el.innerText = txt;
            };

            updateField('transN1Range', this.n1);
            updateField('transN1Input', this.n1);
            updateField('transN2Range', this.n2);
            updateField('transN2Input', this.n2);
            updateField('transVinRange', this.vIn);
            updateField('transVinInput', this.vIn);
            updateField('transFreqRange', this.mode === 'dc_dc' ? this.freq / 1000 : this.freq);
            updateField('transFreqInput', this.mode === 'dc_dc' ? this.freq / 1000 : this.freq);
            updateField('transCoreAreaRange', this.coreArea);
            updateField('transCoreAreaInput', this.coreArea);
            updateField('transRloadRange', this.rLoad);
            updateField('transRloadInput', this.rLoad);
            updateField('transFilterCapRange', this.filterCap);
            updateField('transDutyRange', this.dutyCycle);

            updateText('transN1Text', this.n1 + ' sarım');
            updateText('transN2Text', this.n2 + ' sarım');
            updateText('transVinText', this.vIn + ' V');
            updateText('transFreqText', (this.mode === 'dc_dc' ? (this.freq / 1000).toFixed(1) + ' kHz' : this.freq.toFixed(0) + ' Hz'));
            updateText('transCoreAreaText', this.coreArea.toFixed(1) + ' cm²');
            updateText('transRloadText', this.rLoad + ' Ω');
            updateText('transFilterCapText', this.filterCap + ' µF');
            updateText('transDutyText', this.dutyCycle + ' %');

            const matSelect = document.getElementById('transCoreMatSelect');
            if (matSelect) matSelect.value = this.coreMaterial;
        },

        // --- 4. ELEKTROMANYETİK HESAPLAMALAR ---
        calculate: function() {
            const a = this.n1 / this.n2; // Dönüştürme Oranı
            const bSat = this.materialBsat[this.coreMaterial] || 1.6;
            const coreAreaM2 = this.coreArea * 1e-4; // cm² -> m²

            let phiMax = 0;       // Weber
            let bMax = 0;         // Tesla
            let v2Rms = 0;        // Volt
            let v2Peak = 0;       // Volt
            let iLoadRms = 0;     // Amper
            let pOut = 0;         // Watt
            let pIn = 0;          // Watt
            let efficiency = 96;  // %
            let isSaturated = false;
            let dcHazard = false;

            if (this.mode === 'ac_ac') {
                // Faraday Yasası: V_rms = 4.44 * f * N1 * Phi_max
                phiMax = this.vIn / (4.44 * this.freq * this.n1);
                bMax = phiMax / coreAreaM2;
                isSaturated = bMax > bSat;

                v2Rms = this.vIn / a;
                v2Peak = v2Rms * Math.SQRT2;
                iLoadRms = v2Rms / this.rLoad;
                pOut = (v2Rms * v2Rms) / this.rLoad;
                efficiency = isSaturated ? Math.max(30, 95 - (bMax - bSat) * 45) : 96.5;
                pIn = pOut / (efficiency / 100);

            } else if (this.mode === 'dc_ac') {
                if (!this.dcInverterActive) {
                    // TEHLİKELİ SAF DC DENEYİ
                    dcHazard = true;
                    isSaturated = true;
                    // dΦ/dt = 0 olduğu için sürekli indükleme sıfırdır!
                    phiMax = bSat * coreAreaM2 * 1.8;
                    bMax = bSat * 1.8;
                    v2Rms = 0;
                    v2Peak = 0;
                    iLoadRms = 0;
                    pOut = 0;
                    // Primer omik sargı direnci (~0.8 ohm) ile aşırı akım çeker
                    const rCu1 = 0.8;
                    const iDcPrimary = this.vIn / rCu1;
                    pIn = this.vIn * iDcPrimary;
                    efficiency = 0;
                } else {
                    // H-KÖPRÜSÜ İNVERTÖR AKTİF (Kare/Modifiye Dalga AC)
                    phiMax = this.vIn / (4.0 * this.freq * this.n1);
                    bMax = phiMax / coreAreaM2;
                    isSaturated = bMax > bSat;

                    v2Rms = this.vIn / a;
                    v2Peak = v2Rms;
                    iLoadRms = v2Rms / this.rLoad;
                    pOut = (v2Rms * v2Rms) / this.rLoad;
                    efficiency = isSaturated ? 60 : 92.5;
                    pIn = pOut / (efficiency / 100);
                }

            } else if (this.mode === 'ac_dc') {
                // AC Şebeke -> Trafo -> Köprü Doğrultucu -> Kondansatör Filtre
                phiMax = this.vIn / (4.44 * this.freq * this.n1);
                bMax = phiMax / coreAreaM2;
                isSaturated = bMax > bSat;

                const vSecAcRms = this.vIn / a;
                const vSecPeak = vSecAcRms * Math.SQRT2;
                // 2 Silisyum Diyot Düşümü (2 * 0.7V = 1.4V)
                const vPeakDc = Math.max(0, vSecPeak - 1.4);
                
                // Dalgalanma Gerilimi: V_ripple ≈ V_dc / (2 * f * R_L * C)
                const capFarad = this.filterCap * 1e-6;
                const ripple = vPeakDc / (2 * this.freq * this.rLoad * capFarad + 1);
                v2Rms = Math.max(0, vPeakDc - ripple * 0.5); // DC Ortalama Gerilim
                v2Peak = vPeakDc;
                iLoadRms = v2Rms / this.rLoad;
                pOut = (v2Rms * v2Rms) / this.rLoad;
                efficiency = isSaturated ? 55 : 91;
                pIn = pOut / (efficiency / 100);

            } else if (this.mode === 'dc_dc') {
                // Yüksek Frekanslı SMPS (Flyback / Forward Trafo)
                const d = this.dutyCycle / 100;
                phiMax = (this.vIn * d) / (this.freq * this.n1);
                bMax = phiMax / coreAreaM2;
                isSaturated = bMax > bSat;

                v2Rms = (this.vIn / a) * d; // Çıkış DC Gerilimi
                v2Peak = this.vIn / a;
                iLoadRms = v2Rms / this.rLoad;
                pOut = (v2Rms * v2Rms) / this.rLoad;
                efficiency = isSaturated ? 62 : 93.8;
                pIn = pOut / (efficiency / 100);
            }

            this.calcResults = {
                a,
                bSat,
                phiMax,
                phiMaxMwb: phiMax * 1000,
                bMax,
                isSaturated,
                dcHazard,
                v2Rms,
                v2Peak,
                iLoadRms,
                pOut,
                pIn,
                efficiency
            };

            this.updateTelemetryBadges();
        },

        updateTelemetryBadges: function() {
            const res = this.calcResults;
            if (!res) return;

            const setText = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.innerText = val;
            };

            // Sarım Oranı Rozeti
            let ratioLabel = res.a.toFixed(2);
            if (res.a > 1.05) ratioLabel += ' (Adım Düşürücü)';
            else if (res.a < 0.95) ratioLabel += ' (Adım Yükseltici)';
            else ratioLabel += ' (1:1 İzolasyon)';
            setText('transTelRatio', ratioLabel);

            // Tepe Manyetik Akı (mWb)
            setText('transTelPhi', res.phiMaxMwb.toFixed(2) + ' mWb');

            // Akı Yoğunluğu (B) ve Doyum Durumu
            const satPercent = Math.min(250, (res.bMax / res.bSat) * 100);
            setText('transTelB', res.bMax.toFixed(2) + ' T (' + satPercent.toFixed(0) + '%)');

            const satBadge = document.getElementById('transTelSatBadge');
            if (satBadge) {
                if (res.dcHazard) {
                    satBadge.className = 'trans-badge danger';
                    satBadge.innerHTML = '<i class="fas fa-radiation"></i> DİKKAT: SAF DC DOYUMU (dΦ/dt = 0)';
                } else if (res.isSaturated) {
                    satBadge.className = 'trans-badge warning';
                    satBadge.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Nüve Doyumda (B > B_sat)';
                } else {
                    satBadge.className = 'trans-badge success';
                    satBadge.innerHTML = '<i class="fas fa-check-circle"></i> Lineer Bölge (Güvenli)';
                }
            }

            // Gerilim ve Akım Değerleri
            setText('transTelV2', res.v2Rms.toFixed(1) + ' V' + (this.mode === 'ac_ac' ? ' (RMS)' : ' (DC)'));
            setText('transTelI2', res.iLoadRms.toFixed(2) + ' A');
            setText('transTelPower', res.pOut.toFixed(1) + ' W');
            setText('transTelEff', '% ' + res.efficiency.toFixed(1));
        },

        updateTheoryBlock: function() {
            const titleEl = document.getElementById('transTheoryTitle');
            const descEl = document.getElementById('transTheoryDesc');
            const formulaEl = document.getElementById('transTheoryFormula');

            if (!titleEl || !descEl) return;

            if (this.mode === 'ac_ac') {
                titleEl.innerHTML = '<i class="fas fa-wave-square"></i> AC ➔ AC: Klasik Transformatör & Faraday İndüksiyon Prensibi';
                descEl.innerText = "Transformatörün kalbi Faraday İndüksiyon Kanunudur (e = -N · dΦ/dt). Primer sargıya uygulanan sinüsoidal AC gerilim, demir nüvede 90° faz farklı alternatif bir manyetik akı (Φ) oluşturur. Bu akı demir nüve içinden sekondere akar ve dΦ/dt değişimi sayesinde sekonder sarımlarında gerilim indükler. Manyetik akı ile gerilim arasında tam 90° faz farkı bulunur.";
                if (formulaEl) formulaEl.innerHTML = `$$V_{rms} = 4.44 \\cdot f \\cdot N \\cdot \\Phi_{max} \\qquad \\frac{V_1}{V_2} = \\frac{N_1}{N_2} = a \\qquad \\Phi(t) = \\Phi_{max} \\sin(\\omega t - 90^\\circ)$$`;
            } else if (this.mode === 'dc_ac') {
                titleEl.innerHTML = '<i class="fas fa-battery-full"></i> DC ➔ AC: Transformatörde DC Gerçeği & İnvertör Anahtarlaması';
                descEl.innerText = "Transformatörün primerine SAF DOĞRU AKIM (DC) bağlandığında, geçici rejim (açılma anı) hariç dΦ/dt = 0 olur! Akı zamana göre değişmediği için sekonderde HİÇ GERİLİM İNDÜKLENMEZ (V2 = 0V). Primerde XL = 0 olduğundan sadece bakır direnci kalır, aşırı akım akar ve nüve doyar! Bu sebeple DC'yi AC'ye çevirmek için H-Köprüsü MOSFET'leri (İnvertör) ile frekanslı anahtarlama yapılır.";
                if (formulaEl) formulaEl.innerHTML = `$$e_2 = -N_2 \\frac{d\\Phi}{dt} = 0\\text{ (Saf DC'de)} \\qquad I_1 = \\frac{V_{dc}}{R_{cu}} \\gg I_{nom} \\quad \\implies \\text{H-Bridge ile } d\\Phi/dt \\neq 0$$`;
            } else if (this.mode === 'ac_dc') {
                titleEl.innerHTML = '<i class="fas fa-plug"></i> AC ➔ DC: Şebeke Trafosu + Tam Dalga Köprü Doğrultucu + Kondansatör Filtre';
                descEl.innerText = "Şebekedeki yüksek AC gerilim (230V), güvenlik ve cihaz izolasyonu için trafo ile önce düşük AC gerilime (örneğin 12V/24V) indirilir. Ardından 4 diyotlu Graetz Köprüsü negatif alternansları pozitife çevirir. Çıkışa bağlanan Filtre Kondansatörü (C) pik anında şarj olup diyotlar kesimdeyken yükü besleyerek saf DC gerilime yakın düşük dalgalanmalı (ripple) DC sağlar.";
                if (formulaEl) formulaEl.innerHTML = `$$V_{dc} \\approx V_{sec,pk} - 2 V_D - \\frac{V_{ripple}}{2} \\qquad V_{ripple} \\approx \\frac{I_{dc}}{2 f C}$$`;
            } else if (this.mode === 'dc_dc') {
                titleEl.innerHTML = '<i class="fas fa-bolt"></i> DC ➔ DC: Yüksek Frekanslı İzoleli SMPS (Ferrit Nüve & Minyatürleşme)';
                descEl.innerText = "Neden SMPS trafoları çok küçüktür? Manyetik akı formülü Phi_max = V / (4.44 * f * N) gereği, frekans 50 Hz'den 50.000 Hz'e (50 kHz) çıkarıldığında gereken çekirdek kesit alanı (Ac) yaklaşık 1000 kat küçülür! Böylece minicik bir ferrit nüve ile yüzlerce watt güç galvanik izolasyonla aktarılır. Çıkış gerilimi PWM Doluluk Oranı (Duty Cycle D) ile ayarlanır.";
                if (formulaEl) formulaEl.innerHTML = `$$A_{core} \\propto \\frac{1}{f} \\qquad V_{out} = V_{in} \\cdot \\left(\\frac{N_2}{N_1}\\right) \\cdot D \\qquad f_{sw} = 20\\text{ kHz} - 100\\text{ kHz}$$`;
            }

            if (window.renderMathInElement && formulaEl) {
                try {
                    window.renderMathInElement(formulaEl, { delimiters: [{ left: '$$', right: '$$', display: true }] });
                } catch(e) {}
            }
        },

        // --- 5. RENDER YÖNETİMİ ---
        render: function() {
            this.renderCoreCanvas();
            this.renderScopeCanvas();
        },

        // ═════════════════════════════════════════════════════════════════════
        // KANVAS 1: TRANSFORMATÖR FİZİKSEL NÜVESİ, SARGILAR & MANYETİK AKI
        // ═════════════════════════════════════════════════════════════════════
        renderCoreCanvas: function() {
            const canvas = document.getElementById('transCoreCanvas');
            if (!canvas) return;

            const hi = window.setupHiDpiCanvas ? window.setupHiDpiCanvas(canvas) : null;
            const ctx = hi ? hi.ctx : canvas.getContext('2d');
            const w = hi ? hi.w : canvas.width;
            const h = hi ? hi.h : canvas.height;

            const res = this.calcResults || { a: 1, isSaturated: false, dcHazard: false, phiMax: 0.001, v2Rms: 24 };

            // 1. Laboratuvar Zemin Temizliği (Obsidian Dark)
            ctx.fillStyle = '#060a14';
            ctx.fillRect(0, 0, w, h);

            // Laboratuvar Izgarası
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
            ctx.lineWidth = 1;
            const gridSize = 24;
            for (let x = 0; x < w; x += gridSize) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
            }
            for (let y = 0; y < h; y += gridSize) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
            }

            // 2. Transformatör Çekirdek Boyutlandırması (Merkezde 2-Bacaklı Kare Nüve)
            const cx = w * 0.50;
            const cy = h * 0.48;
            const coreW = Math.min(w * 0.38, 260);
            const coreH = Math.min(h * 0.70, 190);
            const coreThick = 42; // Nüve demir bacak kalınlığı

            const leftX = cx - coreW / 2;
            const rightX = cx + coreW / 2;
            const topY = cy - coreH / 2;
            const botY = cy + coreH / 2;

            // Çekirdek Isınma & Doyum Rengi Belirleme
            let coreColor1 = '#334155';
            let coreColor2 = '#1e293b';
            let coreGlow = 'rgba(56, 189, 248, 0.2)';

            if (res.dcHazard) {
                coreColor1 = '#7f1d1d';
                coreColor2 = '#450a0a';
                coreGlow = 'rgba(239, 68, 68, 0.6)';
            } else if (res.isSaturated) {
                coreColor1 = '#78350f';
                coreColor2 = '#451a03';
                coreGlow = 'rgba(245, 158, 11, 0.5)';
            } else if (this.coreMaterial === 'ferrite') {
                coreColor1 = '#1e293b';
                coreColor2 = '#0f172a';
            }

            // 3. Nüve Çizimi (Dış Çerçeve ve İç Boşluk)
            ctx.save();
            ctx.shadowColor = coreGlow;
            ctx.shadowBlur = res.isSaturated || res.dcHazard ? 18 : 6;

            ctx.beginPath();
            // Dış Dörtgen
            ctx.roundRect(leftX, topY, coreW, coreH, 8);
            // İç Boşluk Dörtgeni (Ters yönde)
            const innerLeft = leftX + coreThick;
            const innerTop = topY + coreThick;
            const innerW = coreW - coreThick * 2;
            const innerH = coreH - coreThick * 2;
            ctx.roundRect(innerLeft + innerW, innerTop, -innerW, innerH, 4);

            const coreGrad = ctx.createLinearGradient(leftX, topY, rightX, botY);
            coreGrad.addColorStop(0, coreColor1);
            coreGrad.addColorStop(0.5, coreColor2);
            coreGrad.addColorStop(1, coreColor1);
            ctx.fillStyle = coreGrad;
            ctx.fill();

            ctx.strokeStyle = res.dcHazard ? '#ef4444' : (res.isSaturated ? '#f59e0b' : 'rgba(148, 163, 184, 0.4)');
            ctx.lineWidth = 1.8;
            ctx.stroke();
            ctx.restore();

            // Laminasyon Sac Çizgileri (Saclı Nüve Hissi)
            if (this.coreMaterial !== 'ferrite') {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.lineWidth = 1;
                for (let ly = topY + 8; ly < botY - 8; ly += 9) {
                    ctx.beginPath();
                    ctx.moveTo(leftX + 4, ly); ctx.lineTo(leftX + coreThick - 4, ly);
                    ctx.moveTo(rightX - coreThick + 4, ly); ctx.lineTo(rightX - 4, ly);
                    ctx.stroke();
                }
            }

            // 4. MANYETİK AKI ÇİZGİLERİ & PARÇACIK ANİMASYONU
            // Akı yönü: sinüsoidal akının işaretine göre saat yönü veya saatin tersi
            let currentFluxSign = 1;
            let fluxMagnitude = 1;

            if (this.mode === 'ac_ac' || this.mode === 'ac_dc') {
                // Faraday gereği akı gerilimden 90° geridedir: -cos(wt) = sin(wt - 90°)
                const fluxVal = -Math.cos(this.timePhase);
                currentFluxSign = Math.sign(fluxVal) || 1;
                fluxMagnitude = Math.abs(fluxVal);
            } else if (this.mode === 'dc_ac') {
                if (this.dcInverterActive) {
                    currentFluxSign = Math.sign(Math.sin(this.timePhase)) || 1;
                    fluxMagnitude = 1;
                } else {
                    currentFluxSign = 1;
                    fluxMagnitude = 0.05; // Saf DC'de değişim sıfıra yakın (kararlı doyum)
                }
            } else if (this.mode === 'dc_dc') {
                currentFluxSign = 1;
                fluxMagnitude = Math.sin(this.timePhase) > 0 ? 1 : 0.1;
            }

            // Kapalı Yol Eğrisi (Nüvenin merkez ekseni)
            const trackL = leftX + coreThick / 2;
            const trackR = rightX - coreThick / 2;
            const trackT = topY + coreThick / 2;
            const trackB = botY - coreThick / 2;
            const perimeter = 2 * ((trackR - trackL) + (trackB - trackT));

            // Statik Akı Yolu Kılavuzu (Hafif kesikli neon çizgi)
            ctx.save();
            ctx.strokeStyle = res.dcHazard 
                ? 'rgba(239, 68, 68, 0.4)' 
                : (res.isSaturated ? 'rgba(245, 158, 11, 0.35)' : 'rgba(56, 189, 248, 0.22)');
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.rect(trackL, trackT, trackR - trackL, trackB - trackT);
            ctx.stroke();
            ctx.restore();

            // Canlı Akı Parçacıkları Çizimi
            const getPointOnTrack = (p) => {
                let norm = ((p % 1) + 1) % 1;
                const segTop = (trackR - trackL) / perimeter;
                const segRight = (trackB - trackT) / perimeter;
                const segBot = segTop;
                const segLeft = segRight;

                if (norm < segTop) {
                    const ratio = norm / segTop;
                    return { x: trackL + ratio * (trackR - trackL), y: trackT, dir: 'right' };
                } else if (norm < segTop + segRight) {
                    const ratio = (norm - segTop) / segRight;
                    return { x: trackR, y: trackT + ratio * (trackB - trackT), dir: 'down' };
                } else if (norm < segTop + segRight + segBot) {
                    const ratio = (norm - segTop - segRight) / segBot;
                    return { x: trackR - ratio * (trackR - trackL), y: trackB, dir: 'left' };
                } else {
                    const ratio = (norm - segTop - segRight - segBot) / segLeft;
                    return { x: trackL, y: trackB - ratio * (trackB - trackT), dir: 'up' };
                }
            };

            const particleSpeed = 0.006 * currentFluxSign * (res.dcHazard ? 0.05 : fluxMagnitude);
            ctx.save();
            this.particles.forEach(pt => {
                if (this.isRunning) {
                    pt.progress += particleSpeed * pt.speedVar;
                }
                const coord = getPointOnTrack(pt.progress);
                
                let pColor = res.dcHazard 
                    ? '#ef4444' 
                    : (res.isSaturated ? '#fbbf24' : '#38bdf8');

                ctx.fillStyle = pColor;
                ctx.shadowColor = pColor;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(coord.x, coord.y, 2.8, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();

            // 5. PRİMER VE SEKONDER SARGILARININ ÇİZİMİ (Bakır Spirler)
            // Sol Ayak = Primer Sargı (N1 sarım oranında spir)
            // Sağ Ayak = Sekonder Sargı (N2 sarım oranında spir)
            const drawCoil = (isPrimary) => {
                const turns = isPrimary ? this.n1 : this.n2;
                const legCenterX = isPrimary ? trackL : trackR;
                const coilWidth = coreThick + 16;
                const coilStartY = topY + coreThick + 10;
                const coilEndY = botY - coreThick - 10;
                const coilHeight = coilEndY - coilStartY;

                // Görsel spir sayısı: 8 ile 28 arasında ölçeklenir
                const visualTurns = Math.round(8 + (turns / 2000) * 20);
                const step = coilHeight / visualTurns;

                ctx.save();
                for (let i = 0; i < visualTurns; i++) {
                    const sy = coilStartY + i * step;

                    // Bakır Tel Rengi (Degrade ile 3B Silindirik Tel Efekti)
                    const wireGrad = ctx.createLinearGradient(legCenterX - coilWidth / 2, sy, legCenterX + coilWidth / 2, sy + step);
                    wireGrad.addColorStop(0, '#b45309');
                    wireGrad.addColorStop(0.3, '#f59e0b');
                    wireGrad.addColorStop(0.6, '#fef08a');
                    wireGrad.addColorStop(1, '#92400e');

                    ctx.fillStyle = wireGrad;
                    ctx.strokeStyle = '#78350f';
                    ctx.lineWidth = 1;

                    ctx.beginPath();
                    ctx.roundRect(legCenterX - coilWidth / 2, sy + 1, coilWidth, step - 2, 3);
                    ctx.fill();
                    ctx.stroke();

                    // Tel Işıltısı
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                    ctx.fillRect(legCenterX - coilWidth / 2 + 2, sy + 2, coilWidth - 4, 1.5);
                }

                // Sargı Etiketleri
                ctx.font = '700 12px "Outfit", sans-serif';
                ctx.fillStyle = isPrimary ? '#38bdf8' : '#ec4899';
                ctx.textAlign = 'center';
                const labelText = isPrimary ? `Primer Sargı (N₁ = ${this.n1})` : `Sekonder Sargı (N₂ = ${this.n2})`;
                ctx.fillText(labelText, legCenterX, botY + 22);

                ctx.font = '600 11px "JetBrains Mono", monospace';
                ctx.fillStyle = '#cbd5e1';
                const vText = isPrimary ? `${this.vIn}V` : `${res.v2Rms.toFixed(1)}V`;
                ctx.fillText(vText, legCenterX, botY + 36);

                ctx.restore();
            };

            drawCoil(true);  // Primer
            drawCoil(false); // Sekonder

            // 6. GİRİŞ VE ÇIKIŞ DEVRE BAĞLANTILARI
            // Sol Taraf: Güç Kaynağı
            const inTermX = leftX - 70;
            const inTermY1 = cy - 35;
            const inTermY2 = cy + 35;

            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(inTermX, inTermY1); ctx.lineTo(leftX - (coreThick + 16) / 2 + coreThick / 2, inTermY1);
            ctx.moveTo(inTermX, inTermY2); ctx.lineTo(leftX - (coreThick + 16) / 2 + coreThick / 2, inTermY2);
            ctx.stroke();

            // Kaynak Kutusu / Simgesi
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(inTermX - 18, cy, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.font = '700 11px "JetBrains Mono", monospace';
            ctx.fillStyle = '#38bdf8';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (this.mode === 'ac_ac' || this.mode === 'ac_dc') {
                ctx.fillText('~ AC', inTermX - 18, cy);
            } else {
                ctx.fillText(this.dcInverterActive ? 'INV' : 'DC', inTermX - 18, cy);
            }

            // Sağ Taraf: Çıkış Yükü (Lamba / Yük Direnci)
            const outTermX = rightX + 70;
            const outTermY1 = cy - 35;
            const outTermY2 = cy + 35;

            ctx.strokeStyle = '#ec4899';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(rightX + (coreThick + 16) / 2 - coreThick / 2, outTermY1); ctx.lineTo(outTermX, outTermY1);
            ctx.moveTo(rightX + (coreThick + 16) / 2 - coreThick / 2, outTermY2); ctx.lineTo(outTermX, outTermY2);
            ctx.stroke();

            // Lamba veya Doğrultucu Görseli
            if (this.loadType === 'lamp') {
                // Akkor Lamba Çizimi: Parlaklığı Sekonder Gerilimiyle Dinamik Parlar!
                const lampR = 20;
                const lampBrightness = Math.min(1.0, Math.max(0.05, res.v2Rms / (this.vIn / res.a || 1)));

                ctx.save();
                if (lampBrightness > 0.15 && !res.dcHazard) {
                    ctx.shadowColor = `rgba(251, 191, 36, ${lampBrightness * 0.9})`;
                    ctx.shadowBlur = 24 * lampBrightness;
                }

                ctx.fillStyle = res.dcHazard 
                    ? '#1e293b' 
                    : `rgba(251, 191, 36, ${0.15 + lampBrightness * 0.85})`;
                ctx.strokeStyle = res.dcHazard ? '#475569' : '#fbbf24';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(outTermX + 22, cy, lampR, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Lamba Filamanı (Çapraz veya spiral)
                ctx.strokeStyle = res.dcHazard ? '#64748b' : '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(outTermX + 14, cy + 8);
                ctx.lineTo(outTermX + 22, cy - 8);
                ctx.lineTo(outTermX + 30, cy + 8);
                ctx.stroke();

                ctx.font = '600 11px "Outfit", sans-serif';
                ctx.fillStyle = '#fbbf24';
                ctx.textAlign = 'center';
                ctx.fillText('Yük (Lamba)', outTermX + 22, cy + lampR + 15);
                ctx.restore();

            } else {
                // Direnç Sembolü
                ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
                ctx.strokeStyle = '#ec4899';
                ctx.lineWidth = 2;
                ctx.strokeRect(outTermX + 6, cy - 18, 32, 36);

                ctx.font = '700 11px "JetBrains Mono", monospace';
                ctx.fillStyle = '#ec4899';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${this.rLoad}Ω`, outTermX + 22, cy);
            }

            // 7. Mod Özel Bileşen Rozetleri
            ctx.save();
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            if (this.mode === 'ac_dc') {
                // Doğrultucu Köprüsü Bilgi Kutusu
                ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
                ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
                ctx.lineWidth = 1;
                ctx.roundRect(rightX - 30, topY - 32, 140, 26, 6);
                ctx.fill(); ctx.stroke();

                ctx.font = '600 11px "Inter", sans-serif';
                ctx.fillStyle = '#fbbf24';
                ctx.fillText('🌉 Köprü Diyot + ' + this.filterCap + 'µF', rightX - 22, topY - 26);
            } else if (this.mode === 'dc_ac' && this.dcInverterActive) {
                // İnvertör Bilgi Kutusu
                ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
                ctx.lineWidth = 1;
                ctx.roundRect(leftX - 110, topY - 32, 150, 26, 6);
                ctx.fill(); ctx.stroke();

                ctx.font = '600 11px "Inter", sans-serif';
                ctx.fillStyle = '#38bdf8';
                ctx.fillText('⚡ 4-MOSFET H-Köprüsü', leftX - 102, topY - 26);
            } else if (this.mode === 'dc_dc') {
                ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
                ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
                ctx.lineWidth = 1;
                ctx.roundRect(cx - 80, topY - 32, 160, 26, 6);
                ctx.fill(); ctx.stroke();

                ctx.font = '600 11px "Inter", sans-serif';
                ctx.fillStyle = '#c084fc';
                ctx.fillText('🚀 ' + (this.freq / 1000).toFixed(0) + ' kHz HF Ferrit Trafo', cx - 72, topY - 26);
            }
            ctx.restore();

            // 8. TEHLİKE / DOYUM BİLGİLENDİRME BANNERI
            if (res.dcHazard) {
                ctx.save();
                ctx.fillStyle = 'rgba(239, 68, 68, 0.92)';
                ctx.roundRect(w * 0.15, h * 0.03, w * 0.70, 28, 6);
                ctx.fill();

                ctx.font = '700 12px "Outfit", sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('⚠️ DİKKAT: SAF DC İLE ÇALIŞMAZ! (dΦ/dt = 0, V₂ = 0V, Primer Aşırı Isınıyor)', w * 0.5, h * 0.03 + 14);
                ctx.restore();
            } else if (res.isSaturated) {
                ctx.save();
                ctx.fillStyle = 'rgba(245, 158, 11, 0.90)';
                ctx.roundRect(w * 0.20, h * 0.03, w * 0.60, 26, 6);
                ctx.fill();

                ctx.font = '700 11px "Outfit", sans-serif';
                ctx.fillStyle = '#0f172a';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`⚠️ NÜVE DOYUMDA (B = ${res.bMax.toFixed(2)}T > B_sat = ${res.bSat}T) - Sarım (N1) veya Nüve Alanı (Ac) Artırılmalı!`, w * 0.5, h * 0.03 + 13);
                ctx.restore();
            }
        },

        // ═════════════════════════════════════════════════════════════════════
        // KANVAS 2: 4-KANALLI DİJİTAL LABORATUVAR OSİLOSKOPU (Tektronix/Keysight)
        // ═════════════════════════════════════════════════════════════════════
        renderScopeCanvas: function() {
            const canvas = document.getElementById('transScopeCanvas');
            if (!canvas) return;

            const hi = window.setupHiDpiCanvas ? window.setupHiDpiCanvas(canvas) : null;
            const ctx = hi ? hi.ctx : canvas.getContext('2d');
            const w = hi ? hi.w : canvas.width;
            const h = hi ? hi.h : canvas.height;

            const res = this.calcResults || { a: 1, v2Rms: 24, phiMax: 0.001, isSaturated: false };

            // 1. Zemin
            ctx.fillStyle = '#050813';
            ctx.fillRect(0, 0, w, h);

            // 2. Osiloskop Izgarası (Tektronix 12x8 Izgara)
            const gridCols = 12;
            const gridRows = 8;
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
            ctx.lineWidth = 1;

            for (let c = 1; c < gridCols; c++) {
                const x = c * (w / gridCols);
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
            }
            for (let r = 1; r < gridRows; r++) {
                const y = r * (h / gridRows);
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
            }

            // Merkez Eksenler (0V Ground Referansı)
            const midY = h * 0.50;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(0, midY); ctx.lineTo(w, midY);
            ctx.stroke();
            ctx.setLineDash([]);

            // 3. DALGA FORMLARI HESAPLAMA & ÇİZİM
            // CH1: v1(t) (Gök Mavisi #38bdf8)
            // CH2: v2(t) (Fuşya Pembe #ec4899)
            // CH3: Φ(t) (Kehribar Altın #f59e0b) - 90° geride!
            // CH4: i2(t) (Zümrüt Yeşili #10b981)

            const maxVoltScale = Math.max(10, Math.max(this.vIn * 1.5, res.v2Peak * 1.5));
            const voltToPx = (v) => midY - (v / maxVoltScale) * (h * 0.42);

            const v1Samples = [];
            const v2Samples = [];
            const phiSamples = [];
            const iSamples = [];

            const cyclesVisible = 2.5; // Ekranda görünen tam periyot sayısı

            for (let px = 0; px < w; px++) {
                const theta = (px / w) * (cyclesVisible * 2 * Math.PI) + this.timePhase;
                let v1 = 0;
                let v2 = 0;
                let phiNorm = 0; // -1 ile +1 arası normalize akı
                let i2 = 0;

                if (this.mode === 'ac_ac') {
                    // v1(t) = V_pk * sin(wt)
                    v1 = (this.vIn * Math.SQRT2) * Math.sin(theta);
                    // Manyetik Akı Φ(t) = -cos(wt) = sin(wt - 90°) -> 90° geridedir!
                    phiNorm = -Math.cos(theta);
                    // v2(t) = (N2/N1) * v1(t)
                    v2 = (res.v2Peak) * Math.sin(theta);
                    i2 = v2 / this.rLoad;

                } else if (this.mode === 'dc_ac') {
                    if (!this.dcInverterActive) {
                        // Saf DC: v1 sabit, dΦ/dt = 0, v2 = 0
                        v1 = this.vIn;
                        phiNorm = 1.0; // Doymuş sabit akı
                        v2 = 0;
                        i2 = 0;
                    } else {
                        // İnvertör Anahtarlama (Kare Dalga AC)
                        const sq = Math.sign(Math.sin(theta));
                        v1 = this.vIn * sq;
                        // Akı üçgen/entegre dalgadır: dΦ/dt = v1
                        const tri = (Math.asin(Math.sin(theta - Math.PI / 2)) / (Math.PI / 2));
                        phiNorm = tri;
                        v2 = res.v2Peak * sq;
                        i2 = v2 / this.rLoad;
                    }

                } else if (this.mode === 'ac_dc') {
                    // AC Giriş
                    v1 = (this.vIn * Math.SQRT2) * Math.sin(theta);
                    phiNorm = -Math.cos(theta);
                    
                    // Doğrultulmuş & Kondansatör Filtreli DC Dalga Formu
                    const rawSec = Math.abs(res.v2Peak * Math.sin(theta));
                    const vCapPeak = Math.max(0, res.v2Peak - 1.4);
                    // Kondansatör dalgalanması (Ripple) simülasyonu
                    const thetaMod = (theta % Math.PI);
                    const rippleDrop = (thetaMod / Math.PI) * (vCapPeak * 0.12 * (1000 / this.filterCap));
                    v2 = Math.max(rawSec - 1.4, Math.max(0, vCapPeak - rippleDrop));
                    i2 = v2 / this.rLoad;

                } else if (this.mode === 'dc_dc') {
                    // PWM Kare Dalga & Filtreli DC Çıkış
                    const dutyFrac = this.dutyCycle / 100;
                    const phaseInCycle = (theta % (2 * Math.PI)) / (2 * Math.PI);
                    const isHigh = phaseInCycle < dutyFrac;
                    v1 = isHigh ? this.vIn : 0;
                    phiNorm = isHigh ? 0.9 : -0.1;
                    v2 = res.v2Rms; // Regüle DC
                    i2 = v2 / this.rLoad;
                }

                v1Samples.push(v1);
                v2Samples.push(v2);
                phiSamples.push(phiNorm);
                iSamples.push(i2);
            }

            // Dalga Çizim Yardımcısı
            const drawWave = (samples, color, lineWidth, dash = []) => {
                ctx.save();
                ctx.strokeStyle = color;
                ctx.lineWidth = lineWidth;
                ctx.shadowColor = color;
                ctx.shadowBlur = 6;
                ctx.setLineDash(dash);
                ctx.beginPath();
                for (let x = 0; x < w; x++) {
                    const y = voltToPx(samples[x]);
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
                ctx.restore();
            };

            // 1. CH1: v1(t) (Mavi)
            drawWave(v1Samples, '#38bdf8', 2.0);

            // 2. CH3: Manyetik Akı Φ(t) (Kehribar - Normalize Genlik ile Gösterim)
            const phiVoltEquivalent = phiSamples.map(p => p * (maxVoltScale * 0.65));
            drawWave(phiVoltEquivalent, '#f59e0b', 1.8, [4, 3]);

            // 3. CH2: v2(t) (Pembe)
            drawWave(v2Samples, '#ec4899', 2.4);

            // 4. CH4: i2(t) (Yeşil Akım - Skalalandırılmış)
            const currentEquivalent = iSamples.map(i => i * (maxVoltScale / (res.iLoadRms * 3 || 1)));
            drawWave(currentEquivalent, '#10b981', 1.6);

            // 4. KANAL LEJANTI (Sol Üst)
            ctx.font = '600 11px "Inter", sans-serif';
            ctx.textBaseline = 'top';
            ctx.textAlign = 'left';

            const drawLegendItem = (txt, color, x, y, isDashed = false) => {
                ctx.save();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2.5;
                if (isDashed) ctx.setLineDash([4, 2]);
                ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.lineTo(x + 16, y + 6); ctx.stroke();
                ctx.fillStyle = color;
                ctx.fillText(txt, x + 22, y);
                ctx.restore();
            };

            drawLegendItem(`CH1: v₁(t) Giriş [${this.vIn}V]`, '#38bdf8', 12, 10);
            drawLegendItem(`CH2: v₂(t) Çıkış [${res && res.v2Rms != null ? res.v2Rms.toFixed(1) : '0.0'}V]`, '#ec4899', 165, 10);
            drawLegendItem(`CH3: Φ(t) Akı (90° Faz Farkı)`, '#f59e0b', 330, 10, true);
            drawLegendItem(`CH4: i₂(t) Akım [${res && res.iLoadRms != null ? res.iLoadRms.toFixed(2) : '0.00'}A]`, '#10b981', 510, 10);

            // 5. SAĞ ALT OSİLOSKOP TELEMETRİ OKUMALARI
            ctx.font = '600 11px "JetBrains Mono", monospace';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            const timePerDiv = (1000 / this.freq) / (gridCols / cyclesVisible);
            ctx.fillText(`Scale: ${(maxVoltScale / (gridRows / 2)).toFixed(0)} V/div • Time: ${timePerDiv.toFixed(1)} ms/div • f: ${this.freq} Hz`, w - 12, h - 8);

            // 6. İNTERAKTİF İMLEÇ HUD (CROSSHAIRS & RETINA TOOLTIP)
            if (this.hoverScopeInfo) {
                const mx = Math.max(0, Math.min(w - 1, Math.round(this.hoverScopeInfo.x)));
                const hoverV1 = v1Samples[mx] || 0;
                const hoverV2 = v2Samples[mx] || 0;
                const hoverPhi = (phiSamples[mx] || 0) * res.phiMaxMwb;
                const hoverI = iSamples[mx] || 0;

                // Dikey Lazer Çizgisi
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(mx, 0); ctx.lineTo(mx, h);
                ctx.stroke();

                // Kesişim Noktaları
                const drawPoint = (v, color) => {
                    const py = voltToPx(v);
                    ctx.fillStyle = color;
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 10;
                    ctx.beginPath(); ctx.arc(mx, py, 4, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath(); ctx.arc(mx, py, 1.8, 0, Math.PI * 2); ctx.fill();
                };

                drawPoint(hoverV1, '#38bdf8');
                drawPoint(hoverV2, '#ec4899');
                drawPoint(hoverI * (maxVoltScale / (res.iLoadRms * 3 || 1)), '#10b981');

                // Cam (Glassmorphic) Telemetri Kutusu
                const boxW = 165;
                const boxH = 92;
                const boxX = (mx + boxW + 20 > w) ? mx - boxW - 15 : mx + 15;
                const boxY = Math.min(h - boxH - 10, Math.max(10, this.hoverScopeInfo.y - boxH / 2));

                ctx.fillStyle = 'rgba(6, 10, 20, 0.94)';
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
                ctx.lineWidth = 1.2;
                ctx.roundRect(boxX, boxY, boxW, boxH, 8);
                ctx.fill(); ctx.stroke();

                ctx.font = '700 11px "Outfit", sans-serif';
                ctx.fillStyle = '#f8fafc';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText('🔍 Anlık Değerler', boxX + 10, boxY + 8);

                ctx.font = '600 11px "JetBrains Mono", monospace';
                ctx.fillStyle = '#38bdf8';
                ctx.fillText(`v₁(t) : ${hoverV1.toFixed(1)} V`, boxX + 10, boxY + 26);
                ctx.fillStyle = '#ec4899';
                ctx.fillText(`v₂(t) : ${hoverV2.toFixed(1)} V`, boxX + 10, boxY + 42);
                ctx.fillStyle = '#f59e0b';
                ctx.fillText(`Φ(t)  : ${hoverPhi.toFixed(2)} mWb`, boxX + 10, boxY + 58);
                ctx.fillStyle = '#10b981';
                ctx.fillText(`i₂(t) : ${hoverI.toFixed(2)} A`, boxX + 10, boxY + 74);

                ctx.restore();
            }
        },

        switchTab: function(tabName) {
            if (typeof window.switchTransformerTab === 'function') {
                window.switchTransformerTab(tabName);
            }
        }
    };

    // Global SimManager Kaydı
    if (window.SimManager) {
        window.SimManager.register('transformer_lab', {
            stop: function() { TransformerLabModule.stop(); },
            resume: function() { TransformerLabModule.resume(); }
        });
    }

    // Dışarıya Açılan Global Modül
    window.TransformerLabModule = TransformerLabModule;

    // DOM Hazır Olduğunda Başlat
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => TransformerLabModule.init());
        } else {
            setTimeout(() => TransformerLabModule.init(), 100);
        }
    }

})(typeof window !== 'undefined' ? window : this);
