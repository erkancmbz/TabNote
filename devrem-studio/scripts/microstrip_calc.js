/**
 * EEM REHBER / DEVREM STUDIO - RF MİKROŞERİT HAT (MICROSTRIP) EMPEDANS HESAPLAYICISI
 * IPC-2141 & Hammerstad/Wheeler formülleriyle analiz (W -> Z0) ve sentez (Z0 -> W) modları
 * HiDPI & Responsive Kanvas Çizimi, İnteraktif Katman & Alan İnceleme İmleci
 */
(function(window) {
    'use strict';

    const MicrostripModule = {
        calcMode: 'analyze', // 'analyze' (W -> Z0) veya 'synthesize' (Z0 -> W)
        lastData: null,
        hoverInfo: null,
        eventsBound: false,

        init: function() {
            this.bindEvents();
            this.calculate();
        },

        setCalcMode: function(mode) {
            this.calcMode = mode;
            if (typeof document !== 'undefined') {
                const wGroup = document.getElementById('uStripWGroup');
                const zGroup = document.getElementById('uStripTargetZGroup');
                if (wGroup && zGroup) {
                    if (mode === 'analyze') {
                        wGroup.style.display = 'block';
                        zGroup.style.display = 'none';
                    } else {
                        wGroup.style.display = 'none';
                        zGroup.style.display = 'block';
                    }
                }
                document.querySelectorAll('.ustrip-mode-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
                });
            }
            this.calculate();
        },

        setPresetEr: function(val) {
            if (typeof document !== 'undefined') {
                const erInput = document.getElementById('uStripEr');
                if (erInput) {
                    erInput.value = val;
                    this.calculate();
                }
            }
        },

        setElText: function(id, text) {
            if (typeof document === 'undefined') return;
            const el = document.getElementById(id);
            if (el) el.innerText = text;
        },

        bindEvents: function() {
            if (typeof document === 'undefined') return;
            const canvas = document.getElementById('uStripCanvas');
            if (!canvas || !canvas.addEventListener || this.eventsBound) return;
            this.eventsBound = true;

            const onMove = (e) => {
                if (!this.lastData) return;
                const rect = canvas.getBoundingClientRect();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                const mx = clientX - rect.left;
                const my = clientY - rect.top;
                this.hoverInfo = { x: mx, y: my, active: true };
                this.drawCrossSection(
                    this.lastData.w,
                    this.lastData.h,
                    this.lastData.tUm,
                    this.lastData.er,
                    this.lastData.z0,
                    this.hoverInfo
                );
            };

            const onLeave = () => {
                if (!this.lastData) return;
                this.hoverInfo = null;
                this.drawCrossSection(
                    this.lastData.w,
                    this.lastData.h,
                    this.lastData.tUm,
                    this.lastData.er,
                    this.lastData.z0,
                    null
                );
                const infoEl = document.getElementById('uStripCursorInfo');
                if (infoEl) {
                    infoEl.innerHTML = '<i class="fas fa-crosshairs"></i> Mikroşerit kesitinde imleci gezdirerek bakır hat, dielektrik altlık ve saçaklanma alanını inceleyin';
                }
            };

            canvas.addEventListener('mousemove', onMove);
            canvas.addEventListener('mouseleave', onLeave);
            canvas.addEventListener('touchmove', onMove, { passive: true });
            canvas.addEventListener('touchend', onLeave);

            window.addEventListener('resize', () => {
                if (this.lastData) {
                    this.drawCrossSection(
                        this.lastData.w,
                        this.lastData.h,
                        this.lastData.tUm,
                        this.lastData.er,
                        this.lastData.z0,
                        this.hoverInfo
                    );
                }
            });
        },

        calculate: function() {
            if (typeof document === 'undefined') return;
            const er = parseFloat(document.getElementById('uStripEr')?.value) || 4.4;
            const h = parseFloat(document.getElementById('uStripH')?.value) || 1.6; // mm
            const tUm = parseFloat(document.getElementById('uStripT')?.value) || 35; // um
            const fGhz = parseFloat(document.getElementById('uStripFreq')?.value) || 2.4; // GHz
            const t = tUm / 1000; // mm cinsine çevir

            let w = 0;
            let z0 = 0;
            let eEff = 0;

            if (this.calcMode === 'synthesize') {
                const targetZ0 = parseFloat(document.getElementById('uStripTargetZ')?.value) || 50;
                w = this.synthesizeWidth(targetZ0, er, h, t);
                const wInput = document.getElementById('uStripW');
                if (wInput) wInput.value = w.toFixed(3);
                z0 = targetZ0;
                eEff = this.calcEeff(w, h, er, t);
            } else {
                w = parseFloat(document.getElementById('uStripW')?.value) || 3.0;
                const res = this.calcZ0(w, h, er, t);
                z0 = res.z0;
                eEff = res.eEff;
            }

            // Gecikme (Propagation Delay): t_pd = sqrt(eEff) / c (ps/mm)
            const c = 299792458; // m/s
            const tpdPsPerMm = (Math.sqrt(eEff) / (c * 1e-9)); // ps/mm
            const tpdPsPerInch = tpdPsPerMm * 25.4;

            // Kılavuz Dalga Boyu: lambda_g = c / (f * sqrt(eEff)) mm
            const fHz = fGhz * 1e9;
            const lambdaGmm = (c / (fHz * Math.sqrt(eEff))) * 1000;

            // DOM Çıktıları
            this.setElText('uStripResZ0', z0.toFixed(2) + ' Ω');
            this.setElText('uStripResEeff', eEff.toFixed(3));
            this.setElText('uStripResW', w.toFixed(3) + ' mm');
            this.setElText('uStripResWhRatio', (w / h).toFixed(3));
            this.setElText('uStripResDelay', tpdPsPerMm.toFixed(2) + ' ps/mm (' + tpdPsPerInch.toFixed(1) + ' ps/in)');
            this.setElText('uStripResLambda', lambdaGmm.toFixed(2) + ' mm (@ ' + fGhz + ' GHz)');

            this.lastData = { w, h, tUm, er, z0, eEff, tpdPsPerMm, lambdaGmm, fGhz };
            this.drawCrossSection(w, h, tUm, er, z0, this.hoverInfo);
        },

        // Hammerstad / Jensen formülleri ile Z0 ve Eeff hesabı
        calcZ0: function(w, h, er, t) {
            // Kalınlık düzeltmesi (Effective Width we)
            let we = w;
            if (t > 0) {
                const deltaW = (t / Math.PI) * (1 + Math.log((2 * h) / t));
                we = w + deltaW;
            }

            const u = we / h;
            const eta0 = 376.73; // Boş uzay empedansı (~120*pi)

            // Düşük frekans etkin dielektrik sabiti
            const a = 1 + (1 / 49) * Math.log((Math.pow(u, 4) + Math.pow(u / 52, 2)) / (Math.pow(u, 4) + 0.432)) + (1 / 18.7) * Math.log(1 + Math.pow(u / 18.1, 3));
            const b = 0.564 * Math.pow((er - 0.9) / (er + 3), 0.053);
            const eEff = ((er + 1) / 2) + (((er - 1) / 2) * Math.pow(1 + (10 / u), -a * b));

            // Z0 hesabı
            const f_u = 6 + (2 * Math.PI - 6) * Math.exp(-Math.pow(30.666 / u, 0.7528));
            const z0 = (eta0 / (2 * Math.PI * Math.sqrt(eEff))) * Math.log((f_u / u) + Math.sqrt(1 + Math.pow(2 / u, 2)));

            return { z0: z0, eEff: eEff };
        },

        calcEeff: function(w, h, er, t) {
            return this.calcZ0(w, h, er, t).eEff;
        },

        // Wheeler sentez formülü ile hedef Z0'dan W bulma
        synthesizeWidth: function(targetZ0, er, h, t) {
            const eta0 = 376.73;
            const A = (targetZ0 / 60) * Math.sqrt((er + 1) / 2) + ((er - 1) / (er + 1)) * (0.23 + (0.11 / er));
            const B = (377 * Math.PI) / (2 * targetZ0 * Math.sqrt(er));

            let u = 0;
            if (A > 1.52) {
                u = (8 * Math.exp(A)) / (Math.exp(2 * A) - 2);
            } else {
                u = (2 / Math.PI) * (B - 1 - Math.log(2 * B - 1) + ((er - 1) / (2 * er)) * (Math.log(B - 1) + 0.39 - (0.61 / er)));
            }

            let w = u * h;
            // Küçük kalınlık düzeltmesi
            if (t > 0) {
                const deltaW = (t / Math.PI) * (1 + Math.log((2 * h) / t));
                w = Math.max(0.05, w - deltaW * 0.5);
            }
            return Math.max(0.1, w);
        },

        drawCrossSection: function(w, h, tUm, er, z0, hoverInfo = null) {
            if (typeof document === 'undefined') return;
            const canvas = document.getElementById('uStripCanvas');
            if (!canvas || !canvas.getContext) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            if (!this.eventsBound) {
                this.bindEvents();
            }

            // 1. HiDPI & Duyarlı (Responsive) Boyutlandırma
            const parent = canvas.parentElement;
            const clientW = parent ? parent.clientWidth : 720;
            const targetW = Math.max(320, clientW || 720);
            const targetH = 230;
            const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;

            canvas.width = Math.round(targetW * dpr);
            canvas.height = Math.round(targetH * dpr);
            canvas.style.width = targetW + 'px';
            canvas.style.height = targetH + 'px';

            if (ctx.setTransform) {
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            }

            const cW = targetW;
            const cH = targetH;

            ctx.clearRect(0, 0, cW, cH);

            // 2. Koyu RF Osiloskop / Laboratuvar Arka Planı
            const bgGrad = ctx.createLinearGradient(0, 0, 0, cH);
            bgGrad.addColorStop(0, '#090e1c');
            bgGrad.addColorStop(1, '#050812');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, cW, cH);

            // Hassas Laboratuvar Izgarası
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
            ctx.lineWidth = 1;
            for (let x = 30; x < cW; x += 30) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, cH);
                ctx.stroke();
            }
            for (let y = 30; y < cH; y += 30) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(cW, y);
                ctx.stroke();
            }

            // 3. Geometri ve Ölçeklendirme
            const scale = Math.min(26, 120 / Math.max(0.5, h));
            const dieH = Math.min(72, Math.max(34, h * scale));
            const traceW = Math.min(cW - 120, Math.max(26, w * scale));
            const traceH = Math.max(8, Math.min(14, (tUm / 35) * 9)); // Bakır kalınlığı

            const gndH = 8;
            const gndY = cH - 44;
            const dieY = gndY - dieH;
            const dieLeft = 32;
            const dieW = cW - 64;
            const traceX = (cW - traceW) / 2;
            const traceY = dieY - traceH;

            // 4. Dielektrik Katmanı (FR-4 / Substrat)
            const subGrad = ctx.createLinearGradient(0, dieY, 0, gndY);
            subGrad.addColorStop(0, '#064e3b'); // Koyu zümrüt FR-4
            subGrad.addColorStop(1, '#022c22');
            ctx.fillStyle = subGrad;
            ctx.fillRect(dieLeft, dieY, dieW, dieH);

            ctx.strokeStyle = '#059669';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(dieLeft, dieY, dieW, dieH);

            // 5. Alt Toprak Düzlemi (GND Plane)
            const gndGrad = ctx.createLinearGradient(dieLeft - 10, gndY, dieLeft - 10, gndY + gndH);
            gndGrad.addColorStop(0, '#f59e0b'); // Parlak bakır/altın
            gndGrad.addColorStop(0.5, '#d97706');
            gndGrad.addColorStop(1, '#92400e');
            ctx.fillStyle = gndGrad;
            ctx.fillRect(dieLeft - 12, gndY, dieW + 24, gndH);

            ctx.strokeStyle = '#fcd34d';
            ctx.lineWidth = 1;
            ctx.strokeRect(dieLeft - 12, gndY, dieW + 24, gndH);

            // 6. Üst Bakır Mikroşerit Hat (Trace)
            const traceGrad = ctx.createLinearGradient(traceX, traceY, traceX, traceY + traceH);
            traceGrad.addColorStop(0, '#fef08a');
            traceGrad.addColorStop(0.3, '#f59e0b');
            traceGrad.addColorStop(1, '#b45309');
            ctx.fillStyle = traceGrad;
            ctx.fillRect(traceX, traceY, traceW, traceH);

            ctx.strokeStyle = '#fffbeb';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(traceX, traceY, traceW, traceH);

            // 7. Quasi-TEM Elektrik Alan Çizgileri (E-Field)
            ctx.save();
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
            ctx.lineWidth = 1.2;
            ctx.setLineDash([4, 3]);

            // Düşey doğrudan alan çizgileri (Hat altı)
            const stepCount = Math.max(3, Math.floor(traceW / 18));
            const stepDx = traceW / (stepCount + 1);
            for (let i = 1; i <= stepCount; i++) {
                const fx = traceX + i * stepDx;
                ctx.beginPath();
                ctx.moveTo(fx, dieY);
                ctx.lineTo(fx, gndY);
                ctx.stroke();

                // Küçük yön oku (E-alanı GND'ye doğru)
                const midY = (dieY + gndY) / 2;
                ctx.beginPath();
                ctx.moveTo(fx - 2.5, midY - 3);
                ctx.lineTo(fx, midY + 2);
                ctx.lineTo(fx + 2.5, midY - 3);
                ctx.stroke();
            }

            // Kenar saçaklanma (Fringing) alanları - Sol
            ctx.beginPath();
            ctx.moveTo(traceX, dieY);
            ctx.bezierCurveTo(traceX - 32, dieY - 6, traceX - 38, gndY - 10, traceX - 18, gndY);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(traceX, dieY);
            ctx.bezierCurveTo(traceX - 18, dieY + 4, traceX - 22, gndY - 6, traceX - 8, gndY);
            ctx.stroke();

            // Kenar saçaklanma (Fringing) alanları - Sağ
            ctx.beginPath();
            ctx.moveTo(traceX + traceW, dieY);
            ctx.bezierCurveTo(traceX + traceW + 32, dieY - 6, traceX + traceW + 38, gndY - 10, traceX + traceW + 18, gndY);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(traceX + traceW, dieY);
            ctx.bezierCurveTo(traceX + traceW + 18, dieY + 4, traceX + traceW + 22, gndY - 6, traceX + traceW + 8, gndY);
            ctx.stroke();
            ctx.restore();

            // 8. Boyut Çizgileri ve Etiketler
            // Genişlik W ölçü çizgisi
            const dimY = traceY - 10;
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(traceX, dimY);
            ctx.lineTo(traceX + traceW, dimY);
            ctx.moveTo(traceX, dimY - 4);
            ctx.lineTo(traceX, dimY + 4);
            ctx.moveTo(traceX + traceW, dimY - 4);
            ctx.lineTo(traceX + traceW, dimY + 4);
            ctx.stroke();

            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`W = ${w.toFixed(2)} mm (t = ${tUm} µm)`, traceX + traceW / 2, dimY - 6);

            // Altlık Yüksekliği h ölçü çizgisi
            const dimHX = dieLeft - 16;
            ctx.strokeStyle = '#64748b';
            ctx.beginPath();
            ctx.moveTo(dimHX, dieY);
            ctx.lineTo(dimHX, gndY);
            ctx.moveTo(dimHX - 3, dieY);
            ctx.lineTo(dimHX + 3, dieY);
            ctx.moveTo(dimHX - 3, gndY);
            ctx.lineTo(dimHX + 3, gndY);
            ctx.stroke();

            ctx.fillStyle = '#34d399';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`h = ${h.toFixed(2)} mm`, dimHX - 4, (dieY + gndY) / 2 + 3);

            // Katman İsimleri
            ctx.fillStyle = '#34d399';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`Dielektrik Altlık (FR-4): εr = ${er.toFixed(2)}`, dieLeft + 12, dieY + 18);

            ctx.fillStyle = '#fbbf24';
            ctx.font = '10px Inter, sans-serif';
            ctx.fillText('GND Toprak Referans Düzlemi (V = 0V)', dieLeft + 12, gndY + 22);

            // 9. Sol-Üst RF Parametreleri Rozeti (Sağ üstteki butonlarla çakışmaz!)
            const badgeX = 14;
            const badgeY = 12;
            const badgeW = 275;
            const badgeH = 28;

            ctx.save();
            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.lineWidth = 1;
            if (ctx.roundRect) {
                ctx.beginPath();
                ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
                ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
            }

            ctx.textAlign = 'left';
            ctx.font = 'bold 12px JetBrains Mono, monospace';
            ctx.fillStyle = '#38bdf8';
            ctx.fillText(`Z₀ = ${z0.toFixed(1)} Ω`, badgeX + 10, badgeY + 19);

            ctx.font = '11px JetBrains Mono, monospace';
            ctx.fillStyle = '#34d399';
            const eEffVal = (this.lastData && this.lastData.eEff) ? this.lastData.eEff.toFixed(2) : (this.calcEeff(w, h, er, tUm/1000)).toFixed(2);
            ctx.fillText(`εeff = ${eEffVal}`, badgeX + 110, badgeY + 19);

            ctx.fillStyle = '#f59e0b';
            const tpdVal = (this.lastData && this.lastData.tpdPsPerMm) ? this.lastData.tpdPsPerMm.toFixed(1) : ((Math.sqrt(parseFloat(eEffVal)) / 0.299792458)).toFixed(1);
            ctx.fillText(`tpd = ${tpdVal} ps/mm`, badgeX + 185, badgeY + 19);
            ctx.restore();

            // 10. İmleç Gezinme, Bölge Tespiti, Işıma ve Floating Tooltip
            if (hoverInfo && hoverInfo.active) {
                const mx = hoverInfo.x;
                const my = hoverInfo.y;

                // Çapraz Nişangah (Crosshair)
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);

                ctx.beginPath();
                ctx.moveTo(mx, 0);
                ctx.lineTo(mx, cH);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, my);
                ctx.lineTo(cW, my);
                ctx.stroke();
                ctx.restore();

                // Bölge Tespiti
                let zoneName = 'Serbest Uzay (Hava)';
                let zoneDesc = 'εr = 1.00 • Elektromanyetik alan saçınımı • Quasi-TEM yayılımı';
                let zoneColor = '#94a3b8';
                let highlightCoords = null;

                const inTrace = mx >= traceX && mx <= traceX + traceW && my >= traceY && my <= dieY;
                const inGnd = mx >= dieLeft - 12 && mx <= dieLeft + dieW + 12 && my >= gndY && my <= gndY + gndH + 8;
                const inDielectric = mx >= dieLeft && mx <= dieLeft + dieW && my >= dieY && my <= gndY;
                const inFringing = (mx < traceX && mx >= traceX - 45 && my >= traceY - 10 && my <= gndY) ||
                                  (mx > traceX + traceW && mx <= traceX + traceW + 45 && my >= traceY - 10 && my <= gndY);

                if (inTrace) {
                    zoneName = 'Mikroşerit İletken Hat (Sinyal Katmanı)';
                    zoneDesc = `W = ${w.toFixed(2)} mm • t = ${tUm} µm • RF Akım Yoğunluğu Tepe Noktası`;
                    zoneColor = '#fbbf24';
                    highlightCoords = [traceX - 2, traceY - 2, traceW + 4, traceH + 4];
                } else if (inGnd) {
                    zoneName = 'GND Toprak Düzlemi (Referans Katmanı)';
                    zoneDesc = `V = 0.0V Dönüş Yolu • Z₀ = ${z0.toFixed(2)} Ω • Kararlı RF Referansı`;
                    zoneColor = '#f59e0b';
                    highlightCoords = [dieLeft - 14, gndY - 1, dieW + 28, gndH + 2];
                } else if (inDielectric) {
                    if (mx >= traceX && mx <= traceX + traceW) {
                        zoneName = 'Dielektrik Altlık (Doğrudan E-Alan Bölgesi)';
                        zoneDesc = `FR-4 Altlık • εr = ${er.toFixed(2)} • h = ${h.toFixed(2)} mm • Yoğun Düşey Akı`;
                        zoneColor = '#38bdf8';
                    } else {
                        zoneName = 'Dielektrik Altlık (Kenar Alanı)';
                        zoneDesc = `FR-4 Altlık • εr = ${er.toFixed(2)} • Saçaklanma akı yolu`;
                        zoneColor = '#34d399';
                    }
                    highlightCoords = [dieLeft, dieY, dieW, dieH];
                } else if (inFringing) {
                    zoneName = 'Kenar Saçaklanma Alanı (Fringing E-Field)';
                    zoneDesc = `Quasi-TEM Modu • Efektif εeff = ${eEffVal} • Kenar Kapasitansı Katkısı`;
                    zoneColor = '#06b6d4';
                }

                // Vurgulama Işıması
                if (highlightCoords) {
                    ctx.save();
                    ctx.strokeStyle = zoneColor;
                    ctx.lineWidth = 2;
                    ctx.shadowColor = zoneColor;
                    ctx.shadowBlur = 8;
                    ctx.strokeRect(...highlightCoords);
                    ctx.restore();
                }

                // İmleç Noktası
                ctx.save();
                ctx.fillStyle = zoneColor;
                ctx.beginPath();
                ctx.arc(mx, my, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.restore();

                // Yüzen HUD Tooltip
                const tipW = 290;
                const tipH = 50;
                let tipX = mx + 14;
                let tipY = my - 58;
                if (tipX + tipW > cW - 10) tipX = mx - tipW - 14;
                if (tipY < 10) tipY = my + 16;
                if (tipX < 10) tipX = 10;

                ctx.save();
                ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
                ctx.strokeStyle = zoneColor;
                ctx.lineWidth = 1.5;
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 10;

                if (ctx.roundRect) {
                    ctx.beginPath();
                    ctx.roundRect(tipX, tipY, tipW, tipH, 6);
                    ctx.fill();
                    ctx.stroke();
                } else {
                    ctx.fillRect(tipX, tipY, tipW, tipH);
                    ctx.strokeRect(tipX, tipY, tipW, tipH);
                }

                ctx.textAlign = 'left';
                ctx.font = 'bold 11px Inter, sans-serif';
                ctx.fillStyle = zoneColor;
                ctx.fillText(zoneName, tipX + 10, tipY + 18);

                ctx.font = '10px Inter, sans-serif';
                ctx.fillStyle = '#cbd5e1';
                ctx.fillText(zoneDesc, tipX + 10, tipY + 36);
                ctx.restore();

                // Bilgi Çubuğu (Info Bar) Güncellemesi
                const infoEl = document.getElementById('uStripCursorInfo');
                if (infoEl) {
                    infoEl.innerHTML = `<i class="fas fa-crosshairs" style="color:${zoneColor}"></i> <strong>${zoneName}:</strong> ${zoneDesc}`;
                }
            }
        }
    };

    window.MicrostripModule = MicrostripModule;

})(typeof window !== 'undefined' ? window : global);
