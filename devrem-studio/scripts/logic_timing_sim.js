/**
 * EEM REHBER / DEVREM STUDIO - DİJİTAL ZAMANLAMA & MANTIK ANALİZÖRÜ (WAVEFORM INSPECTOR)
 * 
 * FPGA & Sayısal Sistemler:
 * - Clock, Reset, Enable, Data Bus ve D-FF Çıkışı
 * - Setup Time (tsu) ve Hold Time (th) İhlal & Metastabilite Detektörü
 * - İnteraktif Zamanlama Çizgisi & Verilog Testbench Üretimi
 */
(function(window) {
    'use strict';

    const LogicTimingModule = {
        clkPeriod: 20,  // ns (50 MHz)
        tSetup: 3.0,    // ns
        tHold: 2.0,     // ns
        tCq: 2.5,       // ns
        dataSkew: 14.0, // ns (Verinin saat kenarına göre gecikmesi)

        simCycles: 5,   // Gösterilecek saat çevrimi sayısı
        totalTimeNs: 100, // 5 * 20ns

        signals: [
            { name: 'clk', type: 'bit', color: '#38bdf8' },
            { name: 'rst_n', type: 'bit', color: '#ef4444' },
            { name: 'en', type: 'bit', color: '#f59e0b' },
            { name: 'data_in', type: 'bus', color: '#a855f7' },
            { name: 'q_out', type: 'bus', color: '#10b981' }
        ],

        violationState: 'ok', // 'ok', 'setup_violation', 'hold_violation'
        hoverInfo: null,
        isRunning: false,
        animFrameId: null,
        scanTime: 0,

        init: function() {
            this.bindEvents();
            this.calculate();
            this.render();
            this.updatePlayButton();
        },

        updatePlayButton: function() {
            const btn = document.getElementById('btnLogicPlay');
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
                if (window.SimManager) window.SimManager.notifyStopped('logic_timing');
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
            if (window.SimManager) window.SimManager.notifyStopped('logic_timing');
        },

        startLoop: function() {
            if (window.SimManager) window.SimManager.notifyStarted('logic_timing');
            if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
            const loop = () => {
                if (this.isRunning) {
                    this.scanTime = (this.scanTime + 0.6) % (this.totalTimeNs || 100);
                    this.render();
                    this.animFrameId = requestAnimationFrame(loop);
                }
            };
            this.animFrameId = requestAnimationFrame(loop);
        },

        bindEvents: function() {
            if (typeof document === 'undefined') return;

            const canvas = document.getElementById('logicScopeCanvas');
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

        setParam: function(key, val) {
            this[key] = parseFloat(val);
            const readout = document.getElementById('logicVal_' + key);
            if (readout) readout.textContent = this[key].toFixed(1) + ' ns';
            this.calculate();
            this.render();
        },

        setPreset: function(type) {
            if (type === 'valid') {
                this.clkPeriod = 20; this.tSetup = 3.0; this.tHold = 2.0; this.dataSkew = 12.0;
            } else if (type === 'setup_fail') {
                this.clkPeriod = 20; this.tSetup = 4.0; this.tHold = 2.0; this.dataSkew = 18.5; // Saat kenarına 1.5ns kala değişiyor (ihlal!)
            } else if (type === 'hold_fail') {
                this.clkPeriod = 20; this.tSetup = 3.0; this.tHold = 3.5; this.dataSkew = 21.0; // Saat kenarından 1.0ns sonra değişiyor (ihlal!)
            }

            ['clkPeriod', 'tSetup', 'tHold', 'dataSkew'].forEach(k => {
                const el = document.getElementById('logicRange_' + k);
                const elVal = document.getElementById('logicVal_' + k);
                if (el) el.value = this[k];
                if (elVal) elVal.textContent = this[k].toFixed(1) + (k === 'clkPeriod' ? ' ns (50 MHz)' : ' ns');
            });

            document.querySelectorAll('.logic-preset-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-preset') === type);
            });

            this.calculate();
            this.render();
        },

        calculate: function() {
            this.totalTimeNs = this.clkPeriod * this.simCycles;

            // Yükselen saat kenarları: clkPeriod, 2*clkPeriod, vb.
            const risingEdge1 = this.clkPeriod; // 20 ns anı
            const dataChangeTime = this.dataSkew;

            // Setup Kontrolü: Data değişimi risingEdge1 - tSetup ile risingEdge1 arasında mı?
            const timeBeforeEdge = risingEdge1 - dataChangeTime;
            const timeAfterEdge = dataChangeTime - risingEdge1;

            if (dataChangeTime < risingEdge1 && timeBeforeEdge < this.tSetup) {
                this.violationState = 'setup_violation';
            } else if (dataChangeTime >= risingEdge1 && timeAfterEdge < this.tHold) {
                this.violationState = 'hold_violation';
            } else {
                this.violationState = 'ok';
            }

            const maxFreqMhz = (1000 / (this.clkPeriod)).toFixed(0);
            const slack = (timeBeforeEdge - this.tSetup).toFixed(2);

            const elSlack = document.getElementById('logicResSlack');
            const elFreq = document.getElementById('logicResFreq');
            const elStatus = document.getElementById('logicResStatus');

            if (elSlack) {
                elSlack.textContent = (slack >= 0 ? '+' : '') + slack + ' ns';
                elSlack.style.color = slack >= 0 ? '#10b981' : '#ef4444';
            }
            if (elFreq) elFreq.textContent = maxFreqMhz + ' MHz';
            if (elStatus) {
                if (this.violationState === 'ok') {
                    elStatus.innerHTML = '<span class="status-pass"><i class="fas fa-check-circle"></i> Zamanlama Güvenli (Setup/Hold Karşılandı)</span>';
                } else if (this.violationState === 'setup_violation') {
                    elStatus.innerHTML = '<span class="status-warn" style="color:#ef4444;"><i class="fas fa-exclamation-circle"></i> SETUP İHLALİ! (Metastabilite Riski)</span>';
                } else {
                    elStatus.innerHTML = '<span class="status-warn" style="color:#ef4444;"><i class="fas fa-exclamation-circle"></i> HOLD İHLALİ! (Veri Çok Erken Değişti)</span>';
                }
            }

            if (window.GamificationModule && this.violationState === 'ok' && parseFloat(slack) < 1.0 && parseFloat(slack) >= 0) {
                GamificationModule.unlockBadge('timing_closure_hero');
            }
        },

        render: function() {
            const canvas = document.getElementById('logicScopeCanvas');
            if (!canvas) return;
            const hi = window.setupHiDpiCanvas ? window.setupHiDpiCanvas(canvas) : null;
            const ctx = hi ? hi.ctx : canvas.getContext('2d');
            const w = hi ? hi.w : canvas.width;
            const h = hi ? hi.h : canvas.height;

            ctx.fillStyle = '#060a14';
            ctx.fillRect(0, 0, w, h);

            const padL = 96; // Sinyal etiketleri için sol boşluk
            const padR = 25;
            const padT = 36;
            const plotW = w - padL - padR;
            const totalT = this.totalTimeNs;

            const getX = (tNs) => padL + (tNs / totalT) * plotW;

            // Zamanlama Grid Çizgileri & Saat Kenarları
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
            ctx.lineWidth = 1;

            for (let c = 0; c <= this.simCycles; c++) {
                const t = c * this.clkPeriod;
                const gx = Math.round(getX(t)) + 0.5;
                ctx.beginPath();
                ctx.moveTo(gx, padT - 10); ctx.lineTo(gx, h - 25);
                ctx.stroke();

                // Üst Zaman Cetveli (Kristal JetBrains Mono)
                ctx.fillStyle = '#94a3b8';
                ctx.font = '500 10.5px "JetBrains Mono", monospace';
                ctx.fillText(t + 'ns', gx - 12, padT - 15);
            }

            // SETUP & HOLD TEHLİKE PENCERESİ (Kırmızı Gölgeli Alan)
            const edge1X = getX(this.clkPeriod);
            const setupStartX = getX(this.clkPeriod - this.tSetup);
            const holdEndX = getX(this.clkPeriod + this.tHold);

            ctx.fillStyle = this.violationState === 'ok' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.28)';
            ctx.fillRect(setupStartX, padT, holdEndX - setupStartX, h - padT - 30);

            ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
            ctx.setLineDash([2, 2]);
            ctx.strokeRect(setupStartX, padT, holdEndX - setupStartX, h - padT - 30);
            ctx.setLineDash([]);

            // Pencere Etiketi
            ctx.fillStyle = '#f87171';
            ctx.font = '9px "JetBrains Mono", monospace';
            ctx.fillText('tsu: ' + this.tSetup + 'ns', setupStartX - 2, padT + 12);
            ctx.fillText('th: ' + this.tHold + 'ns', edge1X + 4, padT + 12);

            // Sinyalleri Çiz
            const rowH = (h - padT - 40) / this.signals.length;

            this.signals.forEach((sig, idx) => {
                const rowY = padT + idx * rowH + rowH * 0.5;

                // Sinyal Etiketi
                ctx.fillStyle = sig.color;
                ctx.font = '700 11px "JetBrains Mono", monospace';
                ctx.textAlign = 'right';
                ctx.fillText(sig.name, padL - 14, rowY + 4);
                ctx.textAlign = 'left';

                ctx.strokeStyle = sig.color;
                ctx.lineWidth = 2.2;
                ctx.beginPath();

                if (sig.name === 'clk') {
                    // Kare Saat Dalgası
                    for (let c = 0; c < this.simCycles; c++) {
                        const t0 = c * this.clkPeriod;
                        const tMid = t0 + this.clkPeriod / 2;
                        const t1 = t0 + this.clkPeriod;

                        const yHigh = rowY - rowH * 0.35;
                        const yLow = rowY + rowH * 0.35;

                        if (c === 0) ctx.moveTo(getX(t0), yLow);
                        ctx.lineTo(getX(t0), yHigh);
                        ctx.lineTo(getX(tMid), yHigh);
                        ctx.lineTo(getX(tMid), yLow);
                        ctx.lineTo(getX(t1), yLow);
                    }
                    ctx.stroke();
                } else if (sig.name === 'rst_n') {
                    // İlk 8ns 0, sonra 1
                    const tResetEnd = 8.0;
                    const yHigh = rowY - rowH * 0.35;
                    const yLow = rowY + rowH * 0.35;
                    ctx.moveTo(getX(0), yLow);
                    ctx.lineTo(getX(tResetEnd), yLow);
                    ctx.lineTo(getX(tResetEnd), yHigh);
                    ctx.lineTo(getX(totalT), yHigh);
                    ctx.stroke();
                } else if (sig.name === 'en') {
                    // Enable 1
                    const yHigh = rowY - rowH * 0.35;
                    ctx.moveTo(getX(0), yHigh);
                    ctx.lineTo(getX(totalT), yHigh);
                    ctx.stroke();
                } else if (sig.name === 'data_in') {
                    // Veri Yolu (Bus) Geçişi dataSkew anında
                    const yHigh = rowY - rowH * 0.32;
                    const yLow = rowY + rowH * 0.32;
                    const tX = getX(this.dataSkew);

                    // Önceki Veri D0
                    ctx.moveTo(getX(0), yHigh); ctx.lineTo(tX - 4, yHigh);
                    ctx.moveTo(getX(0), yLow); ctx.lineTo(tX - 4, yLow);

                    // Çapraz Geçiş
                    ctx.moveTo(tX - 4, yHigh); ctx.lineTo(tX + 4, yLow);
                    ctx.moveTo(tX - 4, yLow); ctx.lineTo(tX + 4, yHigh);

                    // Yeni Veri D1
                    ctx.moveTo(tX + 4, yHigh); ctx.lineTo(getX(totalT), yHigh);
                    ctx.moveTo(tX + 4, yLow); ctx.lineTo(getX(totalT), yLow);
                    ctx.stroke();

                    // Veri İsimleri
                    ctx.fillStyle = '#cbd5e1';
                    ctx.font = '10px "JetBrains Mono", monospace';
                    ctx.fillText('0xAA', getX(4), rowY + 3);
                    ctx.fillText('0x55', tX + 16, rowY + 3);
                } else if (sig.name === 'q_out') {
                    // Flip-Flop Çıkışı (İlk saat kenarında tCq gecikmesiyle güncellenir)
                    const yHigh = rowY - rowH * 0.32;
                    const yLow = rowY + rowH * 0.32;
                    const tQ = getX(this.clkPeriod + this.tCq);

                    ctx.moveTo(getX(0), yHigh); ctx.lineTo(tQ - 4, yHigh);
                    ctx.moveTo(getX(0), yLow); ctx.lineTo(tQ - 4, yLow);

                    ctx.moveTo(tQ - 4, yHigh); ctx.lineTo(tQ + 4, yLow);
                    ctx.moveTo(tQ - 4, yLow); ctx.lineTo(tQ + 4, yHigh);

                    ctx.moveTo(tQ + 4, yHigh); ctx.lineTo(getX(totalT), yHigh);
                    ctx.moveTo(tQ + 4, yLow); ctx.lineTo(getX(totalT), yLow);
                    ctx.stroke();

                    ctx.fillStyle = '#cbd5e1';
                    ctx.font = '10px "JetBrains Mono", monospace';
                    ctx.fillText('0xAA', getX(4), rowY + 3);
                    ctx.fillText(this.violationState === 'ok' ? '0x55' : 'METASTABLE', tQ + 14, rowY + 3);
                }
            });

            // Canlı Tarama Çizgisi (Simülasyon çalışırken)
            if (this.isRunning) {
                const scanX = getX(this.scanTime);
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(scanX, padT - 5); ctx.lineTo(scanX, h - 25);
                ctx.stroke();

                ctx.fillStyle = '#38bdf8';
                ctx.font = '10px "JetBrains Mono", monospace';
                ctx.fillText(this.scanTime.toFixed(1) + ' ns', Math.min(w - padR - 35, Math.max(padL, scanX - 14)), padT - 8);
            }

            // Hover Dikey Çizgisi
            if (this.hoverInfo && this.hoverInfo.x >= padL && this.hoverInfo.x <= w - padR) {
                const hx = this.hoverInfo.x;
                const tHover = ((hx - padL) / plotW) * totalT;

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
                ctx.setLineDash([2, 2]);
                ctx.beginPath();
                ctx.moveTo(hx, padT - 10); ctx.lineTo(hx, h - 25);
                ctx.stroke();
                ctx.setLineDash([]);

                const lines = [
                    'İmleç Zamanı: ' + tHover.toFixed(2) + ' ns',
                    'Clk Kenarı: ' + this.clkPeriod + ' ns',
                    'Data Skew: ' + this.dataSkew.toFixed(1) + ' ns'
                ];
                if (typeof renderCanvasHoverTooltip === 'function') {
                    renderCanvasHoverTooltip(ctx, w, h, hx, this.hoverInfo.y, lines, '#38bdf8');
                }
            }
        }
    };

    window.LogicTimingModule = LogicTimingModule;
    if (window.SimManager) {
        window.SimManager.register('logic_timing', {
            stop: () => LogicTimingModule.stop(),
            isRunning: () => LogicTimingModule.isRunning
        });
    }
})(window);
