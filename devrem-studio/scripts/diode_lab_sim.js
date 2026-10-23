/**
 * EEM REHBER / DEVREM STUDIO - DİYOT & ZENER REGÜLATÖRÜ / KIRPICI & KENETLEYİCİ LAB
 * 
 * Elektronik 1 & Yarıiletkenler:
 * 1. Zener Gerilim Regülatörü: Dalgalı DC giriş, Rs seri direnci, Vz Zener gerilimi, RL yük direnci
 *    - Hat (Line) & Yük (Load) regülasyonu, Pz zener güç kaybı, Iz,min ve Iz,max sınırları
 * 2. Diyot Kırpıcı (Clipper): Pozitif, negatif ve çift yönlü kırpıcı, Vbias referans gerilimi
 * 3. Diyot Kenetleyici (Clamper): Pozitif/negatif DC seviye kaydırıcı (DC Restorer)
 * - Çift Kanvas Osiloskop: Zaman domeni dalga formu + Transfer karakteristiği (Vout - Vin)
 */
(function(window) {
    'use strict';

    const DiodeLabModule = {
        mode: 'zener', // 'zener' | 'clipper' | 'clamper'
        isRunning: false,
        animFrameId: null,
        timePhase: 0,

        // Zener Ayarları
        zener: {
            vinDc: 15.0,    // V (Ortalama DC)
            vinRipple: 2.5, // V (Şebeke dalgalanması peak)
            rs: 100,        // Ohm (Seri direnç)
            vz: 5.1,        // V (Zener gerilimi)
            pzMax: 1.0,     // Watt (Maksimum zener gücü)
            rl: 220         // Ohm (Yük direnci)
        },

        // Kırpıcı Ayarları
        clipper: {
            vinAmp: 10.0,   // V (Giriş sinüs genliği)
            freq: 50,       // Hz
            type: 'pos',    // 'pos' | 'neg' | 'dual'
            vBias: 3.0,     // V
            diodeVf: 0.7    // V (Silisyum bariyeri)
        },

        // Kenetleyici Ayarları
        clamper: {
            vinAmp: 8.0,    // V
            freq: 50,       // Hz
            type: 'pos',    // 'pos' (yukarı öteler) | 'neg' (aşağı öteler)
            vBias: 2.0      // V
        },

        init: function() {
            this.bindEvents();
            this.calculate();
            this.render();
            if (window.SimManager) {
                window.SimManager.register('diode_lab', {
                    stop: () => this.stop(),
                    isRunning: () => this.isRunning,
                    resume: () => { if (this.isRunning) this.startLoop(); }
                });
            }
        },

        setMode: function(m) {
            this.mode = m;
            document.querySelectorAll('.btn-diode-mode').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-mode') === m);
            });
            document.querySelectorAll('.diode-mode-controls').forEach(g => {
                g.style.display = (g.getAttribute('data-mode') === m) ? 'block' : 'none';
            });
            this.calculate();
            this.render();
        },

        togglePlay: function() {
            this.isRunning = !this.isRunning;
            this.updatePlayButton();
            if (this.isRunning) {
                if (window.SimManager) window.SimManager.notifyStarted('diode_lab');
                this.startLoop();
            } else {
                if (this.animFrameId) {
                    cancelAnimationFrame(this.animFrameId);
                    this.animFrameId = null;
                }
                if (window.SimManager) window.SimManager.notifyStopped('diode_lab');
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
                this.timePhase += 0.05;
                if (this.timePhase > Math.PI * 2) this.timePhase -= Math.PI * 2;
                this.render();
                this.animFrameId = requestAnimationFrame(step);
            };
            this.animFrameId = requestAnimationFrame(step);
        },

        updatePlayButton: function() {
            const btn = document.getElementById('btnDiodePlay');
            if (btn) {
                btn.innerHTML = this.isRunning
                    ? '<i class="fas fa-pause"></i> <span>Durdur</span>'
                    : '<i class="fas fa-play"></i> <span>Canlı Osiloskobu Başlat</span>';
                btn.classList.toggle('is-running', this.isRunning);
            }
        },

        loadPreset: function(pKey) {
            if (pKey === 'zener_ok') {
                this.setMode('zener');
                this.zener.vinDc = 15;
                this.zener.vinRipple = 2.0;
                this.zener.rs = 100;
                this.zener.vz = 5.1;
                this.zener.rl = 330;
            } else if (pKey === 'zener_overload') {
                this.setMode('zener');
                this.zener.vinDc = 12;
                this.zener.rs = 220;
                this.zener.vz = 9.1;
                this.zener.rl = 100; // Yük akımı çok yüksek, zener regülasyondan çıkar
            } else if (pKey === 'clipper_dual') {
                this.setMode('clipper');
                this.clipper.type = 'dual';
                this.clipper.vinAmp = 12;
                this.clipper.vBias = 4.0;
            } else if (pKey === 'clamper_pos') {
                this.setMode('clamper');
                this.clamper.type = 'pos';
                this.clamper.vinAmp = 10;
                this.clamper.vBias = 0;
            }
            this.syncControls();
            this.calculate();
            this.render();
        },

        syncControls: function() {
            const elVin = document.getElementById('diodeZenerVin');
            if (elVin) elVin.value = this.zener.vinDc;
            const elRs = document.getElementById('diodeZenerRs');
            if (elRs) elRs.value = this.zener.rs;
            const elRl = document.getElementById('diodeZenerRl');
            if (elRl) elRl.value = this.zener.rl;
            const elClipVb = document.getElementById('diodeClipBias');
            if (elClipVb) elClipVb.value = this.clipper.vBias;
        },

        calculate: function() {
            if (this.mode === 'zener') {
                const vin = this.zener.vinDc;
                const rs = this.zener.rs;
                const rl = this.zener.rl;
                const vz = this.zener.vz;
                const pzMax = this.zener.pzMax;

                // Boşta/Zenersiz gerilim bölücü çıkışı
                const vUnloaded = vin * (rl / (rs + rl));

                let vOut, is, il, iz, pz, status, statusColor;

                if (vUnloaded < vz) {
                    // Zener iletime geçemedi (Regülasyon dışı)
                    vOut = vUnloaded;
                    is = (vin - vOut) / rs;
                    il = vOut / rl;
                    iz = 0;
                    pz = 0;
                    status = 'DÜŞÜK GİRİŞ / REGÜLASYON DIŞI (Vout = ' + vOut.toFixed(2) + 'V < Vz)';
                    statusColor = '#f59e0b';
                } else {
                    // Zener regülasyonda
                    vOut = vz;
                    is = (vin - vOut) / rs;
                    il = vOut / rl;
                    iz = is - il;
                    pz = iz * vz;

                    if (pz > pzMax) {
                        status = 'AŞIRI ISINMA TEHLİKESİ! Pz = ' + (pz * 1000).toFixed(0) + 'mW > ' + (pzMax * 1000) + 'mW';
                        statusColor = '#ef4444';
                    } else if (iz < 0.005) {
                        status = 'KRİTİK SINIR (Iz < 5mA, Zener kırılma dizine çok yakın)';
                        statusColor = '#eab308';
                    } else {
                        status = 'MÜKEMMEL REGÜLASYON (Vout = ' + vz.toFixed(2) + 'V Kararlı)';
                        statusColor = '#10b981';
                    }
                }

                this.zenerResults = {
                    vOut, is: is * 1000, il: il * 1000, iz: iz * 1000, pz: pz * 1000, status, statusColor
                };
            }
        },

        bindEvents: function() {
            // Slider değişikliklerini dinle
            const addInp = (id, fn) => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('input', fn);
            };

            addInp('diodeZenerVin', (e) => {
                this.zener.vinDc = parseFloat(e.target.value) || 12;
                this.calculate();
                this.render();
            });
            addInp('diodeZenerRs', (e) => {
                this.zener.rs = parseFloat(e.target.value) || 100;
                this.calculate();
                this.render();
            });
            addInp('diodeZenerRl', (e) => {
                this.zener.rl = parseFloat(e.target.value) || 330;
                this.calculate();
                this.render();
            });
            addInp('diodeClipBias', (e) => {
                this.clipper.vBias = parseFloat(e.target.value) || 0;
                this.render();
            });
        },

        render: function() {
            const canvas = document.getElementById('diodeScopeCanvas');
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

            // Ekranı İkiye Böl: Sol %62 Osiloskop (Zaman), Sağ %38 Transfer Karakteristiği (XY)
            const splitX = Math.round(cssW * 0.62);

            this.drawGrid(ctx, 0, 0, splitX, cssH, isLight);
            this.drawGrid(ctx, splitX, 0, cssW - splitX, cssH, isLight);

            // Ayırıcı çizgi
            ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(56,189,248,0.2)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(splitX, 0);
            ctx.lineTo(splitX, cssH);
            ctx.stroke();

            if (this.mode === 'zener') {
                this.renderZenerMode(ctx, splitX, cssH, cssW, isLight);
            } else if (this.mode === 'clipper') {
                this.renderClipperMode(ctx, splitX, cssH, cssW, isLight);
            } else if (this.mode === 'clamper') {
                this.renderClamperMode(ctx, splitX, cssH, cssW, isLight);
            }
        },

        drawGrid: function(ctx, x, y, w, h, isLight) {
            ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(56,189,248,0.06)';
            ctx.lineWidth = 1;
            const step = 35;
            for (let gx = x; gx < x + w; gx += step) {
                ctx.beginPath();
                ctx.moveTo(gx, y);
                ctx.lineTo(gx, y + h);
                ctx.stroke();
            }
            for (let gy = y; gy < y + h; gy += step) {
                ctx.beginPath();
                ctx.moveTo(x, gy);
                ctx.lineTo(x + w, gy);
                ctx.stroke();
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // ZENER REGÜLATÖR RENDERER
        // ═══════════════════════════════════════════════════════════════
        renderZenerMode: function(ctx, splitX, h, totalW, isLight) {
            const midY = h * 0.55;
            const scaleY = 9.0; // px / Volt

            // Eksenler (0V referansı)
            ctx.strokeStyle = isLight ? '#cbd5e1' : '#334155';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(40, midY);
            ctx.lineTo(splitX - 10, midY);
            ctx.stroke();

            ctx.fillStyle = isLight ? '#64748b' : '#94a3b8';
            ctx.font = '500 10px JetBrains Mono, monospace';
            ctx.fillText('0V Şasi', 42, midY - 4);

            // Giriş Dalgalı Vin(t) = VinDC + VinRipple * sin(wt)
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            const ptsCount = 200;
            for (let i = 0; i < ptsCount; i++) {
                const px = 40 + (i / ptsCount) * (splitX - 60);
                const t = (i / ptsCount) * Math.PI * 4 + this.timePhase;
                const vinInst = this.zener.vinDc + this.zener.vinRipple * Math.sin(t);
                const py = midY - vinInst * scaleY;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Çıkış Regüle Gerilimi Vout(t)
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2.8;
            ctx.beginPath();
            for (let i = 0; i < ptsCount; i++) {
                const px = 40 + (i / ptsCount) * (splitX - 60);
                const t = (i / ptsCount) * Math.PI * 4 + this.timePhase;
                const vinInst = this.zener.vinDc + this.zener.vinRipple * Math.sin(t);
                const vUnloaded = vinInst * (this.zener.rl / (this.zener.rs + this.zener.rl));
                const vOutInst = (vUnloaded < this.zener.vz) ? vUnloaded : this.zener.vz;
                const py = midY - vOutInst * scaleY;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Legend
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 11px JetBrains Mono, monospace';
            ctx.fillText('Vin(t) [Dalgalı Giriş: ' + this.zener.vinDc.toFixed(1) + 'V ± ' + this.zener.vinRipple.toFixed(1) + 'V]', 40, 24);

            ctx.fillStyle = '#10b981';
            ctx.fillText('Vout(t) [Regüle Çıkış: ' + this.zenerResults.vOut.toFixed(2) + 'V]', 40, 42);

            // Durum Rozeti
            ctx.fillStyle = this.zenerResults.statusColor;
            ctx.font = 'bold 11.5px Inter, sans-serif';
            ctx.fillText('Durum: ' + this.zenerResults.status, 40, h - 16);

            // SAĞ TARAF: Zener I-V Karakteristiği & Çalışma Noktası Q
            this.renderZenerIvCurve(ctx, splitX + 20, 30, totalW - splitX - 40, h - 60, isLight);
        },

        renderZenerIvCurve: function(ctx, x, y, w, h, isLight) {
            ctx.fillStyle = isLight ? '#0f172a' : '#38bdf8';
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.fillText('Zener I-V Karakteristiği', x, y);

            const ox = x + w * 0.7;
            const oy = y + h * 0.35;

            // Eksenler
            ctx.strokeStyle = isLight ? '#94a3b8' : '#475569';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x, oy);
            ctx.lineTo(x + w, oy); // V ekseni
            ctx.moveTo(ox, y + 10);
            ctx.lineTo(ox, y + h); // I ekseni
            ctx.stroke();

            ctx.fillStyle = isLight ? '#64748b' : '#94a3b8';
            ctx.font = '9px JetBrains Mono, monospace';
            ctx.fillText('+V', x + w - 16, oy - 4);
            ctx.fillText('-V', x + 4, oy - 4);
            ctx.fillText('+I', ox + 4, y + 18);
            ctx.fillText('-I', ox + 4, y + h - 4);

            // Zener Kırılma Eğrisi (Ters Polarizasyon)
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(ox + w * 0.25, oy - 40); // İleri iletim
            ctx.lineTo(ox + 10, oy - 2);
            ctx.lineTo(ox, oy);
            ctx.lineTo(ox - w * 0.45, oy); // Ters sızıntı
            ctx.lineTo(ox - w * 0.45, y + h - 10); // Kırılma (Zener dik düşüş)
            ctx.stroke();

            // Çalışma Noktası Q
            const qV = ox - w * 0.45;
            const qI = oy + Math.min(h * 0.5, (this.zenerResults.iz / 100) * (h * 0.45));
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(qV, qI, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 10px JetBrains Mono, monospace';
            ctx.fillText('Q Noktası (Iz = ' + this.zenerResults.iz.toFixed(1) + 'mA)', qV + 8, qI + 4);
        },

        // ═══════════════════════════════════════════════════════════════
        // DİYOT KIRPICI (CLIPPER) RENDERER
        // ═══════════════════════════════════════════════════════════════
        renderClipperMode: function(ctx, splitX, h, totalW, isLight) {
            const midY = h * 0.5;
            const scaleY = 12.0;

            // Giriş ve Çıkış Dalga Formları
            ctx.strokeStyle = isLight ? '#cbd5e1' : '#334155';
            ctx.beginPath();
            ctx.moveTo(40, midY);
            ctx.lineTo(splitX - 10, midY);
            ctx.stroke();

            const ptsCount = 200;
            // Vin(t) Sinüs
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            for (let i = 0; i < ptsCount; i++) {
                const px = 40 + (i / ptsCount) * (splitX - 60);
                const t = (i / ptsCount) * Math.PI * 4 + this.timePhase;
                const vin = this.clipper.vinAmp * Math.sin(t);
                const py = midY - vin * scaleY;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Vout(t) Kırpılmış
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            const clipLevelPos = this.clipper.vBias + this.clipper.diodeVf;
            const clipLevelNeg = -(this.clipper.vBias + this.clipper.diodeVf);

            for (let i = 0; i < ptsCount; i++) {
                const px = 40 + (i / ptsCount) * (splitX - 60);
                const t = (i / ptsCount) * Math.PI * 4 + this.timePhase;
                const vin = this.clipper.vinAmp * Math.sin(t);
                let vout = vin;
                if (this.clipper.type === 'pos' && vin > clipLevelPos) {
                    vout = clipLevelPos;
                } else if (this.clipper.type === 'neg' && vin < clipLevelNeg) {
                    vout = clipLevelNeg;
                } else if (this.clipper.type === 'dual') {
                    if (vin > clipLevelPos) vout = clipLevelPos;
                    if (vin < clipLevelNeg) vout = clipLevelNeg;
                }
                const py = midY - vout * scaleY;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();

            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 11px JetBrains Mono, monospace';
            ctx.fillText('Vin (Referans Sinüs: ±' + this.clipper.vinAmp + 'V)', 40, 24);
            ctx.fillStyle = '#38bdf8';
            ctx.fillText('Vout (Kırpılmış Çıkış, Vbias=' + this.clipper.vBias + 'V)', 40, 42);

            // Sağ Taraf: Vout - Vin Transfer Eğrisi
            this.renderTransferCurve(ctx, splitX + 20, 30, totalW - splitX - 40, h - 60, isLight, (vin) => {
                let vout = vin;
                if (this.clipper.type === 'pos' && vin > clipLevelPos) vout = clipLevelPos;
                if (this.clipper.type === 'neg' && vin < clipLevelNeg) vout = clipLevelNeg;
                if (this.clipper.type === 'dual') {
                    if (vin > clipLevelPos) vout = clipLevelPos;
                    if (vin < clipLevelNeg) vout = clipLevelNeg;
                }
                return vout;
            }, this.clipper.vinAmp);
        },

        // ═══════════════════════════════════════════════════════════════
        // DİYOT KENETLEYİCİ (CLAMPER) RENDERER
        // ═══════════════════════════════════════════════════════════════
        renderClamperMode: function(ctx, splitX, h, totalW, isLight) {
            const midY = h * 0.5;
            const scaleY = 11.0;

            ctx.strokeStyle = isLight ? '#cbd5e1' : '#334155';
            ctx.beginPath();
            ctx.moveTo(40, midY);
            ctx.lineTo(splitX - 10, midY);
            ctx.stroke();

            const ptsCount = 200;
            // Vin(t)
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            for (let i = 0; i < ptsCount; i++) {
                const px = 40 + (i / ptsCount) * (splitX - 60);
                const t = (i / ptsCount) * Math.PI * 4 + this.timePhase;
                const vin = this.clamper.vinAmp * Math.sin(t);
                const py = midY - vin * scaleY;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Vout(t) Kenetlenmiş (DC Restored)
            // Pozitif kenetleyici: dalgayı yukarı öteler (en alt noktası Vbias - 0.7V olur)
            const dcShift = (this.clamper.type === 'pos')
                ? (this.clamper.vinAmp + this.clamper.vBias - 0.7)
                : (-this.clamper.vinAmp - this.clamper.vBias + 0.7);

            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            for (let i = 0; i < ptsCount; i++) {
                const px = 40 + (i / ptsCount) * (splitX - 60);
                const t = (i / ptsCount) * Math.PI * 4 + this.timePhase;
                const vin = this.clamper.vinAmp * Math.sin(t);
                const vout = vin + dcShift;
                const py = midY - vout * scaleY;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();

            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 11px JetBrains Mono, monospace';
            ctx.fillText('Vin (Giriş AC: ±' + this.clamper.vinAmp + 'V, Vp-p = ' + (this.clamper.vinAmp * 2) + 'V)', 40, 24);
            ctx.fillStyle = '#a855f7';
            ctx.fillText('Vout (Kenetlenmiş: Tepe-Tepe Korundu, DC Öteleme = ' + dcShift.toFixed(1) + 'V)', 40, 42);

            // Sağ Taraf
            this.renderTransferCurve(ctx, splitX + 20, 30, totalW - splitX - 40, h - 60, isLight, (vin) => {
                return vin + dcShift;
            }, this.clamper.vinAmp);
        },

        renderTransferCurve: function(ctx, x, y, w, h, isLight, transferFn, maxVin) {
            ctx.fillStyle = isLight ? '#0f172a' : '#38bdf8';
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.fillText('Vout - Vin Transfer Eğrisi', x, y);

            const cx = x + w * 0.5;
            const cy = y + h * 0.55;

            // Eksenler
            ctx.strokeStyle = isLight ? '#94a3b8' : '#475569';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x, cy);
            ctx.lineTo(x + w, cy); // Vin
            ctx.moveTo(cx, y + 10);
            ctx.lineTo(cx, y + h); // Vout
            ctx.stroke();

            ctx.fillStyle = isLight ? '#64748b' : '#94a3b8';
            ctx.font = '9px JetBrains Mono, monospace';
            ctx.fillText('Vin', x + w - 16, cy - 4);
            ctx.fillText('Vout', cx + 4, y + 18);

            const scaleX = (w * 0.42) / maxVin;
            const scaleY = (h * 0.42) / maxVin;

            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            const steps = 60;
            for (let i = 0; i <= steps; i++) {
                const vin = -maxVin + (i / steps) * (2 * maxVin);
                const vout = transferFn(vin);
                const px = cx + vin * scaleX;
                const py = cy - vout * scaleY;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
    };

    window.DiodeLabModule = DiodeLabModule;
})(window);
