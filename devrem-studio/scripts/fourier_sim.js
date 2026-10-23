/**
 * EEM REHBER / DEVREM STUDIO - GELİŞMİŞ FOURIER SERİSİ & GİBBS FENOMENİ ANALİZÖRÜ
 * 
 * Sinyaller ve Sistemler: Harmonik Sentezi, Spektrum Çubukları,
 * Canlı Gibbs Aşımı (%) & Web Audio API Akustik Tını Sentezleyici
 */
(function(window) {
    'use strict';

    const FourierModule = {
        waveType: 'square', // 'square', 'triangle', 'sawtooth', 'rectified'
        harmonics: 7,       // N = 1..49
        frequency: 220,     // Ses / Temel Frekans (Hz - A3 notası)
        showHarmonics: true,
        showIdeal: true,
        
        // Web Audio API
        audioCtx: null,
        isPlayingAudio: false,
        oscList: [],
        gainNode: null,

        // Hover & Canvas
        hoverInfo: null,
        timePhase: 0,
        animFrameId: null,
        isRunning: false,

        init: function() {
            this.bindEvents();
            this.calculate();
            this.render();
            this.updatePlayButton();
        },

        bindEvents: function() {
            if (typeof document === 'undefined') return;

            const canvas = document.getElementById('fourierScopeCanvas');
            if (canvas) {
                canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e, canvas));
                canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
            }
        },

        handleMouseMove: function(e, canvas) {
            const coords = window.getCanvasLogicalCoords ? window.getCanvasLogicalCoords(e, canvas) : { x: e.clientX, y: e.clientY };
            this.hoverInfo = coords;
            if (!this.isRunning) this.render();
        },

        handleMouseLeave: function() {
            this.hoverInfo = null;
        },

        setWaveType: function(type) {
            this.waveType = type;
            document.querySelectorAll('.fourier-type-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-type') === type);
            });
            this.calculate();
            if (this.isPlayingAudio) this.updateAudio();
            if (!this.isRunning) this.render();
        },

        setHarmonics: function(n) {
            this.harmonics = parseInt(n, 10);
            const readout = document.getElementById('fourierVal_harmonics');
            if (readout) readout.textContent = this.harmonics;
            this.calculate();
            if (this.isPlayingAudio) this.updateAudio();
            if (!this.isRunning) this.render();
        },

        toggleHarmonicsOverlay: function() {
            this.showHarmonics = !this.showHarmonics;
            const btn = document.getElementById('btnFourierToggleHarm');
            if (btn) btn.classList.toggle('active', this.showHarmonics);
            if (!this.isRunning) this.render();
        },

        toggleIdealOverlay: function() {
            this.showIdeal = !this.showIdeal;
            const btn = document.getElementById('btnFourierToggleIdeal');
            if (btn) btn.classList.toggle('active', this.showIdeal);
            if (!this.isRunning) this.render();
        },

        getCoefficients: function(maxN) {
            // Dönüş: [ { n, amp, phase, label } ]
            const coeffs = [];
            const type = this.waveType;

            for (let n = 1; n <= maxN; n++) {
                let amp = 0;
                let phase = 0;

                if (type === 'square') {
                    // Kare: Sadece tek harmonikler, bn = 4 / (n * pi)
                    if (n % 2 !== 0) {
                        amp = 4 / (n * Math.PI);
                    }
                } else if (type === 'triangle') {
                    // Üçgen: Sadece tek harmonikler, bn = (8 / (pi^2 * n^2)) * (-1)^((n-1)/2)
                    if (n % 2 !== 0) {
                        const sign = Math.pow(-1, (n - 1) / 2);
                        amp = (8 / (Math.PI * Math.PI * n * n)) * sign;
                    }
                } else if (type === 'sawtooth') {
                    // Testere dişi: Tüm harmonikler, bn = (2 / (n * pi)) * (-1)^(n+1)
                    amp = (2 / (n * Math.PI)) * Math.pow(-1, n + 1);
                } else if (type === 'rectified') {
                    // Yarım dalga doğrultulmuş sinüs
                    if (n === 1) amp = 0.5;
                    else if (n % 2 === 0) amp = (2 / (Math.PI * (1 - n * n)));
                }

                if (Math.abs(amp) > 0.0001) {
                    coeffs.push({ n, amp, phase });
                }
            }
            return coeffs;
        },

        calculate: function() {
            const coeffs = this.getCoefficients(this.harmonics);

            // Gibbs Aşımı (Overshoot) Hesaplama
            let gibbsPct = 0;
            let noteText = '';

            if (this.waveType === 'square') {
                // Kare dalgada analitik tepe aşımı N büyüdükçe %8.949'a yakınsar
                gibbsPct = this.harmonics >= 3 ? 8.95 : (this.harmonics === 1 ? 0 : 4.2);
                noteText = 'Kare dalgada harmonik sayısı arttıkça süreksizlik noktasındaki tepe aşımı %' + gibbsPct.toFixed(1) + " seviyesinde sabit kalır (Wilbraham-Gibbs Olayı).";
            } else if (this.waveType === 'triangle') {
                gibbsPct = 0.0;
                noteText = 'Üçgen dalga 1/n² hızında çok hızlı yakınsadığı için süreksizlik yoktur ve Gibbs aşımı oluşmaz.';
            } else if (this.waveType === 'sawtooth') {
                gibbsPct = this.harmonics >= 3 ? 8.95 : 3.5;
                noteText = 'Testere dişi sinyalinde ani düşüş kenarında Gibbs salınımı gözlemlenir.';
            } else {
                noteText = 'Doğrultulmuş sinüs harmonikleri DC bileşen ve çift harmoniklerden oluşur.';
            }

            // Güç Dağılımı (Parseval Teoremi)
            let totalHarmonicPower = 0;
            coeffs.forEach(c => { totalHarmonicPower += Math.pow(c.amp, 2); });
            const p1 = coeffs.length > 0 ? Math.pow(coeffs[0].amp, 2) : 1;
            const thd = totalHarmonicPower > p1 ? (Math.sqrt(totalHarmonicPower - p1) / Math.sqrt(p1)) * 100 : 0;

            const elGibbs = document.getElementById('fourierResGibbs');
            const elThd = document.getElementById('fourierResThd');
            const elCoeffs = document.getElementById('fourierResCoeffs');
            const elNote = document.getElementById('fourierResNote');

            if (elGibbs) elGibbs.textContent = '%' + gibbsPct.toFixed(1);
            if (elThd) elThd.textContent = '%' + thd.toFixed(1);
            if (elCoeffs) elCoeffs.textContent = coeffs.length + ' Harmonik';
            if (elNote) elNote.textContent = noteText;

            if (window.GamificationModule && this.harmonics >= 25) {
                GamificationModule.unlockBadge('fourier_master');
            }
        },

        updatePlayButton: function() {
            const btn = document.getElementById('btnFourierPlay');
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
                if (window.SimManager) window.SimManager.notifyStopped('fourier');
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
            if (this.isPlayingAudio) {
                this.stopAudio();
            }
            if (window.SimManager) window.SimManager.notifyStopped('fourier');
        },

        startLoop: function() {
            if (window.SimManager) window.SimManager.notifyStarted('fourier');
            if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
            const loop = () => {
                if (this.isRunning) {
                    this.timePhase += 0.02;
                    this.render();
                    this.animFrameId = requestAnimationFrame(loop);
                }
            };
            this.animFrameId = requestAnimationFrame(loop);
        },

        render: function() {
            const canvas = document.getElementById('fourierScopeCanvas');
            if (!canvas) return;
            const hi = window.setupHiDpiCanvas ? window.setupHiDpiCanvas(canvas) : null;
            const ctx = hi ? hi.ctx : canvas.getContext('2d');
            const w = hi ? hi.w : canvas.width;
            const h = hi ? hi.h : canvas.height;

            ctx.fillStyle = '#060a14';
            ctx.fillRect(0, 0, w, h);

            // İki Bölüm: Sol 66% Dalga Formu Zaman Düzlemi, Sağ 34% FFT Spektrum Çubukları
            const splitX = Math.round(w * 0.67);

            // Dikey Ayırıcı
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(splitX, 0); ctx.lineTo(splitX, h);
            ctx.stroke();

            // Sol Dalga Formu Şebekesi
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
            ctx.lineWidth = 1;
            for (let i = 1; i < 8; i++) {
                const gx = Math.round(i * (splitX / 8)) + 0.5;
                ctx.beginPath();
                ctx.moveTo(gx, 0); ctx.lineTo(gx, h);
                ctx.stroke();
            }
            for (let j = 1; j < 6; j++) {
                const gy = Math.round(j * (h / 6)) + 0.5;
                ctx.beginPath();
                ctx.moveTo(0, gy); ctx.lineTo(splitX, gy);
                ctx.stroke();
            }

            const midY = h * 0.5;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(0, midY); ctx.lineTo(splitX, midY);
            ctx.stroke();
            ctx.setLineDash([]);

            const coeffs = this.getCoefficients(this.harmonics);
            const ampScale = h * 0.32;
            const numPoints = Math.floor(splitX);

            // 1. İDEAL HEDEF DALGA FORMU (Kırmızı/Gri Kesikli Çizgi)
            if (this.showIdeal) {
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)';
                ctx.setLineDash([4, 4]);
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                for (let x = 0; x < splitX; x++) {
                    const theta = (x / splitX) * 4 * Math.PI;
                    let idealY = 0;
                    if (this.waveType === 'square') {
                        idealY = Math.sin(theta) >= 0 ? 1 : -1;
                    } else if (this.waveType === 'triangle') {
                        idealY = (2 / Math.PI) * Math.asin(Math.sin(theta));
                    } else if (this.waveType === 'sawtooth') {
                        idealY = (2 * ((theta / (2 * Math.PI)) % 1)) - 1;
                    }
                    const y = midY - idealY * ampScale;
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // 2. TEKİL HARMONİK BİLEŞENLERİ (İnce Renkli Çizgiler)
            if (this.showHarmonics) {
                const harmColors = ['rgba(56,189,248,0.3)', 'rgba(16,185,129,0.3)', 'rgba(245,158,11,0.3)', 'rgba(236,72,153,0.3)'];
                coeffs.forEach((c, idx) => {
                    ctx.strokeStyle = harmColors[idx % harmColors.length];
                    ctx.lineWidth = 1.1;
                    ctx.beginPath();
                    for (let x = 0; x < splitX; x++) {
                        const theta = (x / splitX) * 4 * Math.PI;
                        const yVal = c.amp * Math.sin(c.n * theta);
                        const y = midY - yVal * ampScale;
                        if (x === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                });
            }

            // 3. SENTEZLENMİŞ BİLEŞKE FOURIER DALGASI (Parlak Camgöbeği & Glow)
            ctx.save();
            ctx.shadowColor = 'rgba(56, 189, 248, 0.45)';
            ctx.shadowBlur = 5;
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            for (let x = 0; x < splitX; x++) {
                const theta = (x / splitX) * 4 * Math.PI;
                let sumY = 0;
                coeffs.forEach(c => {
                    sumY += c.amp * Math.sin(c.n * theta);
                });
                const y = midY - sumY * ampScale;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();

            // 4. SAĞ PANEL: FFT HARMONİK SPEKTRUM ÇUBUKLARI
            const specW = w - splitX - 24;
            const barStartX = splitX + 16;
            const maxBarH = h * 0.68;
            const maxCoeffsShow = Math.min(16, coeffs.length);
            const barW = Math.max(8, (specW / maxCoeffsShow) - 6);

            ctx.font = '600 11.5px "Inter", sans-serif';
            ctx.fillStyle = '#f8fafc';
            ctx.fillText('FFT Harmonik Spektrumu', barStartX, 22);

            // Spektrum Yatay Taban Çizgisi
            const specBaseY = h - 36;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(barStartX - 4, specBaseY); ctx.lineTo(w - 12, specBaseY);
            ctx.stroke();

            coeffs.slice(0, maxCoeffsShow).forEach((c, idx) => {
                const bx = barStartX + idx * (barW + 6);
                const normalizedH = Math.min(maxBarH, (Math.abs(c.amp) / 1.3) * maxBarH);
                const by = specBaseY - normalizedH;

                // Çubuk gradyanı
                const grad = ctx.createLinearGradient(0, by, 0, specBaseY);
                grad.addColorStop(0, '#38bdf8');
                grad.addColorStop(1, '#0284c7');

                ctx.fillStyle = grad;
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(bx, by, barW, normalizedH, [3, 3, 0, 0]);
                else ctx.fillRect(bx, by, barW, normalizedH);
                ctx.fill();

                // Harmonik Numarası
                ctx.fillStyle = '#94a3b8';
                ctx.font = '500 10px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(c.n, bx + barW / 2, h - 20);
            });
            ctx.textAlign = 'left';

            // Sol Etiketler
            ctx.font = '600 11.5px "Inter", sans-serif';
            ctx.fillStyle = '#38bdf8';
            ctx.fillText('Zaman Düzlemi (Mavi: Sentez, Kırmızı: İdeal Dalga)', 14, 22);

            // Hover Tooltip
            if (this.hoverInfo && this.hoverInfo.x < splitX) {
                const hx = this.hoverInfo.x;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 3]);
                ctx.beginPath();
                ctx.moveTo(hx, 0); ctx.lineTo(hx, h);
                ctx.stroke();
                ctx.setLineDash([]);

                const theta = (hx / splitX) * 4 * Math.PI;
                let curSum = 0;
                coeffs.forEach(c => { curSum += c.amp * Math.sin(c.n * theta); });

                const lines = [
                    { text: 'FOURIER SENTEZİ', bold: true, color: '#38bdf8' },
                    'Zaman Açısı: ' + (theta % (2 * Math.PI)).toFixed(2) + ' rad',
                    'Anlık Sentez f(t): ' + curSum.toFixed(3),
                    'Aktif Harmonik N: ' + this.harmonics
                ];
                if (typeof window.renderCanvasHoverTooltip === 'function') {
                    window.renderCanvasHoverTooltip(ctx, w, h, hx, this.hoverInfo.y, lines, '#38bdf8');
                } else if (typeof renderCanvasHoverTooltip === 'function') {
                    renderCanvasHoverTooltip(ctx, w, h, hx, this.hoverInfo.y, lines, '#38bdf8');
                }
            }
        },

        // Web Audio API Akustik Sentezleyici
        toggleAudio: function() {
            if (this.isPlayingAudio) {
                this.stopAudio();
            } else {
                this.startAudio();
            }
        },

        startAudio: function() {
            try {
                if (window.SimManager) window.SimManager.notifyStarted('fourier');
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!this.audioCtx) this.audioCtx = new AudioCtx();
                if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

                this.gainNode = this.audioCtx.createGain();
                this.gainNode.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
                this.gainNode.connect(this.audioCtx.destination);

                this.updateAudio();
                this.isPlayingAudio = true;

                const btn = document.getElementById('btnFourierAudio');
                if (btn) {
                    btn.innerHTML = '<i class="fas fa-volume-mute"></i> Sesi Kapat';
                    btn.classList.add('is-running');
                }
            } catch (e) {
                console.warn('Web Audio başlatılamadı:', e);
            }
        },

        updateAudio: function() {
            if (!this.audioCtx || !this.isPlayingAudio) return;

            // Önceki osilatörleri durdur
            this.oscList.forEach(osc => { try { osc.stop(); osc.disconnect(); } catch (err) {} });
            this.oscList = [];

            const coeffs = this.getCoefficients(Math.min(15, this.harmonics));
            coeffs.forEach(c => {
                const osc = this.audioCtx.createOscillator();
                const harmGain = this.audioCtx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(this.frequency * c.n, this.audioCtx.currentTime);

                const volume = (Math.abs(c.amp) / 1.5) * 0.15;
                harmGain.gain.setValueAtTime(volume, this.audioCtx.currentTime);

                osc.connect(harmGain);
                harmGain.connect(this.gainNode);

                osc.start();
                this.oscList.push(osc);
            });
        },

        stopAudio: function() {
            this.oscList.forEach(osc => { try { osc.stop(); osc.disconnect(); } catch (err) {} });
            this.oscList = [];
            this.isPlayingAudio = false;

            const btn = document.getElementById('btnFourierAudio');
            if (btn) {
                btn.innerHTML = '<i class="fas fa-volume-up"></i> Harmonikleri Dinle (Audio)';
                btn.classList.remove('is-running');
            }
        }
    };

    window.FourierModule = FourierModule;
    if (window.SimManager) {
        window.SimManager.register('fourier', {
            stop: () => FourierModule.stop(),
            isRunning: () => (FourierModule.isRunning || FourierModule.isPlayingAudio)
        });
    }
})(window);
