/**
 * EEM REHBER / DEVREM STUDIO - GÜNEŞ PANELİ (PV) & MPPT TEPE GÜÇ NOKTASI TAKİP LAB
 * 
 * Güç Sistemleri & Yenilenebilir Enerji:
 * - Fotovoltaik Hücre I-V (Akım-Gerilim) ve P-V (Güç-Gerilim) Karakteristik Eğrileri
 * - Güneş Işınımı (G: 200 - 1000 W/m²) & Hücre Sıcaklığı (T: 0 - 75 °C) Etkisi
 * - Gerçek Zamanlı P&O (Perturb & Observe) MPPT Arama Algoritması Simülasyonu
 * - Voc, Isc, Vmp, Imp, Pmax ve Panel Dönüşüm Verimi (η) Telemetrisi
 */
(function(window) {
    'use strict';

    const SolarMpptModule = {
        irradiance: 1000, // W/m² (STC: 1000)
        tempC: 25,        // °C (STC: 25)

        // Panel Standart Parametreleri (STC: 300W Panel)
        vocStc: 40.0,     // V
        iscStc: 10.0,     // A
        vmpStc: 32.5,     // V
        impStc: 9.23,     // A
        pMaxStc: 300.0,   // W

        // MPPT Algoritma Durumu
        mpptMode: 'p_and_o', // Perturb & Observe
        vOperating: 20.0,    // Başlangıç çalışma gerilimi
        pLast: 0,
        vStep: 0.4,          // V adım büyüklüğü
        direction: 1,        // +1 veya -1

        isRunning: false,
        animFrameId: null,

        init: function() {
            this.bindEvents();
            this.calculate();
            this.render();
            if (window.SimManager) {
                window.SimManager.register('solar_mppt', {
                    stop: () => this.stop(),
                    isRunning: () => this.isRunning,
                    resume: () => { if (this.isRunning) this.startLoop(); }
                });
            }
        },

        togglePlay: function() {
            this.isRunning = !this.isRunning;
            this.updatePlayButton();
            if (this.isRunning) {
                if (window.SimManager) window.SimManager.notifyStarted('solar_mppt');
                this.startLoop();
            } else {
                if (this.animFrameId) {
                    cancelAnimationFrame(this.animFrameId);
                    this.animFrameId = null;
                }
                if (window.SimManager) window.SimManager.notifyStopped('solar_mppt');
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
            let lastTick = 0;
            const step = (timestamp) => {
                if (!this.isRunning) return;
                if (timestamp - lastTick > 60) { // ~16 Hz MPPT arama hızı
                    this.stepMppt();
                    this.render();
                    lastTick = timestamp;
                }
                this.animFrameId = requestAnimationFrame(step);
            };
            this.animFrameId = requestAnimationFrame(step);
        },

        updatePlayButton: function() {
            const btn = document.getElementById('btnSolarPlay');
            if (btn) {
                btn.innerHTML = this.isRunning
                    ? '<i class="fas fa-pause"></i> <span>Durdur</span>'
                    : '<i class="fas fa-play"></i> <span>Canlı MPPT Takibini Başlat</span>';
                btn.classList.toggle('is-running', this.isRunning);
            }
        },

        loadPreset: function(pKey) {
            if (pKey === 'noon') {
                this.irradiance = 1000;
                this.tempC = 25;
            } else if (pKey === 'cloudy') {
                this.irradiance = 350;
                this.tempC = 20;
            } else if (pKey === 'hot_summer') {
                this.irradiance = 1000;
                this.tempC = 65;
            } else if (pKey === 'cold_winter') {
                this.irradiance = 850;
                this.tempC = 5;
            }
            this.syncControls();
            this.calculate();
            this.render();
        },

        syncControls: function() {
            const elG = document.getElementById('solarIrrInput');
            if (elG) elG.value = this.irradiance;
            const elT = document.getElementById('solarTempInput');
            if (elT) elT.value = this.tempC;
        },

        bindEvents: function() {
            const elG = document.getElementById('solarIrrInput');
            if (elG) {
                elG.addEventListener('input', (e) => {
                    this.irradiance = parseFloat(e.target.value) || 1000;
                    this.calculate();
                    this.render();
                });
            }

            const elT = document.getElementById('solarTempInput');
            if (elT) {
                elT.addEventListener('input', (e) => {
                    this.tempC = parseFloat(e.target.value) || 25;
                    this.calculate();
                    this.render();
                });
            }
        },

        // Sıcaklık ve Işınıma göre Voc, Isc ve I(V) hesaplama
        calculate: function() {
            const G = this.irradiance;
            const T = this.tempC;

            // Sıcaklık katsayıları: Voc katsayısı -0.32 %/°C, Isc katsayısı +0.05 %/°C
            const deltaT = T - 25;
            const vocTemp = this.vocStc * (1 - 0.0032 * deltaT);
            // Işınımın Voc üzerindeki logaritmik etkisi: Voc = Voc(T) + Vt * ln(G/1000)
            const vocG = Math.max(15, vocTemp + 0.65 * Math.log(Math.max(100, G) / 1000));
            this.voc = vocG;

            // Isc ışınımla doğrusal orantılı
            const iscG = this.iscStc * (G / 1000) * (1 + 0.0005 * deltaT);
            this.isc = iscG;

            // Gerçek maksimum güç noktasını bul (Tarama ile)
            let maxP = 0;
            let bestV = 0;
            let bestI = 0;
            for (let v = 0; v <= this.voc; v += 0.2) {
                const i = this.evalCurrent(v);
                const p = v * i;
                if (p > maxP) {
                    maxP = p;
                    bestV = v;
                    bestI = i;
                }
            }
            this.vmp = bestV;
            this.imp = bestI;
            this.pMax = maxP;

            // Başlangıç çalışma noktasını sınırla
            if (this.vOperating > this.voc) this.vOperating = this.voc * 0.7;
        },

        evalCurrent: function(v) {
            if (v <= 0) return this.isc;
            if (v >= this.voc) return 0;
            // Klasik tek diyot PV eğrisi yaklaşımı
            const a = 3.5;
            const term = Math.exp(a * (v / this.voc)) - 1;
            const denom = Math.exp(a) - 1;
            const i = this.isc * (1 - term / denom);
            return Math.max(0, i);
        },

        // Canlı MPPT P&O (Perturb & Observe) Adımı
        stepMppt: function() {
            const iCur = this.evalCurrent(this.vOperating);
            const pCur = this.vOperating * iCur;

            // P(k) - P(k-1)
            const deltaP = pCur - this.pLast;

            if (deltaP > 0) {
                // Güç arttı, aynı yönde git
                this.vOperating += this.direction * this.vStep;
            } else {
                // Güç azaldı, yönü ters çevir
                this.direction = -this.direction;
                this.vOperating += this.direction * this.vStep;
            }

            // Sınırlar
            if (this.vOperating < 2.0) this.vOperating = 2.0;
            if (this.vOperating > this.voc - 0.5) this.vOperating = this.voc - 0.5;

            this.pLast = pCur;
        },

        render: function() {
            const canvas = document.getElementById('solarMpptCanvas');
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

            const plotX = 65;
            const plotY = 40;
            const plotW = cssW - 130;
            const plotH = cssH - 110;

            // Izgara
            ctx.fillStyle = isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)';
            ctx.fillRect(plotX, plotY, plotW, plotH);

            ctx.strokeStyle = isLight ? '#cbd5e1' : '#334155';
            ctx.lineWidth = 1;
            ctx.strokeRect(plotX, plotY, plotW, plotH);

            // Eksen Skalaları
            const maxV = Math.max(45, this.voc * 1.12);
            const maxI = Math.max(12, this.isc * 1.2);
            const maxP = Math.max(350, this.pMax * 1.15);

            // 1. Mavi Çizgi: I-V Karakteristiği (Sol Eksen)
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.8;
            ctx.beginPath();
            const steps = 120;
            for (let i = 0; i <= steps; i++) {
                const v = (i / steps) * this.voc;
                const cur = this.evalCurrent(v);
                const px = plotX + (v / maxV) * plotW;
                const py = plotY + plotH - (cur / maxI) * plotH;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // 2. Turuncu Çizgi: P-V Karakteristiği (Sağ Eksen)
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2.8;
            ctx.beginPath();
            for (let i = 0; i <= steps; i++) {
                const v = (i / steps) * this.voc;
                const p = v * this.evalCurrent(v);
                const px = plotX + (v / maxV) * plotW;
                const py = plotY + plotH - (p / maxP) * plotH;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // MPP Tepe Güç Noktası (Teorik Maksimum Yıldız)
            const mppPx = plotX + (this.vmp / maxV) * plotW;
            const mppPy = plotY + plotH - (this.pMax / maxP) * plotH;
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(mppPx, mppPy, 6, 0, Math.PI * 2);
            ctx.fill();

            // Canlı MPPT Çalışma Noktası (Yeşil Hedef Göstergesi)
            const curV = this.vOperating;
            const curI = this.evalCurrent(curV);
            const curP = curV * curI;
            const opPx = plotX + (curV / maxV) * plotW;
            const opPy = plotY + plotH - (curP / maxP) * plotH;

            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(opPx, opPy, 8, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(opPx, opPy, 4, 0, Math.PI * 2);
            ctx.fill();

            // Başlık & Legend
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 11px JetBrains Mono, monospace';
            ctx.fillText('■ I-V Eğrisi (Isc = ' + this.isc.toFixed(2) + ' A)', plotX + 10, 24);

            ctx.fillStyle = '#f59e0b';
            ctx.fillText('■ P-V Eğrisi (Pmax = ' + this.pMax.toFixed(1) + ' W)', plotX + 220, 24);

            ctx.fillStyle = '#10b981';
            ctx.fillText('● Anlık MPPT Noktası (' + curP.toFixed(1) + ' W)', plotX + 440, 24);

            // Eksen İsimleri & Birimler
            ctx.fillStyle = isLight ? '#64748b' : '#94a3b8';
            ctx.font = '9px JetBrains Mono, monospace';
            ctx.fillText('0V', plotX - 10, plotY + plotH + 16);
            ctx.fillText(maxV.toFixed(0) + 'V (Gerilim)', plotX + plotW - 40, plotY + plotH + 16);
            ctx.fillText(maxI.toFixed(1) + 'A (Akım)', 8, plotY + 12);
            ctx.fillText(maxP.toFixed(0) + 'W (Güç)', plotX + plotW + 10, plotY + 12);

            // Alt Telemetri HUD Kartı
            const trackingEfficiency = (curP / this.pMax * 100).toFixed(1);
            this.drawTelemetryHUD(ctx, plotX, cssH - 55, plotW, [
                { label: 'Güneş Işınımı', val: this.irradiance + ' W/m²' },
                { label: 'Sıcaklık', val: this.tempC + ' °C' },
                { label: 'Tepe MPP', val: this.vmp.toFixed(1) + 'V @ ' + this.pMax.toFixed(0) + 'W' },
                { label: 'Anlık MPPT Gücü', val: curP.toFixed(1) + ' W' },
                { label: 'İzleme Verimi', val: '%' + trackingEfficiency }
            ], isLight);
        },

        drawTelemetryHUD: function(ctx, x, y, w, items, isLight) {
            ctx.fillStyle = isLight ? 'rgba(255,255,255,0.92)' : 'rgba(15,23,42,0.88)';
            ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(56,189,248,0.25)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(x, y, w, 50, 6);
            ctx.fill();
            ctx.stroke();

            const colW = w / items.length;
            items.forEach((item, idx) => {
                const ix = x + idx * colW + 10;
                ctx.fillStyle = isLight ? '#64748b' : '#94a3b8';
                ctx.font = '500 9.5px Inter, sans-serif';
                ctx.fillText(item.label, ix, y + 18);

                ctx.fillStyle = isLight ? '#0f172a' : '#38bdf8';
                ctx.font = 'bold 11px JetBrains Mono, monospace';
                ctx.fillText(item.val, ix, y + 36);
            });
        }
    };

    window.SolarMpptModule = SolarMpptModule;
})(window);
