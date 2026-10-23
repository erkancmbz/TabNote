/**
 * EEM REHBER / DEVREM STUDIO - DEVRE ANALİZİ 1 LABORATUVARI (DC SİSTEMLER)
 * 
 * Alt Menüler & Konular:
 * 1. Thevenin Eşdeğeri (Adım 1: Voc/Vth Açık Devre, Adım 2: Rth Kaynakları Sıfırlama, Adım 3: Eşdeğer Devre & Doğrulama)
 * 2. Norton Eşdeğeri (Adım 1: Isc/In Kısa Devre Akımı, Adım 2: Rn İç Direnç, Adım 3: Eşdeğer Devre, Adım 4: Kaynak Dönüşümü)
 * 3. Süperpozisyon Teoremi (Adım 1: Orijinal Devre, Adım 2: Yalnız V1 Aktif, Adım 3: Yalnız V2 Aktif, Adım 4: Vektörel Toplam)
 * 4. Maksimum Güç Transfer Teoremi (RL = Rth Eğrisi, Tepe Noktası & %50 Verim)
 * 5. DC Yıldız-Üçgen (Y-Δ) Dönüşümü & Dengesiz Köprü Ağı (Req Çözücü)
 * 
 * Özellikler:
 * - %100 Temiz HTML/CSS Matematik Tipografisi (Ham LaTeX kodları olmadan, kesirler, alt indisler ve vurgulu rozetler)
 * - SimManager & Donanım Hızlandırma Uyumlu
 */
(function(window) {
    'use strict';

    const CircuitAnalysis1Module = {
        // Devre Parametreleri
        v1: 24,       // Sol Gerilim Kaynağı (V)
        v2: 12,       // Sağ Gerilim Kaynağı (V)
        r1: 8,        // Üst Sol Direnç (Ohm)
        r2: 12,       // Orta Dikey Direnç (Ohm)
        r3: 4,        // Üst Sağ Seri Direnç (Ohm)
        rl: 10,       // Yük Direnci RL (Ohm)

        // Yıldız-Üçgen DC Parametreleri
        ra: 20, rb: 30, rc: 60,
        rab: 110, rbc: 120, rca: 90,
        rb1: 10, rb2: 20, rb3: 30, rb4: 40, rb5: 50, vBridge: 100,

        // Alt Menü Konusu ve Adım Durumu
        topic: 'thevenin', // 'thevenin', 'norton', 'superposition', 'max_power', 'wye_delta'
        step: 'th_step1',  // 'th_step1', 'th_step2', 'th_step3', etc.

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
            const canvas = document.getElementById('circuitAnalysis1Canvas');
            if (canvas && !canvas.__circuit1Bound) {
                canvas.__circuit1Bound = true;
                canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e, canvas));
                canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
            }
            if (window.SimManager) {
                window.SimManager.register('circuit1', {
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
            this[key] = Math.max(0.1, parseFloat(val) || 1);
            const readout = document.getElementById('c1Val_' + key);
            if (readout) {
                if (key.startsWith('v')) readout.textContent = this[key].toFixed(1) + ' V';
                else readout.textContent = this[key].toFixed(1) + ' Ω';
            }
            this.calculate();
            this.updateUI();
            if (!this.isRunning) this.render();
        },

        setTopic: function(top) {
            this.topic = top;
            // Konuya göre varsayılan adımı seç
            if (top === 'thevenin') this.step = 'th_step1';
            else if (top === 'norton') this.step = 'no_step1';
            else if (top === 'superposition') this.step = 'sp_step1';
            else if (top === 'max_power') this.step = 'mp_curve';
            else if (top === 'wye_delta') this.step = 'yd_wye_to_delta';

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
            document.querySelectorAll('.c1-topic-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-topic') === this.topic);
            });

            // İlgili konunun adım barını göster, diğerlerini gizle
            const stepBars = ['c1StepsThevenin', 'c1StepsNorton', 'c1StepsSuperpos', 'c1StepsMaxPower', 'c1StepsWyeDelta'];
            stepBars.forEach(barId => {
                const el = document.getElementById(barId);
                if (el) el.style.display = 'none';
            });

            let activeBarId = 'c1StepsThevenin';
            if (this.topic === 'norton') activeBarId = 'c1StepsNorton';
            else if (this.topic === 'superposition') activeBarId = 'c1StepsSuperpos';
            else if (this.topic === 'max_power') activeBarId = 'c1StepsMaxPower';
            else if (this.topic === 'wye_delta') activeBarId = 'c1StepsWyeDelta';

            const activeBar = document.getElementById(activeBarId);
            if (activeBar) activeBar.style.display = 'flex';

            // Adım butonlarını güncelle
            document.querySelectorAll('.c1-step-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-step') === this.step);
            });

            // Sliders panelini yıldız-üçgen veya normal devreye göre ayarla
            const normalInputs = document.getElementById('c1NormalInputs');
            const wyeDeltaInputs = document.getElementById('c1WyeDeltaInputs');
            if (normalInputs && wyeDeltaInputs) {
                normalInputs.style.display = (this.topic === 'wye_delta') ? 'none' : 'grid';
                wyeDeltaInputs.style.display = (this.topic === 'wye_delta') ? 'block' : 'none';
            }
        },

        setPreset: function(pName) {
            if (pName === 'classic') {
                this.v1 = 24; this.v2 = 12; this.r1 = 8; this.r2 = 12; this.r3 = 4; this.rl = 10;
            } else if (pName === 'matched') {
                this.v1 = 20; this.v2 = 8; this.r1 = 6; this.r2 = 12; this.r3 = 4;
                this.rl = 8.0; // Rth = 4 + (6*12)/18 = 8.0 Ohm
            } else if (pName === 'superpos') {
                this.v1 = 36; this.v2 = 18; this.r1 = 12; this.r2 = 24; this.r3 = 8; this.rl = 16;
            } else if (pName === 'bridge') {
                this.v1 = 30; this.v2 = 0; this.r1 = 10; this.r2 = 15; this.r3 = 5; this.rl = 11;
            }

            ['v1', 'v2', 'r1', 'r2', 'r3', 'rl'].forEach(k => {
                const el = document.getElementById('c1Range_' + k);
                const ro = document.getElementById('c1Val_' + k);
                if (el) el.value = this[k];
                if (ro) {
                    if (k.startsWith('v')) ro.textContent = this[k].toFixed(1) + ' V';
                    else ro.textContent = this[k].toFixed(1) + ' Ω';
                }
            });

            if (typeof document !== 'undefined') {
                document.querySelectorAll('.c1-preset-btn').forEach(btn => {
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
            const btn = document.getElementById('btnCircuit1Play');
            if (!btn) return;
            if (this.isRunning) {
                btn.innerHTML = '<i class="fas fa-pause"></i> <span>Durdur</span>';
                btn.style.background = 'rgba(239, 68, 68, 0.2)';
                btn.style.color = '#f87171';
            } else {
                btn.innerHTML = '<i class="fas fa-play"></i> <span>Akımı Başlat</span>';
                btn.style.background = 'rgba(16, 185, 129, 0.2)';
                btn.style.color = '#34d399';
            }
        },

        startLoop: function() {
            if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
            this.isRunning = true;
            this.updatePlayButton();
            if (window.SimManager) window.SimManager.notifyStarted('circuit1');

            const loop = () => {
                if (this.isRunning) {
                    this.animPhase = (this.animPhase + 0.05) % (Math.PI * 2);
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
            if (window.SimManager) window.SimManager.notifyStopped('circuit1');
        },

        calculate: function() {
            const v1 = this.v1;
            const v2 = this.v2;
            const r1 = this.r1;
            const r2 = this.r2;
            const r3 = this.r3;
            const rl = this.rl;

            // 1. Thevenin Açık Devre Gerilimi (Voc = Vth)
            const vx_oc = v1 * (r2 / (r1 + r2));
            const va_oc = vx_oc;
            const vb_oc = v2;
            const vth = va_oc - vb_oc;

            // 2. Thevenin Eşdeğer Direnci (Rth)
            const r1_parallel_r2 = (r1 * r2) / (r1 + r2);
            const rth = r3 + r1_parallel_r2;

            // 3. Norton Kısa Devre Akımı (Inorton = Isc)
            const inorton = vth / rth;

            // 4. Yük Bağlandığında (Orijinal / Thevenin / Norton)
            const il = vth / (rth + rl);
            const vl = il * rl;
            const pl = Math.abs(il * vl);

            // 5. Maksimum Güç Transfer Teoremi
            const pmax = (vth * vth) / (4 * rth);
            const maxPowerRL = rth;
            const efficiency = (rl / (rth + rl)) * 100;

            // 6. Süperpozisyon Ayrıştırması
            // Yalnız V1 aktif (V2 = 0)
            const vth_v1 = v1 * (r2 / (r1 + r2));
            const il_v1 = vth_v1 / (rth + rl);
            const vl_v1 = il_v1 * rl;

            // Yalnız V2 aktif (V1 = 0)
            const vth_v2 = -v2;
            const il_v2 = vth_v2 / (rth + rl);
            const vl_v2 = il_v2 * rl;

            // Süperpozisyon Toplamı
            const il_sum = il_v1 + il_v2;
            const vl_sum = vl_v1 + vl_v2;

            // 7. Yıldız-Üçgen DC Bağıntıları
            const sumWye = (this.ra * this.rb) + (this.rb * this.rc) + (this.rc * this.ra);
            const dc_rab = sumWye / this.rc;
            const dc_rbc = sumWye / this.ra;
            const dc_rca = sumWye / this.rb;

            const sumDelta = this.rab + this.rbc + this.rca;
            const dc_ra = (this.rab * this.rca) / sumDelta;
            const dc_rb = (this.rab * this.rbc) / sumDelta;
            const dc_rc = (this.rbc * this.rca) / sumDelta;

            // Wheatstone Köprü
            const sumBridgeDelta = this.rb1 + this.rb2 + this.rb5;
            const rA_bridge = (this.rb1 * this.rb2) / sumBridgeDelta;
            const rB_bridge = (this.rb1 * this.rb5) / sumBridgeDelta;
            const rC_bridge = (this.rb2 * this.rb5) / sumBridgeDelta;
            const brL = rB_bridge + this.rb3;
            const brR = rC_bridge + this.rb4;
            const reqBridge = rA_bridge + (brL * brR) / (brL + brR);
            const iBridge = this.vBridge / reqBridge;

            this.lastData = {
                v1, v2, r1, r2, r3, rl,
                vx_oc, va_oc, vb_oc, vth,
                r1_parallel_r2, rth, inorton,
                il, vl, pl, pmax, maxPowerRL, efficiency,
                vth_v1, il_v1, vl_v1, vth_v2, il_v2, vl_v2, il_sum, vl_sum,
                dc_rab, dc_rbc, dc_rca, dc_ra, dc_rb, dc_rc,
                reqBridge, iBridge, sumWye, sumDelta
            };
        },

        updateUI: function() {
            if (typeof document === 'undefined') return;
            const d = this.lastData;
            if (!d) return;

            const elVth = document.getElementById('c1ResVth');
            const elRth = document.getElementById('c1ResRth');
            const elIn = document.getElementById('c1ResIn');
            const elVl = document.getElementById('c1ResVl');
            const elIl = document.getElementById('c1ResIl');
            const elPl = document.getElementById('c1ResPl');
            const elPmax = document.getElementById('c1ResPmax');
            const elDerivation = document.getElementById('c1StepFormulaText');

            if (elVth) elVth.textContent = d.vth.toFixed(2) + ' V';
            if (elRth) elRth.textContent = d.rth.toFixed(2) + ' Ω';
            if (elIn) elIn.textContent = (Math.abs(d.inorton) >= 1.0 ? d.inorton.toFixed(2) + ' A' : (d.inorton * 1000).toFixed(0) + ' mA');
            if (elVl) elVl.textContent = d.vl.toFixed(2) + ' V';
            if (elIl) elIl.textContent = (Math.abs(d.il) >= 1.0 ? d.il.toFixed(2) + ' A' : (d.il * 1000).toFixed(0) + ' mA');
            if (elPl) elPl.textContent = d.pl >= 1.0 ? d.pl.toFixed(2) + ' W' : (d.pl * 1000).toFixed(1) + ' mW';
            if (elPmax) elPmax.textContent = d.pmax.toFixed(2) + ' W (RL = ' + d.maxPowerRL.toFixed(1) + ' Ω)';

            // ZENGİN FORMÜL METNİ (Kesinlikle ham LaTeX kodları içermez, temiz HTML tipografisi)
            if (elDerivation) {
                let html = '';
                const st = this.step;

                // 1. THEVENIN ADIMLARI
                if (st === 'th_step1') {
                    html = `
                        <div class="circuit-math-card">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge"><i class="fas fa-bolt"></i> Thevenin Adım 1</span>
                                Açık Devre Gerilimi (V<sub>oc</sub> = V<sub>th</sub>) Bulma
                            </div>
                            <p style="margin:0 0 6px 0;">Yük direnci <span class="math-var">R<sub>L</sub></span> devreden tamamen sökülür (Açık Devre: R<sub>L</sub> = ∞). Terminaller arasına dijital voltmetre bağlanır:</p>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • R<sub>3</sub> üzerinden akım geçmez (I<sub>R3</sub> = 0), dolayısıyla R<sub>3</sub> üzerinde gerilim düşümü sıfırdır.<br>
                                • Düğüm X Gerilimi (Gerilim Bölücü): 
                                <span class="math-var">V<sub>X</sub></span> = V<sub>1</sub> · <span class="math-frac"><span class="num">R<sub>2</sub></span><span class="den">R<sub>1</sub> + R<sub>2</sub></span></span>
                                = ${d.v1} · <span class="math-frac"><span class="num">${d.r2}</span><span class="den">${d.r1} + ${d.r2}</span></span> 
                                = <strong>${d.vx_oc.toFixed(2)} V</strong><br>
                                • Terminal A gerilimi: V<sub>A</sub> = V<sub>X</sub> = ${d.vx_oc.toFixed(2)} V | Terminal B gerilimi: V<sub>B</sub> = V<sub>2</sub> = ${d.v2} V<br>
                                • <strong>Thevenin Gerilimi:</strong> <span class="math-var">V<sub>th</sub></span> = V<sub>A</sub> - V<sub>B</sub> = ${d.vx_oc.toFixed(2)} - ${d.v2} = <span class="math-res">${d.vth.toFixed(2)} V</span>
                            </div>
                        </div>`;
                } else if (st === 'th_step2') {
                    html = `
                        <div class="circuit-math-card">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge"><i class="fas fa-microchip"></i> Thevenin Adım 2</span>
                                Thevenin Eşdeğer Direnci (R<sub>th</sub>) Bulma (Kaynakları Sıfırlama)
                            </div>
                            <p style="margin:0 0 6px 0;">Bağımsız gerilim kaynakları sıfırlanarak <strong>kısa devre (0 V)</strong> yapılır. Akım kaynakları olsaydı açık devre yapılırdı. A-B uçlarına ohmmetre bağlanarak iç direnç ölçülür:</p>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • Sol koldaki R<sub>1</sub> ve R<sub>2</sub> birbirine paralel hale gelir: 
                                <span class="math-var">R<sub>1</sub> ∥ R<sub>2</sub></span> = <span class="math-frac"><span class="num">R<sub>1</sub> · R<sub>2</sub></span><span class="den">R<sub>1</sub> + R<sub>2</sub></span></span> 
                                = <span class="math-frac"><span class="num">${d.r1} · ${d.r2}</span><span class="den">${d.r1} + ${d.r2}</span></span> = <strong>${d.r1_parallel_r2.toFixed(2)} Ω</strong><br>
                                • Bu paralel grup, R<sub>3</sub> direncine seri bağlanır:<br>
                                • <strong>Thevenin İç Direnci:</strong> <span class="math-var">R<sub>th</sub></span> = R<sub>3</sub> + (R<sub>1</sub> ∥ R<sub>2</sub>) = ${d.r3} + ${d.r1_parallel_r2.toFixed(2)} = <span class="math-res">${d.rth.toFixed(2)} Ω</span>
                            </div>
                        </div>`;
                } else if (st === 'th_step3') {
                    html = `
                        <div class="circuit-math-card">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge"><i class="fas fa-check-circle"></i> Thevenin Adım 3</span>
                                Thevenin Eşdeğer Devresi & Yük Doğrulaması
                            </div>
                            <p style="margin:0 0 6px 0;">Tüm karmaşık devre, tek bir <span class="math-var">V<sub>th</sub></span> gerilim kaynağı ve ona seri <span class="math-var">R<sub>th</sub></span> direncine indirgenmiştir. Yük direnci R<sub>L</sub> bağlanarak yük akımı test edilir:</p>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • Yük Akımı: <span class="math-var">I<sub>L</sub></span> = <span class="math-frac"><span class="num">V<sub>th</sub></span><span class="den">R<sub>th</sub> + R<sub>L</sub></span></span>
                                = <span class="math-frac"><span class="num">${d.vth.toFixed(2)}</span><span class="den">${d.rth.toFixed(2)} + ${d.rl.toFixed(2)}</span></span>
                                = <span class="math-res">${d.il.toFixed(3)} A (${(d.il * 1000).toFixed(0)} mA)</span><br>
                                • Yük Gerilimi: <span class="math-var">V<sub>L</sub></span> = I<sub>L</sub> · R<sub>L</sub> = ${d.il.toFixed(3)} · ${d.rl} = <strong>${d.vl.toFixed(2)} V</strong><br>
                                • Yükte Harcanan Güç: <span class="math-var">P<sub>L</sub></span> = I<sub>L</sub> · V<sub>L</sub> = <strong>${d.pl >= 1 ? d.pl.toFixed(2) + ' W' : (d.pl * 1000).toFixed(1) + ' mW'}</strong><br>
                                <span style="color:#38bdf8;">✓ Orijinal devre ile Thevenin eşdeğeri yük üzerinde <strong>birebir aynı</strong> elektriksel yanıtı verir.</span>
                            </div>
                        </div>`;
                }

                // 2. NORTON ADIMLARI
                else if (st === 'no_step1') {
                    html = `
                        <div class="circuit-math-card">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge" style="background:rgba(16,185,129,0.2);color:#34d399;"><i class="fas fa-arrows-alt-h"></i> Norton Adım 1</span>
                                Kısa Devre Akımı (I<sub>sc</sub> = I<sub>N</sub>) Bulma
                            </div>
                            <p style="margin:0 0 6px 0;">Yük terminalleri A-B arası ideal bir ampermetre ile <strong>kısa devre</strong> yapılır (V<sub>AB</sub> = 0 V). Bu kısa devre telinden akan akım Norton akımıdır:</p>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • Düğüm denklemi veya Thevenin dönüşümü ile:<br>
                                • <strong>Norton Akımı:</strong> <span class="math-var">I<sub>N</sub></span> = <span class="math-frac"><span class="num">V<sub>th</sub></span><span class="den">R<sub>th</sub></span></span>
                                = <span class="math-frac"><span class="num">${d.vth.toFixed(2)} V</span><span class="den">${d.rth.toFixed(2)} Ω</span></span>
                                = <span class="math-res">${d.inorton.toFixed(3)} A (${(d.inorton * 1000).toFixed(0)} mA)</span><br>
                                • A-B uçları kısa devre iken tüm akım ampermetreden akar, R<sub>L</sub> bağlı değildir.
                            </div>
                        </div>`;
                } else if (st === 'no_step2') {
                    html = `
                        <div class="circuit-math-card">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge" style="background:rgba(16,185,129,0.2);color:#34d399;"><i class="fas fa-microchip"></i> Norton Adım 2</span>
                                Norton Eşdeğer Direnci (R<sub>N</sub> = R<sub>th</sub>) Bulma
                            </div>
                            <p style="margin:0 0 6px 0;">Norton iç direnci, Thevenin iç direnci ile <strong>tamamen aynı kural ve yöntemle</strong> hesaplanır:</p>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • Bağımsız gerilim kaynakları kısa devre yapılır (V<sub>1</sub> = 0 V, V<sub>2</sub> = 0 V).<br>
                                • <strong>Norton Direnci:</strong> <span class="math-var">R<sub>N</sub></span> = R<sub>th</sub> = R<sub>3</sub> + (R<sub>1</sub> ∥ R<sub>2</sub>) = <span class="math-res">${d.rth.toFixed(2)} Ω</span>
                            </div>
                        </div>`;
                } else if (st === 'no_step3') {
                    html = `
                        <div class="circuit-math-card">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge" style="background:rgba(16,185,129,0.2);color:#34d399;"><i class="fas fa-check-circle"></i> Norton Adım 3</span>
                                Norton Eşdeğer Devresinin Kurulması & Akım Bölücü
                            </div>
                            <p style="margin:0 0 6px 0;">Norton eşdeğer devresinde akım kaynağı I<sub>N</sub> ile iç direnç R<sub>N</sub> <strong>birbirine paralel</strong> bağlanır. Yük R<sub>L</sub> bağlandığında akım bölünür:</p>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • Akım Bölücü Kuralı: <span class="math-var">I<sub>L</sub></span> = I<sub>N</sub> · <span class="math-frac"><span class="num">R<sub>N</sub></span><span class="den">R<sub>N</sub> + R<sub>L</sub></span></span>
                                = ${d.inorton.toFixed(3)} · <span class="math-frac"><span class="num">${d.rth.toFixed(2)}</span><span class="den">${d.rth.toFixed(2)} + ${d.rl.toFixed(2)}</span></span>
                                = <span class="math-res">${d.il.toFixed(3)} A (${(d.il * 1000).toFixed(0)} mA)</span><br>
                                <span style="color:#34d399;">✓ Norton eşdeğeri üzerinden hesaplanan yük akımı, Thevenin ve orijinal devre ile tam uyumludur!</span>
                            </div>
                        </div>`;
                } else if (st === 'no_step4') {
                    html = `
                        <div class="circuit-math-card">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge" style="background:rgba(16,185,129,0.2);color:#34d399;"><i class="fas fa-exchange-alt"></i> Norton Adım 4</span>
                                Thevenin ↔ Norton Kaynak Dönüşümü Kanıtı
                            </div>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • <strong>Thevenin'den Norton'a:</strong> <span class="math-var">I<sub>N</sub></span> = <span class="math-frac"><span class="num">V<sub>th</sub></span><span class="den">R<sub>th</sub></span></span> = <span class="math-frac"><span class="num">${d.vth.toFixed(2)}</span><span class="den">${d.rth.toFixed(2)}</span></span> = <strong>${d.inorton.toFixed(3)} A</strong>, R<sub>N</sub> = R<sub>th</sub> = <strong>${d.rth.toFixed(2)} Ω</strong><br>
                                • <strong>Norton'dan Thevenin'e:</strong> <span class="math-var">V<sub>th</sub></span> = I<sub>N</sub> · R<sub>N</sub> = ${d.inorton.toFixed(3)} · ${d.rth.toFixed(2)} = <strong>${d.vth.toFixed(2)} V</strong><br>
                                • Her iki model de terminal davranışları açısından birbirine %100 eşdeğerdir.
                            </div>
                        </div>`;
                }

                // 3. SÜPERPOZİSYON ADIMLARI
                else if (st === 'sp_step1') {
                    html = `
                        <div class="circuit-math-card">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge" style="background:rgba(236,72,153,0.2);color:#f472b6;"><i class="fas fa-layer-group"></i> Süperpozisyon Adım 1</span>
                                Orijinal Devre (V<sub>1</sub> ve V<sub>2</sub> Birlikte Aktif)
                            </div>
                            <p style="margin:0 0 6px 0;">Devredeki iki bağımsız gerilim kaynağı (V<sub>1</sub> = ${d.v1} V, V<sub>2</sub> = ${d.v2} V) aynı anda devreyi beslerken yük parametreleri:</p>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • Yük Akımı: <span class="math-var">I<sub>L</sub></span> = <span class="math-res">${d.il.toFixed(3)} A (${(d.il * 1000).toFixed(0)} mA)</span><br>
                                • Yük Gerilimi: <span class="math-var">V<sub>L</sub></span> = <span class="math-res">${d.vl.toFixed(2)} V</span><br>
                                • Süperpozisyon teoremine göre bu sonuç, her iki kaynağın tek başına ürettiği değerlerin toplamına eşit olmalıdır.
                            </div>
                        </div>`;
                } else if (st === 'sp_step2') {
                    html = `
                        <div class="circuit-math-card">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge" style="background:rgba(236,72,153,0.2);color:#f472b6;"><i class="fas fa-layer-group"></i> Süperpozisyon Adım 2</span>
                                Yalnızca V<sub>1</sub> Aktif (V<sub>2</sub> Kısa Devre Yapıldı)
                            </div>
                            <p style="margin:0 0 6px 0;">Sağ taraftaki V<sub>2</sub> kaynağı sıfırlanıp kısa devre teli yapılır. Yalnızca sol taraftaki V<sub>1</sub> = ${d.v1} V aktiftir:</p>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • V<sub>th1</sub> = V<sub>1</sub> · <span class="math-frac"><span class="num">R<sub>2</sub></span><span class="den">R<sub>1</sub> + R<sub>2</sub></span></span> = ${d.v1} · <span class="math-frac"><span class="num">${d.r2}</span><span class="den">${d.r1}+${d.r2}</span></span> = <strong>${d.vth_v1.toFixed(2)} V</strong><br>
                                • 1. Kaynağın Yük Akımı Katkısı: <span class="math-var">I<sub>L1</sub></span> = <span class="math-frac"><span class="num">V<sub>th1</sub></span><span class="den">R<sub>th</sub> + R<sub>L</sub></span></span> 
                                = <span class="math-frac"><span class="num">${d.vth_v1.toFixed(2)}</span><span class="den">${d.rth.toFixed(2)} + ${d.rl}</span></span> 
                                = <span class="math-res">${d.il_v1.toFixed(3)} A (${(d.il_v1 * 1000).toFixed(0)} mA)</span><br>
                                • 1. Kaynağın Yük Gerilimi Katkısı: <span class="math-var">V<sub>L1</sub></span> = I<sub>L1</sub> · R<sub>L</sub> = <strong>${d.vl_v1.toFixed(2)} V</strong>
                            </div>
                        </div>`;
                } else if (st === 'sp_step3') {
                    html = `
                        <div class="circuit-math-card">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge" style="background:rgba(236,72,153,0.2);color:#f472b6;"><i class="fas fa-layer-group"></i> Süperpozisyon Adım 3</span>
                                Yalnızca V<sub>2</sub> Aktif (V<sub>1</sub> Kısa Devre Yapıldı)
                            </div>
                            <p style="margin:0 0 6px 0;">Sol taraftaki V<sub>1</sub> kaynağı sıfırlanıp kısa devre teli yapılır. Yalnızca sağdaki V<sub>2</sub> = ${d.v2} V aktiftir:</p>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • Sol taraf 0 V olunca V<sub>X</sub> = 0 V olur. Dolayısıyla V<sub>th2</sub> = 0 - V<sub>2</sub> = <strong>-${d.v2.toFixed(1)} V</strong> (Ters kutuplu)<br>
                                • 2. Kaynağın Yük Akımı Katkısı: <span class="math-var">I<sub>L2</sub></span> = <span class="math-frac"><span class="num">-V<sub>2</sub></span><span class="den">R<sub>th</sub> + R<sub>L</sub></span></span> 
                                = <span class="math-frac"><span class="num">-${d.v2.toFixed(1)}</span><span class="den">${d.rth.toFixed(2)} + ${d.rl}</span></span> 
                                = <span class="math-res">${d.il_v2.toFixed(3)} A (${(d.il_v2 * 1000).toFixed(0)} mA)</span><br>
                                • 2. Kaynağın Yük Gerilimi Katkısı: <span class="math-var">V<sub>L2</sub></span> = I<sub>L2</sub> · R<sub>L</sub> = <strong>${d.vl_v2.toFixed(2)} V</strong>
                            </div>
                        </div>`;
                } else if (st === 'sp_step4') {
                    html = `
                        <div class="circuit-math-card">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge" style="background:rgba(236,72,153,0.2);color:#f472b6;"><i class="fas fa-check-double"></i> Süperpozisyon Adım 4</span>
                                Süperpozisyon Toplamı & İspat
                            </div>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • <strong>Toplam Yük Akımı:</strong> <span class="math-var">I<sub>L</sub></span> = I<sub>L1</sub> + I<sub>L2</sub> 
                                = ${(d.il_v1 * 1000).toFixed(0)} mA + (${(d.il_v2 * 1000).toFixed(0)} mA) 
                                = <span class="math-res">${(d.il_sum * 1000).toFixed(0)} mA (${d.il_sum.toFixed(3)} A)</span><br>
                                • <strong>Toplam Yük Gerilimi:</strong> <span class="math-var">V<sub>L</sub></span> = V<sub>L1</sub> + V<sub>L2</sub> 
                                = ${d.vl_v1.toFixed(2)} V + (${d.vl_v2.toFixed(2)} V) 
                                = <span class="math-res">${d.vl_sum.toFixed(2)} V</span><br>
                                <span style="color:#34d399;">✓ Bulunan sonuç, 1. Adımdaki orijinal devre ölçümleriyle TAM VE KUSURSUZ olarak örtüşür! Lineer sistem kanıtlanmıştır.</span>
                            </div>
                        </div>`;
                }

                // 4. MAKSİMUM GÜÇ TRANSFERİ
                else if (st === 'mp_curve') {
                    html = `
                        <div class="circuit-math-card">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge" style="background:rgba(245,158,11,0.2);color:#fbbf24;"><i class="fas fa-chart-line"></i> Maksimum Güç Transfer Teoremi</span>
                                R<sub>L</sub> = R<sub>th</sub> Koşulu ve Tepe Güç
                            </div>
                            <p style="margin:0 0 6px 0;">Bir devreden yüke aktarılacak gücün maksimum olması için, yük direnci devrenin Thevenin iç direncine eşit olmalıdır:</p>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • Eşleşme Şartı: <span class="math-var">R<sub>L</sub> = R<sub>th</sub></span> = <strong>${d.rth.toFixed(2)} Ω</strong><br>
                                • Maksimum Güç Değeri: <span class="math-var">P<sub>max</sub></span> = <span class="math-frac"><span class="num">V<sub>th</sub>²</span><span class="den">4 · R<sub>th</sub></span></span>
                                = <span class="math-frac"><span class="num">(${d.vth.toFixed(2)})²</span><span class="den">4 · ${d.rth.toFixed(2)}</span></span>
                                = <span class="math-res">${d.pmax.toFixed(2)} W</span><br>
                                • Maksimum güç anında aktarım verimi tam <span style="color:#38bdf8;font-weight:700;">%50</span>'dir (Gücün yarısı R<sub>th</sub> içinde, yarısı R<sub>L</sub> üzerinde harcanır).<br>
                                • Şu anki yükte (R<sub>L</sub> = ${d.rl} Ω) harcanan güç: <strong>${d.pl >= 1 ? d.pl.toFixed(2) + ' W' : (d.pl * 1000).toFixed(1) + ' mW'}</strong> (Verim: %${d.efficiency.toFixed(1)}).
                            </div>
                        </div>`;
                }

                // 5. YILDIZ-ÜÇGEN DC DÖNÜŞÜMÜ
                else if (st === 'yd_wye_to_delta') {
                    html = `
                        <div class="circuit-math-card">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge" style="background:rgba(59,130,246,0.2);color:#60a5fa;"><i class="fas fa-arrows-alt"></i> Yıldız → Üçgen</span>
                                Y → Δ Adım Adım Formülasyon
                            </div>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • Pay (Yıldız Kolları Çiftler Çarpımı Toplamı):<br>
                                ΣR<sub>Y</sub> = (R<sub>a</sub>·R<sub>b</sub>) + (R<sub>b</sub>·R<sub>c</sub>) + (R<sub>c</sub>·R<sub>a</sub>) 
                                = (${this.ra}·${this.rb}) + (${this.rb}·${this.rc}) + (${this.rc}·${this.ra}) = <strong>${d.sumWye.toFixed(0)} Ω²</strong><br>
                                • <strong>R<sub>ab</sub> (A ve B arası kenar, karşı kol R<sub>c</sub>'ye bölünür):</strong> 
                                R<sub>ab</sub> = <span class="math-frac"><span class="num">ΣR<sub>Y</sub></span><span class="den">R<sub>c</sub></span></span> = <span class="math-frac"><span class="num">${d.sumWye.toFixed(0)}</span><span class="den">${this.rc}</span></span> = <span class="math-res">${d.dc_rab.toFixed(2)} Ω</span><br>
                                • <strong>R<sub>bc</sub> (B ve C arası kenar, karşı kol R<sub>a</sub>'ya bölünür):</strong> 
                                R<sub>bc</sub> = <span class="math-frac"><span class="num">ΣR<sub>Y</sub></span><span class="den">R<sub>a</sub></span></span> = <span class="math-frac"><span class="num">${d.sumWye.toFixed(0)}</span><span class="den">${this.ra}</span></span> = <span class="math-res">${d.dc_rbc.toFixed(2)} Ω</span><br>
                                • <strong>R<sub>ca</sub> (C ve A arası kenar, karşı kol R<sub>b</sub>'ye bölünür):</strong> 
                                R<sub>ca</sub> = <span class="math-frac"><span class="num">ΣR<sub>Y</sub></span><span class="den">R<sub>b</sub></span></span> = <span class="math-frac"><span class="num">${d.sumWye.toFixed(0)}</span><span class="den">${this.rb}</span></span> = <span class="math-res">${d.dc_rca.toFixed(2)} Ω</span>
                            </div>
                        </div>`;
                } else if (st === 'yd_delta_to_wye') {
                    html = `
                        <div class="circuit-math-card">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge" style="background:rgba(59,130,246,0.2);color:#60a5fa;"><i class="fas fa-compress-arrows-alt"></i> Üçgen → Yıldız</span>
                                Δ → Y Adım Adım Formülasyon
                            </div>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • Payda (Üçgen Kenarlarının Çevre Toplamı):<br>
                                ΣR<sub>Δ</sub> = R<sub>ab</sub> + R<sub>bc</sub> + R<sub>ca</sub> = ${this.rab} + ${this.rbc} + ${this.rca} = <strong>${d.sumDelta.toFixed(0)} Ω</strong><br>
                                • <strong>R<sub>a</sub> (Düğüme komşu iki kenarın çarpımı / Toplam):</strong> 
                                R<sub>a</sub> = <span class="math-frac"><span class="num">R<sub>ab</sub> · R<sub>ca</sub></span><span class="den">ΣR<sub>Δ</sub></span></span> 
                                = <span class="math-frac"><span class="num">${this.rab} · ${this.rca}</span><span class="den">${d.sumDelta.toFixed(0)}</span></span> = <span class="math-res">${d.dc_ra.toFixed(2)} Ω</span><br>
                                • <strong>R<sub>b</sub> (B düğümüne komşu kenarlar / Toplam):</strong> 
                                R<sub>b</sub> = <span class="math-frac"><span class="num">R<sub>ab</sub> · R<sub>bc</sub></span><span class="den">ΣR<sub>Δ</sub></span></span> = <span class="math-res">${d.dc_rb.toFixed(2)} Ω</span><br>
                                • <strong>R<sub>c</sub> (C düğümüne komşu kenarlar / Toplam):</strong> 
                                R<sub>c</sub> = <span class="math-frac"><span class="num">R<sub>bc</sub> · R<sub>ca</sub></span><span class="den">ΣR<sub>Δ</sub></span></span> = <span class="math-res">${d.dc_rc.toFixed(2)} Ω</span>
                            </div>
                        </div>`;
                } else if (st === 'yd_bridge') {
                    html = `
                        <div class="circuit-math-card">
                            <div style="font-weight:700;font-size:0.95rem;color:#f8fafc;margin-bottom:8px;display:flex;align-items:center;">
                                <span class="circuit-math-badge" style="background:rgba(59,130,246,0.2);color:#60a5fa;"><i class="fas fa-project-diagram"></i> DC Köprü Ağı Çözümü</span>
                                Dengesiz Wheatstone Köprüsü (R<sub>eq</sub>) Çözümü
                            </div>
                            <p style="margin:0 0 6px 0;">Köprünün orta kolu R<sub>5</sub> yüzünden dirençler ne seri ne de paraleldir. Üstteki R<sub>1</sub>, R<sub>2</sub>, R<sub>5</sub> üçgeni Δ → Y dönüşümü ile yıldıza çevrilir:</p>
                            <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:6px;margin:8px 0;font-family:'JetBrains Mono',monospace;">
                                • Üst üçgen yıldıza çevrilince köprü kolları basit seri-paralel bağlanır.<br>
                                • <strong>Toplam Eşdeğer Direnç:</strong> <span class="math-var">R<sub>eq</sub></span> = <span class="math-res">${d.reqBridge.toFixed(2)} Ω</span><br>
                                • <strong>Toplam Giriş Akımı:</strong> <span class="math-var">I<sub>toplam</sub></span> = <span class="math-frac"><span class="num">V<sub>in</sub></span><span class="den">R<sub>eq</sub></span></span> = <span class="math-frac"><span class="num">${this.vBridge}</span><span class="den">${d.reqBridge.toFixed(2)}</span></span> = <span class="math-res">${d.iBridge.toFixed(2)} A</span>
                            </div>
                        </div>`;
                }

                elDerivation.innerHTML = html;
            }
        },

        render: function() {
            const canvas = document.getElementById('circuitAnalysis1Canvas');
            if (!canvas) return;
            const hi = window.setupHiDpiCanvas ? window.setupHiDpiCanvas(canvas) : null;
            const ctx = hi ? hi.ctx : canvas.getContext('2d');
            const w = hi ? hi.w : canvas.width;
            const h = hi ? hi.h : canvas.height;

            // Arka Plan & Obsidian Izgara
            ctx.fillStyle = '#060a14';
            ctx.fillRect(0, 0, w, h);

            if (window.drawOscilloscopeGrid) {
                window.drawOscilloscopeGrid(ctx, w, h, { gridX: 12, gridY: 6, strokeColor: 'rgba(56, 189, 248, 0.05)' });
            }

            const d = this.lastData;
            if (!d) return;

            // Çizim yönlendirmesi
            if (this.topic === 'max_power') {
                this.drawMaxPowerCurve(ctx, w, h, d);
            } else if (this.topic === 'wye_delta') {
                this.drawWyeDeltaSchematic(ctx, w, h, d);
            } else {
                this.drawCircuitSchematic(ctx, w, h, d);
            }
        },

        drawCircuitSchematic: function(ctx, w, h, d) {
            ctx.save();
            const phase = this.animPhase;
            const st = this.step;

            const x0 = 70;
            const x1 = Math.round(w * 0.32);
            const x2 = Math.round(w * 0.60);
            const x3 = Math.round(w * 0.85);

            const yTop = 60;
            const yMid = Math.round(h * 0.5);
            const yBot = h - 60;

            const isVocStep = (st === 'th_step1');
            const isRthStep = (st === 'th_step2' || st === 'no_step2');
            const isEquivThev = (st === 'th_step3');
            const isNortonSc = (st === 'no_step1');
            const isNortonEq = (st === 'no_step3' || st === 'no_step4');
            const isSpV1Only = (st === 'sp_step2');
            const isSpV2Only = (st === 'sp_step3');

            // --- 1. EŞDEĞER DEVRELER (Thevenin veya Norton) ---
            if (isEquivThev) {
                this.drawTheveninEquivSchematic(ctx, w, h, d, phase);
                ctx.restore();
                return;
            }
            if (isNortonEq) {
                this.drawNortonEquivSchematic(ctx, w, h, d, phase);
                ctx.restore();
                return;
            }

            // --- 2. ORİJİNAL / ADIM ADIM DEVRE ŞEMATİĞİ ---
            // Ana Hat Telleri (Wires)
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;

            // Sol Kaynak ve R1 üst hat
            ctx.beginPath();
            ctx.moveTo(x0, yBot);
            ctx.lineTo(x0, yTop);
            ctx.lineTo(x1, yTop);
            ctx.stroke();

            // Orta Kol (R2)
            ctx.beginPath();
            ctx.moveTo(x1, yTop);
            ctx.lineTo(x1, yBot);
            ctx.stroke();

            // Sağ Hat (R3 ve V2)
            ctx.beginPath();
            ctx.moveTo(x1, yTop);
            ctx.lineTo(x2, yTop);
            ctx.stroke();

            // Alt Toprak / Dönüş Hattı
            ctx.beginPath();
            ctx.moveTo(x0, yBot);
            ctx.lineTo(x2, yBot);
            ctx.stroke();

            // Terminal Hatları (A ve B)
            ctx.beginPath();
            ctx.moveTo(x2, yTop);
            ctx.lineTo(x3, yTop);
            ctx.moveTo(x2, yBot);
            ctx.lineTo(x3, yBot);
            ctx.stroke();

            // Sol Kaynak V1 Çizimi
            const v1Disabled = isRthStep || isSpV2Only;
            this.drawVoltageSource(ctx, x0, yMid, d.v1, v1Disabled, 'V1');

            // Direnç R1 (x0 ile x1 arası)
            this.drawResistorHoriz(ctx, Math.round((x0 + x1) / 2), yTop, 'R1', d.r1 + ' Ω');

            // Direnç R2 (Dikey orta kol)
            this.drawResistorVert(ctx, x1, yMid, 'R2', d.r2 + ' Ω');

            // Direnç R3 (x1 ile x2 arası)
            this.drawResistorHoriz(ctx, Math.round((x1 + x2) / 2), yTop, 'R3', d.r3 + ' Ω');

            // Sağ Kaynak V2 Çizimi (x2, yMid)
            const v2Disabled = isRthStep || isSpV1Only;
            this.drawVoltageSource(ctx, x2, yMid, d.v2, v2Disabled, 'V2');

            // Düğüm Noktaları
            this.drawNodeDot(ctx, x1, yTop, 'X (Vx)');
            this.drawNodeDot(ctx, x2, yTop, 'A');
            this.drawNodeDot(ctx, x2, yBot, 'B');

            // Terminal Durumları: Açık Devre (Voc), Kısa Devre (Isc) veya Yük Direnci (RL)
            if (isVocStep) {
                // Adım 1: Açık Devre (RL sökülmüş), Dijital Voltmetre Bağlı
                this.drawVoltmeter(ctx, x3, yMid, d.vth);
                this.drawBadgeText(ctx, x3, yMid + 45, 'Voc = ' + d.vth.toFixed(2) + ' V', '#38bdf8');
            } else if (isRthStep) {
                // Adım 2: Ohmmetre Bağlı (Kaynaklar Kısa Devre)
                this.drawOhmmeter(ctx, x3, yMid, d.rth);
                this.drawBadgeText(ctx, x3, yMid + 45, 'Rth = ' + d.rth.toFixed(2) + ' Ω', '#f59e0b');
            } else if (isNortonSc) {
                // Norton Adım 1: Kısa Devre (Ampermetre Bağlı)
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(x3, yTop);
                ctx.lineTo(x3, yBot);
                ctx.stroke();
                this.drawAmmeter(ctx, x3, yMid, d.inorton);
                this.drawBadgeText(ctx, x3, yMid + 45, 'Isc = ' + d.inorton.toFixed(2) + ' A', '#ef4444');
            } else {
                // Normal / Süperpozisyon: Yük Direnci RL Bağlı
                ctx.beginPath();
                ctx.moveTo(x3, yTop);
                ctx.lineTo(x3, yBot);
                ctx.stroke();
                this.drawResistorVert(ctx, x3, yMid, 'RL', d.rl + ' Ω', '#e11d48');
            }

            // Canlı Akım Parçacıkları (Animasyon)
            if (this.isRunning && !isVocStep && !isRthStep) {
                const currentMag = isNortonSc ? d.inorton : d.il;
                const flowDir = currentMag >= 0 ? 1 : -1;
                this.drawCurrentDots(ctx, [
                    { x: x1, y: yTop }, { x: x2, y: yTop }, { x: x3, y: yTop },
                    { x: x3, y: yBot }, { x: x2, y: yBot }, { x: x1, y: yBot }
                ], phase * flowDir);
            }

            // Durum Başlığı
            ctx.fillStyle = '#94a3b8';
            ctx.font = '600 13px Inter, sans-serif';
            ctx.textAlign = 'left';
            let statusText = 'Devre Şematiği';
            if (isVocStep) statusText = 'Adım 1: Açık Devre Gerilimi (RL söküldü, Voltmetre bağlı)';
            else if (isRthStep) statusText = 'Adım 2: Eşdeğer Direnç (Kaynaklar sıfırlandı, Ohmmetre bağlı)';
            else if (isNortonSc) statusText = 'Norton Adım 1: Kısa Devre Akımı (Ampermetre bağlı)';
            else if (isSpV1Only) statusText = 'Süperpozisyon: Sadece V1 Aktif (V2 = 0 V)';
            else if (isSpV2Only) statusText = 'Süperpozisyon: Sadece V2 Aktif (V1 = 0 V)';
            ctx.fillText(statusText, 20, 25);

            ctx.restore();
        },

        drawTheveninEquivSchematic: function(ctx, w, h, d, phase) {
            const cx = Math.round(w / 2);
            const cy = Math.round(h / 2);

            const xSource = Math.round(w * 0.22);
            const xRth = Math.round(w * 0.48);
            const xTerm = Math.round(w * 0.76);

            const yTop = cy - 70;
            const yBot = cy + 70;

            // Başlık
            ctx.fillStyle = '#38bdf8';
            ctx.font = '700 14px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('Adım 3: Thevenin Eşdeğer Devresi (Vth Serisi Rth)', 25, 25);

            // Teller
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(xSource, yBot);
            ctx.lineTo(xSource, yTop);
            ctx.lineTo(xTerm, yTop);
            ctx.lineTo(xTerm, yBot);
            ctx.lineTo(xSource, yBot);
            ctx.stroke();

            // Vth Kaynağı
            this.drawVoltageSource(ctx, xSource, cy, d.vth, false, 'Vth (' + d.vth.toFixed(2) + ' V)');

            // Rth Direnci (Üst Hat)
            this.drawResistorHoriz(ctx, xRth, yTop, 'Rth', d.rth.toFixed(2) + ' Ω', '#f59e0b');

            // RL Yük Direnci (Sağ Kol)
            this.drawResistorVert(ctx, xTerm, cy, 'RL', d.rl.toFixed(1) + ' Ω', '#e11d48');

            // Akım Akışı
            if (this.isRunning) {
                this.drawCurrentDots(ctx, [
                    { x: xSource, y: yBot }, { x: xSource, y: yTop },
                    { x: xTerm, y: yTop }, { x: xTerm, y: yBot }, { x: xSource, y: yBot }
                ], phase);
            }

            // Metrik Rozetleri
            this.drawBadgeText(ctx, xTerm + 60, cy - 20, 'IL = ' + (d.il * 1000).toFixed(0) + ' mA', '#10b981');
            this.drawBadgeText(ctx, xTerm + 60, cy + 20, 'VL = ' + d.vl.toFixed(2) + ' V', '#a855f7');
        },

        drawNortonEquivSchematic: function(ctx, w, h, d, phase) {
            const cy = Math.round(h / 2);
            const xSource = Math.round(w * 0.22);
            const xRn = Math.round(w * 0.50);
            const xRl = Math.round(w * 0.78);

            const yTop = cy - 70;
            const yBot = cy + 70;

            ctx.fillStyle = '#10b981';
            ctx.font = '700 14px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('Adım 3 / 4: Norton Eşdeğer Devresi (In Paralel Rn)', 25, 25);

            // Teller
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(xSource, yTop);
            ctx.lineTo(xRl, yTop);
            ctx.moveTo(xSource, yBot);
            ctx.lineTo(xRl, yBot);
            ctx.stroke();

            // In Akım Kaynağı
            this.drawCurrentSource(ctx, xSource, cy, d.inorton, 'In (' + d.inorton.toFixed(2) + ' A)');

            // Rn Direnci (Orta Paralel Kol)
            this.drawResistorVert(ctx, xRn, cy, 'Rn', d.rth.toFixed(2) + ' Ω', '#f59e0b');

            // RL Yük Direnci (Sağ Paralel Kol)
            this.drawResistorVert(ctx, xRl, cy, 'RL', d.rl.toFixed(1) + ' Ω', '#e11d48');

            if (this.isRunning) {
                this.drawCurrentDots(ctx, [
                    { x: xSource, y: yBot }, { x: xSource, y: yTop },
                    { x: xRl, y: yTop }, { x: xRl, y: yBot }, { x: xSource, y: yBot }
                ], phase);
            }

            this.drawBadgeText(ctx, xRl + 50, cy, 'IL = ' + (d.il * 1000).toFixed(0) + ' mA', '#10b981');
        },

        drawMaxPowerCurve: function(ctx, w, h, d) {
            ctx.save();
            const padL = 70, padR = 40, padT = 50, padB = 50;
            const plotW = w - padL - padR;
            const plotH = h - padT - padB;

            ctx.fillStyle = '#fbbf24';
            ctx.font = '700 14px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('Maksimum Güç Transfer Teoremi: PL - RL Karakteristik Eğrisi', 25, 25);

            // Eksenler
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(padL, padT);
            ctx.lineTo(padL, h - padB);
            ctx.lineTo(w - padR, h - padB);
            ctx.stroke();

            // Eğri Çizimi
            const maxRL = Math.max(40, d.rth * 3.5);
            const peakP = d.pmax;
            const yMax = peakP * 1.25 || 1.0;

            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3;
            ctx.beginPath();

            for (let i = 0; i <= plotW; i++) {
                const curRL = (i / plotW) * maxRL;
                const curIL = d.vth / (d.rth + curRL);
                const curPL = curIL * curIL * curRL;

                const px = padL + i;
                const py = (h - padB) - (curPL / yMax) * plotH;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Tepe Noktası (RL = Rth)
            const peakX = padL + (d.rth / maxRL) * plotW;
            const peakY = (h - padB) - (peakP / yMax) * plotH;

            // Kesikli Kılavuz Çizgileri
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(peakX, h - padB);
            ctx.lineTo(peakX, peakY);
            ctx.lineTo(padL, peakY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Tepe Noktası Rozeti
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(peakX, peakY, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#f8fafc';
            ctx.font = '700 12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Pmax = ' + peakP.toFixed(2) + ' W (RL = ' + d.rth.toFixed(1) + ' Ω)', peakX, peakY - 14);

            // Mevcut RL Konumu
            const curX = padL + (d.rl / maxRL) * plotW;
            const curY = (h - padB) - (d.pl / yMax) * plotH;
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(curX, curY, 6, 0, Math.PI * 2);
            const curPlText = d.pl >= 1 ? d.pl.toFixed(2) + ' W' : (d.pl * 1000).toFixed(0) + ' mW';
            ctx.fillText('Şu Anki RL: ' + d.rl.toFixed(1) + ' Ω (' + curPlText + ')', curX, curY + 20);

            // Eksen Etiketleri
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Yük Direnci RL (Ohm)', padL + plotW / 2, h - 15);
            ctx.save();
            ctx.translate(20, padT + plotH / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText('Yük Gücü PL (Watt)', 0, 0);
            ctx.restore();

            ctx.restore();
        },

        drawWyeDeltaSchematic: function(ctx, w, h, d) {
            ctx.save();
            const cx = Math.round(w / 2);
            const cy = Math.round(h / 2);

            ctx.fillStyle = '#60a5fa';
            ctx.font = '700 14px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('DC Yıldız-Üçgen (Y - Δ) Dönüşüm Şematiği', 25, 25);

            // Sol Panel: Yıldız (Y)
            const xWye = Math.round(w * 0.28);
            const rRadius = 75;
            const pA = { x: xWye, y: cy - rRadius };
            const pB = { x: xWye - rRadius * 0.866, y: cy + rRadius * 0.5 };
            const pC = { x: xWye + rRadius * 0.866, y: cy + rRadius * 0.5 };
            const pN = { x: xWye, y: cy };

            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            // Yıldız Kolları
            ctx.beginPath();
            ctx.moveTo(pN.x, pN.y); ctx.lineTo(pA.x, pA.y);
            ctx.moveTo(pN.x, pN.y); ctx.lineTo(pB.x, pB.y);
            ctx.moveTo(pN.x, pN.y); ctx.lineTo(pC.x, pC.y);
            ctx.stroke();

            this.drawNodeDot(ctx, pA.x, pA.y, 'A');
            this.drawNodeDot(ctx, pB.x, pB.y, 'B');
            this.drawNodeDot(ctx, pC.x, pC.y, 'C');
            this.drawNodeDot(ctx, pN.x, pN.y, 'N (Nötr)');

            this.drawBadgeText(ctx, (pN.x + pA.x) / 2 + 25, (pN.y + pA.y) / 2, 'Ra = ' + this.ra + ' Ω', '#38bdf8');
            this.drawBadgeText(ctx, (pN.x + pB.x) / 2 - 25, (pN.y + pB.y) / 2 + 10, 'Rb = ' + this.rb + ' Ω', '#10b981');
            this.drawBadgeText(ctx, (pN.x + pC.x) / 2 + 25, (pN.y + pC.y) / 2 + 10, 'Rc = ' + this.rc + ' Ω', '#f59e0b');

            // Dönüşüm Oku
            ctx.fillStyle = '#f8fafc';
            ctx.font = '700 22px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⟷', cx, cy);

            // Sağ Panel: Üçgen (Δ)
            const xDelta = Math.round(w * 0.72);
            const dA = { x: xDelta, y: cy - rRadius };
            const dB = { x: xDelta - rRadius * 0.866, y: cy + rRadius * 0.5 };
            const dC = { x: xDelta + rRadius * 0.866, y: cy + rRadius * 0.5 };

            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(dA.x, dA.y); ctx.lineTo(dB.x, dB.y);
            ctx.lineTo(dC.x, dC.y); ctx.closePath();
            ctx.stroke();

            this.drawNodeDot(ctx, dA.x, dA.y, 'A');
            this.drawNodeDot(ctx, dB.x, dB.y, 'B');
            this.drawNodeDot(ctx, dC.x, dC.y, 'C');

            this.drawBadgeText(ctx, (dA.x + dB.x) / 2 - 35, (dA.y + dB.y) / 2, 'Rab = ' + d.dc_rab.toFixed(1) + ' Ω', '#a855f7');
            this.drawBadgeText(ctx, (dB.x + dC.x) / 2, dB.y + 20, 'Rbc = ' + d.dc_rbc.toFixed(1) + ' Ω', '#ec4899');
            this.drawBadgeText(ctx, (dC.x + dA.x) / 2 + 35, (dC.y + dA.y) / 2, 'Rca = ' + d.dc_rca.toFixed(1) + ' Ω', '#f43f5e');

            ctx.restore();
        },

        // --- YARDIMCI BİLEŞEN ÇİZİCİLER ---
        drawVoltageSource: function(ctx, x, y, val, disabled, label) {
            ctx.save();
            ctx.fillStyle = disabled ? 'rgba(100, 116, 139, 0.2)' : 'rgba(56, 189, 248, 0.15)';
            ctx.strokeStyle = disabled ? '#64748b' : '#38bdf8';
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
                ctx.fillText('+', x, y - 6);
                ctx.fillText('-', x, y + 8);
            }

            ctx.fillStyle = disabled ? '#64748b' : '#38bdf8';
            ctx.font = '600 11px Inter, sans-serif';
            ctx.fillText(label, x, y - 28);
            ctx.restore();
        },

        drawCurrentSource: function(ctx, x, y, val, label) {
            ctx.save();
            ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // İçerideki Akım Oku
            ctx.strokeStyle = '#10b981';
            ctx.beginPath();
            ctx.moveTo(x, y + 10);
            ctx.lineTo(x, y - 10);
            ctx.lineTo(x - 5, y - 5);
            ctx.moveTo(x, y - 10);
            ctx.lineTo(x + 5, y - 5);
            ctx.stroke();

            ctx.fillStyle = '#10b981';
            ctx.font = '600 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(label, x, y - 28);
            ctx.restore();
        },

        drawResistorHoriz: function(ctx, x, y, name, valStr, color = '#f59e0b') {
            ctx.save();
            const w = 44, h = 18;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.fillRect(x - w / 2, y - h / 2, w, h);
            ctx.strokeRect(x - w / 2, y - h / 2, w, h);

            ctx.fillStyle = '#f8fafc';
            ctx.font = '700 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(name, x, y);

            ctx.fillStyle = color;
            ctx.font = '600 11px Inter, sans-serif';
            ctx.fillText(valStr, x, y - 16);
            ctx.restore();
        },

        drawResistorVert: function(ctx, x, y, name, valStr, color = '#10b981') {
            ctx.save();
            const w = 18, h = 44;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.fillRect(x - w / 2, y - h / 2, w, h);
            ctx.strokeRect(x - w / 2, y - h / 2, w, h);

            ctx.fillStyle = '#f8fafc';
            ctx.font = '700 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(name, x, y);

            ctx.fillStyle = color;
            ctx.font = '600 11px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(valStr, x + 14, y);
            ctx.restore();
        },

        drawVoltmeter: function(ctx, x, y, val) {
            ctx.save();
            ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#38bdf8';
            ctx.font = '700 14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('V', x, y);
            ctx.restore();
        },

        drawOhmmeter: function(ctx, x, y, val) {
            ctx.save();
            ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#f59e0b';
            ctx.font = '700 14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Ω', x, y);
            ctx.restore();
        },

        drawAmmeter: function(ctx, x, y, val) {
            ctx.save();
            ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ef4444';
            ctx.font = '700 14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('A', x, y);
            ctx.restore();
        },

        drawNodeDot: function(ctx, x, y, label) {
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();

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
        },

        drawCurrentDots: function(ctx, waypoints, phase) {
            ctx.save();
            ctx.fillStyle = '#38bdf8';
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

            const offset = (phase * 15) % dotSpacing;
            for (let dAlong = offset; dAlong < totalDist; dAlong += dotSpacing) {
                let traveled = 0;
                for (let i = 0; i < segLens.length; i++) {
                    if (traveled + segLens[i] >= dAlong) {
                        const rem = dAlong - traveled;
                        const t = rem / segLens[i];
                        const px = waypoints[i].x + (waypoints[i + 1].x - waypoints[i].x) * t;
                        const py = waypoints[i].y + (waypoints[i + 1].y - waypoints[i].y) * t;
                        ctx.beginPath();
                        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
                        ctx.fill();
                        break;
                    }
                    traveled += segLens[i];
                }
            }
            ctx.restore();
        }
    };

    window.CircuitAnalysis1Module = CircuitAnalysis1Module;

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => CircuitAnalysis1Module.init());
        } else {
            setTimeout(() => CircuitAnalysis1Module.init(), 100);
        }
    }
})(typeof window !== 'undefined' ? window : this);
