/**
 * EEM REHBER / DEVREM STUDIO - İNTERAKTİF PID KONTROLCÜ & ADIM YANITI SİMÜLATÖRÜ
 * 
 * Otomatik Kontrol Sistemleri:
 * - 2. Derece Sistem Dinamiği (Kütle-Yay-Sönümleyici / DC Motor)
 * - Oransal (Kp), İntegral (Ki), Türevsel (Kd) Ayarı
 * - Aşım (Mp %), Yükselme Süresi (tr), Yerleşme Süresi (ts) & Kararlı Durum Hatası (ess)
 * - Aktüatör Doyumu (Saturation) ve Dış Bozucu Yük (Disturbance) Testi
 */
(function(window) {
    'use strict';

    const PidSimModule = {
        kp: 3.5,
        ki: 1.2,
        kd: 0.8,
        setpoint: 1.0,
        disturbance: 0.0,
        satLimit: 5.0, // Aktüatör doyumu +-5V

        // Sistem parametreleri (2. Derece Transfer Fonksiyonu: wn^2 / (s^2 + 2*zeta*wn*s + wn^2))
        wn: 2.0,      // Doğal frekans
        zeta: 0.35,   // Sönüm oranı (az sönümlü temel sistem)

        simTime: 6.0, // Toplam simülasyon süresi (s)
        timeStep: 0.01,
        
        // Simülasyon Çıktıları
        timeArray: [],
        outputArray: [],
        controlArray: [],
        setpointArray: [],

        metrics: {
            overshoot: 0,
            riseTime: 0,
            settlingTime: 0,
            steadyStateError: 0,
            isStable: true
        },

        hoverInfo: null,
        isRunning: false,
        animProgress: 1.0,
        animFrameId: null,

        init: function() {
            this.bindEvents();
            this.simulate();
            this.updatePlayButton();
        },

        updatePlayButton: function() {
            const btn = document.getElementById('btnPidPlay');
            if (btn) {
                btn.innerHTML = this.isRunning ? '<i class="fas fa-pause"></i> <span>Durdur</span>' : '<i class="fas fa-play"></i> <span>Simülasyonu Başlat</span>';
                btn.classList.toggle('is-running', this.isRunning);
            }
        },

        togglePlay: function() {
            this.isRunning = !this.isRunning;
            this.updatePlayButton();
            if (this.isRunning) {
                if (this.animProgress >= 1.0) this.animProgress = 0.03;
                this.startLoop();
            } else {
                if (this.animFrameId) {
                    cancelAnimationFrame(this.animFrameId);
                    this.animFrameId = null;
                }
                this.animProgress = 1.0;
                if (window.SimManager) window.SimManager.notifyStopped('pid');
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
                this.animProgress = 1.0;
                this.updatePlayButton();
                this.render();
            }
            if (window.SimManager) window.SimManager.notifyStopped('pid');
        },

        startLoop: function() {
            if (window.SimManager) window.SimManager.notifyStarted('pid');
            if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
            const loop = () => {
                if (this.isRunning) {
                    this.animProgress += 0.02;
                    if (this.animProgress >= 1.0) {
                        this.animProgress = 1.0;
                        this.isRunning = false;
                        this.updatePlayButton();
                        this.render();
                        if (window.SimManager) window.SimManager.notifyStopped('pid');
                        return;
                    }
                    this.render();
                    this.animFrameId = requestAnimationFrame(loop);
                }
            };
            this.animFrameId = requestAnimationFrame(loop);
        },

        bindEvents: function() {
            if (typeof document === 'undefined') return;

            const canvas = document.getElementById('pidScopeCanvas');
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
            const readout = document.getElementById('pidVal_' + key);
            if (readout) readout.textContent = this[key].toFixed(key === 'kp' || key === 'ki' || key === 'kd' ? 2 : 1);
            this.simulate();
        },

        setPreset: function(type) {
            if (type === 'critically_damped') {
                this.kp = 2.5; this.ki = 0.5; this.kd = 1.6;
            } else if (type === 'fast_response') {
                this.kp = 4.8; this.ki = 2.0; this.kd = 1.0;
            } else if (type === 'underdamped') {
                this.kp = 6.0; this.ki = 0.2; this.kd = 0.1;
            } else if (type === 'ziegler_nichols') {
                this.kp = 3.8; this.ki = 1.8; this.kd = 0.6;
            }

            // Slider UI Güncelle
            ['kp', 'ki', 'kd'].forEach(k => {
                const el = document.getElementById('pidRange_' + k);
                const elVal = document.getElementById('pidVal_' + k);
                if (el) el.value = this[k];
                if (elVal) elVal.textContent = this[k].toFixed(2);
            });

            document.querySelectorAll('.pid-preset-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-preset') === type);
            });

            this.simulate();
        },

        simulate: function() {
            const dt = this.timeStep;
            const steps = Math.floor(this.simTime / dt);

            this.timeArray = [];
            this.outputArray = [];
            this.controlArray = [];
            this.setpointArray = [];

            // Durum Değişkenleri (2. Derece Durum Uzayı Simülasyonu)
            let y = 0;       // Konum / Hız
            let dy = 0;      // Hız / İvme
            let integralErr = 0;
            let prevErr = 0;

            const wnSq = this.wn * this.wn;
            const twoZetaWn = 2 * this.zeta * this.wn;

            let maxVal = 0;
            let tRise = 0;
            let tSettle = 0;
            let reached10 = false;
            let reached90 = false;
            let t10 = 0, t90 = 0;

            for (let i = 0; i <= steps; i++) {
                const t = i * dt;
                this.timeArray.push(t);

                // Basamak Giriş (t >= 0.2s anında tetiklenir)
                const sp = t >= 0.2 ? this.setpoint : 0;
                this.setpointArray.push(sp);

                // Hata
                const err = sp - y;
                integralErr += err * dt;

                // Anti-windup (İntegral Taşma Koruması)
                integralErr = Math.max(-5.0, Math.min(5.0, integralErr));

                const derivErr = dt > 0 ? (err - prevErr) / dt : 0;
                prevErr = err;

                // PID Kontrolcü Çıkışı
                let u = (this.kp * err) + (this.ki * integralErr) + (this.kd * derivErr);

                // Bozucu Yük (Disturbance - t >= 3.0s anında eklenir)
                if (t >= 3.0) {
                    u += this.disturbance;
                }

                // Aktüatör Doyumu
                u = Math.max(-this.satLimit, Math.min(this.satLimit, u));
                this.controlArray.push(u);

                // 2. Derece Fiziksel Sistem Diferansiyel Denklemi:
                // d2y/dt2 = wn^2 * u - 2*zeta*wn*dy - wn^2*y
                const d2y = (wnSq * u) - (twoZetaWn * dy) - (wnSq * y);

                // Euler Entegrasyonu
                dy += d2y * dt;
                y += dy * dt;

                this.outputArray.push(y);

                // Metrik Hesaplamaları
                if (y > maxVal) maxVal = y;

                if (!reached10 && y >= sp * 0.1) { reached10 = true; t10 = t; }
                if (!reached90 && y >= sp * 0.9) { reached90 = true; t90 = t; }

                // Yerleşme Zamanı (%2 Tolerans Bandı)
                if (Math.abs(y - sp) > 0.02 * (sp || 1)) {
                    tSettle = t;
                }
            }

            // Aşım (%)
            const spVal = this.setpoint || 1;
            const overshoot = maxVal > spVal ? ((maxVal - spVal) / spVal) * 100 : 0;
            const riseTime = (reached90 && reached10) ? (t90 - t10) : (tSettle * 0.4);
            const finalVal = this.outputArray[this.outputArray.length - 1];
            const ess = Math.abs(this.setpoint - finalVal);
            const isStable = overshoot < 100 && !isNaN(finalVal) && Math.abs(finalVal) < 10;

            this.metrics = {
                overshoot: overshoot,
                riseTime: riseTime,
                settlingTime: tSettle,
                steadyStateError: ess,
                isStable: isStable
            };

            // UI Metrikleri Güncelle
            const elMp = document.getElementById('pidResMp');
            const elTr = document.getElementById('pidResTr');
            const elTs = document.getElementById('pidResTs');
            const elEss = document.getElementById('pidResEss');
            const elStatus = document.getElementById('pidResStatus');

            if (elMp) elMp.textContent = '%' + overshoot.toFixed(1);
            if (elTr) elTr.textContent = riseTime.toFixed(2) + ' s';
            if (elTs) elTs.textContent = tSettle.toFixed(2) + ' s';
            if (elEss) elEss.textContent = ess.toFixed(3);
            if (elStatus) {
                elStatus.innerHTML = isStable
                    ? (overshoot < 8.0 ? '<span class="status-pass"><i class="fas fa-check-circle"></i> Mükemmel Kararlı (Düşük Aşım)</span>' : '<span class="status-pass"><i class="fas fa-check-circle"></i> Kararlı Sistem</span>')
                    : '<span class="status-warn"><i class="fas fa-exclamation-triangle"></i> Kararsız / Yüksek Salınım</span>';
            }

            if (window.GamificationModule && overshoot < 5.0 && tSettle < 2.0 && isStable) {
                GamificationModule.unlockBadge('pid_tuner');
            }

            this.render();
        },

        render: function() {
            const canvas = document.getElementById('pidScopeCanvas');
            if (!canvas) return;
            const hi = window.setupHiDpiCanvas ? window.setupHiDpiCanvas(canvas) : null;
            const ctx = hi ? hi.ctx : canvas.getContext('2d');
            const w = hi ? hi.w : canvas.width;
            const h = hi ? hi.h : canvas.height;

            // Derin Obsidian Arka Plan
            ctx.fillStyle = '#060a14';
            ctx.fillRect(0, 0, w, h);

            // Laboratuvar Osiloskop Şebekesi
            if (window.drawOscilloscopeGrid) {
                window.drawOscilloscopeGrid(ctx, w, h, { gridX: 10, gridY: 6, strokeColor: 'rgba(56, 189, 248, 0.08)' });
            } else {
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
                ctx.lineWidth = 1;
                for (let i = 1; i < 10; i++) {
                    ctx.beginPath();
                    ctx.moveTo(i * (w / 10), 0); ctx.lineTo(i * (w / 10), h);
                    ctx.stroke();
                }
                for (let j = 1; j < 6; j++) {
                    ctx.beginPath();
                    ctx.moveTo(0, j * (h / 6)); ctx.lineTo(w, j * (h / 6));
                    ctx.stroke();
                }
            }

            // Ölçekleme (Yatay: 0..6s, Dikey: -0.2..1.8)
            const padB = 32;
            const padT = 36;
            const padL = 46;
            const padR = 24;
            const plotW = w - padL - padR;
            const plotH = h - padT - padB;

            const yMin = -0.2;
            const yMax = 1.8;

            const getX = (t) => padL + (t / this.simTime) * plotW;
            const getY = (val) => padT + plotH - ((val - yMin) / (yMax - yMin)) * plotH;

            // Sıfır Çizgisi (Zero Reference Line)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padL, getY(0)); ctx.lineTo(w - padR, getY(0));
            ctx.stroke();

            // %2 Tolerans Bandı Alanı (Emerald Yeşil Bölge)
            ctx.fillStyle = 'rgba(16, 185, 129, 0.07)';
            const tolTop = getY(this.setpoint * 1.02);
            const tolBot = getY(this.setpoint * 0.98);
            ctx.fillRect(padL, tolTop, plotW, tolBot - tolTop);

            // Tolerans sınır çizgileri
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
            ctx.setLineDash([2, 4]);
            ctx.beginPath();
            ctx.moveTo(padL, tolTop); ctx.lineTo(w - padR, tolTop);
            ctx.moveTo(padL, tolBot); ctx.lineTo(w - padR, tolBot);
            ctx.stroke();
            ctx.setLineDash([]);

            // Setpoint Hedef Çizgisi (Kırmızı Kesikli Çizgi - Referans)
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
            ctx.lineWidth = 1.6;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.moveTo(padL, getY(this.setpoint));
            ctx.lineTo(w - padR, getY(this.setpoint));
            ctx.stroke();
            ctx.setLineDash([]);

            // 1. KONTROLCÜ ÇIKIŞI U(t) (İnce Amber Çizgi)
            const drawCount = Math.max(2, Math.floor(this.timeArray.length * (this.animProgress || 1.0)));
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            for (let i = 0; i < drawCount; i++) {
                const px = getX(this.timeArray[i]);
                const py = getY(this.controlArray[i] * 0.3);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // 2. SİSTEM BASAMAK ÇIKIŞI Y(t) (Glow Efektli Parlak Camgöbeği)
            ctx.save();
            ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';
            ctx.shadowBlur = 6;
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            for (let i = 0; i < drawCount; i++) {
                const px = getX(this.timeArray[i]);
                const py = getY(this.outputArray[i]);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
            ctx.restore();

            // Animasyon sırasında uç nokta ışıma efekti
            if (this.animProgress < 1.0 && drawCount > 0) {
                const tipX = getX(this.timeArray[drawCount - 1]);
                const tipY = getY(this.outputArray[drawCount - 1]);
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.arc(tipX, tipY, 4.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
                ctx.beginPath();
                ctx.arc(tipX, tipY, 10, 0, Math.PI * 2);
                ctx.fill();
            }

            // Eksen Değerleri ve Birimler (Kristal Netliğinde Monospace)
            ctx.fillStyle = '#94a3b8';
            ctx.font = '500 11px "JetBrains Mono", monospace';
            ctx.fillText('0s', padL, h - 12);
            ctx.fillText((this.simTime / 2).toFixed(1) + ' s', padL + plotW / 2 - 14, h - 12);
            ctx.fillText(this.simTime.toFixed(1) + ' s (Zaman t)', w - padR - 85, h - 12);

            ctx.fillText('1.0', padL - 30, getY(1.0) + 4);
            ctx.fillText('0.0', padL - 30, getY(0) + 4);

            // Başlık & Bilgi Lejandı (Inter & JetBrains Mono)
            ctx.font = '600 11.5px "Inter", sans-serif';
            ctx.fillStyle = '#38bdf8';
            ctx.fillText('● y(t) Sistem Yanıtı', padL, 20);
            ctx.fillStyle = '#f87171';
            ctx.fillText('--- r(t) Referans Hedef', padL + 130, 20);
            ctx.fillStyle = '#fbbf24';
            ctx.fillText('● u(t) Kontrol Eforu', padL + 290, 20);

            // Hover Tooltip & Kılcal Çizgi
            if (this.hoverInfo && this.hoverInfo.x >= padL && this.hoverInfo.x <= w - padR) {
                const hx = this.hoverInfo.x;
                const tHover = ((hx - padL) / plotW) * this.simTime;
                const idx = Math.min(this.timeArray.length - 1, Math.max(0, Math.round(tHover / this.timeStep)));

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 3]);
                ctx.beginPath();
                ctx.moveTo(hx, padT); ctx.lineTo(hx, h - padB);
                ctx.stroke();
                ctx.setLineDash([]);

                const yVal = this.outputArray[idx] || 0;
                const uVal = this.controlArray[idx] || 0;

                const lines = [
                    { text: 'PID CANLI TELEMETRİ', bold: true, color: '#38bdf8' },
                    'Zaman t: ' + tHover.toFixed(2) + ' s',
                    'Çıkış y(t): ' + yVal.toFixed(3) + (Math.abs(yVal - this.setpoint) < 0.02 ? ' (Hedefte)' : ''),
                    'Kontrol u(t): ' + uVal.toFixed(2) + ' V'
                ];
                if (typeof window.renderCanvasHoverTooltip === 'function') {
                    window.renderCanvasHoverTooltip(ctx, w, h, hx, this.hoverInfo.y, lines, '#38bdf8');
                } else if (typeof renderCanvasHoverTooltip === 'function') {
                    renderCanvasHoverTooltip(ctx, w, h, hx, this.hoverInfo.y, lines, '#38bdf8');
                }
            }
        }
    };

    window.PidSimModule = PidSimModule;
    if (window.SimManager) {
        window.SimManager.register('pid', {
            stop: () => PidSimModule.stop(),
            isRunning: () => PidSimModule.isRunning
        });
    }
})(window);
