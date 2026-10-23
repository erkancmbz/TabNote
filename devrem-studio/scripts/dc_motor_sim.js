/**
 * EEM REHBER / DEVREM STUDIO - DC MOTOR & H-BRIDGE PWM SÜRÜŞ SİMÜLATÖRÜ
 * 4-MOSFET H-Köprüsü, İleri/Geri/Fren/Boşta durumları, PWM duty cycle ve dönen rotor animasyonu
 * HiDPI & Responsive Kanvas Çizimi, Play/Pause CPU Tasarrufu ve İnteraktif İmleç İnceleme
 */
(function(window) {
    'use strict';

    const DcMotorModule = {
        state: 'forward', // 'forward', 'reverse', 'brake', 'coast'
        pwm: 60,          // 0 - 100 %
        vSupply: 12,      // Volt
        rotorAngle: 0,
        animId: null,
        isRunning: false, // Varsayılan olarak kapalıdır; Play'e basılınca çalışır, arka planda CPU yormaz
        hoverInfo: null,
        eventsBound: false,
        lastData: null,

        init: function() {
            this.bindEvents();
            this.update();
            this.drawCanvas(this.hoverInfo);
            this.updatePlayButton();
        },

        togglePlay: function() {
            this.isRunning = !this.isRunning;
            this.updatePlayButton();
            if (this.isRunning) {
                this.startAnimation();
            } else {
                if (this.animId) {
                    cancelAnimationFrame(this.animId);
                    this.animId = null;
                }
                if (window.SimManager) window.SimManager.notifyStopped('dc_motor');
                this.drawCanvas(this.hoverInfo);
            }
        },

        stop: function() {
            if (this.isRunning || this.animId) {
                this.isRunning = false;
                if (this.animId) {
                    cancelAnimationFrame(this.animId);
                    this.animId = null;
                }
                this.updatePlayButton();
                this.drawCanvas(this.hoverInfo);
            }
            if (window.SimManager) window.SimManager.notifyStopped('dc_motor');
        },

        updatePlayButton: function() {
            if (typeof document === 'undefined') return;
            const btn = document.getElementById('motorPlayBtn');
            const pill = document.getElementById('motorStatusPill');
            const text = document.getElementById('motorStatusText');
            if (btn) {
                if (this.isRunning) {
                    btn.innerHTML = '<i class="fas fa-pause"></i> <span>Simülasyonu Duraklat (Pause)</span>';
                    btn.classList.add('is-running');
                } else {
                    btn.innerHTML = '<i class="fas fa-play"></i> <span>Simülasyonu Başlat (Play)</span>';
                    btn.classList.remove('is-running');
                }
            }
            if (pill) {
                pill.classList.toggle('running', this.isRunning);
            }
            if (text) {
                text.innerText = this.isRunning ? 'Simülasyon Çalışıyor (Canlı)' : 'Simülasyon Beklemede (CPU Tasarrufu)';
            }
        },

        setState: function(st) {
            this.state = st;
            if (typeof document !== 'undefined') {
                document.querySelectorAll('.motor-state-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.getAttribute('data-state') === st);
                });
            }
            this.update();
            if (!this.isRunning) {
                this.drawCanvas(this.hoverInfo);
            }
        },

        setPwm: function(val) {
            this.pwm = Math.min(100, Math.max(0, parseFloat(val) || 0));
            if (typeof document !== 'undefined') {
                const range = document.getElementById('motorPwmRange');
                const num = document.getElementById('motorPwmNum');
                const txt = document.getElementById('motorPwmValText');
                if (range) range.value = this.pwm;
                if (num) num.value = this.pwm;
                if (txt) txt.innerText = this.pwm + '%';
            }
            this.update();
            if (!this.isRunning) {
                this.drawCanvas(this.hoverInfo);
            }
        },

        setSupplyVoltage: function(val) {
            this.vSupply = Math.max(1, parseFloat(val) || 12);
            this.update();
            if (!this.isRunning) {
                this.drawCanvas(this.hoverInfo);
            }
        },

        update: function() {
            const vIn = this.vSupply;
            const duty = this.pwm / 100;
            let vEff = 0;
            let directionStr = 'Durgun';
            let speedRpm = 0;

            if (this.state === 'forward') {
                vEff = vIn * duty;
                directionStr = 'İleri (Saat Yönü ↻)';
                speedRpm = Math.round((vEff / 12) * 3200);
            } else if (this.state === 'reverse') {
                vEff = -vIn * duty;
                directionStr = 'Geri (Saat Yönü Tersi ↺)';
                speedRpm = Math.round((Math.abs(vEff) / 12) * 3200);
            } else if (this.state === 'brake') {
                vEff = 0;
                directionStr = 'Aktif Fren (Dinamik Frenleme)';
                speedRpm = 0;
            } else { // coast
                vEff = 0;
                directionStr = 'Boşta (Serbest Süzülme)';
                speedRpm = 0;
            }

            const currentA = speedRpm === 0 ? (this.state === 'brake' ? 1.2 : 0) : (0.15 + (duty * 0.85));
            const backEmf = Math.abs(vEff) * 0.85;

            // DOM Çıktıları
            this.setElText('motorResVeff', Math.abs(vEff).toFixed(1) + ' V');
            this.setElText('motorResRpm', speedRpm + ' RPM');
            this.setElText('motorResDir', directionStr);
            this.setElText('motorResCurrent', currentA.toFixed(2) + ' A');
            this.setElText('motorResEmf', backEmf.toFixed(1) + ' V');

            const q1State = (this.state === 'forward' && this.pwm > 0) ? 'ON (PWM)' : (this.state === 'brake' ? 'ON' : 'OFF');
            const q2State = (this.state === 'reverse' && this.pwm > 0) ? 'ON (PWM)' : (this.state === 'brake' ? 'ON' : 'OFF');
            const q3State = (this.state === 'reverse' && this.pwm > 0) ? 'ON' : 'OFF';
            const q4State = (this.state === 'forward' && this.pwm > 0) ? 'ON' : 'OFF';

            this.setElText('q1Status', 'Q1: ' + q1State);
            this.setElText('q2Status', 'Q2: ' + q2State);
            this.setElText('q3Status', 'Q3: ' + q3State);
            this.setElText('q4Status', 'Q4: ' + q4State);

            this.lastData = {
                vEff: vEff,
                directionStr: directionStr,
                speedRpm: speedRpm,
                currentA: currentA,
                backEmf: backEmf,
                q1State: q1State,
                q2State: q2State,
                q3State: q3State,
                q4State: q4State
            };
        },

        setElText: function(id, text) {
            if (typeof document === 'undefined') return;
            const el = document.getElementById(id);
            if (el) el.innerText = text;
        },

        startAnimation: function() {
            if (window.SimManager) window.SimManager.notifyStarted('dc_motor');
            if (this.animId) cancelAnimationFrame(this.animId);

            const loop = () => {
                if (!this.isRunning) return;
                let speedFactor = 0;
                if (this.state === 'forward') {
                    speedFactor = (this.pwm / 100) * 0.18;
                } else if (this.state === 'reverse') {
                    speedFactor = -(this.pwm / 100) * 0.18;
                }
                this.rotorAngle += speedFactor;
                this.drawCanvas(this.hoverInfo);
                this.animId = requestAnimationFrame(loop);
            };
            this.animId = requestAnimationFrame(loop);
        },

        bindEvents: function() {
            if (typeof document === 'undefined') return;
            const canvas = document.getElementById('dcMotorCanvas');
            if (!canvas || !canvas.addEventListener || this.eventsBound) return;
            this.eventsBound = true;

            const onMove = (e) => {
                const rect = canvas.getBoundingClientRect();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                const mx = clientX - rect.left;
                const my = clientY - rect.top;
                this.hoverInfo = { x: mx, y: my, active: true };
                if (!this.isRunning) {
                    this.drawCanvas(this.hoverInfo);
                }
            };

            const onLeave = () => {
                this.hoverInfo = null;
                if (!this.isRunning) {
                    this.drawCanvas(null);
                }
                const infoEl = document.getElementById('dcMotorCursorInfo');
                if (infoEl) {
                    infoEl.innerHTML = '<i class="fas fa-crosshairs"></i> H-Köprüsü anahtarları (Q1-Q4), Vcc/GND rayları ve dönen rotor üzerinde imleci gezdirerek inceleyin';
                }
            };

            canvas.addEventListener('mousemove', onMove);
            canvas.addEventListener('mouseleave', onLeave);
            canvas.addEventListener('touchmove', onMove, { passive: true });
            canvas.addEventListener('touchend', onLeave);

            window.addEventListener('resize', () => {
                this.drawCanvas(this.hoverInfo);
            });
        },

        drawCanvas: function(hoverInfo = null) {
            if (typeof document === 'undefined') return;
            const canvas = document.getElementById('dcMotorCanvas');
            if (!canvas || !canvas.getContext) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            if (!this.eventsBound) {
                this.bindEvents();
            }

            // 1. HiDPI & Responsive Boyutlandırma
            const parent = canvas.parentElement;
            const clientW = parent ? parent.clientWidth : 720;
            const targetW = Math.max(320, clientW || 720);
            const targetH = 220;
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

            // 2. Koyu Laboratuvar Arka Planı ve Izgara
            const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
            bgGrad.addColorStop(0, '#090e1c');
            bgGrad.addColorStop(1, '#050812');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, w, h);

            // Hassas Izgara Hatları
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
            ctx.lineWidth = 1;
            for (let x = 30; x < w; x += 30) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();
            }
            for (let y = 30; y < h; y += 30) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }

            // 3. Sol Bölüm: 4-MOSFET H-Bridge Güç Şematiği
            const hbX = 24;
            const hbY = 40;
            const hbW = Math.min(270, Math.max(190, w * 0.44));
            const hbH = h - 72;

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1.5;

            // +Vcc Üst Rayı ve GND Alt Rayı
            ctx.beginPath();
            ctx.moveTo(hbX, hbY);
            ctx.lineTo(hbX + hbW, hbY);
            ctx.moveTo(hbX, hbY + hbH);
            ctx.lineTo(hbX + hbW, hbY + hbH);
            ctx.stroke();

            // Ray Etiketleri
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 11px JetBrains Mono, monospace';
            ctx.textAlign = 'left';
            ctx.fillText('+Vcc (' + this.vSupply + 'V)', hbX + 4, hbY - 8);

            ctx.fillStyle = '#64748b';
            ctx.fillText('GND (0V Referans)', hbX + 4, hbY + hbH + 16);

            // 4 Adet Anahtar (Q1, Q2, Q3, Q4)
            const swW = 46;
            const swH = 26;
            const q1Pos = { x: hbX + 16, y: hbY + 16 };
            const q2Pos = { x: hbX + hbW - swW - 16, y: hbY + 16 };
            const q3Pos = { x: hbX + 16, y: hbY + hbH - swH - 16 };
            const q4Pos = { x: hbX + hbW - swW - 16, y: hbY + hbH - swH - 16 };

            const q1Active = (this.state === 'forward' && this.pwm > 0) || this.state === 'brake';
            const q2Active = (this.state === 'reverse' && this.pwm > 0) || this.state === 'brake';
            const q3Active = this.state === 'reverse' && this.pwm > 0;
            const q4Active = this.state === 'forward' && this.pwm > 0;

            const drawSwitchBox = (pos, label, isOn) => {
                ctx.save();
                if (isOn) {
                    ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
                    ctx.strokeStyle = '#10b981';
                    ctx.lineWidth = 2;
                    ctx.shadowColor = 'rgba(16, 185, 129, 0.4)';
                    ctx.shadowBlur = 8;
                } else {
                    ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
                    ctx.strokeStyle = '#475569';
                    ctx.lineWidth = 1;
                }

                if (ctx.roundRect) {
                    ctx.beginPath();
                    ctx.roundRect(pos.x, pos.y, swW, swH, 5);
                    ctx.fill();
                    ctx.stroke();
                } else {
                    ctx.fillRect(pos.x, pos.y, swW, swH);
                    ctx.strokeRect(pos.x, pos.y, swW, swH);
                }

                ctx.fillStyle = isOn ? '#34d399' : '#94a3b8';
                ctx.font = 'bold 11px JetBrains Mono, monospace';
                ctx.textAlign = 'center';
                ctx.fillText(label, pos.x + swW / 2, pos.y + 17);
                ctx.restore();
            };

            drawSwitchBox(q1Pos, 'Q1', q1Active);
            drawSwitchBox(q2Pos, 'Q2', q2Active);
            drawSwitchBox(q3Pos, 'Q3', q3Active);
            drawSwitchBox(q4Pos, 'Q4', q4Active);

            // Bağlantı Hatları ve Akım Akışı
            const midY = hbY + hbH / 2;
            const leftBranchX = q1Pos.x + swW / 2;
            const rightBranchX = q2Pos.x + swW / 2;

            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 2;
            ctx.beginPath();

            // Sol kol dikey
            ctx.moveTo(leftBranchX, hbY);
            ctx.lineTo(leftBranchX, q1Pos.y);
            ctx.moveTo(leftBranchX, q1Pos.y + swH);
            ctx.lineTo(leftBranchX, q3Pos.y);
            ctx.moveTo(leftBranchX, q3Pos.y + swH);
            ctx.lineTo(leftBranchX, hbY + hbH);

            // Sağ kol dikey
            ctx.moveTo(rightBranchX, hbY);
            ctx.lineTo(rightBranchX, q2Pos.y);
            ctx.moveTo(rightBranchX, q2Pos.y + swH);
            ctx.lineTo(rightBranchX, q4Pos.y);
            ctx.moveTo(rightBranchX, q4Pos.y + swH);
            ctx.lineTo(rightBranchX, hbY + hbH);

            // Orta Köprü Yatay Hatları
            const motorCenterXBridge = hbX + hbW / 2;
            const motorRadiusBridge = 18;

            ctx.moveTo(leftBranchX, midY);
            ctx.lineTo(motorCenterXBridge - motorRadiusBridge, midY);
            ctx.moveTo(motorCenterXBridge + motorRadiusBridge, midY);
            ctx.lineTo(rightBranchX, midY);
            ctx.stroke();

            // Canlı Akım Yolu Vurgusu (Çalışırken)
            if (this.isRunning && this.pwm > 0) {
                ctx.save();
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2.5;
                ctx.shadowColor = '#38bdf8';
                ctx.shadowBlur = 6;
                ctx.setLineDash([5, 4]);

                ctx.beginPath();
                if (this.state === 'forward') {
                    // Vcc -> Q1 -> Motor (Sol->Sağ) -> Q4 -> GND
                    ctx.moveTo(leftBranchX, hbY);
                    ctx.lineTo(leftBranchX, q1Pos.y + swH);
                    ctx.lineTo(leftBranchX, midY);
                    ctx.lineTo(motorCenterXBridge - motorRadiusBridge, midY);

                    ctx.moveTo(motorCenterXBridge + motorRadiusBridge, midY);
                    ctx.lineTo(rightBranchX, midY);
                    ctx.lineTo(rightBranchX, q4Pos.y + swH);
                    ctx.lineTo(rightBranchX, hbY + hbH);
                } else if (this.state === 'reverse') {
                    // Vcc -> Q2 -> Motor (Sağ->Sol) -> Q3 -> GND
                    ctx.moveTo(rightBranchX, hbY);
                    ctx.lineTo(rightBranchX, q2Pos.y + swH);
                    ctx.lineTo(rightBranchX, midY);
                    ctx.lineTo(motorCenterXBridge + motorRadiusBridge, midY);

                    ctx.moveTo(motorCenterXBridge - motorRadiusBridge, midY);
                    ctx.lineTo(leftBranchX, midY);
                    ctx.lineTo(leftBranchX, q3Pos.y + swH);
                    ctx.lineTo(leftBranchX, hbY + hbH);
                }
                ctx.stroke();
                ctx.restore();
            }

            // Köprü Ortasındaki Motor Endüvi Dairesi
            ctx.save();
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(motorCenterXBridge, midY, motorRadiusBridge, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = (this.isRunning && this.pwm > 0) ? '#38bdf8' : '#475569';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('M', motorCenterXBridge, midY + 4);

            // Kutupluluk Göstergesi (+ / -)
            if (this.state === 'forward' && this.pwm > 0) {
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 9px monospace';
                ctx.fillText('+', motorCenterXBridge - 10, midY - 6);
                ctx.fillStyle = '#38bdf8';
                ctx.fillText('-', motorCenterXBridge + 10, midY - 6);
            } else if (this.state === 'reverse' && this.pwm > 0) {
                ctx.fillStyle = '#38bdf8';
                ctx.font = 'bold 9px monospace';
                ctx.fillText('-', motorCenterXBridge - 10, midY - 6);
                ctx.fillStyle = '#ef4444';
                ctx.fillText('+', motorCenterXBridge + 10, midY - 6);
            }
            ctx.restore();

            // 4. Sağ Bölüm: Dönen DC Motor Stator & Rotor Modeli
            const motorCenterX = Math.max(hbX + hbW + 90, w - Math.min(150, w * 0.28));
            const motorCenterY = h / 2;
            const motorRadius = Math.min(65, (h - 60) / 2);

            // Stator Dış Gövdesi
            ctx.save();
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(motorCenterX, motorCenterY, motorRadius + 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Manyetik Kutuplar: Kuzey (N - Kırmızı) ve Güney (S - Mavi)
            // N Kutbu (Sol)
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(motorCenterX - motorRadius - 4, motorCenterY, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('N', motorCenterX - motorRadius - 4, motorCenterY + 3.5);

            // S Kutbu (Sağ)
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.arc(motorCenterX + motorRadius + 4, motorCenterY, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillText('S', motorCenterX + motorRadius + 4, motorCenterY + 3.5);

            // Dönen Rotor
            ctx.save();
            ctx.translate(motorCenterX, motorCenterY);
            ctx.rotate(this.rotorAngle);

            // Rotor Demir Göbeği
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.arc(0, 0, motorRadius - 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Rotor Bakır Sargı Kutupları (6 Adet)
            for (let i = 0; i < 6; i++) {
                ctx.rotate(Math.PI / 3);
                const coilGrad = ctx.createLinearGradient(0, -motorRadius + 12, 0, -motorRadius + 26);
                coilGrad.addColorStop(0, '#fde047');
                coilGrad.addColorStop(0.5, '#f59e0b');
                coilGrad.addColorStop(1, '#b45309');
                ctx.fillStyle = coilGrad;
                ctx.fillRect(-7, -motorRadius + 12, 14, 14);

                ctx.strokeStyle = '#fef08a';
                ctx.lineWidth = 0.8;
                ctx.strokeRect(-7, -motorRadius + 12, 14, 14);
            }

            // Merkez Şaft / Mil
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath();
            ctx.arc(0, 0, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Dönüş Yönü Gösterge İbresi
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(motorRadius - 16, 0);
            ctx.stroke();

            ctx.restore(); // Rotate restore

            // Motor Altı Durum ve RPM Etiketi
            ctx.textAlign = 'center';
            ctx.font = 'bold 11px JetBrains Mono, monospace';
            ctx.fillStyle = this.isRunning ? '#38bdf8' : '#94a3b8';
            const speedRpm = this.lastData ? this.lastData.speedRpm : 1920;
            const statusLabel = this.isRunning ? `${speedRpm} RPM • PWM: ${this.pwm}%` : `DURAKLATILDI (PWM: ${this.pwm}%)`;
            ctx.fillText(statusLabel, motorCenterX, h - 14);

            ctx.restore(); // Stator restore

            // 5. Sol-Üst HUD Bilgi Rozeti (Sağ üstteki butonlarla çakışmaz!)
            const badgeX = 14;
            const badgeY = 10;
            const badgeW = 270;
            const badgeH = 26;

            ctx.save();
            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            ctx.strokeStyle = this.isRunning ? 'rgba(16, 185, 129, 0.4)' : 'rgba(148, 163, 184, 0.3)';
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
            ctx.font = 'bold 11px JetBrains Mono, monospace';

            if (this.isRunning) {
                ctx.fillStyle = '#34d399';
                ctx.fillText('▶ ÇALIŞIYOR', badgeX + 10, badgeY + 17);
            } else {
                ctx.fillStyle = '#fbbf24';
                ctx.fillText('⏸ BEKLEMEDE', badgeX + 10, badgeY + 17);
            }

            ctx.font = '10px JetBrains Mono, monospace';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(`Vcc: ${this.vSupply}V`, badgeX + 112, badgeY + 17);

            ctx.fillStyle = '#38bdf8';
            ctx.fillText(`Duty: ${this.pwm}%`, badgeX + 185, badgeY + 17);
            ctx.restore();

            // 6. İmleç Gezinme, Bölge Tespiti, Vurgu ve Floating Tooltip
            if (hoverInfo && hoverInfo.active) {
                const mx = hoverInfo.x;
                const my = hoverInfo.y;

                // Çapraz Nişangah
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);

                ctx.beginPath();
                ctx.moveTo(mx, 0);
                ctx.lineTo(mx, h);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, my);
                ctx.lineTo(w, my);
                ctx.stroke();
                ctx.restore();

                // Bölge Tespiti
                let zoneName = 'H-Köprüsü Devre Alanı';
                let zoneDesc = '4-Anahtarlı MOSFET PWM köprü sürücüsü ve DC motor yükü';
                let zoneColor = '#94a3b8';
                let highlightType = null;
                let highlightCoords = null;

                const inQ1 = mx >= q1Pos.x && mx <= q1Pos.x + swW && my >= q1Pos.y && my <= q1Pos.y + swH;
                const inQ2 = mx >= q2Pos.x && mx <= q2Pos.x + swW && my >= q2Pos.y && my <= q2Pos.y + swH;
                const inQ3 = mx >= q3Pos.x && mx <= q3Pos.x + swW && my >= q3Pos.y && my <= q3Pos.y + swH;
                const inQ4 = mx >= q4Pos.x && mx <= q4Pos.x + swW && my >= q4Pos.y && my <= q4Pos.y + swH;
                const inMotorHub = Math.hypot(mx - motorCenterXBridge, my - midY) <= motorRadiusBridge;
                const inVcc = mx >= hbX && mx <= hbX + hbW && my >= hbY - 14 && my <= hbY + 8;
                const inGnd = mx >= hbX && mx <= hbX + hbW && my >= hbY + hbH - 8 && my <= hbY + hbH + 18;
                const inPoleN = Math.hypot(mx - (motorCenterX - motorRadius - 4), my - motorCenterY) <= 14;
                const inPoleS = Math.hypot(mx - (motorCenterX + motorRadius + 4), my - motorCenterY) <= 14;
                const inRotor = Math.hypot(mx - motorCenterX, my - motorCenterY) <= motorRadius;

                if (inQ1) {
                    zoneName = 'Q1 MOSFET (Sol-Üst Yüksek Kol)';
                    zoneDesc = `Durum: ${this.lastData?.q1State || 'ON'} • Vcc'den motora pozitif akım geçişi`;
                    zoneColor = q1Active ? '#10b981' : '#64748b';
                    highlightType = 'rect';
                    highlightCoords = [q1Pos.x - 2, q1Pos.y - 2, swW + 4, swH + 4];
                } else if (inQ2) {
                    zoneName = 'Q2 MOSFET (Sağ-Üst Yüksek Kol)';
                    zoneDesc = `Durum: ${this.lastData?.q2State || 'OFF'} • Ters yönde Vcc akım geçişi`;
                    zoneColor = q2Active ? '#10b981' : '#64748b';
                    highlightType = 'rect';
                    highlightCoords = [q2Pos.x - 2, q2Pos.y - 2, swW + 4, swH + 4];
                } else if (inQ3) {
                    zoneName = 'Q3 MOSFET (Sol-Alt Düşük Kol)';
                    zoneDesc = `Durum: ${this.lastData?.q3State || 'OFF'} • Motor sol ucunu GND rayına bağlar`;
                    zoneColor = q3Active ? '#10b981' : '#64748b';
                    highlightType = 'rect';
                    highlightCoords = [q3Pos.x - 2, q3Pos.y - 2, swW + 4, swH + 4];
                } else if (inQ4) {
                    zoneName = 'Q4 MOSFET (Sağ-Alt Düşük Kol)';
                    zoneDesc = `Durum: ${this.lastData?.q4State || 'ON'} • Motor sağ ucunu GND rayına bağlar`;
                    zoneColor = q4Active ? '#10b981' : '#64748b';
                    highlightType = 'rect';
                    highlightCoords = [q4Pos.x - 2, q4Pos.y - 2, swW + 4, swH + 4];
                } else if (inMotorHub) {
                    zoneName = 'DC Motor Endüvi Bağlantısı';
                    zoneDesc = `Efektif: ${this.lastData?.vEff?.toFixed(1) || 7.2}V • Çekilen Akım: ${this.lastData?.currentA?.toFixed(2) || 0.66}A`;
                    zoneColor = '#38bdf8';
                    highlightType = 'circle';
                    highlightCoords = [motorCenterXBridge, midY, motorRadiusBridge + 4];
                } else if (inVcc) {
                    zoneName = 'Besleme Güç Hattı (+Vcc)';
                    zoneDesc = `${this.vSupply}V DC Giriş Gerilimi • H-Köprüsü güç kaynağı`;
                    zoneColor = '#ef4444';
                    highlightType = 'rect';
                    highlightCoords = [hbX, hbY - 3, hbW, 6];
                } else if (inGnd) {
                    zoneName = 'Toprak Dönüş Hattı (GND)';
                    zoneDesc = '0.0V Referans Düzlemi • Ters akım ve motor dönüş yolu';
                    zoneColor = '#64748b';
                    highlightType = 'rect';
                    highlightCoords = [hbX, hbY + hbH - 3, hbW, 6];
                } else if (inPoleN) {
                    zoneName = 'Stator Kuzey Kutbu (N)';
                    zoneDesc = 'Kalıcı Mıknatıs • Manyetik B-alanı çıkış kutbu (Kırmızı)';
                    zoneColor = '#ef4444';
                    highlightType = 'circle';
                    highlightCoords = [motorCenterX - motorRadius - 4, motorCenterY, 14];
                } else if (inPoleS) {
                    zoneName = 'Stator Güney Kutbu (S)';
                    zoneDesc = 'Kalıcı Mıknatıs • Manyetik B-alanı giriş kutbu (Mavi)';
                    zoneColor = '#3b82f6';
                    highlightType = 'circle';
                    highlightCoords = [motorCenterX + motorRadius + 4, motorCenterY, 14];
                } else if (inRotor) {
                    zoneName = 'Dönen Rotor & Armatür Sargıları';
                    zoneDesc = `Hız: ${speedRpm} RPM • Geri-EMF (Eb): ${this.lastData?.backEmf?.toFixed(1) || 6.1}V • Lorentz Torku`;
                    zoneColor = '#f59e0b';
                    highlightType = 'circle';
                    highlightCoords = [motorCenterX, motorCenterY, motorRadius];
                }

                // Vurgu Işıması
                if (highlightType === 'rect' && highlightCoords) {
                    ctx.save();
                    ctx.strokeStyle = zoneColor;
                    ctx.lineWidth = 2;
                    ctx.shadowColor = zoneColor;
                    ctx.shadowBlur = 8;
                    ctx.strokeRect(...highlightCoords);
                    ctx.restore();
                } else if (highlightType === 'circle' && highlightCoords) {
                    ctx.save();
                    ctx.strokeStyle = zoneColor;
                    ctx.lineWidth = 2;
                    ctx.shadowColor = zoneColor;
                    ctx.shadowBlur = 8;
                    ctx.beginPath();
                    ctx.arc(highlightCoords[0], highlightCoords[1], highlightCoords[2], 0, Math.PI * 2);
                    ctx.stroke();
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
                const tipW = 285;
                const tipH = 50;
                let tipX = mx + 14;
                let tipY = my - 58;
                if (tipX + tipW > w - 10) tipX = mx - tipW - 14;
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
                const infoEl = document.getElementById('dcMotorCursorInfo');
                if (infoEl) {
                    infoEl.innerHTML = `<i class="fas fa-crosshairs" style="color:${zoneColor}"></i> <strong>${zoneName}:</strong> ${zoneDesc}`;
                }
            }
        }
    };

    window.DcMotorModule = DcMotorModule;
    if (typeof window !== 'undefined' && window.SimManager) {
        window.SimManager.register('dc_motor', {
            stop: () => DcMotorModule.stop(),
            isRunning: () => DcMotorModule.isRunning
        });
    }

})(typeof window !== 'undefined' ? window : global);
