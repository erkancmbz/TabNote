/**
 * DEVREM STUDIO - 2-PORTAL MİMARİSİ (AKADEMİ & KARİYER)
 * 3D Logo Morphing Switcher & Dynamic Portal Controller
 * Network Graph Canvas & Portal-Specific Search & Notification Isolation
 */

(function () {
    'use strict';

    let currentDevremPortal = 'akademi'; // 'akademi' | 'kariyer'
    let currentCareerSubTab = 'ilanlar';

    // AI Canlı Bildirim Akışı Verileri (Kariyer Portalı Ticker)
    const AI_TICKER_ITEMS = [
        { icon: 'fas fa-bolt', color: '#fbbf24', text: '⚡ ASELSAN 2026 Güz Dönemi Aday Mühendislik Başvuruları Açıldı!' },
        { icon: 'fas fa-rocket', color: '#06b6d4', text: '🚀 TEKNOFEST 2026 İHA ve Elektrikli Araç takımları EEM donanımcısı arıyor.' },
        { icon: 'fas fa-comments', color: '#38bdf8', text: '💬 Forum: "Flyback SMPS Trafo Tasarımında RCD Snubber Hesabı" yeni çözümlü yanıt aldı.' },
        { icon: 'fas fa-medal', color: '#34d399', text: '🏆 Son 24 saatte 48 mühendis "SMPS Güç Tasarımcısı" ve "AC Fazör" rozeti kazandı.' },
        { icon: 'fas fa-briefcase', color: '#818cf8', text: '💼 BAYKAR & TUSAŞ: Gömülü Yazılım ve Aviyonik Sistem Mühendisi ilanları yayında.' },
        { icon: 'fas fa-flask', color: '#f43f5e', text: '🔬 TÜBİTAK 2209-A Lisans Araştırma Projeleri için Takım Arkadaşı İlanları güncellendi.' }
    ];

    let tickerIndex = 0;
    let tickerInterval = null;

    // DEVREM Soru-Cevap Forumu Canlı Verileri
    const FORUM_QUESTIONS = [
        {
            id: 'fq-1',
            title: 'Buck Dönüştürücüde CCM ve DCM Geçiş Noktası Nasıl Belirlenir?',
            desc: 'Düşük yük akımlarında indüktör akımının sıfıra inmesi durumunda çıkış geriliminde aşırı yükselme oluyor. Lmin seçiminde nelere dikkat edilmeli?',
            author: 'Ahmet Y.',
            uni: 'İTÜ EHM',
            votes: 24,
            replies: 5,
            tag: 'Güç Elektroniği',
            date: '2 saat önce',
            solved: true
        },
        {
            id: 'fq-2',
            title: 'Thevenin Eşdeğeri Bulurken Bağımlı Kaynak Varsa Ne Yapılmalı?',
            desc: 'Devrede bağımlı gerilim ve akım kaynağı olduğunda Rth bulmak için test kaynağı (1V veya 1A) bağlama adımlarını tam anlayamadım, özetleyebilir misiniz?',
            author: 'Selin K.',
            uni: 'ODTÜ EE',
            votes: 38,
            replies: 8,
            tag: 'Devre Teorisi',
            date: '5 saat önce',
            solved: true
        },
        {
            id: 'fq-3',
            title: 'STM32 ile SPWM Üretiminde Dead-Time (Ölü Zaman) Hesabı',
            desc: 'H-Köprüsünde shoot-through arızasını önlemek için IR2110 MOSFET sürücüsü kullanırken TIM1 Dead-time register değerini MOSFET açma/kapama sürelerine göre nasıl boyutlandırmalıyız?',
            author: 'Burak D.',
            uni: 'YTÜ EHM',
            votes: 42,
            replies: 11,
            tag: 'Gömülü Sistemler',
            date: 'Dün',
            solved: false
        },
        {
            id: 'fq-4',
            title: 'Smith Chart ile L-Tipi Empedans Eşleme Ağında Kondansatör Değeri',
            desc: '50 Ohm iletim hattını ZL = 25 - j40 Ohm yüke 2.4 GHz WiFi bandında eşlemek istiyorum. Seri C paralel L mi yoksa tersi mi daha uygun?',
            author: 'Emre T.',
            uni: 'Gazi EEM',
            votes: 19,
            replies: 3,
            tag: 'RF & Mikrodalga',
            date: '2 gün önce',
            solved: true
        }
    ];

    /**
     * Portal Seçim ve Geçiş Fonksiyonu
    /**
     * 💤 AKADEMİ PORTALI UYKU MODU (SLEEP MODE)
     * Pasif duruma geçtiğinde CPU/GPU kullanımını sıfıra indirmek için:
     * - PCB devre arka plan animasyonunu (rAF) durdurur.
     * - Tüm simülatör motorlarını (SimManager), Falstad'ı ve ses motorlarını durdurur.
     */
    function pauseAkademiSleepMode() {
        // 1. PCB Hero Arka Plan Animasyonunu Durdur (cancelAnimationFrame)
        if (typeof window.stopPcbBackground === 'function') {
            try { window.stopPcbBackground(); } catch (e) { }
        }

        // 2. Tüm Laboratuvar Simülasyon Motorlarını Durdur (SimManager)
        if (window.SimManager && typeof window.SimManager.stopAll === 'function') {
            try { window.SimManager.stopAll(); } catch (e) { }
        }

        // 3. 3D Plotter, Falstad ve Ses Motorlarını Durdur
        if (typeof window.stopPlotter3DAutoRotate === 'function') {
            try { window.stopPlotter3DAutoRotate(); } catch (e) { }
        }
        if (typeof window.sleepFalstadCircuit === 'function') {
            try { window.sleepFalstadCircuit(); } catch (e) { }
        }
        if (typeof window.stopSignalGenAudio === 'function') {
            try { window.stopSignalGenAudio(); } catch (e) { }
        }
        if (typeof window.cancelAllTransientSimFrames === 'function') {
            try { window.cancelAllTransientSimFrames(); } catch (e) { }
        }
        if (typeof window.stopZigzagSimulation === 'function') {
            try { window.stopZigzagSimulation(); } catch (e) { }
        }

        // 4. Açık kalan lab modalı varsa kapat
        const labOverlay = document.getElementById('labModalOverlay');
        if (labOverlay && labOverlay.style.display !== 'none' && typeof window.closeLabModal === 'function') {
            try { window.closeLabModal(); } catch (e) { }
        }
    }

    /**
     * ⚡ AKADEMİ PORTALI UYANDIRMA (AWAKE / RESUME MODE)
     */
    function resumeAkademiAwakeMode() {
        if (typeof window.renderPcbBackground === 'function') {
            try { window.renderPcbBackground(); } catch (e) { }
        }
    }

    /**
     * 💤 KARİYER PORTALI UYKU MODU (SLEEP MODE)
     * Kariyer tarafındaki gereksiz arka plan döngülerini (Canvas rAF & AI Ticker setInterval) durdurur.
     */
    function pauseKariyerSleepMode() {
        stopCareerNetworkAnimation();
        stopAiTicker();
    }

    /**
     * ⚡ KARİYER PORTALI UYANDIRMA (AWAKE / RESUME MODE)
     */
    function resumeKariyerAwakeMode() {
        startCareerNetworkAnimation();
        startAiTicker();
        renderCareerForumFeed();
    }

    /**
     * 🔄 PORTAL DEĞİŞTİRİCİ MOTORU (SEAMLESS SWITCHER & SLEEP MODE)
     * @param {'akademi' | 'kariyer'} portalName 
     * @param {boolean} save 
     */
    function setDevremPortal(portalName, save = true) {
        if (portalName !== 'akademi' && portalName !== 'kariyer') portalName = 'akademi';
        currentDevremPortal = portalName;

        if (save) {
            try {
                localStorage.setItem('devrem_active_portal', portalName);
            } catch (e) { }
        }

        const box = document.getElementById('logo3dBox');
        const portalAkademi = document.getElementById('portal-akademi') || document.getElementById('portalAkademi');
        const portalKariyer = document.getElementById('portal-kariyer') || document.getElementById('portalKariyer');

        // Menü Öğeleri İzolasyonu (Sadece aktif portalın menüsü görünür)
        const akademiNavItems = document.querySelectorAll('.nav-item-akademi');
        const kariyerNavItems = document.querySelectorAll('.nav-item-kariyer');

        if (portalName === 'kariyer') {
            // 1. Akademi Portalını Kesin UYKU MODUNA Al (Sleep Mode: 0% CPU)
            pauseAkademiSleepMode();

            if (box) box.classList.add('flipped');
            if (portalAkademi) {
                portalAkademi.classList.remove('active');
                portalAkademi.style.setProperty('display', 'none', 'important');
            }
            if (portalKariyer) {
                portalKariyer.classList.add('active');
                portalKariyer.style.setProperty('display', 'block', 'important');
                portalKariyer.classList.remove('portal-anim-active');
                void portalKariyer.offsetWidth; // reflow
                portalKariyer.classList.add('portal-anim-active');
            }
            document.body.classList.add('portal-kariyer-active');
            document.body.classList.remove('portal-akademi-active');

            // Üye / Kariyer paneli izolasyonu (Kariyer'de giriş yapılmışsa göster)
            const uyePaneli = document.getElementById('uye-paneli');
            if (uyePaneli && (typeof getCurrentUser === 'function' ? getCurrentUser() : true)) {
                uyePaneli.style.removeProperty('display');
                uyePaneli.style.display = 'block';
            }

            // Menü ayrımı
            akademiNavItems.forEach(el => el.style.setProperty('display', 'none', 'important'));
            kariyerNavItems.forEach(el => el.style.setProperty('display', 'inline-flex', 'important'));

            // Kariyer bileşenlerini uyandır
            resumeKariyerAwakeMode();
            updateSpotlightSearchPlaceholder('kariyer');

            if (typeof window.showToast === 'function' && save) {
                window.showToast('💼 Kariyer & Topluluk Portalı Açıldı', 'info');
            }
        } else {
            // 1. Kariyer Portalını Kesin UYKU MODUNA Al (Sleep Mode: 0% CPU)
            pauseKariyerSleepMode();

            if (box) box.classList.remove('flipped');
            if (portalKariyer) {
                portalKariyer.classList.remove('active');
                portalKariyer.style.setProperty('display', 'none', 'important');
            }
            if (portalAkademi) {
                portalAkademi.classList.add('active');
                portalAkademi.style.setProperty('display', 'block', 'important');
                portalAkademi.classList.remove('portal-anim-active');
                void portalAkademi.offsetWidth; // reflow
                portalAkademi.classList.add('portal-anim-active');
            }
            document.body.classList.add('portal-akademi-active');
            document.body.classList.remove('portal-kariyer-active');

            // Üye / Kariyer paneli izolasyonu (Akademi'de kesinlikle gizle)
            const uyePaneli = document.getElementById('uye-paneli');
            if (uyePaneli) {
                uyePaneli.style.setProperty('display', 'none', 'important');
            }

            // Menü ayrımı
            kariyerNavItems.forEach(el => el.style.setProperty('display', 'none', 'important'));
            akademiNavItems.forEach(el => el.style.setProperty('display', 'inline-flex', 'important'));

            // Akademi bileşenlerini uyandır
            resumeAkademiAwakeMode();
            updateSpotlightSearchPlaceholder('akademi');

            if (typeof window.showToast === 'function' && save) {
                window.showToast('🎓 Akademi & Laboratuvar Portalı Açıldı', 'info');
            }
        }

        // Bildirimleri portal tipine göre güncelle
        if (typeof window.renderLiveNotificationUI === 'function') {
            try { window.renderLiveNotificationUI(); } catch (e) { }
        }

        window.scrollTo(0, 0);
    }

    /**
     * Portalları Tersine Değiştir (Logo Switcher Tıklandığında)
     */
    function toggleDevremPortal() {
        const next = (currentDevremPortal === 'akademi') ? 'kariyer' : 'akademi';
        setDevremPortal(next, true);
        window.scrollTo(0, 0);
    }

    /**
     * Kariyer Portalı İçi Alt Sekmeleri Değiştir
     * @param {string} tabId 
     */
    function openCareerSubTab(tabId) {
        currentCareerSubTab = tabId;
        document.querySelectorAll('.career-nav-tab').forEach(btn => {
            if (btn.getAttribute('data-tab') === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        document.querySelectorAll('.career-subpanel').forEach(panel => {
            if (panel.id === 'careerSubpanel-' + tabId) {
                panel.style.display = 'block';
                panel.classList.add('active');
            } else {
                panel.style.display = 'none';
                panel.classList.remove('active');
            }
        });

        if (tabId === 'profil') {
            if (typeof window.renderProfile === 'function') window.renderProfile();
            if (typeof window.renderEngProfile === 'function') window.renderEngProfile();
        } else if (tabId === 'cv') {
            if (typeof window.initCVBuilder === 'function') window.initCVBuilder();
            if (typeof window.setCVTemplate === 'function') window.setCVTemplate('modern');
        } else if (tabId === 'ilanlar') {
            if (typeof window.fetchEngineeringOpportunities === 'function') window.fetchEngineeringOpportunities();
            if (typeof window.filterProjectAds === 'function') window.filterProjectAds('all');
        } else if (tabId === 'forum') {
            renderCareerForumFeed();
        }
    }

    /**
     * AI Ticker Döngüsü
     */
    function startAiTicker() {
        if (tickerInterval) clearInterval(tickerInterval);
        updateTickerDisplay();
        tickerInterval = setInterval(() => {
            tickerIndex = (tickerIndex + 1) % AI_TICKER_ITEMS.length;
            updateTickerDisplay();
        }, 4000);
    }

    function stopAiTicker() {
        if (tickerInterval) {
            clearInterval(tickerInterval);
            tickerInterval = null;
        }
    }

    function updateTickerDisplay() {
        const el = document.getElementById('aiTickerContent');
        if (!el) return;
        const item = AI_TICKER_ITEMS[tickerIndex];
        el.style.opacity = '0';
        el.style.transform = 'translateY(10px)';
        setTimeout(() => {
            el.innerHTML = `
                <span class="ai-ticker-item">
                    <i class="${item.icon}" style="color:${item.color};"></i>
                    <span>${item.text}</span>
                </span>
            `;
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, 200);
    }

    /**
     * Kariyer Portalı Soru-Cevap Forum Kartlarını Render Et
     */
    function renderCareerForumFeed(filterTag = 'all') {
        const container = document.getElementById('careerForumFeedGrid');
        if (!container) return;

        const list = (filterTag === 'all')
            ? FORUM_QUESTIONS
            : FORUM_QUESTIONS.filter(q => q.tag.toLowerCase().includes(filterTag.toLowerCase()));

        container.innerHTML = list.map(q => `
            <div class="career-forum-card" style="background:rgba(15,23,42,0.7);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:18px;display:flex;gap:16px;align-items:flex-start;transition:all 0.2s ease;">
                <div class="forum-vote-box" style="display:flex;flex-direction:column;align-items:center;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:8px 12px;min-width:54px;">
                    <button type="button" onclick="DevremPortal.voteQuestion('${q.id}', 1, this)" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:1rem;" title="Faydalı Soru"><i class="fas fa-chevron-up"></i></button>
                    <span style="font-weight:800;color:#38bdf8;font-size:1.05rem;margin:2px 0;">${q.votes}</span>
                    <span style="font-size:0.68rem;color:#64748b;text-transform:uppercase;">Oy</span>
                </div>
                <div style="flex:1;">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
                        <span style="background:rgba(56,189,248,0.15);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);font-size:0.75rem;padding:2px 8px;border-radius:6px;font-weight:700;">${q.tag}</span>
                        ${q.solved ? '<span style="background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(16,185,129,0.3);font-size:0.75rem;padding:2px 8px;border-radius:6px;font-weight:700;"><i class="fas fa-check-circle"></i> Çözüldü</span>' : ''}
                        <span style="font-size:0.78rem;color:#64748b;margin-left:auto;"><i class="fas fa-clock"></i> ${q.date}</span>
                    </div>
                    <h3 style="font-size:1.05rem;font-weight:800;color:#f8fafc;margin:0 0 6px 0;line-height:1.4;">${q.title}</h3>
                    <p style="font-size:0.88rem;color:#94a3b8;margin:0 0 12px 0;line-height:1.5;">${q.desc}</p>
                    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                        <div style="font-size:0.8rem;color:#cbd5e1;display:flex;align-items:center;gap:6px;">
                            <i class="fas fa-user-circle" style="color:#818cf8;"></i>
                            <span>${q.author}</span>
                            <span style="color:#64748b;">• ${q.uni}</span>
                        </div>
                        <div style="display:flex;gap:8px;">
                            <button type="button" onclick="DevremPortal.openAnswerModal('${q.id}', '${encodeURIComponent(q.title)}')" class="btn btn-sm" style="background:rgba(56,189,248,0.1);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);font-size:0.8rem;border-radius:8px;padding:4px 12px;">
                                <i class="fas fa-reply"></i> Yanıtla (${q.replies})
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function voteQuestion(qid, amount, btn) {
        const item = FORUM_QUESTIONS.find(q => q.id === qid);
        if (item) {
            item.votes += amount;
            const span = btn.parentNode.querySelector('span');
            if (span) span.textContent = item.votes;
            btn.style.color = '#38bdf8';
            if (typeof window.showToast === 'function') window.showToast('Oyunuz kaydedildi!', 'success');
        }
    }

    function openNewQuestionModal() {
        const title = prompt('Sormak istediğiniz EEM sorusu başlığı:');
        if (!title) return;
        const desc = prompt('Sorunuzun detayları ve ders/konu bilgisi:');
        if (!desc) return;
        FORUM_QUESTIONS.unshift({
            id: 'fq-' + Date.now(),
            title: title,
            desc: desc,
            author: 'Sen (Mühendis Adayı)',
            uni: 'EEM Platformu',
            votes: 1,
            replies: 0,
            tag: 'Topluluk Sorusu',
            date: 'Az önce',
            solved: false
        });
        renderCareerForumFeed();
        if (typeof window.showToast === 'function') window.showToast('Sorunuz foruma eklendi!', 'success');
    }

    function openAnswerModal(qid, encTitle) {
        const title = decodeURIComponent(encTitle);
        const reply = prompt(`"${title}" sorusuna teknik cevabınız:`);
        if (!reply) return;
        const q = FORUM_QUESTIONS.find(item => item.id === qid);
        if (q) {
            q.replies += 1;
            renderCareerForumFeed();
            if (typeof window.showToast === 'function') window.showToast('Teknik yanıtınız gönderildi! Teşekkürler.', 'success');
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🌐 2. KARİYER ARKA PLANI: NETWORK GRAPH (CANVAS ENGINE)
    // ═══════════════════════════════════════════════════════════════
    let networkAnimId = null;
    let networkCanvas = null;
    let networkCtx = null;
    let networkNodes = [];
    let networkMouse = { x: -1000, y: -1000 };

    const KEY_DISCIPLINES = [
        'Güç El.', 'Gömülü', 'Aviyonik', 'RF & Radar', 'Kontrol',
        'FPGA', 'BMS', 'IoT', 'DSP', 'Otonom', 'Batarya', 'CANBus'
    ];

    function initCareerNetworkCanvas() {
        if (window.innerWidth <= 768) return;
        networkCanvas = document.getElementById('careerNetworkCanvas');
        if (!networkCanvas) return;
        networkCtx = networkCanvas.getContext('2d');
        if (!networkCtx) return;

        function resize() {
            if (!networkCanvas) return;
            const hero = networkCanvas.closest('.career-hero');
            if (!hero) return;
            const rect = hero.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            networkCanvas.width = rect.width * dpr;
            networkCanvas.height = rect.height * dpr;
            networkCanvas.style.width = rect.width + 'px';
            networkCanvas.style.height = rect.height + 'px';
            networkCtx.scale(dpr, dpr);
            createNetworkNodes(rect.width, rect.height);
        }

        window.addEventListener('resize', resize);
        resize();

        const hero = networkCanvas.closest('.career-hero');
        if (hero) {
            hero.addEventListener('mousemove', (e) => {
                const rect = hero.getBoundingClientRect();
                networkMouse.x = e.clientX - rect.left;
                networkMouse.y = e.clientY - rect.top;
            });
            hero.addEventListener('mouseleave', () => {
                networkMouse.x = -1000;
                networkMouse.y = -1000;
            });
        }
    }

    function createNetworkNodes(w, h) {
        networkNodes = [];
        const count = Math.min(38, Math.max(20, Math.floor(w / 35)));
        for (let i = 0; i < count; i++) {
            networkNodes.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.45,
                vy: (Math.random() - 0.5) * 0.45,
                radius: Math.random() * 2.5 + 2.5,
                label: (i < KEY_DISCIPLINES.length) ? KEY_DISCIPLINES[i] : null,
                pulse: Math.random() * Math.PI * 2
            });
        }
    }

    function renderCareerNetwork() {
        if (!networkCanvas || !networkCtx) return;
        const hero = networkCanvas.closest('.career-hero');
        if (!hero) return;
        const w = hero.clientWidth;
        const h = hero.clientHeight;

        networkCtx.clearRect(0, 0, w, h);

        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        const nodeColor = isDark ? '#10b981' : '#059669';
        const nodeCyan = isDark ? '#06b6d4' : '#0284c7';
        const lineBase = isDark ? 'rgba(16, 185, 129,' : 'rgba(5, 150, 105,';
        const maxDist = 130;

        // Düğümleri güncelle & çiz
        for (let i = 0; i < networkNodes.length; i++) {
            const n = networkNodes[i];
            n.x += n.vx;
            n.y += n.vy;
            n.pulse += 0.03;

            if (n.x < 10) { n.x = 10; n.vx *= -1; }
            if (n.x > w - 10) { n.x = w - 10; n.vx *= -1; }
            if (n.y < 10) { n.y = 10; n.vy *= -1; }
            if (n.y > h - 10) { n.y = h - 10; n.vy *= -1; }

            // Bağlantı çizgileri
            for (let j = i + 1; j < networkNodes.length; j++) {
                const n2 = networkNodes[j];
                const dx = n.x - n2.x;
                const dy = n.y - n2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < maxDist) {
                    const alpha = (1 - dist / maxDist) * 0.35;
                    networkCtx.beginPath();
                    networkCtx.moveTo(n.x, n.y);
                    networkCtx.lineTo(n2.x, n2.y);
                    networkCtx.strokeStyle = `${lineBase}${alpha})`;
                    networkCtx.lineWidth = 1;
                    networkCtx.stroke();
                }
            }

            // Fare etkileşimi
            const mdx = n.x - networkMouse.x;
            const mdy = n.y - networkMouse.y;
            const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
            if (mdist < 140) {
                const mAlpha = (1 - mdist / 140) * 0.6;
                networkCtx.beginPath();
                networkCtx.moveTo(n.x, n.y);
                networkCtx.lineTo(networkMouse.x, networkMouse.y);
                networkCtx.strokeStyle = `rgba(6, 182, 212, ${mAlpha})`;
                networkCtx.lineWidth = 1.2;
                networkCtx.stroke();
            }

            // Düğüm dairesi
            networkCtx.beginPath();
            const r = n.radius + Math.sin(n.pulse) * 0.5;
            networkCtx.arc(n.x, n.y, r, 0, Math.PI * 2);
            networkCtx.fillStyle = (i % 2 === 0) ? nodeColor : nodeCyan;
            networkCtx.shadowColor = (i % 2 === 0) ? nodeColor : nodeCyan;
            networkCtx.shadowBlur = 6;
            networkCtx.fill();
            networkCtx.shadowBlur = 0;

            // Etiket
            if (n.label) {
                networkCtx.font = '600 10px Inter, sans-serif';
                networkCtx.fillStyle = isDark ? 'rgba(203, 213, 225, 0.75)' : 'rgba(51, 65, 85, 0.85)';
                networkCtx.fillText(n.label, n.x + 8, n.y + 3);
            }
        }

        networkAnimId = requestAnimationFrame(renderCareerNetwork);
    }

    function startCareerNetworkAnimation() {
        if (!networkCanvas) {
            initCareerNetworkCanvas();
        }
        if (!networkAnimId) {
            renderCareerNetwork();
        }
    }

    function stopCareerNetworkAnimation() {
        if (networkAnimId) {
            cancelAnimationFrame(networkAnimId);
            networkAnimId = null;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔍 4. ARAMA VE BİLDİRİM AYRIMI (PORTAL ISOLATION)
    // ═══════════════════════════════════════════════════════════════
    function updateSpotlightSearchPlaceholder(portal) {
        const inp = document.getElementById('spotlightSearchInput');
        const navPlaceholder = document.querySelector('.nav-search-placeholder');
        if (portal === 'kariyer') {
            if (inp) inp.placeholder = 'Staj, iş ilanı, CV, mülakat sorusu veya forum ara... (Kariyer)';
            if (navPlaceholder) navPlaceholder.textContent = 'Kariyer, staj veya forumda ara...';
        } else {
            if (inp) inp.placeholder = 'Formül, hesaplayıcı, ders veya simülatör ara... (Akademi)';
            if (navPlaceholder) navPlaceholder.textContent = 'Formül, ders veya lab ara...';
        }
    }

    // Spotlight Search sonucunu aktif portala göre filtrele
    function setupPortalSearchHook() {
        if (typeof window.getComprehensiveSearchableRegistry === 'function') {
            const originalRegistry = window.getComprehensiveSearchableRegistry;
            window.getComprehensiveSearchableRegistry = function () {
                const items = originalRegistry();
                if (currentDevremPortal === 'kariyer') {
                    // Sadece Kariyer & Topluluk öğeleri
                    return items.filter(item => {
                        const cat = (item.cat || '').toLowerCase();
                        const type = (item.type || '').toLowerCase();
                        return cat.includes('kariyer') || cat.includes('mülakat') || cat.includes('topluluk') ||
                               cat.includes('staj') || cat.includes('ilan') || cat.includes('cv') ||
                               cat.includes('forum') || type.includes('community') || type.includes('member');
                    });
                } else {
                    // Sadece Akademi & Laboratuvar öğeleri
                    return items.filter(item => {
                        const cat = (item.cat || '').toLowerCase();
                        const type = (item.type || '').toLowerCase();
                        return !(cat.includes('kariyer') || cat.includes('mülakat') ||
                                 cat.includes('staj') || cat.includes('ilan') || cat.includes('cv'));
                    });
                }
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🚀 BAŞLATMA & KALICILIK (LOCALSTORAGE)
    // ═══════════════════════════════════════════════════════════════
    document.addEventListener('DOMContentLoaded', function () {
        // Kaydedilmiş portal tercihi veya URL parametresi
        let savedPortal = 'akademi';
        try {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('portal') === 'kariyer' || window.location.hash === '#kariyer') {
                savedPortal = 'kariyer';
            } else {
                savedPortal = localStorage.getItem('devrem_active_portal') || 'akademi';
            }
        } catch (e) { }

        setDevremPortal(savedPortal, false);
        setupPortalSearchHook();
        initCareerNetworkCanvas();
    });

    // Global Dışa Aktarımlar
    window.DevremPortal = {
        setPortal: setDevremPortal,
        togglePortal: toggleDevremPortal,
        getCurrentPortal: () => currentDevremPortal,
        openCareerSubTab: openCareerSubTab,
        renderCareerForumFeed: renderCareerForumFeed,
        voteQuestion: voteQuestion,
        openNewQuestionModal: openNewQuestionModal,
        openAnswerModal: openAnswerModal,
        openGate: () => { if (typeof window.openDevremPortalGate === 'function') window.openDevremPortalGate(); },
        closeGate: () => { if (typeof window.closeDevremPortalGate === 'function') window.closeDevremPortalGate(); }
    };

    window.setDevremPortal = setDevremPortal;
    window.toggleDevremPortal = toggleDevremPortal;
    window.openCareerSubTab = openCareerSubTab;
    window.getCurrentDevremPortal = () => currentDevremPortal;

})();
