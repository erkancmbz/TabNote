/**
 * EEM REHBER / DEVREM STUDIO - ELEKTROMANYETİK DALGA & POLARİZASYON SİMÜLATÖRÜ
 * 
 * Elektromanyetik Alan & Dalga Teorisi:
 * - 3B/2B Düzlemsel Dalga Yayılımı (E ve B Alanları)
 * - Doğrusal, Dairesel (RHCP/LHCP) ve Eliptik Polarizasyon Sentezi
 * - İletim Hatları, Yansıma Katsayısı (Γ) ve Duran Dalga Oranı (VSWR)
 */
(function (window) {
    'use strict';

    const EmWavesModule = {
        mode: 'polarization', // 'polarization' veya 'vswr'

        // Polarizasyon Parametreleri
        e0x: 1.0,            // Ex Genliği
        e0y: 1.0,            // Ey Genliği
        deltaDeg: 90,        // Faz Farkı (Derece)
        polPreset: 'rhcp',   // 'linear', 'rhcp', 'lhcp', 'elliptical'

        // VSWR / İletim Hattı Parametreleri
        z0: 50,              // Hat Karakteristik Empedansı (Ohm)
        zlReal: 100,         // Yük Reel Bileşeni (Ohm)
        zlImag: 0,           // Yük İmajiner Bileşeni (Ohm)
        loadPreset: 'mismatched', // 'matched', 'short', 'open', 'mismatched', 'reactive'

        // Animasyon ve Görselleştirme
        isRunning: false,
        animFrameId: null,
        timePhase: 0,
        viewAngle: 35,       // 3B Eğim Açısı
        hoverInfo: null,

        init: function () {
            this.bindEvents();
            this.calculate();
            this.render();
            this.updatePlayButton();
        },

        bindEvents: function () {
            if (typeof document === 'undefined') return;

            const canvas = document.getElementById('emWavesCanvas');
            if (canvas) {
                canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e, canvas));
                canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
            }
        },

        handleMouseMove: function (e, canvas) {
            const coords = window.getCanvasLogicalCoords ? window.getCanvasLogicalCoords(e, canvas) : { x: e.clientX, y: e.clientY };
            this.hoverInfo = coords;
            if (!this.isRunning) this.render();
        },

        handleMouseLeave: function () {
            this.hoverInfo = null;
            if (!this.isRunning) this.render();
        },

        setMode: function (m) {
            this.mode = m;
            const btnPol = document.getElementById('btnEmModePol');
            const btnVswr = document.getElementById('btnEmModeVswr');
            const polBox = document.getElementById('emPolControls');
            const vswrBox = document.getElementById('emVswrControls');

            if (btnPol && btnVswr) {
                btnPol.classList.toggle('active', m === 'polarization');
                btnVswr.classList.toggle('active', m === 'vswr');
            }
            if (polBox && vswrBox) {
                polBox.style.display = m === 'polarization' ? 'block' : 'none';
                vswrBox.style.display = m === 'vswr' ? 'block' : 'none';
            }
            this.calculate();
            if (!this.isRunning) this.render();
        },

        setPolarizationPreset: function (type) {
            this.polPreset = type;
            if (type === 'linear') {
                this.e0x = 1.0; this.e0y = 1.0; this.deltaDeg = 0;
            } else if (type === 'rhcp') {
                this.e0x = 1.0; this.e0y = 1.0; this.deltaDeg = 90;
            } else if (type === 'lhcp') {
                this.e0x = 1.0; this.e0y = 1.0; this.deltaDeg = -90;
            } else if (type === 'elliptical') {
                this.e0x = 1.2; this.e0y = 0.6; this.deltaDeg = 45;
            }

            this.updatePolControlsUI();
            this.calculate();
            if (!this.isRunning) this.render();
        },

        updatePolControlsUI: function () {
            const elDelta = document.getElementById('emDeltaRange');
            const elDeltaVal = document.getElementById('emVal_delta');
            const elE0x = document.getElementById('emE0xRange');
            const elE0y = document.getElementById('emE0yRange');

            if (elDelta) elDelta.value = this.deltaDeg;
            if (elDeltaVal) elDeltaVal.textContent = this.deltaDeg + '°';
            if (elE0x) elE0x.value = this.e0x;
            if (elE0y) elE0y.value = this.e0y;

            document.querySelectorAll('.em-preset-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-preset') === this.polPreset);
            });
        },

        setVswrPreset: function (type) {
            this.loadPreset = type;
            if (type === 'matched') {
                this.zlReal = 50; this.zlImag = 0;
            } else if (type === 'short') {
                this.zlReal = 0; this.zlImag = 0;
            } else if (type === 'open') {
                this.zlReal = 5000; this.zlImag = 0;
            } else if (type === 'mismatched') {
                this.zlReal = 150; this.zlImag = 0;
            } else if (type === 'reactive') {
                this.zlReal = 50; this.zlImag = -50; // Kapasitif
            }

            const elZl = document.getElementById('emZlRange');
            const elZlVal = document.getElementById('emVal_zl');
            if (elZl) elZl.value = Math.min(200, this.zlReal);
            if (elZlVal) elZlVal.textContent = this.zlReal + (this.zlImag !== 0 ? (this.zlImag > 0 ? ' + j' + this.zlImag : ' - j' + Math.abs(this.zlImag)) : '') + ' Ω';

            document.querySelectorAll('.em-vswr-preset-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-vswr-preset') === type);
            });
            this.calculate();
            if (!this.isRunning) this.render();
        },

        updatePlayButton: function () {
            const btn = document.getElementById('btnEmPlay');
            if (btn) {
                btn.innerHTML = this.isRunning ? '<i class="fas fa-pause"></i> <span>Durdur</span>' : '<i class="fas fa-play"></i> <span>Simülasyonu Başlat</span>';
                btn.classList.toggle('is-running', this.isRunning);
            }
        },

        togglePlay: function () {
            this.isRunning = !this.isRunning;
            this.updatePlayButton();
            if (this.isRunning) {
                this.startLoop();
            } else {
                if (this.animFrameId) {
                    cancelAnimationFrame(this.animFrameId);
                    this.animFrameId = null;
                }
                if (window.SimManager) window.SimManager.notifyStopped('em_waves');
                this.render();
            }
        },

        stop: function () {
            if (this.isRunning || this.animFrameId) {
                this.isRunning = false;
                if (this.animFrameId) {
                    cancelAnimationFrame(this.animFrameId);
                    this.animFrameId = null;
                }
                this.updatePlayButton();
                this.render();
            }
            if (window.SimManager) window.SimManager.notifyStopped('em_waves');
        },

        calculate: function () {
            if (this.mode === 'polarization') {
                // Polarizasyon Durumu Tespiti
                const dRad = (this.deltaDeg * Math.PI) / 180;
                let polDesc = '';
                let axialRatio = 0;

                const sinD = Math.abs(Math.sin(dRad));
                const cosD = Math.cos(dRad);

                if (sinD < 0.05) {
                    polDesc = 'Doğrusal Polarizasyon (Linear) • E Alanı Tek Bir Düzlemde Titreşir';
                    axialRatio = 999;
                } else if (Math.abs(this.e0x - this.e0y) < 0.08 && Math.abs(sinD - 1.0) < 0.05) {
                    polDesc = this.deltaDeg > 0 ? 'Sağ El Dairesel Polarizasyon (RHCP)' : 'Sol El Dairesel Polarizasyon (LHCP)';
                    axialRatio = 1.0;
                } else {
                    polDesc = 'Eliptik Polarizasyon • E Alan Vektörü Sarmal Çizerek Yayılır';
                    axialRatio = (Math.max(this.e0x, this.e0y) / Math.min(this.e0x, this.e0y)).toFixed(2);
                }

                const elType = document.getElementById('emResPolType');
                const elAxial = document.getElementById('emResAxialRatio');
                const elPhase = document.getElementById('emResDelta');
                if (elType) elType.textContent = polDesc;
                if (elAxial) elAxial.textContent = axialRatio === 999 ? '∞ (Doğrusal)' : axialRatio + ' (AR)';
                if (elPhase) elPhase.textContent = this.deltaDeg + '° (' + (dRad).toFixed(2) + ' rad)';

                if (window.GamificationModule && axialRatio === 1.0) {
                    GamificationModule.unlockBadge('em_wave_expert');
                }
            } else {
                // VSWR & Yansıma Katsayısı (Gamma = (ZL - Z0) / (ZL + Z0))
                const z0 = this.z0;
                const rL = this.zlReal;
                const xL = this.zlImag;

                // Karmaşık Gamma = ( (rL - z0) + j xL ) / ( (rL + z0) + j xL )
                const numR = rL - z0;
                const numI = xL;
                const denR = rL + z0;
                const denI = xL;

                const denMagSq = denR * denR + denI * denI;
                const gammaR = (numR * denR + numI * denI) / (denMagSq || 1);
                const gammaI = (numI * denR - numR * denI) / (denMagSq || 1);

                const gammaMag = Math.min(1.0, Math.sqrt(gammaR * gammaR + gammaI * gammaI));
                const gammaPhaseDeg = (Math.atan2(gammaI, gammaR) * 180) / Math.PI;

                // VSWR = (1 + |Gamma|) / (1 - |Gamma|)
                let vswr = (1 + gammaMag) / (Math.max(0.001, 1 - gammaMag));
                if (vswr > 50) vswr = 999;

                // Geri Dönüş Kaybı (Return Loss = -20 log10 |Gamma|)
                const returnLoss = gammaMag > 0.001 ? (-20 * Math.log10(gammaMag)).toFixed(2) + ' dB' : '> 40 dB';

                const elGamma = document.getElementById('emResGamma');
                const elVswr = document.getElementById('emResVswr');
                const elRl = document.getElementById('emResRl');
                const elMatch = document.getElementById('emResMatchStatus');

                if (elGamma) elGamma.textContent = gammaMag.toFixed(3) + ' ∠ ' + gammaPhaseDeg.toFixed(1) + '°';
                if (elVswr) elVswr.textContent = vswr >= 999 ? '∞ (Tam Yansıma)' : vswr.toFixed(2) + ' : 1';
                if (elRl) elRl.textContent = returnLoss;
                if (elMatch) {
                    elMatch.innerHTML = gammaMag < 0.1
                        ? '<span class="status-pass"><i class="fas fa-check-circle"></i> Mükemmel Uyum (VSWR < 1.2)</span>'
                        : '<span class="status-warn"><i class="fas fa-exclamation-triangle"></i> Empedans Uyumsuzluğu (Duran Dalga Var)</span>';
                }
            }
        },

        startLoop: function () {
            if (window.SimManager) window.SimManager.notifyStarted('em_waves');
            if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
            const loop = () => {
                if (this.isRunning) {
                    this.timePhase += 0.05;
                }
                this.render();
                if (this.isRunning) {
                    this.animFrameId = requestAnimationFrame(loop);
                }
            };
            this.animFrameId = requestAnimationFrame(loop);
        },

        render: function () {
            const canvas = document.getElementById('emWavesCanvas');
            if (!canvas) return;
            const hi = window.setupHiDpiCanvas ? window.setupHiDpiCanvas(canvas) : null;
            const ctx = hi ? hi.ctx : canvas.getContext('2d');
            const w = hi ? hi.w : canvas.width;
            const h = hi ? hi.h : canvas.height;

            ctx.fillStyle = '#060a14';
            ctx.fillRect(0, 0, w, h);

            if (this.mode === 'polarization') {
                this.renderPolarization(ctx, w, h);
            } else {
                this.renderVswr(ctx, w, h);
            }
        },

        renderPolarization: function (ctx, w, h) {
            // Sol 65%: 3B İzometrik Dalga Yayılımı (z ekseni boyunca E ve B alanları)
            // Sağ 35%: 2B Enine Kesit (Transverse plane) Dönen E Vektörü
            const splitX = w * 0.68;

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(splitX, 0); ctx.lineTo(splitX, h);
            ctx.stroke();

            // 1. SOL: 3B İZOMETRİK DALGA ALANI
            const originX = 50;
            const originY = h * 0.52;
            const zLength = splitX - 80;

            // 3B Eksenler (z: yayılma yönü, x: yatay/eğik, y: dikey)
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(originX, originY);
            ctx.lineTo(originX + zLength, originY - zLength * 0.15); // z ekseni
            ctx.moveTo(originX, originY);
            ctx.lineTo(originX, originY - 120); // y ekseni (+E_y)
            ctx.moveTo(originX, originY);
            ctx.lineTo(originX - 35, originY + 45); // x ekseni (+E_x)
            ctx.stroke();

            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.fillText('+z (Yayılma Yönü k)', originX + zLength - 20, originY - zLength * 0.15 + 16);
            ctx.fillText('+y', originX + 6, originY - 110);
            ctx.fillText('+x', originX - 35, originY + 58);

            // Sarmal E-Alanı Eğrisi
            const dRad = (this.deltaDeg * Math.PI) / 180;
            const wavePoints = 120;
            const scaleY = 70 * this.e0y;
            const scaleX = 45 * this.e0x;

            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.4;
            ctx.beginPath();

            for (let i = 0; i < wavePoints; i++) {
                const zFrac = i / wavePoints;
                const zPx = originX + zFrac * zLength;
                const zOffY = originY - zFrac * zLength * 0.15;

                const phaseZ = zFrac * 4 * Math.PI - this.timePhase;
                const ex = Math.cos(phaseZ) * scaleX;
                const ey = Math.cos(phaseZ + dRad) * scaleY;

                // 3B projeksiyon: x eğiklik katar (dx = -ex * 0.7, dy = ex * 0.4)
                const projX = zPx - ex * 0.7;
                const projY = zOffY - ey + ex * 0.4;

                if (i === 0) ctx.moveTo(projX, projY);
                else ctx.lineTo(projX, projY);
            }
            ctx.stroke();

            // 2. SAĞ: 2B ENİNE KESİT (Transverse Kesit & E-Vektör Yörüngesi)
            const circCenterX = splitX + (w - splitX) / 2;
            const circCenterY = h * 0.5;
            const circRadius = 75;

            // Koordinat Şebekesi
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
            ctx.beginPath();
            ctx.arc(circCenterX, circCenterY, circRadius, 0, 2 * Math.PI);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(circCenterX - circRadius - 10, circCenterY); ctx.lineTo(circCenterX + circRadius + 10, circCenterY);
            ctx.moveTo(circCenterX, circCenterY - circRadius - 10); ctx.lineTo(circCenterX, circCenterY + circRadius + 10);
            ctx.stroke();
            ctx.setLineDash([]);

            // Polarizasyon Elipsi / Yörüngesi (Statik İnce Çizgi)
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let a = 0; a <= 360; a += 4) {
                const rad = (a * Math.PI) / 180;
                const ex = Math.cos(rad) * (circRadius * 0.8 * this.e0x);
                const ey = Math.cos(rad + dRad) * (circRadius * 0.8 * this.e0y);
                const px = circCenterX + ex;
                const py = circCenterY - ey;
                if (a === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Anlık E Vektörü (Dönen Ok)
            const curPhase = -this.timePhase;
            const curEx = Math.cos(curPhase) * (circRadius * 0.8 * this.e0x);
            const curEy = Math.cos(curPhase + dRad) * (circRadius * 0.8 * this.e0y);
            const vecTipX = circCenterX + curEx;
            const vecTipY = circCenterY - curEy;

            ctx.strokeStyle = '#38bdf8';
            ctx.fillStyle = '#38bdf8';
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            ctx.moveTo(circCenterX, circCenterY);
            ctx.lineTo(vecTipX, vecTipY);
            ctx.stroke();

            // Ok Başı
            ctx.beginPath();
            ctx.arc(vecTipX, vecTipY, 4.5, 0, 2 * Math.PI);
            ctx.fill();

            // Etiketler
            ctx.fillStyle = '#cbd5e1';
            ctx.font = '11px "JetBrains Mono", monospace';
            ctx.fillText('3B Elektrik Alanı Yayılımı Ē(z, t)', 14, 22);
            ctx.fillText('2B Kesit (Dönen Ē Vektörü)', splitX + 16, 22);
        },

        renderVswr: function (ctx, w, h) {
            // İletim Hattı Duran Dalga Görünümü (Voltaj Zarfı ve Gelen/Yansıyan Dalgalar)
            ctx.fillStyle = '#cbd5e1';
            ctx.font = '11px "JetBrains Mono", monospace';
            ctx.fillText('İletim Hattı Voltaj Profili: Gelen Dalga (Mavi), Yansıyan (Sarı), Net Duran Dalga (Yeşil)', 14, 22);

            const midY = h * 0.52;
            const waveLengthPx = w * 0.35; // 1 dalga boyu piksel
            const ampBase = h * 0.22;

            // Eksen Çizgisi
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(0, midY); ctx.lineTo(w, midY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Yük Konumu (Sağ Uç: z = 0, Sol: -z jeneratöre doğru)
            ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
            ctx.fillRect(w - 24, midY - 60, 20, 120);
            ctx.strokeStyle = '#38bdf8';
            ctx.strokeRect(w - 24, midY - 60, 20, 120);
            ctx.fillStyle = '#38bdf8';
            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.fillText('YÜK ZL', w - 46, midY + 75);

            // Gamma Hesaplama
            const z0 = this.z0;
            const rL = this.zlReal;
            const xL = this.zlImag;
            const numR = rL - z0, numI = xL;
            const denR = rL + z0, denI = xL;
            const denMagSq = denR * denR + denI * denI;
            const gammaR = (numR * denR + numI * denI) / (denMagSq || 1);
            const gammaI = (numI * denR - numR * denI) / (denMagSq || 1);
            const gammaMag = Math.min(1.0, Math.sqrt(gammaR * gammaR + gammaI * gammaI));
            const gammaPhase = Math.atan2(gammaI, gammaR);

            // 1. DURAN DALGA VOLTAJ ZARFI (|V(z)| Envelopes)
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            for (let x = 0; x < w - 24; x++) {
                const zFromLoad = (w - 24 - x) / waveLengthPx; // Dalga boyu cinsinden mesafe
                const thetaZ = 2 * (2 * Math.PI) * zFromLoad + gammaPhase;
                // V_envelope = |1 + |Gamma| * e^(-j 2 beta z)|
                const env = Math.sqrt(1 + gammaMag * gammaMag + 2 * gammaMag * Math.cos(thetaZ));
                const yTop = midY - env * ampBase;
                if (x === 0) ctx.moveTo(x, yTop);
                else ctx.lineTo(x, yTop);
            }
            ctx.stroke();

            // Alt Zarf
            ctx.beginPath();
            for (let x = 0; x < w - 24; x++) {
                const zFromLoad = (w - 24 - x) / waveLengthPx;
                const thetaZ = 2 * (2 * Math.PI) * zFromLoad + gammaPhase;
                const env = Math.sqrt(1 + gammaMag * gammaMag + 2 * gammaMag * Math.cos(thetaZ));
                const yBot = midY + env * ampBase;
                if (x === 0) ctx.moveTo(x, yBot);
                else ctx.lineTo(x, yBot);
            }
            ctx.stroke();

            // 2. ANLIK ANİMASYONLU NET VOLTAJ DALGASI (Yeşil)
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            for (let x = 0; x < w - 24; x++) {
                const zFromLoad = (w - 24 - x) / waveLengthPx;
                const betaZ = (2 * Math.PI) * zFromLoad;

                // Gelen Dalga V+ = cos(wt - beta*z)
                const vInc = Math.cos(this.timePhase + betaZ);
                // Yansıyan Dalga V- = |Gamma| * cos(wt - beta*z + gammaPhase)
                const vRef = gammaMag * Math.cos(this.timePhase - betaZ + gammaPhase);
                const vTotal = vInc + vRef;

                const y = midY - vTotal * ampBase;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    };

    window.EmWavesModule = EmWavesModule;
    if (window.SimManager) {
        window.SimManager.register('em_waves', {
            stop: () => EmWavesModule.stop(),
            isRunning: () => EmWavesModule.isRunning
        });
    }
})(window);
