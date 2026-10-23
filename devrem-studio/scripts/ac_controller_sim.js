/**
 * EEM REHBER / DEVREM STUDIO - AC-AC GERİLİM KONTROLCÜSÜ & SİKLODÖNÜŞTÜRÜCÜ SİMÜLATÖRÜ
 * 
 * Güç Elektroniği 4. Sütun (AC-AC):
 * - Triyak / Ters Paralel Tristör Faz Kıyıcı (Dimmer / Soft-Starter)
 * - İntegral Çevrim / Periyot Atlama (Burst Firing / On-Off Sıfır Geçiş Kontrolü)
 * - Siklodönüştürücü (Cycloconverter: 50Hz -> 25Hz / 16.6Hz / 12.5Hz Ara DC Barasız Çevrim)
 */
(function(window) {
    'use strict';

    const AcControllerModule = {
        mode: 'phase_control', // 'phase_control', 'burst_firing', 'cycloconverter'
        vSourceRms: 220,       // Giriş Gerilimi (V rms)
        fSource: 50,           // Şebeke Frekansı (Hz)
        
        // Faz Kıyıcı Parametreleri
        alphaDeg: 60,          // Ateşleme Açısı (0 - 180 derece)

        // İntegral Çevrim Parametreleri
        cyclesOn: 3,           // Açık periyot sayısı (n)
        cyclesOff: 2,          // Kapalı periyot sayısı (m)

        // Siklodönüştürücü Parametreleri
        cycloRatio: 2,         // f_in / 2 (25 Hz), 3 (16.67 Hz), 4 (12.5 Hz)

        isRunning: false,
        animFrameId: null,
        timePhase: 0,
        hoverInfo: null,

        init: function() {
            this.bindEvents();
            this.calculate();
            this.render();
            this.updatePlayButton();
        },

        bindEvents: function() {
            if (typeof document === 'undefined') return;

            const canvas = document.getElementById('acControllerCanvas');
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

        setMode: function(m) {
            this.mode = m;
            document.querySelectorAll('.ac-mode-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-mode') === m);
            });

            const pBox = document.getElementById('acPhaseBox');
            const bBox = document.getElementById('acBurstBox');
            const cBox = document.getElementById('acCycloBox');

            if (pBox) pBox.style.display = m === 'phase_control' ? 'block' : 'none';
            if (bBox) bBox.style.display = m === 'burst_firing' ? 'block' : 'none';
            if (cBox) cBox.style.display = m === 'cycloconverter' ? 'block' : 'none';

            this.calculate();
            if (!this.isRunning) this.render();
        },

        setAlpha: function(deg) {
            this.alphaDeg = parseFloat(deg);
            const readout = document.getElementById('acVal_alpha');
            if (readout) readout.textContent = this.alphaDeg.toFixed(0) + '°';
            this.calculate();
            if (!this.isRunning) this.render();
        },

        setBurstCycles: function(on, off) {
            this.cyclesOn = parseInt(on, 10);
            this.cyclesOff = parseInt(off, 10);
            const readout = document.getElementById('acVal_burst');
            if (readout) readout.textContent = this.cyclesOn + ' Açık / ' + this.cyclesOff + ' Kapalı';
            this.calculate();
            if (!this.isRunning) this.render();
        },

        setCycloRatio: function(r) {
            this.cycloRatio = parseInt(r, 10);
            document.querySelectorAll('.cyclo-preset-btn').forEach(btn => {
                btn.classList.toggle('active', parseInt(btn.getAttribute('data-ratio'), 10) === this.cycloRatio);
            });
            this.calculate();
            if (!this.isRunning) this.render();
        },

        updatePlayButton: function() {
            const btn = document.getElementById('btnAcPlay');
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
                if (window.SimManager) window.SimManager.notifyStopped('ac_controller');
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
            if (window.SimManager) window.SimManager.notifyStopped('ac_controller');
        },

        calculate: function() {
            let voRms = 0;
            let pf = 0;
            let pOutRel = 0;
            let fOut = this.fSource;

            if (this.mode === 'phase_control') {
                const alphaRad = (this.alphaDeg * Math.PI) / 180;
                // Vo_rms = Vin_rms * sqrt( (1 / pi) * (pi - alpha + sin(2*alpha)/2) )
                const factor = Math.sqrt((Math.PI - alphaRad + 0.5 * Math.sin(2 * alphaRad)) / Math.PI);
                voRms = this.vSourceRms * factor;
                pf = factor; // Saf direnç yükünde PF = Vo_rms / Vin_rms
                pOutRel = factor * factor * 100;
                fOut = this.fSource;
            } else if (this.mode === 'burst_firing') {
                const duty = this.cyclesOn / (this.cyclesOn + this.cyclesOff);
                voRms = this.vSourceRms * Math.sqrt(duty);
                pf = Math.sqrt(duty);
                pOutRel = duty * 100;
                fOut = this.fSource;
            } else {
                // Siklodönüştürücü
                fOut = this.fSource / this.cycloRatio;
                voRms = this.vSourceRms * 0.85; // Basamaklı sentez RMS
                pf = 0.78;
                pOutRel = 75;
            }

            const elVo = document.getElementById('acResVo');
            const elPf = document.getElementById('acResPf');
            const elP = document.getElementById('acResPower');
            const elF = document.getElementById('acResFreq');
            const elStatus = document.getElementById('acResStatus');

            if (elVo) elVo.textContent = voRms.toFixed(1) + ' V rms';
            if (elPf) elPf.textContent = pf.toFixed(2);
            if (elP) elP.textContent = '%' + pOutRel.toFixed(1) + ' P_nom';
            if (elF) elF.textContent = fOut.toFixed(1) + ' Hz';

            if (elStatus) {
                if (this.mode === 'phase_control') {
                    elStatus.innerHTML = '<span class="status-pass"><i class="fas fa-lightbulb"></i> Faz Kıyıcı Triyak Kontrolü (Dimmer / Soft-Starter)</span>';
                } else if (this.mode === 'burst_firing') {
                    elStatus.innerHTML = '<span class="status-pass"><i class="fas fa-fire"></i> Sıfır Geçişli İntegral Çevrim (Sıfır RFI Gürültüsü)</span>';
                } else {
                    elStatus.innerHTML = '<span class="status-pass"><i class="fas fa-sync-alt"></i> Siklodönüştürücü: Doğrudan AC-AC Frekans İndirgeme (' + fOut.toFixed(1) + ' Hz)</span>';
                }
            }

            if (window.GamificationModule && this.mode === 'cycloconverter') {
                GamificationModule.unlockBadge('cycloconverter_pro');
            }
        },

        startLoop: function() {
            if (window.SimManager) window.SimManager.notifyStarted('ac_controller');
            if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
            const loop = () => {
                if (this.isRunning) {
                    this.timePhase += 0.03;
                }
                this.render();
                if (this.isRunning) {
                    this.animFrameId = requestAnimationFrame(loop);
                }
            };
            this.animFrameId = requestAnimationFrame(loop);
        },

        render: function() {
            const canvas = document.getElementById('acControllerCanvas');
            if (!canvas) return;
            const hi = window.setupHiDpiCanvas ? window.setupHiDpiCanvas(canvas) : null;
            const ctx = hi ? hi.ctx : canvas.getContext('2d');
            const w = hi ? hi.w : canvas.width;
            const h = hi ? hi.h : canvas.height;

            ctx.fillStyle = '#060a14';
            ctx.fillRect(0, 0, w, h);

            // Laboratuvar Osiloskop Izgarası
            if (window.drawOscilloscopeGrid) {
                window.drawOscilloscopeGrid(ctx, w, h, { gridX: 12, gridY: 6, strokeColor: 'rgba(56, 189, 248, 0.08)' });
            } else {
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
                ctx.lineWidth = 1;
                for (let i = 1; i < 12; i++) {
                    ctx.beginPath();
                    ctx.moveTo(i * (w / 12), 0); ctx.lineTo(i * (w / 12), h);
                    ctx.stroke();
                }
                for (let j = 1; j < 6; j++) {
                    ctx.beginPath();
                    ctx.moveTo(0, j * (h / 6)); ctx.lineTo(w, j * (h / 6));
                    ctx.stroke();
                }
            }

            const midY = h * 0.52;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(0, midY); ctx.lineTo(w, midY);
            ctx.stroke();
            ctx.setLineDash([]);

            const ampScale = h * 0.38;

            // 1. ŞEBEKE AC GİRİŞİ (Gri İnce Çizgi)
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.38)';
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            for (let x = 0; x < w; x++) {
                const theta = (x / w) * 6 * Math.PI + this.timePhase;
                const vSin = Math.sin(theta);
                const y = midY - vSin * ampScale;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // 2. ÇIKIŞ AC DALGA FORMU (Glow Camgöbeği)
            ctx.save();
            ctx.shadowColor = 'rgba(56, 189, 248, 0.45)';
            ctx.shadowBlur = 6;
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.8;
            ctx.beginPath();

            const alphaRad = (this.alphaDeg * Math.PI) / 180;
            const totalBurstPeriod = this.cyclesOn + this.cyclesOff;

            for (let x = 0; x < w; x++) {
                const theta = (x / w) * 6 * Math.PI + this.timePhase;
                let vOut = 0;

                if (this.mode === 'phase_control') {
                    const halfPeriodAngle = theta % Math.PI;
                    if (halfPeriodAngle >= alphaRad) {
                        vOut = Math.sin(theta);
                    } else {
                        vOut = 0;
                    }
                } else if (this.mode === 'burst_firing') {
                    const cycleIdx = Math.floor((theta / (2 * Math.PI)) % totalBurstPeriod);
                    if (cycleIdx < this.cyclesOn) {
                        vOut = Math.sin(theta);
                    } else {
                        vOut = 0;
                    }
                } else {
                    const cycloPhase = theta / this.cycloRatio;
                    const sinHigh = Math.sin(theta);
                    const lowFreqSign = Math.sin(cycloPhase) >= 0 ? 1 : -1;
                    vOut = Math.abs(sinHigh) * lowFreqSign;
                }

                const y = midY - vOut * ampScale;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();

            // Etiketler & Göstergeler (Inter & JetBrains Mono)
            ctx.font = '600 11.5px "Inter", sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('● Gri: Şebeke AC Girişi (50Hz)', 14, 22);
            ctx.fillStyle = '#38bdf8';
            ctx.fillText('● Mavi: AC-AC Çıkış Gerilimi Vo(t)', 220, 22);

            ctx.font = '600 11.5px "JetBrains Mono", monospace';
            if (this.mode === 'phase_control') {
                ctx.fillStyle = '#38bdf8';
                ctx.fillText('Ateşleme Açısı α: ' + this.alphaDeg + '°', w - 170, 22);
            } else if (this.mode === 'burst_firing') {
                ctx.fillStyle = '#10b981';
                ctx.fillText('Görev Oranı: %' + ((this.cyclesOn / totalBurstPeriod) * 100).toFixed(0), w - 160, 22);
            } else {
                ctx.fillStyle = '#f59e0b';
                ctx.fillText('Siklodönüştürücü: ' + (this.fSource / this.cycloRatio).toFixed(1) + ' Hz', w - 190, 22);
            }

            // Hover İnceleme & Telemetri
            if (this.hoverInfo) {
                const hx = Math.max(0, Math.min(w - 1, this.hoverInfo.x));
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 3]);
                ctx.beginPath();
                ctx.moveTo(hx, 0); ctx.lineTo(hx, h);
                ctx.stroke();
                ctx.setLineDash([]);

                const theta = (hx / w) * 6 * Math.PI + this.timePhase;
                const vIn = (Math.sin(theta) * 311).toFixed(1);

                const lines = [
                    { text: 'AC-AC KONTROLÖR TELEMETRİ', bold: true, color: '#38bdf8' },
                    'Zaman Açısı ωt: ' + ((theta % (2 * Math.PI)) * 180 / Math.PI).toFixed(0) + '°',
                    'Anlık Giriş: ' + vIn + ' V',
                    'Mod: ' + (this.mode === 'phase_control' ? 'Faz Açısı Kontrolü' : (this.mode === 'burst_firing' ? 'Darbe Paketi Kontrolü' : 'Siklodönüştürücü'))
                ];
                if (typeof window.renderCanvasHoverTooltip === 'function') {
                    window.renderCanvasHoverTooltip(ctx, w, h, hx, this.hoverInfo.y, lines, '#38bdf8');
                } else if (typeof renderCanvasHoverTooltip === 'function') {
                    renderCanvasHoverTooltip(ctx, w, h, hx, this.hoverInfo.y, lines, '#38bdf8');
                }
            }
        }
    };

    window.AcControllerModule = AcControllerModule;
    if (window.SimManager) {
        window.SimManager.register('ac_controller', {
            stop: () => AcControllerModule.stop(),
            isRunning: () => AcControllerModule.isRunning
        });
    }
})(window);
