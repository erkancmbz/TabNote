/**
 * EEM REHBER / DEVREM STUDIO - AC-DC KONTROLLÜ TRİSTÖR DOĞRULTUCU LABORATUVARI
 * 
 * Güç Elektroniği:
 * - 1-Faz ve 3-Faz Tam Kontrollü Tristör Köprüsü (SCR Bridge)
 * - Ateşleme Açısı (Alpha: 0° - 180°)
 * - R, R-L (Endüktif) ve R-L-E (Motor Ters EMK) Yük Modelleri
 * - Serbest Salınım Diyodu (Freewheeling Diode) Sönümleme Etkisi
 * - Ortalama Gerilim (Vdc), Efektif (Vrms), Güç Faktörü (PF) & Osiloskop
 */
(function(window) {
    'use strict';

    const RectifierModule = {
        phaseType: '1phase', // '1phase' veya '3phase'
        alphaDeg: 45,        // Ateşleme Açısı (0 - 180 derece)
        loadType: 'rl',      // 'r', 'rl', 'rle'
        hasFreewheeling: true, // Serbest Salınım Diyodu
        vSourceRms: 220,     // Giriş Şebeke Gerilimi (V rms)
        freq: 50,            // Frekans (Hz)
        eBackEmf: 60,        // Ters EMK (V - RLE modunda)
        
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

            const canvas = document.getElementById('rectifierScopeCanvas');
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

        setPhaseType: function(type) {
            this.phaseType = type;
            const btn1 = document.getElementById('btnRect1Phase');
            const btn3 = document.getElementById('btnRect3Phase');
            if (btn1 && btn3) {
                btn1.classList.toggle('active', type === '1phase');
                btn3.classList.toggle('active', type === '3phase');
            }
            this.calculate();
            if (!this.isRunning) this.render();
        },

        setLoadType: function(type) {
            this.loadType = type;
            document.querySelectorAll('.rect-load-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-load') === type);
            });
            const rleRow = document.getElementById('rectRleParamRow');
            if (rleRow) rleRow.style.display = type === 'rle' ? 'flex' : 'none';
            this.calculate();
            if (!this.isRunning) this.render();
        },

        setAlpha: function(deg) {
            this.alphaDeg = parseFloat(deg);
            const readout = document.getElementById('rectVal_alpha');
            if (readout) readout.textContent = this.alphaDeg.toFixed(0) + '°';
            this.calculate();
            if (!this.isRunning) this.render();
        },

        toggleFreewheeling: function() {
            this.hasFreewheeling = !this.hasFreewheeling;
            const btn = document.getElementById('btnRectFreewheel');
            if (btn) btn.classList.toggle('active', this.hasFreewheeling);
            this.calculate();
            if (!this.isRunning) this.render();
        },

        updatePlayButton: function() {
            const btn = document.getElementById('btnRectPlay');
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
                if (window.SimManager) window.SimManager.notifyStopped('rectifier');
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
            if (window.SimManager) window.SimManager.notifyStopped('rectifier');
        },

        calculate: function() {
            const alphaRad = (this.alphaDeg * Math.PI) / 180;
            const vm = this.vSourceRms * Math.SQRT2; // Tepe gerilim
            let vdc = 0;
            let vrms = 0;
            let pf = 0;

            if (this.phaseType === '1phase') {
                // 1-Fazlı Tam Dalga Kontrollü Doğrultucu
                if (this.loadType === 'r' || this.hasFreewheeling) {
                    // Serbest salınım diyodu veya R yük (Negatif gerilim sönümlenir):
                    // Vdc = (Vm / pi) * (1 + cos(alpha))
                    vdc = (vm / Math.PI) * (1 + Math.cos(alphaRad));
                    vrms = (vm / Math.sqrt(2)) * Math.sqrt((Math.PI - alphaRad + 0.5 * Math.sin(2 * alphaRad)) / Math.PI);
                } else {
                    // Sürekli iletimli R-L yük (Negatif bölgeye taşar):
                    // Vdc = (2 * Vm / pi) * cos(alpha)
                    vdc = (2 * vm / Math.PI) * Math.cos(alphaRad);
                    vrms = this.vSourceRms;
                }
                pf = (2 * Math.SQRT2 / Math.PI) * Math.cos(alphaRad);
            } else {
                // 3-Fazlı Tam Kontrollü Doğrultucu (6-Darbe):
                // Vdc = (3 * sqrt(3) * Vm / pi) * cos(alpha)
                const vmLn = vm; // Faz-nötr tepe
                const vmLine = vmLn * Math.sqrt(3); // Faz-faz tepe
                if (this.alphaDeg <= 60 || !this.hasFreewheeling) {
                    vdc = (3 * vmLine / Math.PI) * Math.cos(alphaRad);
                } else {
                    vdc = (3 * vmLine / Math.PI) * (1 + Math.cos(alphaRad + Math.PI / 3));
                }
                vrms = vmLine * Math.sqrt(0.5 + (3 * Math.sqrt(3) / (4 * Math.PI)) * Math.cos(2 * alphaRad));
                pf = (3 / Math.PI) * Math.cos(alphaRad);
            }

            if (this.loadType === 'rle') {
                vdc = Math.max(this.eBackEmf, vdc);
            }

            // UI Güncellemeleri
            const elVdc = document.getElementById('rectResVdc');
            const elVrms = document.getElementById('rectResVrms');
            const elPf = document.getElementById('rectResPf');
            const elRipple = document.getElementById('rectResRipple');
            const elStatus = document.getElementById('rectResStatus');

            const rippleFactor = vdc > 0 ? (Math.sqrt(Math.max(0, Math.pow(vrms / vdc, 2) - 1)) * 100) : 0;

            if (elVdc) elVdc.textContent = vdc.toFixed(1) + ' V dc';
            if (elVrms) elVrms.textContent = vrms.toFixed(1) + ' V rms';
            if (elPf) elPf.textContent = Math.abs(pf).toFixed(2);
            if (elRipple) elRipple.textContent = '%' + rippleFactor.toFixed(1);

            if (elStatus) {
                if (vdc < 0) {
                    elStatus.innerHTML = '<span class="status-warn"><i class="fas fa-undo"></i> İnvertör Çalışma Modu (Rejeneratif Geri Besleme)</span>';
                } else if (this.alphaDeg === 0) {
                    elStatus.innerHTML = '<span class="status-pass"><i class="fas fa-check-circle"></i> Maksimum Doğrultma (Diyot Köprüsü Eşdeğeri)</span>';
                } else {
                    elStatus.innerHTML = '<span class="status-pass"><i class="fas fa-bolt"></i> Faz Açısı Kontrolü Aktif</span>';
                }
            }

            if (window.GamificationModule && this.alphaDeg >= 90 && vdc < 0) {
                GamificationModule.unlockBadge('inverter_regenerative');
            }
        },

        startLoop: function() {
            if (window.SimManager) window.SimManager.notifyStarted('rectifier');
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
            const canvas = document.getElementById('rectifierScopeCanvas');
            if (!canvas) return;
            const hi = window.setupHiDpiCanvas ? window.setupHiDpiCanvas(canvas) : null;
            const ctx = hi ? hi.ctx : canvas.getContext('2d');
            const w = hi ? hi.w : canvas.width;
            const h = hi ? hi.h : canvas.height;

            ctx.fillStyle = '#060a14';
            ctx.fillRect(0, 0, w, h);

            // Laboratuvar Izgarası
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
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(0, midY); ctx.lineTo(w, midY);
            ctx.stroke();
            ctx.setLineDash([]);

            const alphaRad = (this.alphaDeg * Math.PI) / 180;
            const ampScale = h * 0.38;

            // 1. ŞEBEKE GİRİŞ GERİLİMİ (Silik Gri Sinüs)
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            for (let x = 0; x < w; x++) {
                const theta = (x / w) * 4 * Math.PI + this.timePhase;
                const vSin = Math.sin(theta);
                const y = midY - vSin * ampScale;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // 2. DOĞRULTULMUŞ ÇIKIŞ GERİLİMİ V_load(t) (Glow Amber & Gölgeli Alan)
            ctx.save();
            ctx.shadowColor = 'rgba(245, 158, 11, 0.4)';
            ctx.shadowBlur = 6;
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2.8;
            ctx.beginPath();

            for (let x = 0; x < w; x++) {
                const theta = (x / w) * 4 * Math.PI + this.timePhase;
                const piMod = theta % Math.PI;
                let vOut = 0;

                if (this.phaseType === '1phase') {
                    if (piMod >= alphaRad) {
                        const sinVal = Math.abs(Math.sin(theta));
                        vOut = sinVal;
                    } else {
                        if (this.loadType === 'rl' && !this.hasFreewheeling) {
                            vOut = -Math.sin(alphaRad) * 0.45;
                        } else if (this.loadType === 'rle') {
                            vOut = this.eBackEmf / (this.vSourceRms * Math.SQRT2);
                        } else {
                            vOut = 0;
                        }
                    }
                } else {
                    const phaseOffset = (Math.PI / 3);
                    const angleInHex = (theta + alphaRad) % phaseOffset;
                    vOut = Math.cos(angleInHex - phaseOffset / 2) * 1.15;
                }

                const y = midY - vOut * ampScale;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();

            // 3. DOĞRULTULMUŞ ORTALAMA V_DC ÇİZGİSİ (Yeşil Kesikli Çizgi & Glow)
            const vm = this.vSourceRms * Math.SQRT2;
            let vdc = (vm / Math.PI) * (1 + Math.cos(alphaRad));
            const yDc = midY - (vdc / vm) * ampScale;

            ctx.save();
            ctx.shadowColor = 'rgba(16, 185, 129, 0.35)';
            ctx.shadowBlur = 4;
            ctx.strokeStyle = '#10b981';
            ctx.setLineDash([6, 4]);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, yDc); ctx.lineTo(w, yDc);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            // Etiketler & Göstergeler (Inter & JetBrains Mono)
            ctx.font = '600 11.5px "Inter", sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('● Gri: Şebeke AC Girişi (220V)', 14, 22);
            ctx.fillStyle = '#f59e0b';
            ctx.fillText('● Sarı: Yük Çıkışı Vo(t)', 200, 22);
            ctx.fillStyle = '#10b981';
            ctx.fillText('--- Yeşil: Ortalama Vdc (' + vdc.toFixed(1) + ' V)', 360, 22);

            // Ateşleme Açısı Tetik Göstergesi
            ctx.font = '600 11.5px "JetBrains Mono", monospace';
            ctx.fillStyle = '#f59e0b';
            ctx.fillText('Tetik α: ' + this.alphaDeg + '°', w - 120, 22);

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

                const theta = (hx / w) * 4 * Math.PI + this.timePhase;
                const vInst = (Math.abs(Math.sin(theta)) * vm).toFixed(1);

                const lines = [
                    { text: 'DOĞRULTUCU TELEMETRİ', bold: true, color: '#f59e0b' },
                    'Faz Açısı ωt: ' + ((theta % (2 * Math.PI)) * 180 / Math.PI).toFixed(0) + '°',
                    'Anlık AC: ' + (Math.sin(theta) * vm).toFixed(1) + ' V',
                    'Ortalama Vdc: ' + vdc.toFixed(1) + ' V'
                ];
                if (typeof window.renderCanvasHoverTooltip === 'function') {
                    window.renderCanvasHoverTooltip(ctx, w, h, hx, this.hoverInfo.y, lines, '#f59e0b');
                } else if (typeof renderCanvasHoverTooltip === 'function') {
                    renderCanvasHoverTooltip(ctx, w, h, hx, this.hoverInfo.y, lines, '#f59e0b');
                }
            }
        }
    };

    window.RectifierModule = RectifierModule;
    if (window.SimManager) {
        window.SimManager.register('rectifier', {
            stop: () => RectifierModule.stop(),
            isRunning: () => RectifierModule.isRunning
        });
    }
})(window);
