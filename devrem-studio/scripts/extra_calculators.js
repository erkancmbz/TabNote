/**
 * EEM REHBER / DEVREM STUDIO - YENİ PRATİK HESAPLAYICILAR
 * 
 * 1. calculateBatteryLife: IoT & Gömülü Sistem Pil / Batarya Ömrü Hesaplayıcısı
 * 2. calculateThermalHeatsink: Güç Yarıiletkenleri Isıl Tasarım & Soğutucu (Heatsink) Boyutlandırma
 */
(function(window) {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════
    // 1. IOT PİL & BATARYA ÖMRÜ HESAPLAYICISI
    // ═══════════════════════════════════════════════════════════════════
    function calculateBatteryLife() {
        const iAct = parseFloat(document.getElementById('batIActive')?.value) || 20; // mA
        const tActMs = parseFloat(document.getElementById('batTActive')?.value) || 50; // ms
        const iSleepUa = parseFloat(document.getElementById('batISleep')?.value) || 15; // uA
        const tPeriodS = parseFloat(document.getElementById('batTPeriod')?.value) || 10; // sn
        const capMah = parseFloat(document.getElementById('batCapacity')?.value) || 220; // mAh
        const derating = (parseFloat(document.getElementById('batDerate')?.value) || 85) / 100;

        // Hesaplamalar
        const tActS = tActMs / 1000;
        const duty = Math.min(1.0, tActS / Math.max(0.001, tPeriodS));
        const sleepDuty = 1.0 - duty;

        const iSleepMa = iSleepUa / 1000;
        const iAvgMa = (iAct * duty) + (iSleepMa * sleepDuty);
        const usableCap = capMah * derating;

        const hours = usableCap / Math.max(0.0001, iAvgMa);
        const days = hours / 24;
        const years = days / 365.25;
        const dailyMah = iAvgMa * 24;

        // DOM Güncelleme
        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val;
        };

        setTxt('batResDuty', '%' + (duty * 100).toFixed(2));
        setTxt('batResIavg', iAvgMa < 1 ? (iAvgMa * 1000).toFixed(1) + ' µA' : iAvgMa.toFixed(3) + ' mA');
        setTxt('batResDaily', dailyMah.toFixed(2) + ' mAh / gün');

        let lifeStr = '';
        if (days < 30) {
            lifeStr = days.toFixed(1) + ' Gün (' + hours.toFixed(0) + ' Saat)';
        } else if (years < 1) {
            lifeStr = (days / 30.4).toFixed(1) + ' Ay (' + days.toFixed(0) + ' Gün)';
        } else {
            lifeStr = years.toFixed(2) + ' Yıl (' + (years * 12).toFixed(1) + ' Ay)';
        }
        setTxt('batResLife', lifeStr);

        const badge = document.getElementById('batResBadge');
        if (badge) {
            if (years >= 2) {
                badge.className = 'calc-status-badge badge-green';
                badge.innerText = 'Mükemmel Düşük Güç (Ultra Low-Power)';
            } else if (days >= 90) {
                badge.className = 'calc-status-badge badge-blue';
                badge.innerText = 'Standart IoT Telsiz Çalışma Ömrü';
            } else {
                badge.className = 'calc-status-badge badge-amber';
                badge.innerText = 'Sık Pil Değişimi veya Şarj Gerektirir';
            }
        }
    }

    function setBatteryPreset(type) {
        const setVal = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.value = v;
        };
        if (type === 'cr2032') {
            setVal('batCapacity', 220);
            setVal('batIActive', 18);
            setVal('batTActive', 30);
            setVal('batISleep', 3.5);
            setVal('batTPeriod', 60);
        } else if (type === '18650') {
            setVal('batCapacity', 2600);
            setVal('batIActive', 80);
            setVal('batTActive', 150);
            setVal('batISleep', 20);
            setVal('batTPeriod', 5);
        } else if (type === 'aa') {
            setVal('batCapacity', 2400);
            setVal('batIActive', 25);
            setVal('batTActive', 40);
            setVal('batISleep', 8);
            setVal('batTPeriod', 15);
        }
        calculateBatteryLife();
    }

    // ═══════════════════════════════════════════════════════════════════
    // 2. ISIL TASARIM & SOĞUTUCU (HEATSINK) BOYUTLANDIRICISI
    // ═══════════════════════════════════════════════════════════════════
    function calculateThermalHeatsink() {
        const pd = parseFloat(document.getElementById('thmPower')?.value) || 5.0; // Watt
        const tjMax = parseFloat(document.getElementById('thmTjMax')?.value) || 125; // °C
        const ta = parseFloat(document.getElementById('thmTa')?.value) || 40; // °C (Ortam)
        const rJc = parseFloat(document.getElementById('thmRjc')?.value) || 1.5; // °C/W
        const rCs = parseFloat(document.getElementById('thmRcs')?.value) || 0.5; // °C/W (Macun)

        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val;
        };

        const deltaT = tjMax - ta;
        const rTotalMax = deltaT / Math.max(0.1, pd);
        const rSaRequired = rTotalMax - rJc - rCs;

        setTxt('thmResTotalR', rTotalMax.toFixed(2) + ' °C/W');
        setTxt('thmResDeltaT', deltaT.toFixed(1) + ' °C');

        const badge = document.getElementById('thmResBadge');
        if (rSaRequired <= 0) {
            setTxt('thmResRsa', 'YETERSİZ! (Negatif)');
            if (badge) {
                badge.className = 'calc-status-badge badge-red';
                badge.innerText = 'KRİTİK HATA: Soğutucu takılsa bile eleman yanar! Pd gücünü azaltın veya çift eleman paralel bağlayın.';
            }
        } else {
            setTxt('thmResRsa', 'Maksimum ' + rSaRequired.toFixed(2) + ' °C/W');
            if (badge) {
                if (rSaRequired > 15) {
                    badge.className = 'calc-status-badge badge-green';
                    badge.innerText = 'Küçük PCB Bakır Alanı veya Klipsli Soğutucu Yeterli';
                } else if (rSaRequired > 4) {
                    badge.className = 'calc-status-badge badge-blue';
                    badge.innerText = 'Orta Boy Alüminyum Kanatlı Soğutucu Gerekli (Doğal Konveksiyon)';
                } else {
                    badge.className = 'calc-status-badge badge-amber';
                    badge.innerText = 'Büyük Ağır Soğutucu veya Fanlı Zorlamalı Soğutma (Active Cooling) Şart!';
                }
            }
        }
    }

    function setThermalPreset(pkg) {
        const setVal = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.value = v;
        };
        if (pkg === 'to220') {
            setVal('thmRjc', 1.5);
            setVal('thmRcs', 0.5);
            setVal('thmTjMax', 125);
        } else if (pkg === 'to247') {
            setVal('thmRjc', 0.7);
            setVal('thmRcs', 0.3);
            setVal('thmTjMax', 150);
        } else if (pkg === 'd2pak') {
            setVal('thmRjc', 2.0);
            setVal('thmRcs', 0.8);
            setVal('thmTjMax', 125);
        }
        calculateThermalHeatsink();
    }

    // Global nesneye bağla
    window.calculateBatteryLife = calculateBatteryLife;
    window.setBatteryPreset = setBatteryPreset;
    window.calculateThermalHeatsink = calculateThermalHeatsink;
    window.setThermalPreset = setThermalPreset;

})(window);
