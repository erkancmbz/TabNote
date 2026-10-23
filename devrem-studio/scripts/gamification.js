/**
 * EEM REHBER / DEVREM STUDIO - OYUNLAŞTIRMA, GÜNÜN SORUSU & BAŞARI ROZETLERİ (FAZ 5)
 * Günlük teknik mülakat sorusu (Daily Streak 🔥), ASELSAN/BAYKAR soruları ve EEM Başarı Rozetleri
 */
(function(window) {
    'use strict';

    const STORAGE_KEY_STREAK = 'eem_daily_streak';
    const STORAGE_KEY_ANSWERED = 'eem_daily_answered_date';
    const STORAGE_KEY_BADGES = 'eem_unlocked_badges';

    // 30 Günlük Teknik EEM Mülakat Soruları Havuzu
    const QUESTION_BANK = [
        {
            id: 'q1',
            company: 'ASELSAN • Radar & Donanım Tasarım',
            question: 'Yüksek hızlı bir PCB tasarımında (örneğin 100 MHz SPI veri hattı), mikrodenetleyicinin çıkış pinine seri olarak 22 - 33 Ω aralığında bir direnç (damping resistor) konulmasının temel mühendislik sebebi nedir?',
            options: [
                'Hattın çektiği akımı artırarak sinyali güçlendirmek',
                'İletim hattı empedansını eşleyerek yansımaları (ringing) ve EMI gürültüsünü sönümlemek',
                'Sinyalin frekansını iki katına çıkarmak',
                'Kısa devre durumunda mikrodenetleyiciyi aşırı gerilimden korumak'
            ],
            correct: 1,
            explanation: 'Hızlı kenar yükselme zamanına (tr < 1-2 ns) sahip hatlarda mikrodenetleyicinin düşük çıkış empedansı (genellikle 15-25 Ω), hattın empedansıyla eşleşmediğinde yansıma (ringing) ve EMI yayılımı yapar. 22-33 Ω seri seri sönümleme direnci hat başında eşleme sağlar.'
        },
        {
            id: 'q2',
            company: 'BAYKAR • Aviyonik & Gömülü Sistemler',
            question: 'Bir I2C veri yolunda 100 kHz (Standard Mode) ve 400 kHz (Fast Mode) haberleşmede kullanılan Pull-Up dirençlerinin değeriyle ilgili hangi ifade DOĞRUDUR?',
            options: [
                'Frekans arttıkça (Fast Mode), hat parazitik kapasitansını hızlı şarj edebilmek için pull-up direnci küçültülmelidir (örn: 10 kΩ yerine 2.2 kΩ).',
                'Pull-up direnci ne kadar büyük seçilirse sinyal yükselme süresi (tr) o kadar kısalır.',
                'Pull-up dirençleri I2C yolunda enerji tüketimini artırmak için kullanılır, çıkarılsa da çalışır.',
                'SDA ve SCL hatları push-pull çalıştığı için pull-up dirençlerine gerek yoktur.'
            ],
            correct: 0,
            explanation: 'I2C açık kolektör (open-drain) bir veri yoludur. Lojik 1 seviyesine çıkış RC zaman sabitiyle (R_pullup * C_bus) belirlenir. Yüksek hızlarda yükselme süresinin standart sınırlarında kalması için R değeri küçültülmelidir.'
        },
        {
            id: 'q3',
            company: 'TUSAŞ • Güç Elektroniği & Sürücüler',
            question: 'Bir Buck (Düşürücü) DC-DC dönüştürücüde, indüktör akımının periyot boyunca sıfıra düşmediği çalışma rejimi hangisidir?',
            options: [
                'DCM (Discontinuous Conduction Mode)',
                'CCM (Continuous Conduction Mode)',
                'Rezonans Yumuşak Anahtarlama Modu (ZVS)',
                'Doyum Modu (Saturation Mode)'
            ],
            correct: 1,
            explanation: 'CCM (Sürekli İletim Modu) durumunda indüktör akımı (i_L) asla sıfıra inmez; çıkış gerilimi dalgacığı düşüktür ve transfer fonksiyonu doğrudan Vout = D * Vin şeklindedir.'
        },
        {
            id: 'q4',
            company: 'HAVELSAN • Sayısal İşleme & Savunma',
            question: 'Nyquist-Shannon Örnekleme Teoremine göre, 20 kHz bant genişliğindeki bir analog ses sinyalini örtüşme (aliasing) olmadan dijitalleştirmek için gereken minimum örnekleme frekansı (fs) nedir?',
            options: [
                '10 kHz',
                '20 kHz',
                '40 kHz',
                '96 kHz'
            ],
            correct: 2,
            explanation: 'Örnekleme teoremi: fs >= 2 * f_max olmalıdır. f_max = 20 kHz olduğundan minimum örnekleme frekansı 40 kHz (stüdyo standardı 44.1 kHz veya 48 kHz) seçilir.'
        },
        {
            id: 'q5',
            company: 'ROKETSAN • Kontrol & Güdüm',
            question: '2. derece bir dinamik sistemde sönüm oranı ζ (zeta) = 0.707 olduğunda sistemin basamak yanıtı karakteristiği nasıldır?',
            options: [
                'Sonsuz salınımlı kararsız sistem',
                'Aşırı sönümlü (overdamped), çok yavaş yanıt',
                'Optimum hız ve sönüm dengesi, yaklaşık %4.3 tepe aşımı (overshoot)',
                'Kritik sönümlü (hiç aşım yapmayan)'
            ],
            correct: 2,
            explanation: 'ζ = 1/√2 ≈ 0.707 kontrol mühendisliğinde altın orandır. Hızlı oturma zamanı ve minimum kabul edilebilir tepe aşımı (~%4.3) sağlar.'
        }
    ];

    // Rozet Tanımları (Badges)
    const BADGES = [
        { id: 'first_streak', name: 'Günün Kaşifi', desc: 'İlk teknik mülakat sorusunu başarıyla çözdü', icon: 'fa-brain', color: '#38bdf8' },
        { id: 'streak_3', name: 'Seri Mühendis 🔥', desc: '3 gün aralıksız günlük soruyu doğru bildi', icon: 'fa-fire', color: '#f59e0b' },
        { id: 'streak_7', name: 'Mülakat Kurdu ⚡', desc: '7 gün üst üste mülakat antrenmanını tamamladı', icon: 'fa-bolt', color: '#ec4899' },
        { id: 'kmap_master', name: 'Sayısal Mantık Gurusu', desc: 'Karnaugh Haritasında lojik sadeleştirme yaptı', icon: 'fa-microchip', color: '#10b981' },
        { id: 'smps_designer', name: 'Güç Elektroniği Mimarı', desc: 'Buck/Boost SMPS dönüştürücü tasarladı', icon: 'fa-charging-station', color: '#f97316' },
        { id: 'rf_guru', name: 'RF & Mikrodalga Ustası', desc: 'Mikroşerit hat empedans hesabı yaptı', icon: 'fa-broadcast-tower', color: '#8b5cf6' },
        { id: 'motor_driver', name: 'Motor Kontrolörü', desc: 'H-Bridge PWM simülasyonunu çalıştırdı', icon: 'fa-cogs', color: '#06b6d4' }
    ];

    const GamificationModule = {
        init: function() {
            this.renderDailyCard();
            this.renderBadgesGallery();
        },

        getTodayDateString: function() {
            const now = new Date();
            return now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
        },

        getTodayQuestion: function() {
            const now = new Date();
            const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
            const index = dayOfYear % QUESTION_BANK.length;
            return QUESTION_BANK[index];
        },

        getStreakCount: function() {
            return parseInt(localStorage.getItem(STORAGE_KEY_STREAK) || '0', 10);
        },

        hasAnsweredToday: function() {
            return localStorage.getItem(STORAGE_KEY_ANSWERED) === this.getTodayDateString();
        },

        getUnlockedBadges: function() {
            try {
                return JSON.parse(localStorage.getItem(STORAGE_KEY_BADGES) || '[]');
            } catch(e) {
                return [];
            }
        },

        unlockBadge: function(badgeId) {
            const unlocked = this.getUnlockedBadges();
            if (!unlocked.includes(badgeId)) {
                unlocked.push(badgeId);
                localStorage.setItem(STORAGE_KEY_BADGES, JSON.stringify(unlocked));
                this.showBadgeNotification(badgeId);
                this.renderBadgesGallery();
            }
        },

        showBadgeNotification: function(badgeId) {
            if (typeof document === 'undefined') return;
            const badge = BADGES.find(b => b.id === badgeId);
            if (!badge) return;

            const notif = document.createElement('div');
            notif.className = 'badge-unlock-toast';
            notif.innerHTML = `
                <div class="toast-badge-icon" style="background:${badge.color}22;color:${badge.color}">
                    <i class="fas ${badge.icon}"></i>
                </div>
                <div>
                    <div class="toast-badge-title">🎉 Yeni Rozet Açıldı!</div>
                    <div class="toast-badge-name">${badge.name}</div>
                    <div class="toast-badge-desc">${badge.desc}</div>
                </div>
            `;
            document.body.appendChild(notif);
            setTimeout(() => {
                notif.classList.add('hide');
                setTimeout(() => {
                    if (typeof notif.remove === 'function') notif.remove();
                    else if (notif.parentNode) notif.parentNode.removeChild(notif);
                }, 400);
            }, 4500);
        },

        submitAnswer: function(selectedIndex) {
            const q = this.getTodayQuestion();
            const resultBox = document.getElementById('dailyQuestionResult');
            if (!resultBox) return;

            const isCorrect = selectedIndex === q.correct;
            const todayStr = this.getTodayDateString();

            // Şıkları renklendir
            document.querySelectorAll('.daily-opt-btn').forEach((btn, idx) => {
                btn.disabled = true;
                if (idx === q.correct) btn.classList.add('correct');
                else if (idx === selectedIndex) btn.classList.add('wrong');
            });

            if (isCorrect) {
                let streak = this.getStreakCount();
                const lastDate = localStorage.getItem(STORAGE_KEY_ANSWERED);

                // Streak artırma
                if (lastDate !== todayStr) {
                    streak += 1;
                    localStorage.setItem(STORAGE_KEY_STREAK, streak.toString());
                    localStorage.setItem(STORAGE_KEY_ANSWERED, todayStr);
                }

                this.unlockBadge('first_streak');
                if (streak >= 3) this.unlockBadge('streak_3');
                if (streak >= 7) this.unlockBadge('streak_7');

                resultBox.className = 'daily-result-box success';
                resultBox.innerHTML = `
                    <div class="res-head"><i class="fas fa-check-circle"></i> Tebrikler, Doğru Cevap! (+1 Günlük Seri 🔥)</div>
                    <p class="res-exp">${q.explanation}</p>
                `;
            } else {
                resultBox.className = 'daily-result-box error';
                resultBox.innerHTML = `
                    <div class="res-head"><i class="fas fa-times-circle"></i> Yanlış Cevap, Ama Sorun Değil!</div>
                    <p class="res-exp">${q.explanation}</p>
                `;
            }
            resultBox.style.display = 'block';

            // Streak sayacını güncelle
            const streakNumEl = document.getElementById('dailyStreakNumber');
            if (streakNumEl) streakNumEl.innerText = this.getStreakCount();
        },

        renderDailyCard: function() {
            if (typeof document === 'undefined') return;
            const container = document.getElementById('dailyQuestionWidget');
            if (!container) return;

            const q = this.getTodayQuestion();
            const streak = this.getStreakCount();
            const answered = this.hasAnsweredToday();

            let optsHtml = '';
            q.options.forEach((opt, idx) => {
                optsHtml += `
                    <button class="daily-opt-btn" onclick="GamificationModule.submitAnswer(${idx})">
                        <span class="opt-letter">${String.fromCharCode(65 + idx)}</span>
                        <span class="opt-text">${opt}</span>
                    </button>
                `;
            });

            container.innerHTML = `
                <div class="daily-q-card">
                    <div class="daily-q-topbar">
                        <div class="daily-q-badge">
                            <i class="fas fa-star" style="color:#fbbf24;"></i> Günün EEM Mülakat Sorusu
                        </div>
                        <div class="daily-streak-pill" title="Mülakat serinizi korumak için her gün 1 soru çözün!">
                            <i class="fas fa-fire" style="color:#f97316;"></i> Seri: <strong id="dailyStreakNumber">${streak}</strong> Gün
                        </div>
                    </div>
                    <div class="daily-q-company"><i class="fas fa-building"></i> ${q.company}</div>
                    <h3 class="daily-q-text">${q.question}</h3>
                    <div class="daily-opts-grid">${optsHtml}</div>
                    <div id="dailyQuestionResult" class="daily-result-box" style="display:none;"></div>
                </div>
            `;
        },

        renderBadgesGallery: function() {
            if (typeof document === 'undefined') return;
            const container = document.getElementById('badgesGalleryContainer');
            if (!container) return;

            const unlocked = this.getUnlockedBadges();
            let html = '<div class="badges-grid">';

            BADGES.forEach(b => {
                const isOwned = unlocked.includes(b.id);
                html += `
                    <div class="badge-item ${isOwned ? 'owned' : 'locked'}" title="${isOwned ? 'Kazanıldı!' : 'Kilitli'}">
                        <div class="badge-icon-wrap" style="--badge-color: ${b.color};">
                            <i class="fas ${b.icon}"></i>
                        </div>
                        <div class="badge-title">${b.name}</div>
                        <div class="badge-sub">${b.desc}</div>
                    </div>
                `;
            });

            html += '</div>';
            container.innerHTML = html;
        }
    };

    window.GamificationModule = GamificationModule;

})(window);
