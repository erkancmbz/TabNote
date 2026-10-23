/**
 * EEM REHBER / DEVREM STUDIO - SMPS BUCK / BOOST GÜÇ ELEKTRONİĞİ TASARIMCISI
 * Buck, Boost ve Buck-Boost dönüştürücü boyutlandırma, kritik endüktans (CCM/DCM) ve canlı dalga formu
 */
(function(window) {
    'use strict';

    const SmpsModule = {
        mode: 'buck', // 'buck', 'boost', 'buckboost'

        calculate: function() {
            const vin = parseFloat(document.getElementById('smpsVin')?.value) || 24;
            const vout = parseFloat(document.getElementById('smpsVout')?.value) || 5;
            const iout = parseFloat(document.getElementById('smpsIout')?.value) || 2;
            const fsKhz = parseFloat(document.getElementById('smpsFs')?.value) || 100;
            const rippleRatio = (parseFloat(document.getElementById('smpsRippleL')?.value) || 30) / 100; // %30
            const vRipplePercent = (parseFloat(document.getElementById('smpsRippleV')?.value) || 1) / 100; // %1

            const fs = fsKhz * 1000;
            const T = 1 / fs;
            const rLoad = vout / (iout || 0.001);

            let D = 0;
            let lMin = 0;
            let cMin = 0;
            let ilAvg = 0;
            let deltaIl = 0;
            let isCcm = true;

            if (this.mode === 'buck') {
                if (vout >= vin) {
                    this.showError('Buck (Düşürücü) modunda Vout, Vin değerinden küçük olmalıdır!');
                    return;
                }
                D = vout / vin;
                ilAvg = iout;
                deltaIl = ilAvg * rippleRatio;
                // L = (Vin - Vout) * D / (fs * deltaIl)
                lMin = (vin - vout) * D / (fs * deltaIl);
                // Kritik L (CCM sınırı): L_crit = (1 - D) * R / (2 * fs)
                const lCrit = ((1 - D) * rLoad) / (2 * fs);
                isCcm = lMin >= lCrit;
                // C_min = deltaIl / (8 * fs * deltaV)
                const deltaV = vout * vRipplePercent;
                cMin = deltaIl / (8 * fs * deltaV);
            } else if (this.mode === 'boost') {
                if (vout <= vin) {
                    this.showError('Boost (Yükseltici) modunda Vout, Vin değerinden büyük olmalıdır!');
                    return;
                }
                D = 1 - (vin / vout);
                ilAvg = iout / (1 - D);
                deltaIl = ilAvg * rippleRatio;
                // L = Vin * D / (fs * deltaIl)
                lMin = (vin * D) / (fs * deltaIl);
                const lCrit = (D * Math.pow(1 - D, 2) * rLoad) / (2 * fs);
                isCcm = lMin >= lCrit;
                // C_min = Iout * D / (fs * deltaV)
                const deltaV = vout * vRipplePercent;
                cMin = (iout * D) / (fs * deltaV);
            } else { // buckboost
                D = vout / (vin + vout);
                ilAvg = iout / (1 - D);
                deltaIl = ilAvg * rippleRatio;
                lMin = (vin * D) / (fs * deltaIl);
                const lCrit = (Math.pow(1 - D, 2) * rLoad) / (2 * fs);
                isCcm = lMin >= lCrit;
                const deltaV = vout * vRipplePercent;
                cMin = (iout * D) / (fs * deltaV);
            }

            this.clearError();

            const lMinUH = lMin * 1e6;
            const cMinUF = cMin * 1e6;
            const ilPeak = ilAvg + (deltaIl / 2);
            const ilMin = Math.max(0, ilAvg - (deltaIl / 2));
            const pOut = vout * iout;

            // DOM Güncellemeleri
            this.setElText('smpsResDuty', (D * 100).toFixed(1) + ' %');
            this.setElText('smpsResL', lMinUH.toFixed(1) + ' µH');
            this.setElText('smpsResC', cMinUF.toFixed(1) + ' µF');
            this.setElText('smpsResIlPeak', ilPeak.toFixed(2) + ' A');
            this.setElText('smpsResIlMin', ilMin.toFixed(2) + ' A');
            this.setElText('smpsResPower', pOut.toFixed(1) + ' W');

            const modeBadge = document.getElementById('smpsModeBadge');
            if (modeBadge) {
                modeBadge.className = 'smps-state-badge ' + (isCcm ? 'state-ccm' : 'state-dcm');
                modeBadge.innerHTML = isCcm ? '<i class="fas fa-check-circle"></i> CCM (Sürekli Akım Modu)' : '<i class="fas fa-exclamation-triangle"></i> DCM (Kesintili Akım Modu)';
            }

            this.lastCalcData = {
                D: D,
                ilMin: ilMin,
                ilPeak: ilPeak,
                ilAvg: ilAvg,
                fs: fs,
                T: T,
                mode: this.mode,
                vin: vin,
                vout: vout,
                iout: iout
            };

            // Dalga biçimini çiz
            this.drawWaveform(D, ilMin, ilPeak, ilAvg, this.hoverInfo);
        },

        setMode: function(m) {
            this.mode = m;
            if (typeof document !== 'undefined') {
                document.querySelectorAll('.smps-mode-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.getAttribute('data-mode') === m);
                });
                const voutInput = document.getElementById('smpsVout');
                if (voutInput) {
                    if (m === 'buck' && parseFloat(voutInput.value) >= 24) voutInput.value = 5;
                    if (m === 'boost' && parseFloat(voutInput.value) <= 12) voutInput.value = 24;
                }
            }
            this.calculate();
        },

        setElText: function(id, text) {
            if (typeof document === 'undefined') return;
            const el = document.getElementById(id);
            if (el) el.innerText = text;
        },

        showError: function(msg) {
            if (typeof document === 'undefined') return;
            const errEl = document.getElementById('smpsErrorBox');
            if (errEl) {
                errEl.innerText = msg;
                errEl.style.display = 'block';
            }
        },

        clearError: function() {
            if (typeof document === 'undefined') return;
            const errEl = document.getElementById('smpsErrorBox');
            if (errEl) errEl.style.display = 'none';
        },

        bindEvents: function() {
            if (typeof document === 'undefined') return;
            const canvas = document.getElementById('smpsCanvas');
            if (!canvas || !canvas.addEventListener || this.eventsBound) return;
            this.eventsBound = true;

            const onMove = (e) => {
                if (!this.lastCalcData) return;
                const rect = canvas.getBoundingClientRect();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                const mx = clientX - rect.left;
                const my = clientY - rect.top;
                this.hoverInfo = { x: mx, y: my, active: true };
                this.drawWaveform(
                    this.lastCalcData.D,
                    this.lastCalcData.ilMin,
                    this.lastCalcData.ilPeak,
                    this.lastCalcData.ilAvg,
                    this.hoverInfo
                );
            };

            const onLeave = () => {
                if (!this.lastCalcData) return;
                this.hoverInfo = null;
                this.drawWaveform(
                    this.lastCalcData.D,
                    this.lastCalcData.ilMin,
                    this.lastCalcData.ilPeak,
                    this.lastCalcData.ilAvg,
                    null
                );
                const infoEl = document.getElementById('smpsCursorInfo');
                if (infoEl) {
                    infoEl.innerHTML = '<i class="fas fa-crosshairs"></i> Dalga formunda imleci gezdirerek anlık zaman, kapı durumu ve akım değerlerini inceleyin';
                }
            };

            canvas.addEventListener('mousemove', onMove);
            canvas.addEventListener('mouseleave', onLeave);
            canvas.addEventListener('touchmove', onMove, { passive: true });
            canvas.addEventListener('touchend', onLeave);

            window.addEventListener('resize', () => {
                if (this.lastCalcData) {
                    this.drawWaveform(
                        this.lastCalcData.D,
                        this.lastCalcData.ilMin,
                        this.lastCalcData.ilPeak,
                        this.lastCalcData.ilAvg,
                        this.hoverInfo
                    );
                }
            });
        },

        drawWaveform: function(D, ilMin, ilPeak, ilAvg, hoverInfo = null) {
            if (typeof document === 'undefined') return;
            const canvas = document.getElementById('smpsCanvas');
            if (!canvas || !canvas.getContext) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            if (!this.eventsBound) {
                this.bindEvents();
            }

            // 1. HiDPI & Responsive Boyutlandırma (Net ve Temiz Çizim)
            const parent = canvas.parentElement;
            const clientW = parent ? parent.clientWidth : 720;
            const targetW = Math.max(300, clientW || 720);
            const targetH = 240;
            const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;

            canvas.width = Math.round(targetW * dpr);
            canvas.height = Math.round(targetH * dpr);
            canvas.style.width = targetW + 'px';
            canvas.style.height = targetH + 'px';

            if (ctx.setTransform) {
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            }

            const w = targetW;
            const h = targetH;

            ctx.clearRect(0, 0, w, h);

            // 2. Koyu Osiloskop Arka Planı
            ctx.fillStyle = '#080d1a';
            ctx.fillRect(0, 0, w, h);

            // Hassas Izgara Hatları
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.lineWidth = 1;
            for (let x = 40; x < w; x += 40) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();
            }
            for (let y = 25; y < h; y += 25) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }

            const padLeft = 72;
            const padRight = 50;
            const padTop = 26;
            const padBottom = 32;
            const wPlot = w - padLeft - padRight;
            const tWidth = wPlot / 2; // 2 Periyot

            // 3. Kanal 1: MOSFET Gate Sinyali (PWM / Mavi)
            const ch1Top = padTop + 8;
            const ch1H = 46;
            const ch1Bottom = ch1Top + ch1H;
            const pwmHighY = ch1Top + 6;
            const pwmLowY = ch1Bottom;

            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.fillText('CH1: MOSFET Gate (PWM)', padLeft, padTop);

            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px JetBrains Mono, monospace';
            ctx.fillText('Duty: %' + (D * 100).toFixed(1), padLeft + 160, padTop);

            // 0V Referans Çizgisi
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padLeft, pwmLowY);
            ctx.lineTo(w - padRight, pwmLowY);
            ctx.stroke();

            // PWM Çizimi
            ctx.beginPath();
            for (let cycle = 0; cycle < 2; cycle++) {
                const startX = padLeft + cycle * tWidth;
                const dX = startX + D * tWidth;
                const endX = startX + tWidth;

                if (cycle === 0) {
                    ctx.moveTo(startX, pwmLowY);
                }
                ctx.lineTo(startX, pwmHighY);
                ctx.lineTo(dX, pwmHighY);
                ctx.lineTo(dX, pwmLowY);
                ctx.lineTo(endX, pwmLowY);
            }

            // PWM Alan Dolgusu
            const pwmGrad = ctx.createLinearGradient(0, pwmHighY, 0, pwmLowY);
            pwmGrad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
            pwmGrad.addColorStop(1, 'rgba(56, 189, 248, 0.02)');
            ctx.save();
            ctx.fillStyle = pwmGrad;
            ctx.lineTo(padLeft + 2 * tWidth, pwmLowY);
            ctx.lineTo(padLeft, pwmLowY);
            ctx.fill();
            ctx.restore();

            // PWM Konturu
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.lineJoin = 'miter';
            ctx.stroke();

            // PWM Seviye Etiketleri
            ctx.fillStyle = '#64748b';
            ctx.font = '9px JetBrains Mono, monospace';
            ctx.fillText('0V', padLeft - 22, pwmLowY + 3);
            ctx.fillStyle = '#38bdf8';
            ctx.fillText('V_GS', padLeft - 32, pwmHighY + 3);

            // 4. İki Kanal Arası Ayraç
            const midY = ch1Bottom + 22;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(padLeft - 10, midY);
            ctx.lineTo(w - padRight + 10, midY);
            ctx.stroke();
            ctx.setLineDash([]);

            // 5. Kanal 2: İndüktör Akımı (i_L / Turuncu)
            const ch2Top = midY + 12;
            const ch2Bottom = h - padBottom - 6;
            const ch2H = ch2Bottom - ch2Top;

            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.fillText('CH2: İndüktör Akımı (i_L)', padLeft, midY - 2);

            const maxCurrent = Math.max(0.5, ilPeak * 1.25);
            const scaleY = ch2H / maxCurrent;

            const yPeak = ch2Bottom - (ilPeak * scaleY);
            const yMin = ch2Bottom - (ilMin * scaleY);
            const yAvg = ch2Bottom - (ilAvg * scaleY);

            // Referans Hatları: 0A, I_min, I_peak, I_avg
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padLeft, ch2Bottom);
            ctx.lineTo(w - padRight, ch2Bottom);
            ctx.stroke();
            ctx.fillStyle = '#64748b';
            ctx.font = '9px JetBrains Mono, monospace';
            ctx.fillText('0 A', padLeft - 26, ch2Bottom + 3);

            // I_min Hattı
            if (ilMin > 0.05) {
                ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
                ctx.setLineDash([2, 4]);
                ctx.beginPath();
                ctx.moveTo(padLeft, yMin);
                ctx.lineTo(w - padRight, yMin);
                ctx.stroke();
                ctx.fillStyle = 'rgba(245, 158, 11, 0.8)';
                ctx.fillText('I_min: ' + ilMin.toFixed(2) + 'A', padLeft - 68, yMin + 3);
            }

            // I_peak Hattı
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(padLeft, yPeak);
            ctx.lineTo(w - padRight, yPeak);
            ctx.stroke();
            ctx.fillStyle = '#f59e0b';
            ctx.fillText('I_peak: ' + ilPeak.toFixed(2) + 'A', padLeft - 70, yPeak + 3);

            // I_avg Hattı (Kırmızı kesikli)
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(padLeft, yAvg);
            ctx.lineTo(w - padRight, yAvg);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.95)';
            ctx.fillText('I_avg: ' + ilAvg.toFixed(2) + 'A', w - padRight + 6, yAvg + 3);

            // İndüktör Akımı Eğrisi Çizimi
            ctx.beginPath();
            for (let cycle = 0; cycle < 2; cycle++) {
                const startX = padLeft + cycle * tWidth;
                const dX = startX + D * tWidth;
                const endX = startX + tWidth;

                if (cycle === 0) {
                    ctx.moveTo(startX, yMin);
                }
                ctx.lineTo(dX, yPeak);
                ctx.lineTo(endX, yMin);
            }

            // İndüktör Alan Dolgusu
            const indGrad = ctx.createLinearGradient(0, yPeak, 0, ch2Bottom);
            indGrad.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
            indGrad.addColorStop(1, 'rgba(245, 158, 11, 0.02)');
            ctx.save();
            ctx.fillStyle = indGrad;
            ctx.lineTo(padLeft + 2 * tWidth, ch2Bottom);
            ctx.lineTo(padLeft, ch2Bottom);
            ctx.fill();
            ctx.restore();

            // İndüktör Konturu
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2.5;
            ctx.lineJoin = 'round';
            ctx.stroke();

            // 6. Zaman Ekseni Çentikleri (X-Axis Ticks)
            const T_s = (this.lastCalcData && this.lastCalcData.T) ? this.lastCalcData.T : 1e-5;
            const T_us = T_s * 1e6;

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.fillStyle = '#94a3b8';
            ctx.font = '9px JetBrains Mono, monospace';

            const drawTick = (x, label) => {
                ctx.beginPath();
                ctx.moveTo(x, ch2Bottom);
                ctx.lineTo(x, ch2Bottom + 4);
                ctx.stroke();
                ctx.fillText(label, x - 12, ch2Bottom + 16);
            };

            drawTick(padLeft, '0');
            drawTick(padLeft + D * tWidth, (D * T_us).toFixed(1) + 'µs');
            drawTick(padLeft + tWidth, T_us.toFixed(1) + 'µs (Ts)');
            drawTick(padLeft + 2 * tWidth, (2 * T_us).toFixed(1) + 'µs (2Ts)');

            // 7. Mouse İmleci Gezinmesi & Değer Gösterimi (Crosshair & Floating HUD)
            if (hoverInfo && hoverInfo.active) {
                let mx = Math.max(padLeft, Math.min(padLeft + wPlot, hoverInfo.x));
                const cycleProg = (mx - padLeft) / tWidth;
                const cycleIdx = Math.floor(cycleProg);
                const tau = cycleProg - cycleIdx; // 0..1 döngü içi kesir
                const curTimeUs = cycleProg * T_us;

                const isHigh = tau <= D;
                const yGateCur = isHigh ? pwmHighY : pwmLowY;

                let iLCur = 0;
                if (isHigh) {
                    const frac = D > 0 ? (tau / D) : 0;
                    iLCur = ilMin + (ilPeak - ilMin) * frac;
                } else {
                    const frac = (1 - D) > 0 ? ((tau - D) / (1 - D)) : 0;
                    iLCur = ilPeak - (ilPeak - ilMin) * frac;
                }
                const yIndCur = ch2Bottom - (iLCur * scaleY);

                // Dikey İmleç Çizgisi
                ctx.save();
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 3]);
                ctx.beginPath();
                ctx.moveTo(mx, padTop);
                ctx.lineTo(mx, ch2Bottom + 6);
                ctx.stroke();
                ctx.restore();

                // PWM Üzerindeki İmleç Noktası
                ctx.save();
                ctx.fillStyle = '#38bdf8';
                ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(mx, yGateCur, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();

                // İndüktör Akımı Üzerindeki İmleç Noktası
                ctx.save();
                ctx.fillStyle = '#f59e0b';
                ctx.shadowColor = 'rgba(245, 158, 11, 0.8)';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(mx, yIndCur, 5.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();

                // Yüzen HUD Tooltip Kutusu
                let tipW = 180;
                let tipH = 72;
                let tipX = mx + 14;
                if (tipX + tipW > w - 10) {
                    tipX = mx - tipW - 14;
                }
                let tipY = Math.max(12, Math.min(h - tipH - 12, hoverInfo.y - tipH / 2));

                ctx.save();
                ctx.fillStyle = 'rgba(8, 13, 26, 0.94)';
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(tipX, tipY, tipW, tipH, 6);
                } else {
                    ctx.rect(tipX, tipY, tipW, tipH);
                }
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#cbd5e1';
                ctx.font = 'bold 10px JetBrains Mono, monospace';
                ctx.fillText('⏱ t = ' + curTimeUs.toFixed(2) + ' µs (' + Math.round(tau * 100) + '% Ts)', tipX + 8, tipY + 16);

                ctx.fillStyle = isHigh ? '#38bdf8' : '#94a3b8';
                ctx.fillText('⚡ Gate: ' + (isHigh ? 'ON (HIGH)' : 'OFF (LOW)'), tipX + 8, tipY + 34);

                ctx.fillStyle = '#f59e0b';
                ctx.fillText('📈 i_L(t): ' + iLCur.toFixed(2) + ' A', tipX + 8, tipY + 52);

                ctx.fillStyle = '#64748b';
                ctx.font = '9px Inter, sans-serif';
                ctx.fillText(isHigh ? '▲ Şarj (L artıyor)' : '▼ Deşarj (Diyot açık)', tipX + 8, tipY + 66);
                ctx.restore();

                // Üst Durum Şeridini Güncelle
                const infoEl = document.getElementById('smpsCursorInfo');
                if (infoEl) {
                    infoEl.innerHTML = `<i class="fas fa-crosshairs" style="color:#38bdf8;"></i> ` +
                        `<strong>t = ${curTimeUs.toFixed(2)} µs</strong> (%${Math.round(tau * 100)} T<sub>s</sub>) • ` +
                        `<strong>MOSFET Gate:</strong> <span style="color:${isHigh ? '#38bdf8' : '#94a3b8'};font-weight:700;">${isHigh ? 'ON (High)' : 'OFF (Low)'}</span> • ` +
                        `<strong>İndüktör Akımı:</strong> <span style="color:#f59e0b;font-weight:700;">${iLCur.toFixed(2)} A</span> • ` +
                        `<span style="color:#94a3b8;">${isHigh ? '⚡ Manyetik Enerji Depolanıyor' : '🔄 Yüke Enerji Aktarımı'}</span>`;
                }
            }
        }
    };

    window.SmpsModule = SmpsModule;

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                if (document.getElementById('smpsCanvas')) {
                    SmpsModule.calculate();
                }
            });
        } else {
            if (document.getElementById('smpsCanvas')) {
                SmpsModule.calculate();
            }
        }
    }

})(window);
