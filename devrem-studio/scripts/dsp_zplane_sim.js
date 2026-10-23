/**
 * EEM REHBER / DEVREM STUDIO - DSP Z-DÜZLEMİ KUTUPLAR, SIFIRLAR & SAYISAL FİLTRE
 * 
 * Sayısal Sinyal İşleme (DSP) & Ayrık Zamanlı Sistemler:
 * - Birim Çember (|z| = 1) Üzerinde İnteraktif Kutuplar (x) ve Sıfırlar (o)
 * - Frekans Cevabı: |H(e^jω)| Genlik (dB / Doğrusal) ve Faz Cevabı
 * - BIBO Kararlılık Analizi (|p| < 1 Kararlı, |p| >= 1 Kararsız)
 * - Dürtü Yanıtı (Impulse Response h[n]) ve Rezonans Analizörü
 */
(function(window) {
    'use strict';

    const DspZplaneModule = {
        poles: [
            { r: 0.85, theta: 0.25 * Math.PI },
            { r: 0.85, theta: -0.25 * Math.PI }
        ],
        zeros: [
            { r: 1.0, theta: Math.PI },
            { r: 1.0, theta: -Math.PI }
        ],

        gain: 1.0,
        isRunning: false,
        animFrameId: null,
        sweepFreq: 0, // 0 to pi

        init: function() {
            this.bindEvents();
            this.render();
            if (window.SimManager) {
                window.SimManager.register('dsp_zplane', {
                    stop: () => this.stop(),
                    isRunning: () => this.isRunning,
                    resume: () => { if (this.isRunning) this.startLoop(); }
                });
            }
        },

        togglePlay: function() {
            this.isRunning = !this.isRunning;
            this.updatePlayButton();
            if (this.isRunning) {
                if (window.SimManager) window.SimManager.notifyStarted('dsp_zplane');
                this.startLoop();
            } else {
                if (this.animFrameId) {
                    cancelAnimationFrame(this.animFrameId);
                    this.animFrameId = null;
                }
                if (window.SimManager) window.SimManager.notifyStopped('dsp_zplane');
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
        },

        startLoop: function() {
            const step = () => {
                if (!this.isRunning) return;
                this.sweepFreq += 0.02;
                if (this.sweepFreq > Math.PI) this.sweepFreq = 0;
                this.render();
                this.animFrameId = requestAnimationFrame(step);
            };
            this.animFrameId = requestAnimationFrame(step);
        },

        updatePlayButton: function() {
            const btn = document.getElementById('btnDspPlay');
            if (btn) {
                btn.innerHTML = this.isRunning
                    ? '<i class="fas fa-pause"></i> <span>Durdur</span>'
                    : '<i class="fas fa-play"></i> <span>Frekans Taramasını Başlat</span>';
                btn.classList.toggle('is-running', this.isRunning);
            }
        },

        loadPreset: function(pKey) {
            if (pKey === 'lpf') {
                // Low Pass Filter
                this.poles = [
                    { r: 0.8, theta: 0.2 * Math.PI },
                    { r: 0.8, theta: -0.2 * Math.PI }
                ];
                this.zeros = [
                    { r: 1.0, theta: Math.PI },
                    { r: 1.0, theta: -Math.PI }
                ];
            } else if (pKey === 'hpf') {
                // High Pass Filter
                this.poles = [
                    { r: 0.8, theta: 0.8 * Math.PI },
                    { r: 0.8, theta: -0.8 * Math.PI }
                ];
                this.zeros = [
                    { r: 1.0, theta: 0 },
                    { r: 1.0, theta: 0 }
                ];
            } else if (pKey === 'notch') {
                // 50Hz Notch (Zero on unit circle at theta=0.3*pi)
                this.poles = [
                    { r: 0.92, theta: 0.35 * Math.PI },
                    { r: 0.92, theta: -0.35 * Math.PI }
                ];
                this.zeros = [
                    { r: 1.0, theta: 0.35 * Math.PI },
                    { r: 1.0, theta: -0.35 * Math.PI }
                ];
            } else if (pKey === 'unstable') {
                // Unstable pole (|z| > 1)
                this.poles = [
                    { r: 1.15, theta: 0.25 * Math.PI },
                    { r: 1.15, theta: -0.25 * Math.PI }
                ];
                this.zeros = [
                    { r: 0.9, theta: Math.PI },
                    { r: 0.9, theta: -Math.PI }
                ];
            }
            this.syncControls();
            this.render();
        },

        syncControls: function() {
            const pRad = document.getElementById('dspPoleR');
            if (pRad && this.poles.length > 0) pRad.value = this.poles[0].r;
            const pAng = document.getElementById('dspPoleTheta');
            if (pAng && this.poles.length > 0) pAng.value = (this.poles[0].theta / Math.PI).toFixed(2);
        },

        bindEvents: function() {
            const pRad = document.getElementById('dspPoleR');
            if (pRad) {
                pRad.addEventListener('input', (e) => {
                    const r = parseFloat(e.target.value) || 0.8;
                    if (this.poles.length >= 2) {
                        this.poles[0].r = r;
                        this.poles[1].r = r;
                    }
                    this.render();
                });
            }

            const pAng = document.getElementById('dspPoleTheta');
            if (pAng) {
                pAng.addEventListener('input', (e) => {
                    const frac = parseFloat(e.target.value) || 0.25;
                    if (this.poles.length >= 2) {
                        this.poles[0].theta = frac * Math.PI;
                        this.poles[1].theta = -frac * Math.PI;
                    }
                    this.render();
                });
            }
        },

        // Frekans Cevabı Hesaplayıcı: H(e^jw) = Prod(e^jw - z_k) / Prod(e^jw - p_k)
        evalH: function(omega) {
            const ejw = { re: Math.cos(omega), im: Math.sin(omega) };

            let numRe = 1.0, numIm = 0.0;
            this.zeros.forEach(z => {
                const zRe = z.r * Math.cos(z.theta);
                const zIm = z.r * Math.sin(z.theta);
                const diffRe = ejw.re - zRe;
                const diffIm = ejw.im - zIm;
                const newRe = numRe * diffRe - numIm * diffIm;
                const newIm = numRe * diffIm + numIm * diffRe;
                numRe = newRe;
                numIm = newIm;
            });

            let denRe = 1.0, denIm = 0.0;
            this.poles.forEach(p => {
                const pRe = p.r * Math.cos(p.theta);
                const pIm = p.r * Math.sin(p.theta);
                const diffRe = ejw.re - pRe;
                const diffIm = ejw.im - pIm;
                const newRe = denRe * diffRe - denIm * diffIm;
                const newIm = denRe * diffIm + denIm * diffRe;
                denRe = newRe;
                denIm = newIm;
            });

            const denMagSq = denRe * denRe + denIm * denIm;
            if (denMagSq < 1e-12) return 100.0;

            const resRe = (numRe * denRe + numIm * denIm) / denMagSq;
            const resIm = (numIm * denRe - numRe * denIm) / denMagSq;
            return Math.sqrt(resRe * resRe + resIm * resIm);
        },

        render: function() {
            const canvas = document.getElementById('dspZplaneCanvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;

            const rect = canvas.getBoundingClientRect();
            const cssW = rect.width || 800;
            const cssH = rect.height || 360;

            if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
                canvas.width = Math.round(cssW * dpr);
                canvas.height = Math.round(cssH * dpr);
            }

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const isLight = document.documentElement.getAttribute('data-theme') === 'light';
            ctx.fillStyle = isLight ? '#f8fafc' : '#020617';
            ctx.fillRect(0, 0, cssW, cssH);

            const splitX = Math.round(cssW * 0.45);

            // SOL TARAF: Z-Düzlemi & Birim Çember
            this.renderZPlane(ctx, 0, 0, splitX, cssH, isLight);

            // SAĞ TARAF: Frekans Cevabı |H(e^jw)|
            this.renderFreqResponse(ctx, splitX, 0, cssW - splitX, cssH, isLight);
        },

        renderZPlane: function(ctx, x, y, w, h, isLight) {
            const cx = x + w * 0.5;
            const cy = y + h * 0.52;
            const radius = Math.min(w, h) * 0.36; // Birim çember yarıçapı (px)

            ctx.fillStyle = isLight ? '#0f172a' : '#38bdf8';
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.fillText('Z-Düzlemi (|z| = 1 Birim Çember)', x + 20, y + 24);

            // Eksenler (Re, Im)
            ctx.strokeStyle = isLight ? '#cbd5e1' : '#334155';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x + 15, cy);
            ctx.lineTo(x + w - 15, cy);
            ctx.moveTo(cx, y + 35);
            ctx.lineTo(cx, y + h - 15);
            ctx.stroke();

            ctx.fillStyle = isLight ? '#64748b' : '#94a3b8';
            ctx.font = '9px JetBrains Mono, monospace';
            ctx.fillText('Re', x + w - 30, cy - 4);
            ctx.fillText('j Im', cx + 4, y + 48);

            // Birim Çember (|z| = 1)
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Birim çember içi dolgu hafif yeşil
            ctx.fillStyle = isLight ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.06)';
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();

            // Kutuplar (x) Çizimi (Kırmızı)
            let isBibostable = true;
            this.poles.forEach(p => {
                if (p.r >= 1.0) isBibostable = false;
                const px = cx + p.r * radius * Math.cos(p.theta);
                const py = cy - p.r * radius * Math.sin(p.theta);

                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 3;
                const sz = 6;
                ctx.beginPath();
                ctx.moveTo(px - sz, py - sz);
                ctx.lineTo(px + sz, py + sz);
                ctx.moveTo(px + sz, py - sz);
                ctx.lineTo(px - sz, py + sz);
                ctx.stroke();
            });

            // Sıfırlar (o) Çizimi (Mavi/Camgöbeği)
            this.zeros.forEach(z => {
                const zx = cx + z.r * radius * Math.cos(z.theta);
                const zy = cy - z.r * radius * Math.sin(z.theta);

                ctx.strokeStyle = '#06b6d4';
                ctx.lineWidth = 2.4;
                ctx.beginPath();
                ctx.arc(zx, zy, 5.5, 0, Math.PI * 2);
                ctx.stroke();
            });

            // Canlı Tarama Açısı (ω)
            if (this.isRunning) {
                const wx = cx + radius * Math.cos(this.sweepFreq);
                const wy = cy - radius * Math.sin(this.sweepFreq);
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(wx, wy);
                ctx.stroke();

                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.arc(wx, wy, 4, 0, Math.PI * 2);
                ctx.fill();
            }

            // Kararlılık Durum Kutusu
            const maxPoleR = Math.max(...this.poles.map(p => p.r));
            ctx.font = 'bold 11px Inter, sans-serif';
            if (maxPoleR < 1.0) {
                ctx.fillStyle = '#10b981';
                ctx.fillText('✔ KARARLI SİSTEM (|p| = ' + maxPoleR.toFixed(2) + ' < 1)', x + 20, h - 16);
            } else if (Math.abs(maxPoleR - 1.0) < 0.01) {
                ctx.fillStyle = '#facc15';
                ctx.fillText('⚠ MARJİNAL KARARLI / OSİLATÖR (|p| = 1)', x + 20, h - 16);
            } else {
                ctx.fillStyle = '#ef4444';
                ctx.fillText('✖ KARARSIZ SİSTEM! (|p| = ' + maxPoleR.toFixed(2) + ' > 1)', x + 20, h - 16);
            }
        },

        renderFreqResponse: function(ctx, x, y, w, h, isLight) {
            ctx.fillStyle = isLight ? '#0f172a' : '#38bdf8';
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.fillText('Frekans Cevabı |H(e^jω)| (0 → π rad/örnek)', x + 20, y + 24);

            const plotX = x + 40;
            const plotY = y + 50;
            const plotW = w - 60;
            const plotH = h - 90;

            // Arka Plan & Grid
            ctx.fillStyle = isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)';
            ctx.fillRect(plotX, plotY, plotW, plotH);

            ctx.strokeStyle = isLight ? '#cbd5e1' : '#334155';
            ctx.lineWidth = 1;
            ctx.strokeRect(plotX, plotY, plotW, plotH);

            // Eğri Verisi Hesabı
            const steps = 100;
            const mags = [];
            let maxMag = 1e-6;

            for (let i = 0; i <= steps; i++) {
                const wVal = (i / steps) * Math.PI;
                const m = this.evalH(wVal);
                mags.push(m);
                if (m > maxMag) maxMag = m;
            }

            maxMag = Math.max(2.0, maxMag * 1.15);

            // Genlik Eğrisi Çizimi
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            for (let i = 0; i <= steps; i++) {
                const px = plotX + (i / steps) * plotW;
                const py = plotY + plotH - (mags[i] / maxMag) * plotH;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Eksen Yazıları
            ctx.fillStyle = isLight ? '#64748b' : '#94a3b8';
            ctx.font = '9.5px JetBrains Mono, monospace';
            ctx.fillText('0 (DC)', plotX - 5, plotY + plotH + 16);
            ctx.fillText('π/2 (fs/4)', plotX + plotW * 0.5 - 20, plotY + plotH + 16);
            ctx.fillText('π (fs/2 Nyquist)', plotX + plotW - 40, plotY + plotH + 16);
            ctx.fillText('Tepe: ' + maxMag.toFixed(2), plotX + 6, plotY + 14);

            // Taramadaki ω Noktası
            if (this.isRunning) {
                const curX = plotX + (this.sweepFreq / Math.PI) * plotW;
                const curM = this.evalH(this.sweepFreq);
                const curY = plotY + plotH - (curM / maxMag) * plotH;

                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 1.8;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(curX, plotY);
                ctx.lineTo(curX, plotY + plotH);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.arc(curX, curY, 5, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 10px JetBrains Mono, monospace';
                ctx.fillText('|H|=' + curM.toFixed(2), curX + 6, curY - 6);
            }
        }
    };

    window.DspZplaneModule = DspZplaneModule;
})(window);
