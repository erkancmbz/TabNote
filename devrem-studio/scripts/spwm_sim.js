/**
 * EEM REHBER / DEVREM STUDIO - İNVERTÖR SİNÜZOİDAL PWM (SPWM) SİMÜLATÖRÜ
 * 
 * Güç Elektroniği: DC/AC Dönüştürücü, H-Köprüsü, Bipolar/Unipolar SPWM,
 * LC Alçak Geçiren Filtre & Canlı THD (%) Harmonik Analizörü (IEEE 519 Uyumlu)
 */
(function(window) {
    'use strict';

    const SpwmModule = {
        // Parametreler
        vdc: 320,        // Giriş DC Bara Gerilimi (V)
        fMod: 50,        // Modülasyon / Çıkış Frekansı (Hz)
        fCar: 2000,      // Taşıyıcı Üçgen Frekansı (Hz)
        ma: 0.85,        // Modülasyon İndeksi (Vref / Vtri)
        pwmType: 'unipolar', // 'unipolar' veya 'bipolar'
        inductance: 2.5, // Filtre Bobini (mH)
        capacitance: 10, // Filtre Kondansatörü (uF)
        loadR: 10,       // Yük Direnci (Ohm)

        // Simülasyon Durumu
        isRunning: false,
        animFrameId: null,
        timePhase: 0,
        scopeChannel: 'all', // 'all', 'carrier', 'pwm', 'filtered'
        hoverInfo: null,

        init: function() {
            this.bindEvents();
            this.calculate();
            this.render();
            this.updatePlayButton();
        },

        bindEvents: function() {
            if (typeof document === 'undefined') return;

            const canvas = document.getElementById('spwmScopeCanvas');
            if (canvas) {
                canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e, canvas));
                canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
            }
        },

        handleMouseMove: function(e, canvas) {
            const coords = window.getCanvasLogicalCoords ? window.getCanvasLogicalCoords(e, canvas) : { x: e.clientX, y: e.clientY };
            this.hoverInfo = coords;
        },

        handleMouseLeave: function() {
            this.hoverInfo = null;
        },

        setParam: function(key, val) {
            this[key] = parseFloat(val);
            const readout = document.getElementById('spwmVal_' + key);
            if (readout) {
                if (key === 'ma') readout.textContent = this.ma.toFixed(2);
                else if (key === 'fCar') readout.textContent = (this.fCar >= 1000 ? (this.fCar / 1000).toFixed(1) + ' kHz' : this.fCar + ' Hz');
                else if (key === 'fMod') readout.textContent = this.fMod + ' Hz';
                else if (key === 'vdc') readout.textContent = this.vdc + ' V';
                else if (key === 'inductance') readout.textContent = this.inductance.toFixed(1) + ' mH';
                else if (key === 'capacitance') readout.textContent = this.capacitance.toFixed(1) + ' µF';
            }
            this.calculate();
            if (!this.isRunning) this.render();
        },

        setPwmType: function(type) {
            this.pwmType = type;
            const btnUni = document.getElementById('btnSpwmUnipolar');
            const btnBi = document.getElementById('btnSpwmBipolar');
            if (btnUni && btnBi) {
                btnUni.classList.toggle('active', type === 'unipolar');
                btnBi.classList.toggle('active', type === 'bipolar');
            }
            this.calculate();
            if (!this.isRunning) this.render();
        },

        setChannel: function(ch) {
            this.scopeChannel = ch;
            document.querySelectorAll('.spwm-ch-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-ch') === ch);
            });
            if (!this.isRunning) this.render();
        },

        updatePlayButton: function() {
            const btn = document.getElementById('btnSpwmPlay');
            if (btn) {
                btn.innerHTML = this.isRunning ? '<i class="fas fa-pause"></i> <span>Durdur</span>' : '<i class="fas fa-play"></i> <span>Simülasyonu Başlat</span>';
                btn.classList.toggle('is-running', this.isRunning);
            }
        },

        togglePlay: function() {
            this.isRunning = !this.isRunning;
            this.updatePlayButton();
            if (this.isRunning) {
                this.startLoop();
            } else {
                if (this.animFrameId) {
                    cancelAnimationFrame(this.animFrameId);
                    this.animFrameId = null;
                }
                if (window.SimManager) window.SimManager.notifyStopped('spwm');
                this.render();
            }
        },

        stop: function() {
            if (this.isRunning || this.animFrameId) {
                this.isRunning = false;
                if (this.animFrameId) {
                    cancelAnimationFrame(this.animFrameId);
                    this.animFrameId = null;
                }
                this.updatePlayButton();
                this.render();
            }
            if (window.SimManager) window.SimManager.notifyStopped('spwm');
        },

        startLoop: function() {
            if (window.SimManager) window.SimManager.notifyStarted('spwm');
            if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
            const loop = () => {
                if (this.isRunning) {
                    this.timePhase += 0.04;
                }
                this.render();
                if (this.isRunning) {
                    this.animFrameId = requestAnimationFrame(loop);
                }
            };
            this.animFrameId = requestAnimationFrame(loop);
        },

        calculate: function() {
            const mf = this.fCar / this.fMod;
            const v1_peak = this.ma <= 1.0 ? this.ma * this.vdc : this.vdc * (1.0 + 0.15 * Math.log(this.ma));
            const v1_rms = v1_peak / Math.SQRT2;

            // LC Filtre Kesim Frekansı: fc = 1 / (2 * pi * sqrt(L * C))
            const L_h = this.inductance * 1e-3;
            const C_f = this.capacitance * 1e-6;
            const fFilterCutoff = 1 / (2 * Math.PI * Math.sqrt(L_h * C_f));

            // THD (%) Hesaplama (Unipolar vs Bipolar & Filtreleme Etkisi)
            // Filtresiz PWM geriliminde ilk ana harmonikler mf veya 2mf etrafında toplanır
            let rawThd = this.pwmType === 'unipolar' ? (105 / (this.ma || 0.1)) : (145 / (this.ma || 0.1));
            rawThd = Math.min(220, Math.max(40, rawThd));

            // LC Filtrenin taşıyıcı frekansındaki zayıflatması: H(f) = 1 / |1 - (f/fc)^2|
            const attenRatio = Math.pow(this.fCar / fFilterCutoff, 2);
            let filteredThd = rawThd / (attenRatio > 1 ? attenRatio : 1);
            if (filteredThd < 0.8) filteredThd = 0.8;

            const isIEEE519Pass = filteredThd <= 5.0;

            // UI Güncellemeleri
            const elV1 = document.getElementById('spwmResV1');
            const elMf = document.getElementById('spwmResMf');
            const elFc = document.getElementById('spwmResFc');
            const elThd = document.getElementById('spwmResThd');
            const elStatus = document.getElementById('spwmResStatus');

            if (elV1) elV1.textContent = v1_rms.toFixed(1) + ' V rms';
            if (elMf) elMf.textContent = mf.toFixed(0) + ' (' + (mf % 2 === 0 ? 'Çift' : 'Tek') + ')';
            if (elFc) elFc.textContent = (fFilterCutoff >= 1000 ? (fFilterCutoff / 1000).toFixed(2) + ' kHz' : fFilterCutoff.toFixed(0) + ' Hz');
            if (elThd) {
                elThd.textContent = filteredThd.toFixed(2) + ' %';
                elThd.style.color = isIEEE519Pass ? '#10b981' : '#f59e0b';
            }
            if (elStatus) {
                elStatus.innerHTML = isIEEE519Pass
                    ? '<span class="status-pass"><i class="fas fa-check-circle"></i> IEEE 519 Uyumlu (THD ≤ %5)</span>'
                    : '<span class="status-warn"><i class="fas fa-exclamation-triangle"></i> Yüksek Harmonik (Filtre Artırılmalı)</span>';
            }

            if (window.GamificationModule && isIEEE519Pass) {
                GamificationModule.unlockBadge('spwm_expert');
            }
        },

        render: function() {
            const canvas = document.getElementById('spwmScopeCanvas');
            if (!canvas) return;
            const hi = window.setupHiDpiCanvas ? window.setupHiDpiCanvas(canvas) : null;
            const ctx = hi ? hi.ctx : canvas.getContext('2d');
            const w = hi ? hi.w : canvas.width;
            const h = hi ? hi.h : canvas.height;

            // Arka Plan & Osiloskop Şebekesi
            ctx.fillStyle = '#060a14';
            ctx.fillRect(0, 0, w, h);

            // Laboratuvar Izgarası
            if (window.drawOscilloscopeGrid) {
                window.drawOscilloscopeGrid(ctx, w, h, { gridX: 12, gridY: 8, strokeColor: 'rgba(56, 189, 248, 0.08)' });
            } else {
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
                ctx.lineWidth = 1;
                const gridX = 12;
                const gridY = 8;
                for (let i = 1; i < gridX; i++) {
                    ctx.beginPath();
                    ctx.moveTo(i * (w / gridX), 0); ctx.lineTo(i * (w / gridX), h);
                    ctx.stroke();
                }
                for (let j = 1; j < gridY; j++) {
                    ctx.beginPath();
                    ctx.moveTo(0, j * (h / gridY)); ctx.lineTo(w, j * (h / gridY));
                    ctx.stroke();
                }
            }

            // Merkez Eksenleri
            const midY1 = h * 0.28; // Üst Grafik (Modülasyon & Taşıyıcı)
            const midY2 = h * 0.65; // Alt Grafik (PWM Darbeleri & Filtrelenmiş Sinüs)

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(0, midY1); ctx.lineTo(w, midY1);
            ctx.moveTo(0, midY2); ctx.lineTo(w, midY2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Simülasyon Verisi Hazırla
            const numPoints = Math.round(w);
            const carrierCycles = Math.min(24, Math.round(this.fCar / this.fMod));

            const sineAmp = (h * 0.19) * Math.min(1.2, this.ma);
            const triAmp = h * 0.19;

            // 1. ÜÇGEN TAŞIYICI DALGA (Carrier)
            if (this.scopeChannel === 'all' || this.scopeChannel === 'carrier') {
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                for (let x = 0; x < w; x++) {
                    const phi = (x / w) * carrierCycles * 2 * Math.PI + (this.timePhase * 2);
                    const triVal = (2 / Math.PI) * Math.asin(Math.sin(phi));
                    const y = midY1 - triVal * triAmp;
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();

                // 2. REFERANS SİNÜS DALGASI (Reference - Parlak Camgöbeği)
                ctx.save();
                ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';
                ctx.shadowBlur = 4;
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2.4;
                ctx.beginPath();
                for (let x = 0; x < w; x++) {
                    const theta = (x / w) * 2 * Math.PI + this.timePhase;
                    const sinVal = Math.sin(theta);
                    const y = midY1 - sinVal * sineAmp;
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
                ctx.restore();

                // Unipolar modda ters referans sinüsü (-vref)
                if (this.pwmType === 'unipolar') {
                    ctx.strokeStyle = 'rgba(236, 72, 153, 0.75)';
                    ctx.setLineDash([3, 3]);
                    ctx.lineWidth = 1.6;
                    ctx.beginPath();
                    for (let x = 0; x < w; x++) {
                        const theta = (x / w) * 2 * Math.PI + this.timePhase;
                        const sinVal = -Math.sin(theta);
                        const y = midY1 - sinVal * sineAmp;
                        if (x === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }

            // 3. H-KÖPRÜSÜ ÇIKIŞ PWM DARBELERİ (V_AB - Parlak Amber)
            const pwmAmp = h * 0.22;
            if (this.scopeChannel === 'all' || this.scopeChannel === 'pwm') {
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                for (let x = 0; x < w; x++) {
                    const theta = (x / w) * 2 * Math.PI + this.timePhase;
                    const phi = (x / w) * carrierCycles * 2 * Math.PI + (this.timePhase * 2);

                    const sinA = Math.sin(theta) * this.ma;
                    const sinB = -Math.sin(theta) * this.ma;
                    const tri = (2 / Math.PI) * Math.asin(Math.sin(phi));

                    let vPwm = 0;
                    if (this.pwmType === 'unipolar') {
                        const s1 = sinA > tri ? 1 : 0;
                        const s2 = sinB > tri ? 1 : 0;
                        vPwm = s1 - s2; // +1, 0, -1
                    } else {
                        // Bipolar
                        vPwm = sinA > tri ? 1 : -1;
                    }

                    const y = midY2 - vPwm * pwmAmp;
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }

            // 4. LC FİLTRELENMİŞ SAF SİNÜS ÇIKIŞI (V_Load - Zümrüt Yeşili)
            if (this.scopeChannel === 'all' || this.scopeChannel === 'filtered') {
                ctx.save();
                ctx.shadowColor = 'rgba(16, 185, 129, 0.4)';
                ctx.shadowBlur = 6;
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 2.8;
                ctx.beginPath();
                for (let x = 0; x < w; x++) {
                    const theta = (x / w) * 2 * Math.PI + this.timePhase;
                    const rippleFreq = carrierCycles * (this.pwmType === 'unipolar' ? 2 : 1);
                    const rippleAmp = pwmAmp * 0.05;
                    const cleanSin = Math.sin(theta) * pwmAmp * Math.min(1.0, this.ma);
                    const ripple = Math.sin(theta * rippleFreq) * rippleAmp;

                    const y = midY2 - (cleanSin + ripple);
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
                ctx.restore();
            }

            // Gösterge Etiketleri & Kanvas Metinleri (Inter & JetBrains Mono)
            ctx.font = '600 11.5px "Inter", sans-serif';
            ctx.fillStyle = '#38bdf8';
            ctx.fillText('KANAL 1: Modülasyon (Mavi: V_ref, Gri: V_tri' + (this.pwmType === 'unipolar' ? ', Pembe: -V_ref' : '') + ')', 14, 20);
            
            ctx.fillStyle = '#10b981';
            ctx.fillText('KANAL 2: H-Köprüsü PWM (Sarı) & LC Çıkışı (Yeşil)', 14, midY1 + 22);

            // Hover İmleç İnceleme
            if (this.hoverInfo) {
                const hx = Math.max(0, Math.min(w - 1, this.hoverInfo.x));
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 3]);
                ctx.beginPath();
                ctx.moveTo(hx, 0); ctx.lineTo(hx, h);
                ctx.stroke();
                ctx.setLineDash([]);

                const curTheta = (hx / w) * 2 * Math.PI + this.timePhase;
                const curV = (Math.sin(curTheta) * this.vdc * this.ma).toFixed(1);
                const curTimeMs = ((hx / w) * (1000 / this.fMod)).toFixed(2);

                const tooltipLines = [
                    { text: 'SPWM TELEMETRİ', bold: true, color: '#38bdf8' },
                    'Zaman t: ' + curTimeMs + ' ms',
                    'Anlık V_ref: ' + curV + ' V',
                    'V_dc Bara: ' + this.vdc + ' V',
                    'Modülasyon ma: ' + this.ma.toFixed(2)
                ];
                if (typeof window.renderCanvasHoverTooltip === 'function') {
                    window.renderCanvasHoverTooltip(ctx, w, h, hx, this.hoverInfo.y, tooltipLines, '#38bdf8');
                } else if (typeof renderCanvasHoverTooltip === 'function') {
                    renderCanvasHoverTooltip(ctx, w, h, hx, this.hoverInfo.y, tooltipLines, '#38bdf8');
                }
            }
        }
    };

    window.SpwmModule = SpwmModule;
    if (window.SimManager) {
        window.SimManager.register('spwm', {
            stop: () => SpwmModule.stop(),
            isRunning: () => SpwmModule.isRunning
        });
    }
})(window);
