/**
 * EEM REHBER / DEVREM STUDIO - DEVRE ANALİZİ 2 LABORATUVARI (AC SİSTEMLER)
 * 
 * Alt Menüler & Konular:
 * 1. AC Thevenin Eşdeğeri (Adım 1: Voc ∠ θ Açık Devre, Adım 2: Zth Kompleks Empedans, Adım 3: Eşdeğer Devre & Yük)
 * 2. AC Norton Eşdeğeri (Adım 1: Isc ∠ θ Kısa Devre, Adım 2: Zn Empedans, Adım 3: Eşdeğer Devre, Adım 4: Kaynak Dönüşümü)
 * 3. AC Süperpozisyon Teoremi (Adım 1: Orijinal Devre, Adım 2: Sadece Kaynak 1, Adım 3: Sadece Kaynak 2, Adım 4: Vektörel Toplam)
 * 4. AC Maksimum Güç Transferi (Kompleks Eşlenik ZL = Zth*, Rezonans & cos φ = 1)
 * 5. 3-Fazlı AC Yıldız-Üçgen (Y-Δ) & Dönen Fazörler (Hat-Faz İlişkileri, P, Q, S & Güç Faktörü)
 * 
 * Özellikler:
 * - %100 Temiz HTML/CSS Matematik Tipografisi (Ham LaTeX kodları olmadan, kesirler, fazör açıları ve vurgulu rozetler)
 * - SimManager & Donanım Hızlandırma Uyumlu
 */
(function(window) {
    'use strict';

    const CircuitAnalysis2Module = {
        // AC Devre Parametreleri
        acFreq: 50,     // Frekans (Hz)
        acV1: 120,      // 1. AC Gerilim Kaynağı (V rms)
        acTheta1: 0,    // 1. Kaynak Faz Açısı (Derece)
        acV2: 60,       // 2. AC Gerilim Kaynağı (V rms)
        acTheta2: -30,  // 2. Kaynak Faz Açısı (Derece)

        acR1: 15,       // 1. Kol Direnci (Ohm)
        acL1: 40,       // 1. Kol Bobini (mH)
        acR2: 25,       // Orta Kol Direnci (Ohm)
        acC2: 80,       // Orta Kol Kondansatörü (µF)
        acR3: 10,       // Sağ Seri Kol Direnci (Ohm)
        acL3: 20,       // Sağ Seri Kol Bobini (mH)

        // AC Yük Empedansı
        acRL: 20,       // Yük Direnci (Ohm)
        acXL: 15,       // Yük Reaktansı (Ohm, pozitif = endüktif, negatif = kapasitif)

        // 3-Faz Yıldız / Üçgen Parametreleri
        vPhase: 230,    // Faz Gerilimi (V rms)
        zPhaseMag: 30,  // Faz Empedans Büyüklüğü (Ohm)
        zPhaseAng: 25,  // Faz Empedans Açısı (Derece)

        // Alt Menü Konusu ve Adım Durumu
        topic: 'ac_thevenin', // 'ac_thevenin', 'ac_norton', 'ac_superposition', 'ac_max_power', 'ac_wye_delta'
        step: 'acth_step1',   // 'acth_step1', 'acth_step2', 'acth_step3', etc.

        // Simülasyon Durumu
        isRunning: true,
        animFrameId: null,
        animPhase: 0,
        hoverInfo: null,
        lastData: null,

        init: function() {
            this.bindEvents();
            this.calculate();
            this.updateUI();
            this.render();
            if (this.isRunning) {
                this.startLoop();
            }
        },

        bindEvents: function() {
            if (typeof document === 'undefined') return;
            const canvas = document.getElementById('circuitAnalysis2Canvas');
            if (canvas && !canvas.__circuit2Bound) {
                canvas.__circuit2Bound = true;
                canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e, canvas));
                canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
            }
            if (window.SimManager) {
                window.SimManager.register('circuit2', {
                    stop: () => this.stopLoop(),
                    start: () => this.startLoop()
                });
            }
        },

        handleMouseMove: function(e, canvas) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.hoverInfo = { x, y };
            if (!this.isRunning) this.render();
        },

        handleMouseLeave: function() {
            this.hoverInfo = null;
            if (!this.isRunning) this.render();
        },

        setParam: function(key, val) {
            this[key] = parseFloat(val) || 0;
            const readout = document.getElementById('c2Val_' + key);
            if (readout) {
                if (key.includes('Freq')) readout.textContent = this[key].toFixed(0) + ' Hz';
                else if (key.includes('Theta') || key.includes('Ang')) readout.textContent = this[key].toFixed(0) + '°';
                else if (key.startsWith('acV') || key.startsWith('vPhase')) readout.textContent = this[key].toFixed(0) + ' V';
                else if (key.includes('L')) readout.textContent = this[key].toFixed(1) + ' mH';
                else if (key.includes('C')) readout.textContent = this[key].toFixed(1) + ' µF';
                else readout.textContent = this[key].toFixed(1) + ' Ω';
            }
            this.calculate();
            this.updateUI();
            if (!this.isRunning) this.render();
        },

        setTopic: function(top) {
            this.topic = top;
            if (top === 'ac_thevenin') this.step = 'acth_step1';
            else if (top === 'ac_norton') this.step = 'acno_step1';
            else if (top === 'ac_superposition') this.step = 'acsp_step1';
            else if (top === 'ac_max_power') this.step = 'acmp_proof';
            else if (top === 'ac_wye_delta') this.step = 'acyd_trans';

            this.updateTabsUI();
            this.calculate();
            this.updateUI();
            this.render();
        },

        setStep: function(st) {
            this.step = st;
            this.updateTabsUI();
            this.calculate();
            this.updateUI();
            this.render();
        },

        updateTabsUI: function() {
            if (typeof document === 'undefined') return;
            // Konu butonlarını güncelle
            document.querySelectorAll('.c2-topic-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-topic') === this.topic);
            });

            // İlgili konunun adım barını göster, diğerlerini gizle
            const stepBars = ['c2StepsThevenin', 'c2StepsNorton', 'c2StepsSuperpos', 'c2StepsMaxPower', 'c2StepsWyeDelta'];
            stepBars.forEach(barId => {
                const el = document.getElementById(barId);
                if (el) el.style.display = 'none';
            });

            let activeBarId = 'c2StepsThevenin';
            if (this.topic === 'ac_norton') activeBarId = 'c2StepsNorton';
            else if (this.topic === 'ac_superposition') activeBarId = 'c2StepsSuperpos';
            else if (this.topic === 'ac_max_power') activeBarId = 'c2StepsMaxPower';
            else if (this.topic === 'ac_wye_delta') activeBarId = 'c2StepsWyeDelta';

            const activeBar = document.getElementById(activeBarId);
            if (activeBar) activeBar.style.display = 'flex';

            // Adım butonlarını güncelle
            document.querySelectorAll('.c2-step-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-step') === this.step);
            });

            // Girdi panellerini göster/gizle
            const normalInputs = document.getElementById('c2NormalInputs');
            const threePhaseInputs = document.getElementById('c2ThreePhaseInputs');
            if (normalInputs && threePhaseInputs) {
                normalInputs.style.display = (this.topic === 'ac_wye_delta') ? 'none' : 'grid';
                threePhaseInputs.style.display = (this.topic === 'ac_wye_delta') ? 'block' : 'none';
            }
        },

        setPreset: function(pName) {
            if (pName === 'balanced') {
                this.acFreq = 50; this.acV1 = 120; this.acTheta1 = 0; this.acV2 = 60; this.acTheta2 = -30;
                this.acR1 = 10; this.acL1 = 30; this.acR2 = 20; this.acC2 = 100; this.acR3 = 8; this.acL3 = 15;
                this.acRL = 15; this.acXL = 10;
            } else if (pName === 'ac_resonant') {
                this.acFreq = 50; this.acV1 = 100; this.acTheta1 = 0; this.acV2 = 0; this.acTheta2 = 0;
                this.acR1 = 12; this.acL1 = 45; this.acR2 = 25; this.acC2 = 68; this.acR3 = 6; this.acL3 = 10;
                // Eşlenik yük ayarı hesapta otomatik güncellenir
            } else if (pName === 'three_phase') {
                this.vPhase = 230; this.zPhaseMag = 25; this.zPhaseAng = 30;
            }

            ['acFreq', 'acV1', 'acTheta1', 'acV2', 'acTheta2', 'acR1', 'acL1', 'acR2', 'acC2', 'acR3', 'acL3', 'acRL', 'acXL', 'vPhase', 'zPhaseMag', 'zPhaseAng'].forEach(k => {
                const el = document.getElementById('c2Range_' + k);
                const ro = document.getElementById('c2Val_' + k);
                if (el && this[k] !== undefined) el.value = this[k];
                if (ro && this[k] !== undefined) {
                    if (k.includes('Freq')) ro.textContent = this[k].toFixed(0) + ' Hz';
                    else if (k.includes('Theta') || k.includes('Ang')) ro.textContent = this[k].toFixed(0) + '°';
                    else if (k.startsWith('acV') || k.startsWith('vPhase')) ro.textContent = this[k].toFixed(0) + ' V';
                    else if (k.includes('L')) ro.textContent = this[k].toFixed(1) + ' mH';
                    else if (k.includes('C')) ro.textContent = this[k].toFixed(1) + ' µF';
                    else ro.textContent = this[k].toFixed(1) + ' Ω';
                }
            });

            if (typeof document !== 'undefined') {
                document.querySelectorAll('.c2-preset-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.getAttribute('data-preset') === pName);
                });
            }

            this.calculate();
            this.updateUI();
            this.render();
        },

        togglePlay: function() {
            this.isRunning = !this.isRunning;
            this.updatePlayButton();
            if (this.isRunning) {
                this.startLoop();
            } else {
                this.stopLoop();
            }
        },

        updatePlayButton: function() {
            const btn = document.getElementById('btnCircuit2Play');
            if (!btn) return;
            if (this.isRunning) {
                btn.innerHTML = '<i class="fas fa-pause"></i> <span>Durdur</span>';
                btn.style.background = 'rgba(239, 68, 68, 0.2)';
                btn.style.color = '#f87171';
            } else {
                btn.innerHTML = '<i class="fas fa-play"></i> <span>Fazörleri Döndür</span>';
                btn.style.background = 'rgba(16, 185, 129, 0.2)';
                btn.style.color = '#34d399';
            }
        },

        startLoop: function() {
            if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
            this.isRunning = true;
            this.updatePlayButton();
            if (window.SimManager) window.SimManager.notifyStarted('circuit2');

            const loop = () => {
                if (this.isRunning) {
                    this.animPhase = (this.animPhase + 0.04) % (Math.PI * 2);
                    this.render();
                    this.animFrameId = requestAnimationFrame(loop);
                }
            };
            this.animFrameId = requestAnimationFrame(loop);
        },

        stopLoop: function() {
            this.isRunning = false;
            if (this.animFrameId) {
                cancelAnimationFrame(this.animFrameId);
                this.animFrameId = null;
            }
            this.updatePlayButton();
            if (window.SimManager) window.SimManager.notifyStopped('circuit2');
        },

        // Kompleks Sayı İşlem Yardımcıları (Re, Im)
        cAdd: (a, b) => ({ re: a.re + b.re, im: a.im + b.im }),
        cSub: (a, b) => ({ re: a.re - b.re, im: a.im - b.im }),
        cMul: (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }),
        cDiv: (a, b) => {
            const denom = b.re * b.re + b.im * b.im || 1e-9;
            return { re: (a.re * b.re + a.im * b.im) / denom, im: (a.im * b.re - a.re * b.im) / denom };
        },
        cMag: (a) => Math.sqrt(a.re * a.re + a.im * a.im),
        cAngDeg: (a) => (Math.atan2(a.im, a.re) * 180) / Math.PI,
        toPolar: function(a) {
            return { mag: this.cMag(a), ang: this.cAngDeg(a) };
        },
        fromPolar: function(mag, deg) {
            const rad = (deg * Math.PI) / 180;
            return { re: mag * Math.cos(rad), im: mag * Math.sin(rad) };
        },

        calculate: function() {
            const omega = 2 * Math.PI * this.acFreq;

            // Kol Empedansları
            const z1 = { re: this.acR1, im: omega * (this.acL1 * 1e-3) }; // R1 + j omega L1
            const xc2 = 1 / (omega * (this.acC2 * 1e-6));
            const z2 = { re: this.acR2, im: -xc2 };                        // R2 - j (1 / omega C2)
            const z3 = { re: this.acR3, im: omega * (this.acL3 * 1e-3) }; // R3 + j omega L3

            // Kaynak Fazörleri
            const v1Phasor = this.fromPolar(this.acV1, this.acTheta1);
            const v2Phasor = this.fromPolar(this.acV2, this.acTheta2);

            // 1. AC Thevenin Voc Gerilim Fazörü:
            // Vx = V1 * Z2 / (Z1 + Z2)
            const z1PlusZ2 = this.cAdd(z1, z2);
            const vxPhasor = this.cDiv(this.cMul(v1Phasor, z2), z1PlusZ2);
            // Vth = Vx - V2
            const vthPhasor = this.cSub(vxPhasor, v2Phasor);
            const vthPolar = this.toPolar(vthPhasor);

            // 2. AC Thevenin Empedansı (Zth):
            // Zth = Z3 + (Z1 // Z2)
            const z1ParallelZ2 = this.cDiv(this.cMul(z1, z2), z1PlusZ2);
            const zthPhasor = this.cAdd(z3, z1ParallelZ2);
            const zthPolar = this.toPolar(zthPhasor);

            // 3. AC Norton Akım Fazörü (In = Vth / Zth):
            const inPhasor = this.cDiv(vthPhasor, zthPhasor);
            const inPolar = this.toPolar(inPhasor);

            // 4. AC Yük Akımı (IL = Vth / (Zth + ZL)):
            const zlPhasor = { re: this.acRL, im: this.acXL };
            const zlPolar = this.toPolar(zlPhasor);
            const zTotal = this.cAdd(zthPhasor, zlPhasor);
            const ilPhasor = this.cDiv(vthPhasor, zTotal);
            const ilPolar = this.toPolar(ilPhasor);

            const vlPhasor = this.cMul(ilPhasor, zlPhasor);
            const vlPolar = this.toPolar(vlPhasor);

            // Güçler
            const phiRad = ((vlPolar.ang - ilPolar.ang) * Math.PI) / 180;
            const cosPhi = Math.cos(phiRad);
            const pReal = vlPolar.mag * ilPolar.mag * cosPhi;
            const qReactive = vlPolar.mag * ilPolar.mag * Math.sin(phiRad);
            const sApparent = vlPolar.mag * ilPolar.mag;

            // AC Maksimum Güç Eşlenik Değeri (ZL = Zth*)
            // ZL_opt = Rth - j Xth
            const pMaxAc = (vthPolar.mag * vthPolar.mag) / (4 * Math.max(0.1, zthPhasor.re));

            // AC Süperpozisyon Ayrıştırması:
            // Sadece V1 aktif (V2 = 0)
            const il_v1 = this.cDiv(vxPhasor, this.cAdd(zthPhasor, zlPhasor));
            // Sadece V2 aktif (V1 = 0)
            const il_v2 = this.cDiv({ re: -v2Phasor.re, im: -v2Phasor.im }, this.cAdd(zthPhasor, zlPhasor));
            const il_sum = this.cAdd(il_v1, il_v2);

            // 3-Faz Bağıntıları
            const vLine = this.vPhase * Math.sqrt(3);
            const zWye = this.zPhaseMag;
            const zDelta = this.zPhaseMag * 3; // Dengeli Y -> Delta
            const iPhaseWye = this.vPhase / zWye;
            const iLineWye = iPhaseWye;
            const p3Phase = Math.sqrt(3) * vLine * iLineWye * Math.cos((this.zPhaseAng * Math.PI) / 180);
            const q3Phase = Math.sqrt(3) * vLine * iLineWye * Math.sin((this.zPhaseAng * Math.PI) / 180);
            const s3Phase = Math.sqrt(3) * vLine * iLineWye;

            this.lastData = {
                omega, z1, z2, z3, xc2,
                v1Phasor, v2Phasor, vxPhasor,
                vthPhasor, vthPolar,
                zthPhasor, zthPolar,
                inPhasor, inPolar,
                zlPhasor, zlPolar,
                ilPhasor, ilPolar,
                vlPhasor, vlPolar,
                cosPhi, pReal, qReactive, sApparent, pMaxAc,
                il_v1: this.toPolar(il_v1),
                il_v2: this.toPolar(il_v2),
                il_sum: this.toPolar(il_sum),
                il_v1_rect: il_v1,
                il_v2_rect: il_v2,
                il_sum_rect: il_sum,
                vLine, zWye, zDelta, iPhaseWye, iLineWye,
                p3Phase, q3Phase, s3Phase
            };
        },

        updateUI: function() {
            if (typeof document === 'undefined') return;
            const d = this.lastData;
            if (!d) return;

            const elRes1 = document.getElementById('c2ResValue1');
            const elRes2 = document.getElementById('c2ResValue2');
            const elRes3 = document.getElementById('c2ResValue3');
            const elFormulaText = document.getElementById('c2StepFormulaText');
            const lbl1 = document.getElementById('c2ResLabel1');
            const lbl2 = document.getElementById('c2ResLabel2');
            const lbl3 = document.getElementById('c2ResLabel3');

            if (lbl1) lbl1.textContent = 'AC Thevenin Gerilimi (|Vth| ∠ θ)';
            if (lbl2) lbl2.textContent = 'AC Thevenin Empedansı (Zth)';
            if (lbl3) lbl3.textContent = 'Yük Akımı (|IL| ∠ θ) & Güç (P)';

            if (elRes1) elRes1.textContent = d.vthPolar.mag.toFixed(1) + ' V ∠ ' + d.vthPolar.ang.toFixed(1) + '°';
            if (elRes2) elRes2.textContent = d.zthPhasor.re.toFixed(1) + (d.zthPhasor.im >= 0 ? ' + j' : ' - j') + Math.abs(d.zthPhasor.im).toFixed(1) + ' Ω';
            if (elRes3) elRes3.textContent = d.ilPolar.mag.toFixed(2) + ' A (' + d.pReal.toFixed(1) + ' W)';

            // ZENGİN AC FORMÜL AÇIKLAMALARI (Ham LaTeX kesinlikle yok!)
            if (elFormulaText) {
                let html = '';
                const st = this.step;

                // 1. AC THEVENIN ADIMLARI
                if (st === 'acth_step1') {
                    html = `
                        <div class="circuit-math-card purple-theme">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge"><i class="fas fa-bolt"></i> AC Thevenin Adım 1</span>
                                AC Açık Devre Gerilim Fazörü (V<sub>oc</sub> = V<sub>th</sub> ∠ θ)
                            </div>
                            <p style="margin:0 0 6px 0;">AC yük empedansı sökülür (Açık Devre). A-B uçları arasındaki kompleks fazör gerilimi voltmetre ile ölçülür:</p>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • Frekans: <span class="math-var">f</span> = ${this.acFreq} Hz, Açısal Frekans: <span class="math-var">ω</span> = 2πf = <strong>${d.omega.toFixed(1)} rad/s</strong><br>
                                • Kol 1 Empedansı: <span class="math-var">Z<sub>1</sub></span> = ${this.acR1} + j(${d.z1.im.toFixed(1)}) Ω<br>
                                • Kol 2 Empedansı (Kapasitif): <span class="math-var">Z<sub>2</sub></span> = ${this.acR2} - j(${d.xc2.toFixed(1)}) Ω<br>
                                • Düğüm X Gerilim Fazörü: <span class="math-var">V<sub>X</sub></span> = V<sub>1</sub> · <span class="math-frac"><span class="num">Z<sub>2</sub></span><span class="den">Z<sub>1</sub> + Z<sub>2</sub></span></span><br>
                                • <strong>AC Thevenin Fazörü:</strong> <span class="math-var">V<sub>th</sub></span> = V<sub>X</sub> - V<sub>2</sub> = <span class="math-res">${d.vthPolar.mag.toFixed(2)} V ∠ ${d.vthPolar.ang.toFixed(1)}°</span>
                            </div>
                        </div>`;
                } else if (st === 'acth_step2') {
                    html = `
                        <div class="circuit-math-card purple-theme">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge"><i class="fas fa-microchip"></i> AC Thevenin Adım 2</span>
                                Kompleks Thevenin Empedansı (Z<sub>th</sub> = R<sub>th</sub> + jX<sub>th</sub>)
                            </div>
                            <p style="margin:0 0 6px 0;">Bağımsız AC kaynaklar sıfırlanıp kısa devre yapılır. A-B uçlarına AC empedansmetre bağlanır:</p>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • Paralel Kol Empedansı: <span class="math-var">Z<sub>1</sub> ∥ Z<sub>2</sub></span> = <span class="math-frac"><span class="num">Z<sub>1</sub> · Z<sub>2</sub></span><span class="den">Z<sub>1</sub> + Z<sub>2</sub></span></span><br>
                                • <strong>AC Thevenin Empedansı:</strong> <span class="math-var">Z<sub>th</sub></span> = Z<sub>3</sub> + (Z<sub>1</sub> ∥ Z<sub>2</sub>)<br>
                                • Kartezyen Form: <span class="math-res">${d.zthPhasor.re.toFixed(2)} ${d.zthPhasor.im >= 0 ? '+ j' : '- j'}${Math.abs(d.zthPhasor.im).toFixed(2)} Ω</span><br>
                                • Polar (Kutupsal) Form: <span class="math-res">${d.zthPolar.mag.toFixed(2)} Ω ∠ ${d.zthPolar.ang.toFixed(1)}°</span> (${d.zthPhasor.im >= 0 ? 'Endüktif' : 'Kapasitif'})
                            </div>
                        </div>`;
                } else if (st === 'acth_step3') {
                    html = `
                        <div class="circuit-math-card purple-theme">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge"><i class="fas fa-check-circle"></i> AC Thevenin Adım 3</span>
                                AC Thevenin Eşdeğer Devresi & Kompleks Yük Akımı
                            </div>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • Bağlanan Yük Empedansı: <span class="math-var">Z<sub>L</sub></span> = ${this.acRL} + j(${this.acXL}) Ω = <strong>${d.zlPolar.mag.toFixed(1)} Ω ∠ ${d.zlPolar.ang.toFixed(1)}°</strong><br>
                                • <strong>Yük Akım Fazörü:</strong> <span class="math-var">I<sub>L</sub></span> = <span class="math-frac"><span class="num">V<sub>th</sub></span><span class="den">Z<sub>th</sub> + Z<sub>L</sub></span></span> 
                                = <span class="math-res">${d.ilPolar.mag.toFixed(3)} A ∠ ${d.ilPolar.ang.toFixed(1)}°</span><br>
                                • <strong>Yük Gerilim Fazörü:</strong> <span class="math-var">V<sub>L</sub></span> = I<sub>L</sub> · Z<sub>L</sub> 
                                = <span class="math-res">${d.vlPolar.mag.toFixed(1)} V ∠ ${d.vlPolar.ang.toFixed(1)}°</span><br>
                                • Aktif Güç: <strong>${d.pReal.toFixed(1)} W</strong> | Reaktif Güç: <strong>${d.qReactive.toFixed(1)} VAR</strong> | cos φ = <strong>${d.cosPhi.toFixed(3)}</strong>
                            </div>
                        </div>`;
                }

                // 2. AC NORTON ADIMLARI
                else if (st === 'acno_step1') {
                    html = `
                        <div class="circuit-math-card purple-theme">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge"><i class="fas fa-arrows-alt-h"></i> AC Norton Adım 1</span>
                                AC Kısa Devre Akım Fazörü (I<sub>sc</sub> = I<sub>N</sub> ∠ θ)
                            </div>
                            <p style="margin:0 0 6px 0;">Yük terminalleri A-B arası AC ampermetre ile kısa devre yapılır:</p>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • <strong>Norton Akım Fazörü:</strong> <span class="math-var">I<sub>N</sub></span> = <span class="math-frac"><span class="num">V<sub>th</sub></span><span class="den">Z<sub>th</sub></span></span>
                                = <span class="math-frac"><span class="num">${d.vthPolar.mag.toFixed(1)} V ∠ ${d.vthPolar.ang.toFixed(1)}°</span><span class="den">${d.zthPolar.mag.toFixed(1)} Ω ∠ ${d.zthPolar.ang.toFixed(1)}°</span></span><br>
                                • <strong>I<sub>N</sub> Sonucu:</strong> <span class="math-res">${d.inPolar.mag.toFixed(3)} A ∠ ${d.inPolar.ang.toFixed(1)}°</span>
                            </div>
                        </div>`;
                } else if (st === 'acno_step2') {
                    html = `
                        <div class="circuit-math-card purple-theme">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge"><i class="fas fa-microchip"></i> AC Norton Adım 2</span>
                                AC Norton Eşdeğer Empedansı (Z<sub>N</sub> = Z<sub>th</sub>)
                            </div>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • AC Norton empedansı Thevenin empedansına tamamen eşittir:<br>
                                • <strong>Z<sub>N</sub></strong> = Z<sub>th</sub> = <span class="math-res">${d.zthPhasor.re.toFixed(2)} ${d.zthPhasor.im >= 0 ? '+ j' : '- j'}${Math.abs(d.zthPhasor.im).toFixed(2)} Ω</span>
                            </div>
                        </div>`;
                } else if (st === 'acno_step3') {
                    html = `
                        <div class="circuit-math-card purple-theme">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge"><i class="fas fa-check-circle"></i> AC Norton Adım 3</span>
                                AC Norton Eşdeğer Devresi & Paralel Akım Bölücü
                            </div>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • Paralel Bağlantıda Akım Bölücü: <span class="math-var">I<sub>L</sub></span> = I<sub>N</sub> · <span class="math-frac"><span class="num">Z<sub>N</sub></span><span class="den">Z<sub>N</sub> + Z<sub>L</sub></span></span><br>
                                • <strong>Yük Akımı:</strong> <span class="math-res">${d.ilPolar.mag.toFixed(3)} A ∠ ${d.ilPolar.ang.toFixed(1)}°</span><br>
                                <span style="color:#a855f7;">✓ AC Thevenin ile hesaplanan yük fazörü ile birebir aynıdır.</span>
                            </div>
                        </div>`;
                } else if (st === 'acno_step4') {
                    html = `
                        <div class="circuit-math-card purple-theme">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge"><i class="fas fa-exchange-alt"></i> AC Norton Adım 4</span>
                                AC Thevenin ↔ Norton Kaynak Dönüşümü
                            </div>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • V<sub>th</sub> = I<sub>N</sub> · Z<sub>N</sub> = (${d.inPolar.mag.toFixed(2)} ∠ ${d.inPolar.ang.toFixed(1)}°) · (${d.zthPolar.mag.toFixed(1)} ∠ ${d.zthPolar.ang.toFixed(1)}°)<br>
                                • <strong>Sonuç:</strong> <span class="math-res">${d.vthPolar.mag.toFixed(1)} V ∠ ${d.vthPolar.ang.toFixed(1)}°</span> (Açılar toplanır, genlikler çarpılır).
                            </div>
                        </div>`;
                }

                // 3. AC SÜPERPOZİSYON ADIMLARI
                else if (st === 'acsp_step1') {
                    html = `
                        <div class="circuit-math-card purple-theme">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge"><i class="fas fa-layer-group"></i> AC Süperpozisyon Adım 1</span>
                                Orijinal AC Devre (Tüm AC Kaynaklar Aktif)
                            </div>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • V<sub>1</sub> = ${this.acV1} V ∠ ${this.acTheta1}° | V<sub>2</sub> = ${this.acV2} V ∠ ${this.acTheta2}°<br>
                                • Toplam Yük Akımı: <span class="math-res">${d.ilPolar.mag.toFixed(3)} A ∠ ${d.ilPolar.ang.toFixed(1)}°</span><br>
                                • Süperpozisyon teoremine göre fazörler vektörel olarak toplanabilir.
                            </div>
                        </div>`;
                } else if (st === 'acsp_step2') {
                    html = `
                        <div class="circuit-math-card purple-theme">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge"><i class="fas fa-layer-group"></i> AC Süperpozisyon Adım 2</span>
                                Yalnızca 1. AC Kaynak Aktif (V<sub>2</sub> = 0 V Kısa Devre)
                            </div>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • 1. Kaynağın Katkısı: <span class="math-var">I<sub>L1</sub></span> = <span class="math-res">${d.il_v1.mag.toFixed(3)} A ∠ ${d.il_v1.ang.toFixed(1)}°</span>
                            </div>
                        </div>`;
                } else if (st === 'acsp_step3') {
                    html = `
                        <div class="circuit-math-card purple-theme">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge"><i class="fas fa-layer-group"></i> AC Süperpozisyon Adım 3</span>
                                Yalnızca 2. AC Kaynak Aktif (V<sub>1</sub> = 0 V Kısa Devre)
                            </div>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • 2. Kaynağın Katkısı: <span class="math-var">I<sub>L2</sub></span> = <span class="math-res">${d.il_v2.mag.toFixed(3)} A ∠ ${d.il_v2.ang.toFixed(1)}°</span>
                            </div>
                        </div>`;
                } else if (st === 'acsp_step4') {
                    html = `
                        <div class="circuit-math-card purple-theme">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge"><i class="fas fa-check-double"></i> AC Süperpozisyon Adım 4</span>
                                Kompleks Vektörel Fazör Toplamı & İspat
                            </div>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • I<sub>L</sub> = I<sub>L1</sub> + I<sub>L2</sub> (Vektörel Kartezyen Toplam):<br>
                                • <strong>Toplam Fazör:</strong> <span class="math-res">${d.il_sum.mag.toFixed(3)} A ∠ ${d.il_sum.ang.toFixed(1)}°</span><br>
                                <span style="color:#34d399;">✓ AC lineer sistemlerde süperpozisyon teoremi kusursuz geçerlidir!</span>
                            </div>
                        </div>`;
                }

                // 4. AC MAKSİMUM GÜÇ TRANSFERİ
                else if (st === 'acmp_proof') {
                    html = `
                        <div class="circuit-math-card purple-theme">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge"><i class="fas fa-chart-line"></i> AC Maksimum Güç Transfer Teoremi</span>
                                Kompleks Eşlenik Eşleşmesi (Z<sub>L</sub> = Z<sub>th</sub>*)
                            </div>
                            <p style="margin:0 0 6px 0;">AC devrelerde yüke maksimum aktif güç (Watt) aktarılabilmesi için yük empedansı, iç empedansın <strong>kompleks eşleniği</strong> olmalıdır:</p>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • İç Empedans: <span class="math-var">Z<sub>th</sub></span> = ${d.zthPhasor.re.toFixed(1)} ${d.zthPhasor.im >= 0 ? '+ j' : '- j'}${Math.abs(d.zthPhasor.im).toFixed(1)} Ω<br>
                                • <strong>Optimum Yük Şartı:</strong> <span class="math-var">Z<sub>L,opt</sub> = Z<sub>th</sub>*</span> = <span class="math-res">${d.zthPhasor.re.toFixed(1)} ${d.zthPhasor.im >= 0 ? '- j' : '+ j'}${Math.abs(d.zthPhasor.im).toFixed(1)} Ω</span><br>
                                • Neden? Reaktif kısımlar birbirini sıfırlar (Seri Rezonans: X<sub>th</sub> + X<sub>L</sub> = 0).<br>
                                • Devre saf omik hale gelir, güç faktörü tam <span style="color:#38bdf8;font-weight:700;">cos φ = 1.00</span> olur!<br>
                                • <strong>Maksimum Aktif Güç:</strong> <span class="math-var">P<sub>max</sub></span> = <span class="math-frac"><span class="num">|V<sub>th</sub>|²</span><span class="den">4 · R<sub>th</sub></span></span> 
                                = <span class="math-frac"><span class="num">(${d.vthPolar.mag.toFixed(1)})²</span><span class="den">4 · ${d.zthPhasor.re.toFixed(1)}</span></span> 
                                = <span class="math-res">${d.pMaxAc.toFixed(1)} W</span>
                            </div>
                        </div>`;
                }

                // 5. 3-FAZ YILDIZ-ÜÇGEN
                else if (st === 'acyd_trans' || st === 'acyd_phasor' || st === 'acyd_power') {
                    html = `
                        <div class="circuit-math-card purple-theme">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge"><i class="fas fa-project-diagram"></i> 3-Fazlı AC Sistemler</span>
                                Yıldız-Üçgen (Y - Δ) & Dönen Fazör Bağıntıları
                            </div>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • Faz Gerilimi: <span class="math-var">V<sub>faz</sub></span> = ${this.vPhase} V | Hat Gerilimi: <span class="math-var">V<sub>hat</sub> = √3 · V<sub>faz</sub></span> = <strong>${d.vLine.toFixed(1)} V</strong><br>
                                • Dengeli Dönüşüm: <span class="math-var">Z<sub>Δ</sub> = 3 · Z<sub>Y</sub></span> = 3 · ${d.zWye.toFixed(1)} = <strong>${d.zDelta.toFixed(1)} Ω</strong><br>
                                • Hat Akımı: <span class="math-var">I<sub>hat</sub></span> = <span class="math-res">${d.iLineWye.toFixed(2)} A</span><br>
                                • 3-Faz Aktif Güç: <span class="math-var">P</span> = √3 · V<sub>hat</sub> · I<sub>hat</sub> · cos φ = <span class="math-res">${d.p3Phase.toFixed(0)} W (${(d.p3Phase / 1000).toFixed(2)} kW)</span><br>
                                • 3-Faz Reaktif Güç: <span class="math-var">Q</span> = √3 · V<sub>hat</sub> · I<sub>hat</sub> · sin φ = <strong>${d.q3Phase.toFixed(0)} VAR</strong><br>
                                • Görünür Güç: <span class="math-var">S</span> = <strong>${d.s3Phase.toFixed(0)} VA</strong> | Güç Faktörü: <strong>cos(${this.zPhaseAng}°) = ${(Math.cos((this.zPhaseAng * Math.PI) / 180)).toFixed(3)}</strong>
                            </div>
                        </div>`;
                }

                elFormulaText.innerHTML = html;
            }
        },

        render: function() {
            const canvas = document.getElementById('circuitAnalysis2Canvas');
            if (!canvas) return;
            const hi = window.setupHiDpiCanvas ? window.setupHiDpiCanvas(canvas) : null;
            const ctx = hi ? hi.ctx : canvas.getContext('2d');
            const w = hi ? hi.w : canvas.width;
            const h = hi ? hi.h : canvas.height;

            ctx.fillStyle = '#060a14';
            ctx.fillRect(0, 0, w, h);

            if (window.drawOscilloscopeGrid) {
                window.drawOscilloscopeGrid(ctx, w, h, { gridX: 12, gridY: 6, strokeColor: 'rgba(168, 85, 247, 0.06)' });
            }

            const d = this.lastData;
            if (!d) return;

            if (this.topic === 'ac_wye_delta') {
                this.draw3PhaseModule(ctx, w, h, d);
            } else {
                this.drawAcCircuitAndPhasors(ctx, w, h, d);
            }
        },

        drawAcCircuitAndPhasors: function(ctx, w, h, d) {
            ctx.save();
            const phase = this.animPhase;
            const halfW = Math.round(w * 0.56);

            // Sol Panel: Seçilen Adıma Göre AC Devre Şematiği
            if (this.step === 'acth_step3') {
                this.drawAcTheveninEquivSchematic(ctx, halfW, h, d, phase);
            } else if (this.step === 'acno_step3') {
                this.drawAcNortonEquivSchematic(ctx, halfW, h, d, phase);
            } else if (this.step === 'acno_step4') {
                this.drawAcSourceConversionSchematic(ctx, halfW, h, d, phase);
            } else if (this.step === 'acmp_proof') {
                this.drawAcMaxPowerProofSchematic(ctx, halfW, h, d, phase);
            } else {
                this.drawAcOriginalStepSchematic(ctx, halfW, h, d, phase);
            }

            // Sağ Panel: Seçilen Adıma Göre Dinamik Fazör / Empedans / Vektör Düzlemi
            if (this.step === 'acth_step2' || this.step === 'acno_step2') {
                this.drawComplexImpedancePlane(ctx, halfW, 0, w - halfW, h, d);
            } else if (this.step === 'acsp_step2') {
                this.drawSuperpositionSinglePhasor(ctx, halfW, 0, w - halfW, h, d, 'V1', phase);
            } else if (this.step === 'acsp_step3') {
                this.drawSuperpositionSinglePhasor(ctx, halfW, 0, w - halfW, h, d, 'V2', phase);
            } else if (this.step === 'acsp_step4') {
                this.drawTipToTailPhasorSum(ctx, halfW, 0, w - halfW, h, d, phase);
            } else if (this.step === 'acmp_proof') {
                this.drawAcMaxPowerPhasorSide(ctx, halfW, 0, w - halfW, h, d);
            } else {
                this.drawStandardAcPhasorDiagram(ctx, halfW, 0, w - halfW, h, d, phase);
            }

            ctx.restore();
        },

        // --- 1. SOL PANEL: ADIM ADIM DEVRE ŞEMATİKLERİ ---
        drawAcOriginalStepSchematic: function(ctx, w, h, d, phase) {
            const x0 = 45;
            const x1 = Math.round(w * 0.38);
            const x2 = Math.round(w * 0.72);
            const x3 = w - 30;

            const yTop = 65;
            const yMid = Math.round(h * 0.5);
            const yBot = h - 65;

            const st = this.step;
            const isVocStep = (st === 'acth_step1');
            const isZthStep = (st === 'acth_step2' || st === 'acno_step2');
            const isNortonSc = (st === 'acno_step1');
            const isSpV1Only = (st === 'acsp_step2');
            const isSpV2Only = (st === 'acsp_step3');
            const isSpSum = (st === 'acsp_step4');

            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2.5;

            // Hat Telleri
            ctx.beginPath();
            ctx.moveTo(x0, yBot); ctx.lineTo(x0, yTop); ctx.lineTo(x1, yTop);
            ctx.moveTo(x1, yTop); ctx.lineTo(x1, yBot);
            ctx.moveTo(x1, yTop); ctx.lineTo(x2, yTop); ctx.lineTo(x3, yTop);
            ctx.moveTo(x0, yBot); ctx.lineTo(x3, yBot);
            ctx.stroke();

            // Kaynak V1: Zth adımında veya V2-only süperpozisyonda sıfırlanır (0V kısa devre)
            const disableV1 = isZthStep || isSpV2Only;
            this.drawAcSource(ctx, x0, yMid, d.v1Phasor, disableV1, isSpV2Only ? 'V1 = 0V' : 'V1');

            // Z1 Kolu (R1 + jXL1)
            this.drawImpedanceBox(ctx, Math.round((x0 + x1) / 2), yTop, 'Z1', 'R1+jXL1', '#38bdf8');

            // Z2 Kolu (R2 - jXC2)
            this.drawImpedanceBox(ctx, x1, yMid, 'Z2', 'R2-jXC2', '#ec4899', true);

            // Z3 Kolu (R3 + jXL3)
            this.drawImpedanceBox(ctx, Math.round((x1 + x2) / 2), yTop, 'Z3', 'R3+jXL3', '#38bdf8');

            // Kaynak V2: Zth adımında veya V1-only süperpozisyonda sıfırlanır (0V kısa devre)
            const disableV2 = isZthStep || isSpV1Only;
            this.drawAcSource(ctx, x2, yMid, d.v2Phasor, disableV2, isSpV1Only ? 'V2 = 0V' : 'V2');

            // Terminal Düğümleri A ve B
            this.drawNodeDot(ctx, x2, yTop, 'A');
            this.drawNodeDot(ctx, x2, yBot, 'B');

            // Yük / Cihaz Terminali
            if (isVocStep) {
                // Açık devre Voc voltmetresi
                this.drawVoltmeter(ctx, x3, yMid, d.vthPolar.mag);
                this.drawBadgeText(ctx, x3, yMid + 32, 'Voc = ' + d.vthPolar.mag.toFixed(1) + 'V', '#a855f7');
            } else if (isZthStep) {
                // İç empedans Zth ölçer
                this.drawOhmmeter(ctx, x3, yMid, d.zthPolar.mag);
                this.drawBadgeText(ctx, x3, yMid + 32, 'Zth = ' + d.zthPolar.mag.toFixed(1) + 'Ω', '#f59e0b');
            } else if (isNortonSc) {
                // Kısa devre Isc ampermetresi
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(x3, yTop); ctx.lineTo(x3, yBot); ctx.stroke();
                this.drawAmmeter(ctx, x3, yMid, d.inPolar.mag);
                this.drawBadgeText(ctx, x3, yMid + 32, 'Isc = ' + d.inPolar.mag.toFixed(2) + 'A', '#ef4444');
            } else {
                // Normal AC Yük Empedansı (ZL = RL + jXL)
                ctx.beginPath(); ctx.moveTo(x3, yTop); ctx.lineTo(x3, yBot); ctx.stroke();
                const zlColor = isSpSum ? '#4ade80' : '#e11d48';
                this.drawImpedanceBox(ctx, x3, yMid, 'ZL', this.acRL + (this.acXL >= 0 ? '+j' : '-j') + Math.abs(this.acXL) + 'Ω', zlColor, true);
            }

            // Canlı Sinüzoidal AC Akım Noktacıkları
            if (this.isRunning && !isZthStep) {
                if (isVocStep) {
                    // Sadece sol döngüde akım (açık devreye akım gitmez)
                    const loop1 = [{ x: x0, y: yMid }, { x: x0, y: yTop }, { x: x1, y: yTop }, { x: x1, y: yBot }, { x: x0, y: yBot }, { x: x0, y: yMid }];
                    this.drawAcCurrentDots(ctx, loop1, phase, 1.0, '#38bdf8');
                } else if (isSpV1Only) {
                    // Sadece V1 aktif akımı (mavi akım noktacıkları)
                    const wayV1 = [{ x: x0, y: yMid }, { x: x0, y: yTop }, { x: x1, y: yTop }, { x: x2, y: yTop }, { x: x3, y: yTop }, { x: x3, y: yBot }, { x: x0, y: yBot }];
                    this.drawAcCurrentDots(ctx, wayV1, phase, d.il_v1.mag, '#38bdf8');
                } else if (isSpV2Only) {
                    // Sadece V2 aktif akımı (pembe akım noktacıkları)
                    const wayV2 = [{ x: x2, y: yMid }, { x: x2, y: yTop }, { x: x3, y: yTop }, { x: x3, y: yBot }, { x: x2, y: yBot }];
                    this.drawAcCurrentDots(ctx, wayV2, phase, d.il_v2.mag, '#ec4899');
                } else {
                    // Tam çift yönlü akım
                    const wayMain = [{ x: x0, y: yTop }, { x: x1, y: yTop }, { x: x2, y: yTop }, { x: x3, y: yTop }, { x: x3, y: yBot }, { x: x0, y: yBot }];
                    this.drawAcCurrentDots(ctx, wayMain, phase, d.ilPolar.mag, '#c084fc');
                }
            }

            // Başlık
            let titleText = 'AC Şematik: Orijinal Devre';
            if (isVocStep) titleText = '1. Adım: Voc (Açık Devre Gerilimi)';
            else if (isZthStep) titleText = '2. Adım: Zth (Kaynaklar Sıfırlandı)';
            else if (isNortonSc) titleText = '1. Adım: Isc (Kısa Devre Akımı)';
            else if (isSpV1Only) titleText = 'Süperpozisyon: Sadece V1 Aktif (V2=0)';
            else if (isSpV2Only) titleText = 'Süperpozisyon: Sadece V2 Aktif (V1=0)';
            else if (isSpSum) titleText = 'Süperpozisyon: V1 + V2 Toplamı';

            ctx.fillStyle = '#c084fc';
            ctx.font = '700 12.5px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(titleText, 18, 24);
        },

        drawAcTheveninEquivSchematic: function(ctx, w, h, d, phase) {
            const x0 = 50;
            const x1 = Math.round(w * 0.45);
            const x2 = Math.round(w * 0.75);
            const x3 = w - 35;

            const yTop = 70;
            const yMid = Math.round(h * 0.5);
            const yBot = h - 70;

            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2.5;

            // Seri Eşdeğer Döngü
            ctx.beginPath();
            ctx.moveTo(x0, yBot); ctx.lineTo(x0, yTop); ctx.lineTo(x3, yTop);
            ctx.lineTo(x3, yBot); ctx.lineTo(x0, yBot);
            ctx.stroke();

            // AC Thevenin Gerilim Kaynağı Vth ∠ θth
            this.drawAcSource(ctx, x0, yMid, d.vthPhasor, false, 'Vth');
            this.drawBadgeText(ctx, x0 + 4, yMid + 32, d.vthPolar.mag.toFixed(1) + 'V ∠ ' + d.vthPolar.ang.toFixed(0) + '°', '#c084fc');

            // Thevenin Empedansı Zth
            const zthStr = d.zthPhasor.re.toFixed(1) + (d.zthPhasor.im >= 0 ? '+j' : '-j') + Math.abs(d.zthPhasor.im).toFixed(1) + 'Ω';
            this.drawImpedanceBox(ctx, x1, yTop, 'Zth', zthStr, '#f59e0b');

            // Terminal Düğümleri A ve B
            this.drawNodeDot(ctx, x2, yTop, 'A');
            this.drawNodeDot(ctx, x2, yBot, 'B');

            // AC Yük Empedansı ZL
            const zlStr = this.acRL + (this.acXL >= 0 ? '+j' : '-j') + Math.abs(this.acXL) + 'Ω';
            this.drawImpedanceBox(ctx, x3, yMid, 'ZL', zlStr, '#10b981', true);
            this.drawBadgeText(ctx, x3 - 8, yMid + 35, 'IL = ' + d.ilPolar.mag.toFixed(2) + 'A', '#34d399');

            // Canlı Akım Noktacıkları
            if (this.isRunning) {
                const equivWay = [
                    { x: x0, y: yMid }, { x: x0, y: yTop }, { x: x1, y: yTop },
                    { x: x3, y: yTop }, { x: x3, y: yBot }, { x: x0, y: yBot }, { x: x0, y: yMid }
                ];
                this.drawAcCurrentDots(ctx, equivWay, phase, d.ilPolar.mag, '#34d399');
            }

            ctx.fillStyle = '#34d399';
            ctx.font = '700 13px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('3. Adım: AC Thevenin Eşdeğeri & Yük', 18, 24);
        },

        drawAcNortonEquivSchematic: function(ctx, w, h, d, phase) {
            const x0 = 50;
            const x1 = Math.round(w * 0.45);
            const x2 = Math.round(w * 0.75);
            const x3 = w - 35;

            const yTop = 70;
            const yMid = Math.round(h * 0.5);
            const yBot = h - 70;

            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2.5;

            // Paralel Hatlar
            ctx.beginPath();
            ctx.moveTo(x0, yTop); ctx.lineTo(x3, yTop);
            ctx.moveTo(x0, yBot); ctx.lineTo(x3, yBot);
            ctx.moveTo(x0, yTop); ctx.lineTo(x0, yBot);
            ctx.moveTo(x1, yTop); ctx.lineTo(x1, yBot);
            ctx.moveTo(x3, yTop); ctx.lineTo(x3, yBot);
            ctx.stroke();

            // AC Norton Akım Kaynağı IN
            ctx.save();
            ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x0, yMid, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#34d399';
            ctx.font = '700 13px Inter, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('IN ~', x0, yMid);
            ctx.restore();
            this.drawBadgeText(ctx, x0 + 4, yMid + 32, d.inPolar.mag.toFixed(2) + 'A ∠ ' + d.inPolar.ang.toFixed(0) + '°', '#10b981');

            // Paralel İç Empedans ZN = Zth
            const znStr = d.zthPhasor.re.toFixed(1) + (d.zthPhasor.im >= 0 ? '+j' : '-j') + Math.abs(d.zthPhasor.im).toFixed(1) + 'Ω';
            this.drawImpedanceBox(ctx, x1, yMid, 'ZN', znStr, '#f59e0b', true);

            // Düğümler
            this.drawNodeDot(ctx, x2, yTop, 'A');
            this.drawNodeDot(ctx, x2, yBot, 'B');

            // Yük ZL
            const zlStr = this.acRL + (this.acXL >= 0 ? '+j' : '-j') + Math.abs(this.acXL) + 'Ω';
            this.drawImpedanceBox(ctx, x3, yMid, 'ZL', zlStr, '#ec4899', true);

            if (this.isRunning) {
                const wayIn = [{ x: x0, y: yMid }, { x: x0, y: yTop }, { x: x1, y: yTop }, { x: x1, y: yBot }, { x: x0, y: yBot }];
                this.drawAcCurrentDots(ctx, wayIn, phase, d.inPolar.mag, '#10b981');
                const wayL = [{ x: x1, y: yTop }, { x: x3, y: yTop }, { x: x3, y: yBot }, { x: x1, y: yBot }];
                this.drawAcCurrentDots(ctx, wayL, phase, d.ilPolar.mag, '#ec4899');
            }

            ctx.fillStyle = '#10b981';
            ctx.font = '700 13px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('3. Adım: AC Norton Eşdeğeri & Akım Bölünmesi', 18, 24);
        },

        drawAcSourceConversionSchematic: function(ctx, w, h, d, phase) {
            const midX = Math.round(w / 2);
            const leftW = midX - 20;

            ctx.fillStyle = '#38bdf8';
            ctx.font = '700 12.5px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('4. Adım: AC Thevenin ↔ Norton Kaynak Dönüşümü', 18, 24);

            // Sol Bölge: Mini Thevenin
            ctx.save();
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2;
            ctx.strokeRect(20, 45, leftW - 30, h - 85);
            ctx.fillStyle = '#c084fc';
            ctx.font = '600 11px Inter, sans-serif';
            ctx.fillText('Thevenin: Vth Seri Zth', 30, 62);
            this.drawAcSource(ctx, 45, Math.round(h * 0.55), d.vthPhasor, false, 'Vth');
            this.drawImpedanceBox(ctx, 45 + Math.round((leftW - 85) / 2), 75, 'Zth', d.zthPolar.mag.toFixed(1) + 'Ω', '#f59e0b');
            ctx.restore();

            // Orta Çift Yönlü Ok
            ctx.save();
            ctx.fillStyle = '#38bdf8';
            ctx.font = '700 18px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⇄', midX, Math.round(h * 0.5));
            ctx.font = '600 10.5px "JetBrains Mono", monospace';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('Vth = In · ZN', midX, Math.round(h * 0.5) - 20);
            ctx.fillText('In = Vth / Zth', midX, Math.round(h * 0.5) + 20);
            ctx.restore();

            // Sağ Bölge: Mini Norton
            ctx.save();
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2;
            const rightX0 = midX + 20;
            const rightW = w - rightX0 - 20;
            ctx.strokeRect(rightX0, 45, rightW, h - 85);
            ctx.fillStyle = '#34d399';
            ctx.font = '600 11px Inter, sans-serif';
            ctx.fillText('Norton: In Paralel ZN', rightX0 + 10, 62);
            this.drawImpedanceBox(ctx, rightX0 + Math.round(rightW * 0.6), Math.round(h * 0.55), 'ZN', d.zthPolar.mag.toFixed(1) + 'Ω', '#f59e0b', true);
            ctx.restore();
        },

        drawAcMaxPowerProofSchematic: function(ctx, w, h, d, phase) {
            const x0 = 50;
            const x1 = Math.round(w * 0.44);
            const x2 = Math.round(w * 0.74);
            const x3 = w - 35;

            const yTop = 70;
            const yMid = Math.round(h * 0.5);
            const yBot = h - 70;

            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2.5;

            ctx.beginPath();
            ctx.moveTo(x0, yBot); ctx.lineTo(x0, yTop); ctx.lineTo(x3, yTop);
            ctx.lineTo(x3, yBot); ctx.lineTo(x0, yBot);
            ctx.stroke();

            this.drawAcSource(ctx, x0, yMid, d.vthPhasor, false, 'Vth');

            // Zth = Rth + jXth
            const zthStr = d.zthPhasor.re.toFixed(1) + (d.zthPhasor.im >= 0 ? '+j' : '-j') + Math.abs(d.zthPhasor.im).toFixed(1) + 'Ω';
            this.drawImpedanceBox(ctx, x1, yTop, 'Zth', zthStr, '#f59e0b');

            // Optimum Yük ZL = Zth* = Rth - jXth
            const zlOptStr = d.zthPhasor.re.toFixed(1) + (d.zthPhasor.im >= 0 ? '-j' : '+j') + Math.abs(d.zthPhasor.im).toFixed(1) + 'Ω';
            this.drawImpedanceBox(ctx, x3, yMid, 'ZL*', zlOptStr, '#10b981', true);

            // Rezonans ve İptal Vurgusu
            ctx.fillStyle = '#4ade80';
            ctx.font = '700 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Reaktif İptal: Xth + XL = 0', Math.round((x1 + x3) / 2), yTop + 24);
            ctx.fillText('Saf Omik Devre (cos φ = 1.00)', Math.round((x1 + x3) / 2), yTop + 40);

            this.drawBadgeText(ctx, x3 - 8, yMid + 35, 'Pmax = ' + d.pMaxAc.toFixed(1) + 'W', '#fbbf24');

            ctx.fillStyle = '#fbbf24';
            ctx.font = '700 13px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('AC Maksimum Güç: Kompleks Eşlenik Eşleşmesi (ZL = Zth*)', 18, 24);
        },

        // --- 2. SAĞ PANEL: ADIM ADIM FAZÖR, EMPEDANS & VEKTÖR DÜZLEMLERİ ---
        drawComplexImpedancePlane: function(ctx, xOff, yOff, w, h, d) {
            ctx.save();
            ctx.translate(xOff, yOff);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(0, h - 20); ctx.stroke();

            const cx = Math.round(w / 2);
            const cy = Math.round(h / 2);
            const maxRadius = Math.min(cx, cy) - 45;

            // Eksenler
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath();
            ctx.moveTo(cx - maxRadius - 10, cy); ctx.lineTo(cx + maxRadius + 10, cy);
            ctx.moveTo(cx, cy - maxRadius - 10); ctx.lineTo(cx, cy + maxRadius + 10);
            ctx.stroke();

            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('+Re (R, Ω)', cx + maxRadius + 28, cy + 3);
            ctx.fillText('+jIm (+jXL)', cx + 22, cy - maxRadius - 5);
            ctx.fillText('-jIm (-jXC)', cx + 22, cy + maxRadius + 14);

            // Zth Vektörü
            const rth = d.zthPhasor.re;
            const xth = d.zthPhasor.im;
            const mag = d.zthPolar.mag;
            const ang = d.zthPolar.ang;

            const scale = maxRadius / Math.max(15, mag * 1.2);
            const vx = cx + rth * scale;
            const vy = cy - xth * scale;

            // Rth Bileşeni (Yatay Direnç)
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2;
            ctx.setLineDash([2, 2]);
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(vx, cy); ctx.stroke();
            ctx.setLineDash([]);

            // Xth Bileşeni (Düşey Reaktans)
            ctx.strokeStyle = xth >= 0 ? '#38bdf8' : '#ec4899';
            ctx.setLineDash([2, 2]);
            ctx.beginPath(); ctx.moveTo(vx, cy); ctx.lineTo(vx, vy); ctx.stroke();
            ctx.setLineDash([]);

            // Zth Hipotenüs Vektörü (Yeşil/Mavi)
            ctx.strokeStyle = '#10b981';
            ctx.fillStyle = '#10b981';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(vx, vy); ctx.stroke();

            // Ok Ucu
            const vAng = Math.atan2(cy - vy, vx - cx);
            const headLen = 9;
            ctx.beginPath();
            ctx.moveTo(vx, vy);
            ctx.lineTo(vx - headLen * Math.cos(vAng - 0.4), vy + headLen * Math.sin(vAng - 0.4));
            ctx.lineTo(vx - headLen * Math.cos(vAng + 0.4), vy + headLen * Math.sin(vAng + 0.4));
            ctx.closePath(); ctx.fill();

            // Etiket
            ctx.fillStyle = '#f8fafc';
            ctx.font = '700 12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Kompleks Empedans Düzlemi (Z)', cx, 24);

            const typeLabel = xth >= 0 ? 'Endüktif (+j)' : 'Kapasitif (-j)';
            this.drawBadgeText(ctx, cx, h - 22, 'Zth = ' + mag.toFixed(1) + 'Ω ∠ ' + ang.toFixed(1) + '° (' + typeLabel + ')', '#10b981');

            ctx.restore();
        },

        drawSuperpositionSinglePhasor: function(ctx, xOff, yOff, w, h, d, sourceName, phase) {
            ctx.save();
            ctx.translate(xOff, yOff);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(0, h - 20); ctx.stroke();

            const cx = Math.round(w / 2);
            const cy = Math.round(h / 2);
            const maxRadius = Math.min(cx, cy) - 45;
            const rot = this.isRunning ? phase : 0;

            this.drawPhasorAxes(ctx, cx, cy, maxRadius);

            if (sourceName === 'V1') {
                this.drawPhasorArrow(ctx, cx, cy, d.il_v1.ang, rot, maxRadius * 0.8, '#38bdf8', 'IL1 (' + d.il_v1.mag.toFixed(3) + 'A)');
                ctx.fillStyle = '#38bdf8';
                ctx.font = '700 12px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('1. Kaynak Akım Fazörü (IL1)', cx, 24);
                this.drawBadgeText(ctx, cx, h - 22, 'IL1 = ' + d.il_v1.mag.toFixed(3) + 'A ∠ ' + d.il_v1.ang.toFixed(1) + '°', '#38bdf8');
            } else {
                this.drawPhasorArrow(ctx, cx, cy, d.il_v2.ang, rot, maxRadius * 0.8, '#ec4899', 'IL2 (' + d.il_v2.mag.toFixed(3) + 'A)');
                ctx.fillStyle = '#ec4899';
                ctx.font = '700 12px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('2. Kaynak Akım Fazörü (IL2)', cx, 24);
                this.drawBadgeText(ctx, cx, h - 22, 'IL2 = ' + d.il_v2.mag.toFixed(3) + 'A ∠ ' + d.il_v2.ang.toFixed(1) + '°', '#ec4899');
            }

            ctx.restore();
        },

        drawTipToTailPhasorSum: function(ctx, xOff, yOff, w, h, d, phase) {
            ctx.save();
            ctx.translate(xOff, yOff);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(0, h - 20); ctx.stroke();

            const cx = Math.round(w / 2);
            const cy = Math.round(h / 2);
            const maxRadius = Math.min(cx, cy) - 45;

            this.drawPhasorAxes(ctx, cx, cy, maxRadius);

            const v1_r = d.il_v1_rect || { re: 0.1, im: 0.1 };
            const v2_r = d.il_v2_rect || { re: 0.1, im: 0.1 };
            const sum_r = d.il_sum_rect || { re: 0.2, im: 0.2 };

            const totalMag = Math.max(0.1, d.ilPolar.mag, d.il_v1.mag + d.il_v2.mag);
            const scale = (maxRadius * 0.85) / totalMag;

            // Dönen faz etkisi
            const rot = this.isRunning ? phase : 0;
            const cosRot = Math.cos(rot), sinRot = Math.sin(rot);

            const rotPt = (re, im) => ({
                x: cx + (re * cosRot - im * sinRot) * scale,
                y: cy - (re * sinRot + im * cosRot) * scale
            });

            const p0 = { x: cx, y: cy };
            const p1 = rotPt(v1_r.re, v1_r.im);
            const pSum = rotPt(sum_r.re, sum_r.im);

            // 1. Vektör: IL1 (Mavi, Orijinden p1'e)
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
            this.drawVectorHead(ctx, p0.x, p0.y, p1.x, p1.y, '#38bdf8');

            // 2. Vektör: IL2 (Pembe, p1'in ucuna eklenmiş Tip-to-Tail!)
            ctx.strokeStyle = '#ec4899';
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(pSum.x, pSum.y); ctx.stroke();
            this.drawVectorHead(ctx, p1.x, p1.y, pSum.x, pSum.y, '#ec4899');

            // 3. Bileşke Vektör: IL = IL1 + IL2 (Parlak Yeşil, Orijinden pSum'a)
            ctx.strokeStyle = '#4ade80';
            ctx.lineWidth = 3.5;
            ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(pSum.x, pSum.y); ctx.stroke();
            this.drawVectorHead(ctx, p0.x, p0.y, pSum.x, pSum.y, '#4ade80');

            ctx.fillStyle = '#f8fafc';
            ctx.font = '700 12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Uç Uca Fazör Toplamı: IL1 + IL2 = IL', cx, 24);

            this.drawBadgeText(ctx, cx, h - 22, 'Toplam IL = ' + d.ilPolar.mag.toFixed(3) + 'A ∠ ' + d.ilPolar.ang.toFixed(1) + '°', '#4ade80');

            ctx.restore();
        },

        drawAcMaxPowerPhasorSide: function(ctx, xOff, yOff, w, h, d) {
            ctx.save();
            ctx.translate(xOff, yOff);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(0, h - 20); ctx.stroke();

            const cx = Math.round(w / 2);
            const cy = Math.round(h / 2);
            const maxRadius = Math.min(cx, cy) - 45;

            this.drawPhasorAxes(ctx, cx, cy, maxRadius);

            const xth = Math.abs(d.zthPhasor.im);
            const scale = (maxRadius * 0.7) / Math.max(10, xth * 1.4);

            // +jXth İndüktif Reaktans Vektörü (Yukarı Doğru)
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - xth * scale); ctx.stroke();
            this.drawVectorHead(ctx, cx, cy, cx, cy - xth * scale, '#38bdf8');

            // -jXL Kapasitif Reaktans Eşlenik Vektörü (Aşağı Doğru, Birebir Eşit)
            ctx.strokeStyle = '#ec4899';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + xth * scale); ctx.stroke();
            this.drawVectorHead(ctx, cx, cy, cx, cy + xth * scale, '#ec4899');

            // İptal Çizgisi
            ctx.strokeStyle = '#fbbf24';
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(cx + 25, cy - xth * scale);
            ctx.lineTo(cx + 40, cy);
            ctx.lineTo(cx + 25, cy + xth * scale);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#fbbf24';
            ctx.font = '700 11px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('+jX - jX = 0', cx + 46, cy + 4);

            ctx.fillStyle = '#f8fafc';
            ctx.font = '700 12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Rezonans & Güç Faktörü: cos φ = 1.00', cx, 24);

            this.drawBadgeText(ctx, cx, h - 22, 'Net Reaktans = 0.0 Ω | Tam Aktif İletim', '#fbbf24');

            ctx.restore();
        },

        drawStandardAcPhasorDiagram: function(ctx, xOff, yOff, w, h, d, phase) {
            ctx.save();
            ctx.translate(xOff, yOff);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(0, h - 20); ctx.stroke();

            const cx = Math.round(w / 2);
            const cy = Math.round(h / 2);
            const maxRadius = Math.min(cx, cy) - 45;
            const rot = this.isRunning ? phase : 0;

            this.drawPhasorAxes(ctx, cx, cy, maxRadius);

            // Polar Daireler
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.15)';
            ctx.setLineDash([2, 4]);
            ctx.beginPath();
            ctx.arc(cx, cy, maxRadius * 0.5, 0, Math.PI * 2);
            ctx.arc(cx, cy, maxRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Fazörler: Vth, VL, IL
            this.drawPhasorArrow(ctx, cx, cy, d.vthPolar.ang, rot, maxRadius * 0.9, '#a855f7', 'Vth (' + d.vthPolar.mag.toFixed(0) + 'V)');
            this.drawPhasorArrow(ctx, cx, cy, d.vlPolar.ang, rot, maxRadius * 0.7, '#38bdf8', 'VL (' + d.vlPolar.mag.toFixed(0) + 'V)');
            this.drawPhasorArrow(ctx, cx, cy, d.ilPolar.ang, rot, maxRadius * 0.55, '#10b981', 'IL (' + d.ilPolar.mag.toFixed(2) + 'A)');

            ctx.fillStyle = '#f8fafc';
            ctx.font = '700 12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Dönen Fazör Diyagramı', cx, 24);

            this.drawBadgeText(ctx, cx, h - 22, 'Faz Farkı: φ = ' + (d.vlPolar.ang - d.ilPolar.ang).toFixed(1) + '° (cos φ = ' + d.cosPhi.toFixed(2) + ')', '#a855f7');

            ctx.restore();
        },

        // --- 3. 3-FAZ DÖNÜŞÜM & GÜÇ ÜÇGENİ MODÜLLERİ ---
        draw3PhaseModule: function(ctx, w, h, d) {
            if (this.step === 'acyd_trans') {
                this.draw3PhaseWyeDeltaConversion(ctx, w, h, d);
            } else if (this.step === 'acyd_power') {
                this.draw3PhasePowerTriangle(ctx, w, h, d);
            } else {
                this.draw3PhasePhasors(ctx, w, h, d);
            }
        },

        draw3PhaseWyeDeltaConversion: function(ctx, w, h, d) {
            ctx.save();
            const midX = Math.round(w / 2);

            ctx.fillStyle = '#c084fc';
            ctx.font = '700 14px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('3-Faz Dengeli Yıldız (Y) ⇄ Üçgen (Δ) Dönüşümü', 24, 28);

            // Sol Taraf: Yıldız (Y) Bağlantı
            const leftCx = Math.round(midX * 0.45);
            const cy = Math.round(h * 0.52);
            const r = 65;

            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;

            // 3 Kol (Yıldız)
            const angA = -Math.PI / 2;
            const angB = -Math.PI / 2 + (2 * Math.PI / 3);
            const angC = -Math.PI / 2 - (2 * Math.PI / 3);

            const pN = { x: leftCx, y: cy };
            const pA = { x: leftCx + Math.cos(angA) * r, y: cy + Math.sin(angA) * r };
            const pB = { x: leftCx + Math.cos(angB) * r, y: cy + Math.sin(angB) * r };
            const pC = { x: leftCx + Math.cos(angC) * r, y: cy + Math.sin(angC) * r };

            ctx.beginPath();
            ctx.moveTo(pA.x, pA.y); ctx.lineTo(pN.x, pN.y);
            ctx.moveTo(pB.x, pB.y); ctx.lineTo(pN.x, pN.y);
            ctx.moveTo(pC.x, pC.y); ctx.lineTo(pN.x, pN.y);
            ctx.stroke();

            this.drawNodeDot(ctx, pN.x, pN.y, 'N');
            this.drawNodeDot(ctx, pA.x, pA.y, 'A');
            this.drawNodeDot(ctx, pB.x, pB.y, 'B');
            this.drawNodeDot(ctx, pC.x, pC.y, 'C');

            ctx.fillStyle = '#38bdf8';
            ctx.font = '700 12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Yıldız (Y)', leftCx, cy + r + 24);
            ctx.font = '600 11px "JetBrains Mono", monospace';
            ctx.fillText('ZY = ' + d.zWye.toFixed(1) + ' Ω', leftCx, cy + r + 40);

            // Orta Dönüşüm Bağıntısı
            ctx.fillStyle = '#f8fafc';
            ctx.font = '700 20px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⇄', midX, cy - 10);
            ctx.font = '700 12px "JetBrains Mono", monospace';
            ctx.fillStyle = '#fbbf24';
            ctx.fillText('ZΔ = 3 · ZY', midX, cy + 18);
            ctx.fillText('ZY = ZΔ / 3', midX, cy + 36);

            // Sağ Taraf: Üçgen (Δ) Bağlantı
            const rightCx = Math.round(midX + (w - midX) * 0.55);
            const pDA = { x: rightCx + Math.cos(angA) * r, y: cy + Math.sin(angA) * r };
            const pDB = { x: rightCx + Math.cos(angB) * r, y: cy + Math.sin(angB) * r };
            const pDC = { x: rightCx + Math.cos(angC) * r, y: cy + Math.sin(angC) * r };

            ctx.strokeStyle = '#ec4899';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(pDA.x, pDA.y); ctx.lineTo(pDB.x, pDB.y);
            ctx.lineTo(pDC.x, pDC.y); ctx.closePath();
            ctx.stroke();

            this.drawNodeDot(ctx, pDA.x, pDA.y, 'A');
            this.drawNodeDot(ctx, pDB.x, pDB.y, 'B');
            this.drawNodeDot(ctx, pDC.x, pDC.y, 'C');

            ctx.fillStyle = '#ec4899';
            ctx.font = '700 12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Üçgen (Δ)', rightCx, cy + r + 24);
            ctx.font = '600 11px "JetBrains Mono", monospace';
            ctx.fillText('ZΔ = ' + d.zDelta.toFixed(1) + ' Ω', rightCx, cy + r + 40);

            ctx.restore();
        },

        draw3PhasePowerTriangle: function(ctx, w, h, d) {
            ctx.save();
            const cx = Math.round(w * 0.35);
            const cy = Math.round(h * 0.68);

            ctx.fillStyle = '#fbbf24';
            ctx.font = '700 14px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('3-Faz Kompleks Güç Üçgeni (P, Q, S)', 24, 28);

            const pKw = d.p3Phase / 1000;
            const qKvar = d.q3Phase / 1000;
            const sKva = d.s3Phase / 1000;

            const scale = 180 / Math.max(1, sKva);
            const pW = pKw * scale;
            const qH = qKvar * scale;

            // P (Yatay Aktif Güç, Yeşil)
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + pW, cy); ctx.stroke();

            // Q (Düşey Reaktif Güç, Amber)
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(cx + pW, cy); ctx.lineTo(cx + pW, cy - qH); ctx.stroke();

            // S (Görünür Güç Hipotenüs, Mor)
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 3.5;
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + pW, cy - qH); ctx.stroke();

            // Açı Yayı (phi)
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, 32, -Math.atan2(qH, pW), 0);
            ctx.stroke();

            ctx.fillStyle = '#38bdf8';
            ctx.font = '600 11px Inter, sans-serif';
            ctx.fillText('φ = ' + this.zPhaseAng + '°', cx + 38, cy - 8);

            // Sağ Telemetri Paneli
            const rightX = Math.round(w * 0.72);
            this.drawBadgeText(ctx, rightX, cy - 65, 'Aktif: P = ' + pKw.toFixed(2) + ' kW', '#10b981');
            this.drawBadgeText(ctx, rightX, cy - 30, 'Reaktif: Q = ' + qKvar.toFixed(2) + ' kVAR', '#f59e0b');
            this.drawBadgeText(ctx, rightX, cy + 5, 'Görünür: S = ' + sKva.toFixed(2) + ' kVA', '#a855f7');
            this.drawBadgeText(ctx, rightX, cy + 40, 'Güç Faktörü: cos φ = ' + Math.cos((this.zPhaseAng * Math.PI) / 180).toFixed(3), '#38bdf8');

            ctx.restore();
        },

        // --- 4. YARDIMCI VEKTÖREL VE KANVAS ÇİZİCİLER ---
        drawPhasorAxes: function(ctx, cx, cy, maxRadius) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx - maxRadius - 10, cy); ctx.lineTo(cx + maxRadius + 10, cy);
            ctx.moveTo(cx, cy - maxRadius - 10); ctx.lineTo(cx, cy + maxRadius + 10);
            ctx.stroke();

            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('+Re', cx + maxRadius + 28, cy + 3);
            ctx.fillText('+jIm', cx + 22, cy - maxRadius - 5);
        },

        drawVectorHead: function(ctx, x0, y0, x1, y1, color) {
            const ang = Math.atan2(y1 - y0, x1 - x0);
            const headLen = 8;
            ctx.save();
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 - headLen * Math.cos(ang - 0.4), y1 - headLen * Math.sin(ang - 0.4));
            ctx.lineTo(x1 - headLen * Math.cos(ang + 0.4), y1 - headLen * Math.sin(ang + 0.4));
            ctx.closePath(); ctx.fill();
            ctx.restore();
        },

        drawAcCurrentDots: function(ctx, waypoints, phase, currentMag, color) {
            if (!waypoints || waypoints.length < 2 || !currentMag || currentMag < 0.001) return;
            ctx.save();
            ctx.fillStyle = color || '#38bdf8';
            const dotSpacing = 28;
            let totalDist = 0;
            const segLens = [];

            for (let i = 0; i < waypoints.length - 1; i++) {
                const dx = waypoints[i + 1].x - waypoints[i].x;
                const dy = waypoints[i + 1].y - waypoints[i].y;
                const d = Math.sqrt(dx * dx + dy * dy);
                segLens.push(d);
                totalDist += d;
            }

            const dir = Math.sin(phase) >= 0 ? 1 : -1;
            const offset = ((phase * 15 * dir) % dotSpacing + dotSpacing) % dotSpacing;

            for (let dAlong = offset; dAlong < totalDist; dAlong += dotSpacing) {
                let traveled = 0;
                for (let i = 0; i < segLens.length; i++) {
                    if (traveled + segLens[i] >= dAlong) {
                        const rem = dAlong - traveled;
                        const t = rem / segLens[i];
                        const px = waypoints[i].x + (waypoints[i + 1].x - waypoints[i].x) * t;
                        const py = waypoints[i].y + (waypoints[i + 1].y - waypoints[i].y) * t;
                        ctx.beginPath();
                        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
                        ctx.fill();
                        break;
                    }
                    traveled += segLens[i];
                }
            }
            ctx.restore();
        },

        draw3PhasePhasors: function(ctx, w, h, d) {
            ctx.save();
            const cx = Math.round(w / 2);
            const cy = Math.round(h / 2);
            const r = Math.min(cx, cy) - 50;
            const rot = this.isRunning ? this.animPhase : 0;

            ctx.fillStyle = '#a855f7';
            ctx.font = '700 14px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('3-Faz Dönen Fazörler: Va (0°), Vb (-120°), Vc (+120°)', 25, 25);

            // 120 Derece Ayrık Fazörler
            this.drawPhasorArrow(ctx, cx, cy, 0, rot, r, '#ef4444', 'Va (Kırmızı Faz)');
            this.drawPhasorArrow(ctx, cx, cy, -120, rot, r, '#eab308', 'Vb (Sarı Faz)');
            this.drawPhasorArrow(ctx, cx, cy, 120, rot, r, '#3b82f6', 'Vc (Mavi Faz)');

            // Dairesel Kılavuz
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();

            // Metrik Rozet
            this.drawBadgeText(ctx, cx, cy + r + 25, 'Vhat = √3 · Vfaz = ' + d.vLine.toFixed(0) + ' V (30° İleri)', '#a855f7');

            ctx.restore();
        },

        drawPhasorArrow: function(ctx, cx, cy, baseDeg, rotRad, length, color, label) {
            const rad = (baseDeg * Math.PI) / 180 + rotRad;
            const ex = cx + Math.cos(rad) * length;
            const ey = cy - Math.sin(rad) * length;

            ctx.save();
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 2.5;

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(ex, ey);
            ctx.stroke();

            const headLen = 9;
            const headAng = 0.4;
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - headLen * Math.cos(rad - headAng), ey + headLen * Math.sin(rad - headAng));
            ctx.lineTo(ex - headLen * Math.cos(rad + headAng), ey + headLen * Math.sin(rad + headAng));
            ctx.closePath();
            ctx.fill();

            ctx.font = '600 11px "JetBrains Mono", monospace';
            ctx.textAlign = (ex > cx) ? 'left' : 'right';
            ctx.fillText(label, ex + ((ex > cx) ? 6 : -6), ey);

            ctx.restore();
        },

        drawAcSource: function(ctx, x, y, phasor, disabled, label) {
            ctx.save();
            ctx.fillStyle = disabled ? 'rgba(100, 116, 139, 0.2)' : 'rgba(168, 85, 247, 0.15)';
            ctx.strokeStyle = disabled ? '#64748b' : '#a855f7';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = disabled ? '#94a3b8' : '#f8fafc';
            ctx.font = '700 13px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (disabled) {
                ctx.fillText('0 V', x, y);
            } else {
                ctx.fillText('~', x, y);
            }

            ctx.fillStyle = disabled ? '#64748b' : '#c084fc';
            ctx.font = '600 11px Inter, sans-serif';
            ctx.fillText(label, x, y - 26);
            ctx.restore();
        },

        drawImpedanceBox: function(ctx, x, y, name, valStr, color = '#38bdf8', isVert = false) {
            ctx.save();
            const w = isVert ? 22 : 46;
            const h = isVert ? 46 : 22;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.fillRect(x - w / 2, y - h / 2, w, h);
            ctx.strokeRect(x - w / 2, y - h / 2, w, h);

            ctx.fillStyle = '#f8fafc';
            ctx.font = '700 10.5px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(name, x, y);

            ctx.fillStyle = color;
            ctx.font = '600 10.5px Inter, sans-serif';
            if (isVert) {
                ctx.textAlign = 'left';
                ctx.fillText(valStr, x + 16, y);
            } else {
                ctx.fillText(valStr, x, y - 18);
            }
            ctx.restore();
        },

        drawVoltmeter: function(ctx, x, y, val) {
            ctx.save();
            ctx.fillStyle = 'rgba(168, 85, 247, 0.15)';
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#c084fc';
            ctx.font = '700 14px Inter, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('V~', x, y);
            ctx.restore();
        },

        drawOhmmeter: function(ctx, x, y, val) {
            ctx.save();
            ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#f59e0b';
            ctx.font = '700 14px Inter, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('Z', x, y);
            ctx.restore();
        },

        drawAmmeter: function(ctx, x, y, val) {
            ctx.save();
            ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#ef4444';
            ctx.font = '700 14px Inter, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('A~', x, y);
            ctx.restore();
        },

        drawNodeDot: function(ctx, x, y, label) {
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
            if (label) {
                ctx.fillStyle = '#94a3b8';
                ctx.font = '600 11px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(label, x, y - 9);
            }
            ctx.restore();
        },

        drawBadgeText: function(ctx, x, y, text, color) {
            ctx.save();
            ctx.font = '600 11px "JetBrains Mono", monospace';
            const m = ctx.measureText(text);
            const padX = 8, padY = 4;
            const bgW = m.width + padX * 2;
            const bgH = 20;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.fillRect(x - bgW / 2, y - bgH / 2, bgW, bgH);
            ctx.strokeRect(x - bgW / 2, y - bgH / 2, bgW, bgH);

            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, x, y);
            ctx.restore();
        }
    };

    window.CircuitAnalysis2Module = CircuitAnalysis2Module;

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => CircuitAnalysis2Module.init());
        } else {
            setTimeout(() => CircuitAnalysis2Module.init(), 100);
        }
    }
})(typeof window !== 'undefined' ? window : this);
