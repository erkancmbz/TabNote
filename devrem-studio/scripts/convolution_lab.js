/**
 * EEM REHBER / DEVREM STUDIO - CANLI ADIM ADIM KONVOLÜSYON LABORATUVARI
 * 
 * Sinyaller ve Sistemler:
 * - Sürekli ve Ayrık Zaman Konvolüsyonu: y(t) = ∫ x(τ) h(t - τ) dτ
 * - 1) Sabit x(τ) ve Kayan h(t - τ)
 * - 2) Anlık Çarpım x(τ)·h(t - τ) ve Taranan Alan (İntegral)
 * - 3) Çıkış Sinyali y(t) Zaman Eğrisi
 */
(function(window) {
    'use strict';

    const ConvolutionLabModule = {
        sigXType: 'rect',    // 'rect', 'tri', 'exp', 'step'
        sigHType: 'rect',    // 'rect', 'tri', 'exp'
        timeDomain: 'continuous', // 'continuous' veya 'discrete'
        
        tShift: 0.0,         // Kayan zaman t parametresi (-4.0 .. +6.0)
        isPlaying: false,
        animFrameId: null,
        playSpeed: 1.0,

        tMin: -4.0,
        tMax: 6.0,
        dt: 0.02,

        init: function() {
            this.bindEvents();
            this.calculate();
            this.render();
        },

        bindEvents: function() {
            if (typeof document === 'undefined') return;

            const canvas = document.getElementById('convLabCanvas');
            if (canvas) {
                canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e, canvas));
                canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
            }
        },

        handleMouseMove: function(e, canvas) {
            const coords = window.getCanvasLogicalCoords ? window.getCanvasLogicalCoords(e, canvas) : { x: e.clientX, y: e.clientY };
            this.hoverInfo = coords;
            this.render();
        },

        handleMouseLeave: function() {
            this.hoverInfo = null;
            this.render();
        },

        setDomain: function(dom) {
            this.timeDomain = dom;
            const btnCont = document.getElementById('btnConvCont');
            const btnDisc = document.getElementById('btnConvDisc');
            if (btnCont && btnDisc) {
                btnCont.classList.toggle('active', dom === 'continuous');
                btnDisc.classList.toggle('active', dom === 'discrete');
            }
            this.calculate();
            this.render();
        },

        setSignals: function(xType, hType) {
            if (xType) this.sigXType = xType;
            if (hType) this.sigHType = hType;
            this.calculate();
            this.render();
        },

        setTShift: function(val) {
            this.tShift = parseFloat(val);
            const readout = document.getElementById('convLabVal_t');
            if (readout) readout.textContent = this.tShift.toFixed(2) + ' s';
            this.calculate();
            this.render();
        },

        togglePlay: function() {
            this.isPlaying = !this.isPlaying;
            const btn = document.getElementById('btnConvLabPlay');
            if (btn) {
                btn.innerHTML = this.isPlaying ? '<i class="fas fa-pause"></i> <span>Durdur</span>' : '<i class="fas fa-play"></i> <span>Simülasyonu Başlat</span>';
                btn.classList.toggle('is-running', this.isPlaying);
            }
            if (this.isPlaying) {
                this.startLoop();
            } else {
                if (this.animFrameId) {
                    cancelAnimationFrame(this.animFrameId);
                    this.animFrameId = null;
                }
                if (window.SimManager) window.SimManager.notifyStopped('convolution');
            }
        },

        stop: function() {
            if (this.isPlaying || this.animFrameId) {
                this.isPlaying = false;
                if (this.animFrameId) {
                    cancelAnimationFrame(this.animFrameId);
                    this.animFrameId = null;
                }
                const btn = document.getElementById('btnConvLabPlay');
                if (btn) {
                    btn.innerHTML = '<i class="fas fa-play"></i> <span>Simülasyonu Başlat</span>';
                    btn.classList.remove('is-running');
                }
                this.render();
            }
            if (window.SimManager) window.SimManager.notifyStopped('convolution');
        },

        resetAnim: function() {
            this.isPlaying = false;
            this.tShift = -3.5;
            const slider = document.getElementById('convLabRange_t');
            const readout = document.getElementById('convLabVal_t');
            const btn = document.getElementById('btnConvLabPlay');
            if (slider) slider.value = -3.5;
            if (readout) readout.textContent = '-3.50 s';
            if (btn) {
                btn.innerHTML = '<i class="fas fa-play"></i> <span>Simülasyonu Başlat</span>';
                btn.classList.remove('is-running');
            }
            this.calculate();
            this.render();
        },

        startLoop: function() {
            if (window.SimManager) window.SimManager.notifyStarted('convolution');
            if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
            const loop = () => {
                if (this.isPlaying) {
                    this.tShift += 0.025 * this.playSpeed;
                    if (this.tShift > this.tMax) {
                        this.tShift = this.tMin;
                    }
                    const slider = document.getElementById('convLabRange_t');
                    const readout = document.getElementById('convLabVal_t');
                    if (slider) slider.value = this.tShift;
                    if (readout) readout.textContent = this.tShift.toFixed(2) + ' s';
                    this.calculate();
                    this.render();
                    this.animFrameId = requestAnimationFrame(loop);
                }
            };
            this.animFrameId = requestAnimationFrame(loop);
        },

        evalX: function(tau) {
            if (this.sigXType === 'rect') {
                return (tau >= 0 && tau <= 2.0) ? 1.0 : 0;
            } else if (this.sigXType === 'tri') {
                return (tau >= 0 && tau <= 2.0) ? (1.0 - Math.abs(tau - 1.0)) : 0;
            } else if (this.sigXType === 'exp') {
                return (tau >= 0 && tau <= 4.0) ? Math.exp(-tau) : 0;
            } else {
                return (tau >= 0) ? 1.0 : 0;
            }
        },

        evalH: function(tau) {
            if (this.sigHType === 'rect') {
                return (tau >= 0 && tau <= 1.5) ? 1.0 : 0;
            } else if (this.sigHType === 'tri') {
                return (tau >= 0 && tau <= 2.0) ? (1.0 - Math.abs(tau - 1.0)) : 0;
            } else {
                return (tau >= 0 && tau <= 3.0) ? Math.exp(-1.5 * tau) : 0;
            }
        },

        calculate: function() {
            // Anlık Konvolüsyon İntegrali Hesabı: y(t) = int x(tau) * h(t - tau) dtau
            const t = this.tShift;
            let currentIntegral = 0;
            const steps = 400;
            const dTau = (this.tMax - this.tMin) / steps;

            for (let i = 0; i <= steps; i++) {
                const tau = this.tMin + i * dTau;
                const xVal = this.evalX(tau);
                const hVal = this.evalH(t - tau);
                currentIntegral += (xVal * hVal) * dTau;
            }

            const elY = document.getElementById('convLabResY');
            const elDesc = document.getElementById('convLabResDesc');

            if (elY) elY.textContent = 'y(' + t.toFixed(2) + ') = ' + currentIntegral.toFixed(3);
            if (elDesc) {
                if (currentIntegral > 0.01) {
                    elDesc.textContent = 'Sinyaller çakışıyor: Boyalı alan anlık integral büyüklüğünü temsil eder.';
                } else if (t < 0) {
                    elDesc.textContent = 'Henüz çakışma başlamadı (t < 0). h(t-τ) sinyali x(τ)\'ya yaklaşıyor.';
                } else {
                    elDesc.textContent = 'Çakışma tamamlandı. Çıkış sinyali sıfıra döndü.';
                }
            }

            if (window.GamificationModule && currentIntegral > 1.2) {
                GamificationModule.unlockBadge('signals_conv_master');
            }
        },

        render: function() {
            const canvas = document.getElementById('convLabCanvas');
            if (!canvas) return;
            const hi = window.setupHiDpiCanvas ? window.setupHiDpiCanvas(canvas) : null;
            const ctx = hi ? hi.ctx : canvas.getContext('2d');
            const w = hi ? hi.w : canvas.width;
            const h = hi ? hi.h : canvas.height;

            ctx.fillStyle = '#060a14';
            ctx.fillRect(0, 0, w, h);

            // 3 Eşit Yükseklikte Laboratuvar Paneli
            const panelH = h / 3;
            const padL = 44;
            const padR = 24;
            const plotW = w - padL - padR;

            const getX = (tau) => padL + ((tau - this.tMin) / (this.tMax - this.tMin)) * plotW;

            // Panel Ayırıcı Çizgileri
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, panelH); ctx.lineTo(w, panelH);
            ctx.moveTo(0, panelH * 2); ctx.lineTo(w, panelH * 2);
            ctx.stroke();

            // 1. PANEL: Sinyaller x(τ) ve h(t - τ)
            const p1MidY = panelH * 0.78;
            const amp1 = panelH * 0.52;

            // 0V / Taban Çizgisi
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.moveTo(padL, p1MidY); ctx.lineTo(w - padR, p1MidY);
            ctx.stroke();

            ctx.font = '600 11.5px "Inter", sans-serif';
            ctx.fillStyle = '#38bdf8';
            ctx.fillText('1. Sinyaller: x(τ) [Mavi Sabit] ve h(t - τ) [Sarı Kayan]', padL, 18);

            // x(τ) Eğrisi (Camgöbeği)
            ctx.save();
            ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';
            ctx.shadowBlur = 4;
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            for (let px = padL; px <= w - padR; px++) {
                const tau = this.tMin + ((px - padL) / plotW) * (this.tMax - this.tMin);
                const yVal = this.evalX(tau);
                const py = p1MidY - yVal * amp1;
                if (px === padL) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
            ctx.restore();

            // h(t - τ) Kayan Eğrisi (Amber)
            ctx.save();
            ctx.shadowColor = 'rgba(245, 158, 11, 0.4)';
            ctx.shadowBlur = 4;
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            for (let px = padL; px <= w - padR; px++) {
                const tau = this.tMin + ((px - padL) / plotW) * (this.tMax - this.tMin);
                const yVal = this.evalH(this.tShift - tau);
                const py = p1MidY - yVal * amp1;
                if (px === padL) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
            ctx.restore();

            // 2. PANEL: Çarpım x(τ)·h(t - τ) ve Alan Taraması
            const p2MidY = panelH * 1.78;

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.moveTo(padL, p2MidY); ctx.lineTo(w - padR, p2MidY);
            ctx.stroke();

            ctx.font = '600 11.5px "Inter", sans-serif';
            ctx.fillStyle = '#ec4899';
            ctx.fillText('2. Çarpım x(τ)·h(t - τ) ve Taranan Alan (İntegral Büyüklüğü)', padL, panelH + 18);

            // Gradyan Dolgulu Çarpım Alanı
            const grad = ctx.createLinearGradient(0, p2MidY - amp1, 0, p2MidY);
            grad.addColorStop(0, 'rgba(236, 72, 153, 0.45)');
            grad.addColorStop(1, 'rgba(236, 72, 153, 0.05)');

            ctx.fillStyle = grad;
            ctx.strokeStyle = '#ec4899';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(padL, p2MidY);

            for (let px = padL; px <= w - padR; px++) {
                const tau = this.tMin + ((px - padL) / plotW) * (this.tMax - this.tMin);
                const prod = this.evalX(tau) * this.evalH(this.tShift - tau);
                const py = p2MidY - prod * amp1;
                ctx.lineTo(px, py);
            }
            ctx.lineTo(w - padR, p2MidY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 3. PANEL: Çıkış Sinyali y(t)
            const p3MidY = panelH * 2.82;

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.moveTo(padL, p3MidY); ctx.lineTo(w - padR, p3MidY);
            ctx.stroke();

            ctx.font = '600 11.5px "Inter", sans-serif';
            ctx.fillStyle = '#10b981';
            ctx.fillText('3. Konvolüsyon Çıkışı y(t) = (x * h)(t)', padL, panelH * 2 + 18);

            ctx.save();
            ctx.shadowColor = 'rgba(16, 185, 129, 0.35)';
            ctx.shadowBlur = 4;
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2.6;
            ctx.beginPath();

            const sampleSteps = 250;
            const dTs = (this.tMax - this.tMin) / sampleSteps;

            for (let i = 0; i <= sampleSteps; i++) {
                const curT = this.tMin + i * dTs;
                let convSum = 0;
                for (let k = 0; k <= 100; k++) {
                    const tau = this.tMin + (k / 100) * (this.tMax - this.tMin);
                    convSum += (this.evalX(tau) * this.evalH(curT - tau)) * ((this.tMax - this.tMin) / 100);
                }

                const px = getX(curT);
                const py = p3MidY - convSum * (amp1 * 0.7);

                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
            ctx.restore();

            // Çıkış Üzerinde Kayan Anlık Nokta Göstergesi
            const curPx = getX(this.tShift);
            let curYVal = 0;
            for (let k = 0; k <= 100; k++) {
                const tau = this.tMin + (k / 100) * (this.tMax - this.tMin);
                curYVal += (this.evalX(tau) * this.evalH(this.tShift - tau)) * ((this.tMax - this.tMin) / 100);
            }
            const curPy = p3MidY - curYVal * (amp1 * 0.7);

            // Anlık Zaman Kılcal Çizgisi
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 3]);
            ctx.beginPath();
            ctx.moveTo(curPx, 0); ctx.lineTo(curPx, h);
            ctx.stroke();
            ctx.setLineDash([]);

            // Nokta ve Halo
            ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
            ctx.beginPath();
            ctx.arc(curPx, curPy, 11, 0, 2 * Math.PI);
            ctx.fill();

            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(curPx, curPy, 5.5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Eksen Değerleri (Alt panel zaman ekseni)
            ctx.fillStyle = '#94a3b8';
            ctx.font = '500 11px "JetBrains Mono", monospace';
            [-4, -2, 0, 2, 4, 6].forEach(tVal => {
                const px = getX(tVal);
                ctx.fillText(tVal + 's', px - 8, h - 8);
            });
        }
    };

    window.ConvolutionLabModule = ConvolutionLabModule;
    if (window.SimManager) {
        window.SimManager.register('convolution', {
            stop: () => ConvolutionLabModule.stop(),
            isRunning: () => ConvolutionLabModule.isPlaying
        });
    }
})(window);
