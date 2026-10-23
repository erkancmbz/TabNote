/**
 * EEM REHBER / DEVREM STUDIO - SAYFA & MODÜL ERİŞİM KONTROL SİSTEMİ
 * Yalnızca Yönetici (Admin) tarafından yönetilebilen dinamik sayfa, modül ve laboratuvar görünürlük motoru.
 * Sayfaları "Herkese Açık", "Sadece Üyelere Özel" (🔒) veya "Tamamen Gizli" olarak yapılandırır.
 */

(function (window) {
    'use strict';

    const STORAGE_KEY = 'eem_page_access_permissions';

    const PAGE_MODULES = [
        {
            id: 'kaynaklar',
            name: 'Ders Kaynakları & Kitaplar',
            subName: '64 Akredite Ders Kitabı & Açık Kaynak',
            category: 'Akademi & Dersler',
            icon: 'fas fa-book-open',
            iconColor: '#818cf8',
            badge: '64 Kitap',
            sectionId: 'kaynaklar',
            modalType: 'resource',
            navKeywords: ['kaynaklar', 'openResourceModal'],
            defaultAccess: 'members_only', // Kullanıcının talep ettiği varsayılan
            description: 'Sedra & Smith, Alexander & Sadiku, Hayt temel EEM ders kitapları, ders notları ve açık akademik kütüphane.'
        },
        {
            id: 'muhendislik-lab',
            name: 'Mühendislik Lab & Simülatörler',
            subName: '36 Canlı Simülatör (SPWM, RLC, Falstad, RF, Sinyal)',
            category: 'Laboratuvar & Simülasyon',
            icon: 'fas fa-atom',
            iconColor: '#c084fc',
            badge: '36 Canlı Araç',
            sectionId: null,
            modalType: 'lab',
            navKeywords: ['navLabMegaMenu', 'muhendislik-lab', 'openLabModal'],
            defaultAccess: 'public', // Mühendislik Laboratuvarı varsayılan olarak herkese açıktır
            description: 'SPICE Falstad devre motoru, SPWM güç invertörü, Smith Chart, 3B EM dalga ve donanım hesaplayıcıları.'
        },
        {
            id: 'sinav-arsivi',
            name: 'Vize & Final Soru Bankası',
            subName: 'İTÜ, ODTÜ, Boğaziçi ve YTÜ Çözümlü Sınavları',
            category: 'Akademi & Dersler',
            icon: 'fas fa-university',
            iconColor: '#fbbf24',
            badge: 'Çözümlü',
            sectionId: null,
            modalType: 'lab_sub',
            labSubTab: 'sinav-arsivi',
            navKeywords: ['sinav-arsivi'],
            defaultAccess: 'members_only',
            description: 'Üniversitelerin geçmiş dönem vize ve final sınavı soru kağıtları ve adım adım çözümleri.'
        },
        {
            id: 'mufredat',
            name: 'Ağır Ders Müfredatı & Seçmeliler',
            subName: 'Ders İçerikleri, Zorluk Analizi & Taktikler',
            category: 'Akademi & Dersler',
            icon: 'fas fa-graduation-cap',
            iconColor: '#a78bfa',
            badge: '1-4. Sınıf',
            sectionId: 'yolharitasi',
            modalType: 'lab_sub',
            labSubTab: 'mufredat',
            navKeywords: ['mufredat', 'yolharitasi'],
            defaultAccess: 'public',
            description: 'Dönem bazlı EEM dersleri, önkoşul zincirleri ve ders geçme rehberleri.'
        },
        {
            id: 'gpa',
            name: 'GNO & Mezuniyet Takipçisi',
            subName: '240 AKTS Lisans Not Ortalaması Hesaplayıcı',
            category: 'Akademi & Dersler',
            icon: 'fas fa-calculator',
            iconColor: '#34d399',
            badge: '240 AKTS',
            sectionId: null,
            modalType: 'lab_sub',
            labSubTab: 'gpa',
            navKeywords: ['openLabModal(\'gpa\')', 'gpa'],
            defaultAccess: 'public',
            description: 'Kişisel not ortalaması, harf notları ve mezuniyet kredisi simülasyonu.'
        },
        {
            id: 'formuller',
            name: 'Formül Kütüphanesi & CheatSheet',
            subName: 'Maxwell, Laplace, Fourier, Devre & Kontrol',
            category: 'Akademi & Dersler',
            icon: 'fas fa-square-root-alt',
            iconColor: '#ec4899',
            badge: 'KaTeX',
            sectionId: null,
            modalType: 'lab_sub',
            labSubTab: 'formuller',
            navKeywords: ['formuller'],
            defaultAccess: 'public',
            description: 'EEM derslerinde en çok kullanılan matematiksel ve mühendislik formüllerinin formül sayfası.'
        },
        {
            id: 'pratik',
            name: '3D Flashcards & Pratik Sınav',
            subName: 'Kavram Kartları & İnteraktif Testler',
            category: 'Akademi & Dersler',
            icon: 'fas fa-brain',
            iconColor: '#10b981',
            badge: '3D Test',
            sectionId: null,
            modalType: 'lab_sub',
            labSubTab: 'pratik',
            navKeywords: ['pratik'],
            defaultAccess: 'members_only',
            description: 'Mühendislik mülakatlarına ve ders sınavlarına yönelik interaktif test ve kartlar.'
        },
        {
            id: 'kurslar',
            name: 'Online Kurslar & YouTube',
            subName: 'Ücretsiz Video Eğitim Serileri',
            category: 'Akademi & Dersler',
            icon: 'fas fa-play-circle',
            iconColor: '#f472b6',
            badge: 'Video',
            sectionId: 'kurslar',
            navKeywords: ['kurslar'],
            defaultAccess: 'public',
            description: 'Devreler, elektronik, sinyaller ve programlama üzerine seçilmiş en kaliteli YouTube video serileri.'
        },
        {
            id: 'dallar',
            name: 'EEM Alt Dalları (12 Uzmanlık)',
            subName: 'Güç, Mikroelektronik, Telekom, Kontrol vb.',
            category: 'Rehber & Bilgi',
            icon: 'fas fa-sitemap',
            iconColor: '#38bdf8',
            badge: '12 Alan',
            sectionId: 'dallar',
            navKeywords: ['dallar'],
            defaultAccess: 'public',
            description: 'Elektrik-Elektronik Mühendisliği 12 temel uzmanlık dalının tanıtımı, dersleri ve iş alanları.'
        },
        {
            id: 'kariyer',
            name: 'Kariyer Rehberi & Staj',
            subName: 'Savunma Sanayii, Mülakatlar & Maaş Skalaları',
            category: 'Kariyer & İlanlar',
            icon: 'fas fa-user-tie',
            iconColor: '#818cf8',
            badge: 'Sektör',
            sectionId: 'kariyer',
            navKeywords: ['kariyer'],
            defaultAccess: 'public',
            description: 'ASELSAN, ROKETSAN, TUSAŞ staj rehberi, mühendislik mülakat tüyoları ve kariyer adımları.'
        },
        {
            id: 'firsatlar',
            name: 'Burs & Yarışma Fırsatları',
            subName: 'TEKNOFEST, TÜBİTAK & Güncel Burslar',
            category: 'Kariyer & İlanlar',
            icon: 'fas fa-certificate',
            iconColor: '#f59e0b',
            badge: 'Fırsatlar',
            sectionId: 'firsatlar',
            navKeywords: ['firsatlar'],
            defaultAccess: 'public',
            description: 'Mühendislik öğrencilerine özel burs programları, TEKNOFEST yarışmaları ve proje destekleri.'
        },
        {
            id: 'ilanlar',
            name: 'Canlı İlanlar & Takım Panosu',
            subName: 'Kariyer.net, LinkedIn & Bitirme Projesi İlanları',
            category: 'Kariyer & İlanlar',
            icon: 'fas fa-briefcase',
            iconColor: '#06b6d4',
            badge: 'Canlı',
            sectionId: 'panel-ilanlar',
            navKeywords: ['ilanlar'],
            defaultAccess: 'public',
            description: 'Anlık çekilen EEM iş ve staj ilanları ile öğrencilerin takım arkadaşı arama panosu.'
        },
        {
            id: 'cv-builder',
            name: 'Akıllı CV Oluşturucu',
            subName: 'Mühendis Formatında PDF Özgeçmiş Hazırlama',
            category: 'Kariyer & İlanlar',
            icon: 'fas fa-file-invoice',
            iconColor: '#a855f7',
            badge: 'PDF',
            sectionId: 'panel-cv-builder',
            navKeywords: ['cv-builder'],
            defaultAccess: 'members_only',
            description: 'Mühendislik standartlarına uygun tek tıkla profesyonel PDF CV üretici.'
        },
        {
            id: 'arkadaslar',
            name: 'Mühendis Ağı (Arkadaş Bul)',
            subName: 'Üniversite ve İlgi Alanına Göre Mühendis Bulma',
            category: 'Topluluk & İletişim',
            icon: 'fas fa-user-friends',
            iconColor: '#f472b6',
            badge: 'Network',
            sectionId: 'panel-arkadaslar',
            navKeywords: ['arkadaslar'],
            defaultAccess: 'members_only',
            description: 'Türkiye genelindeki EEM öğrencileri ve mezunları ile bağlantı kurma platformu.'
        },
        {
            id: 'forum',
            name: 'Devrem Forum & Tartışma',
            subName: 'Teknik Soru-Cevap & Canlı Mühendis Topluluğu',
            category: 'Topluluk & İletişim',
            icon: 'fas fa-comments',
            iconColor: '#34d399',
            badge: 'Canlı Forum',
            sectionId: null,
            navKeywords: ['forum', 'forum.html'],
            defaultAccess: 'public',
            description: 'Devre tasarımı, kodlama ve ders sorularının sorulduğu ve yanıtlandığı interaktif forum.'
        },
        {
            id: 'topluluklar',
            name: 'EEM Toplulukları & Kulüpler',
            subName: 'IEEE, Discord, Telegram & Kulüpler',
            category: 'Topluluk & İletişim',
            icon: 'fas fa-users',
            iconColor: '#818cf8',
            badge: 'Kulüpler',
            sectionId: 'topluluklar',
            navKeywords: ['topluluklar'],
            defaultAccess: 'public',
            description: 'Mühendislik öğrenci kolları ve aktif online topluluk kanalları listesi.'
        },
        {
            id: 'ipuclari',
            name: 'Mühendislik İpuçları',
            subName: 'Ders Geçme, Laboratuvar Güvenliği & Taktikler',
            category: 'Rehber & Bilgi',
            icon: 'fas fa-lightbulb',
            iconColor: '#fbbf24',
            badge: 'Tüyolar',
            sectionId: 'ipuclari',
            navKeywords: ['ipuclari'],
            defaultAccess: 'public',
            description: 'EEM eğitim hayatında başarı için pratik çalışma tüyoları ve lab kuralları.'
        }
    ];

    const PageAccessControl = {
        MODULES: PAGE_MODULES,

        /**
         * Kayıtlı izin yapılandırmasını döner. Bulunamazsa varsayılanları başlatır.
         */
        getPermissions: function () {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    const merged = {};
                    PAGE_MODULES.forEach(m => {
                        merged[m.id] = parsed[m.id] || m.defaultAccess;
                    });
                    // Eski önbellekte kalmış varsayılan members_only değerini public olarak güncelle
                    if (!parsed._v2 && merged['muhendislik-lab'] === 'members_only') {
                        merged['muhendislik-lab'] = 'public';
                    }
                    return merged;
                }
            } catch (e) {
                console.warn('[PageAccessControl] İzinler okunamadı:', e);
            }

            const initial = {};
            PAGE_MODULES.forEach(m => {
                initial[m.id] = m.defaultAccess;
            });
            return initial;
        },

        /**
         * İzinleri kaydeder ve tüm sayfada dinamik olarak yürürlüğe koyar.
         */
        savePermissions: function (perms) {
            try {
                perms._v2 = true;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(perms));
                this.applyPermissions();
                return true;
            } catch (e) {
                console.error('[PageAccessControl] İzin kaydetme hatası:', e);
                return false;
            }
        },

        /**
         * Belirli bir modülün erişim seviyesini günceller ('public' | 'members_only' | 'hidden').
         */
        setModuleAccess: function (moduleId, accessLevel) {
            const user = this.getCurrentUser();
            if (!user || !user.isAdmin) {
                if (typeof window.showToast === 'function') {
                    window.showToast('Bu işlemi yalnızca sistem yöneticisi gerçekleştirebilir!', 'error');
                }
                return false;
            }

            const perms = this.getPermissions();
            perms[moduleId] = accessLevel;
            this.savePermissions(perms);

            const mod = PAGE_MODULES.find(m => m.id === moduleId);
            const levelLabel = accessLevel === 'public' ? 'Herkese Açık 🌍'
                : (accessLevel === 'members_only' ? 'Sadece Üyelere Özel 🔒' : 'Gizli 👁️‍🗨️');

            if (typeof window.showToast === 'function') {
                window.showToast(`"${mod ? mod.name : moduleId}" erişim seviyesi "${levelLabel}" olarak güncellendi!`, 'success');
            }

            this.renderAdminPanelUI();
            return true;
        },

        /**
         * Bir modülün erişim seviyesini döner.
         */
        getModuleAccess: function (moduleId) {
            const perms = this.getPermissions();
            return perms[moduleId] || 'public';
        },

        /**
         * Aktif kullanıcı oturumu
         */
        getCurrentUser: function () {
            if (typeof window.getCurrentUser === 'function') {
                return window.getCurrentUser();
            }
            try {
                return JSON.parse(localStorage.getItem('eem-current-user') || 'null');
            } catch (e) {
                return null;
            }
        },

        /**
         * Aktif kullanıcının verilen modüle erişim hakkı olup olmadığını kontrol eder.
         */
        canAccess: function (moduleId) {
            const access = this.getModuleAccess(moduleId);
            const user = this.getCurrentUser();

            // Yönetici her zaman tam erişime sahiptir
            if (user && user.isAdmin) {
                return true;
            }

            if (access === 'public') {
                return true;
            }

            if (access === 'members_only') {
                return Boolean(user);
            }

            if (access === 'hidden') {
                return Boolean(user && user.isAdmin);
            }

            return false;
        },

        /**
         * Sitedeki tüm navigasyon bağlantılarını, mega menüleri ve sayfa bölümlerini
         * izinlere ve kullanıcı oturum durumuna göre anlık günceller.
         */
        applyPermissions: function () {
            const perms = this.getPermissions();
            const user = this.getCurrentUser();
            const isAdmin = Boolean(user && user.isAdmin);
            const isMember = Boolean(user);

            PAGE_MODULES.forEach(mod => {
                const access = perms[mod.id] || 'public';

                // 1. Sayfa İçi Bölüm (Section) Denetimi
                if (mod.sectionId) {
                    const sec = document.getElementById(mod.sectionId);
                    if (sec) {
                        if (access === 'hidden' && !isAdmin) {
                            sec.style.display = 'none';
                        } else {
                            // Sadece Üyelere Özel ve kullanıcı misafir ise kilitli kapak göster
                            if (access === 'members_only' && !isMember && !isAdmin) {
                                this.attachSectionLockOverlay(sec, mod);
                            } else {
                                this.removeSectionLockOverlay(sec);
                                if (mod.sectionId !== 'uye-paneli') {
                                    // Default inline style if any
                                    if (sec.getAttribute('data-prev-display')) {
                                        sec.style.display = sec.getAttribute('data-prev-display');
                                    } else {
                                        sec.style.display = '';
                                    }
                                }
                            }
                        }
                    }
                }

                // 2. Navigasyon ve Mega Menü Bağlantıları Denetimi
                this.updateNavItems(mod, access, isMember, isAdmin);
            });
        },

        /**
         * Navigasyon bağlantılarına kilit rozeti veya gizleme uygular
         */
        updateNavItems: function (mod, access, isMember, isAdmin) {
            const navLinks = document.querySelectorAll('.nav-links a, .nav-dropdown-item, .nav-mega-all-btn, .nav-mega-cat-btn, .nav-mega-tool-item');

            navLinks.forEach(link => {
                const href = link.getAttribute('href') || '';
                const onclick = link.getAttribute('onclick') || '';
                const text = (link.textContent || '').toLowerCase();

                let matches = false;
                if (mod.navKeywords) {
                    matches = mod.navKeywords.some(kw =>
                        href.includes(kw) || onclick.includes(kw) || text.includes(kw.toLowerCase())
                    );
                }

                if (matches) {
                    // Mevcut eski kilit rozetini temizle
                    const oldBadge = link.querySelector('.nav-access-lock-badge');
                    if (oldBadge) oldBadge.remove();

                    if (access === 'hidden' && !isAdmin) {
                        link.style.display = 'none';
                    } else {
                        link.style.display = '';

                        if (access === 'members_only') {
                            if (!isMember && !isAdmin) {
                                // Misafire kilit rozeti ekle
                                const badge = document.createElement('span');
                                badge.className = 'nav-access-lock-badge';
                                badge.innerHTML = '<i class="fas fa-lock" style="font-size:0.65rem;margin-right:2px;"></i> Üye';
                                badge.title = 'Bu alan sadece kayıtlı üyelere özeldir';

                                const titleEl = link.querySelector('.nav-dd-title') || link.querySelector('.nav-mega-tool-title') || link.querySelector('span') || link;
                                if (titleEl) {
                                    titleEl.appendChild(badge);
                                }
                            }
                        }
                    }
                }
            });
        },

        /**
         * Sayfa içi bölüme şık, buzlu cam kilitli üye uyarısı ekler
         */
        attachSectionLockOverlay: function (sec, mod) {
            sec.style.position = 'relative';
            sec.setAttribute('data-access-locked', 'true');

            let overlay = sec.querySelector('.section-access-lock-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'section-access-lock-overlay';
                overlay.innerHTML = `
                    <div class="section-lock-card">
                        <div class="section-lock-icon">
                            <i class="fas fa-user-lock"></i>
                        </div>
                        <div class="section-lock-badge">
                            <i class="fas fa-crown"></i> SADECE ÜYELERE ÖZEL İÇERİK
                        </div>
                        <h3 class="section-lock-title">${mod.name}</h3>
                        <p class="section-lock-desc">
                            Bu bölümdeki ders kaynakları, dökümanlar ve araçlar sadece kayıtlı mühendis ve öğrenci üyelerimize açıktır.
                            Tüm kütüphaneye sınırsız erişmek için lütfen giriş yapın veya 30 saniyede ücretsiz hesabınızı oluşturun.
                        </p>
                        <div class="section-lock-actions">
                            <button class="btn btn-primary" onclick="openAuthModal('login')">
                                <i class="fas fa-sign-in-alt"></i> Üye Girişi Yap
                            </button>
                            <button class="btn btn-secondary" onclick="openAuthModal('register')">
                                <i class="fas fa-user-plus"></i> Ücretsiz Kayıt Ol
                            </button>
                        </div>
                        <div class="section-lock-features">
                            <span><i class="fas fa-check-circle"></i> 64+ Akademik Kitap & Not</span>
                            <span><i class="fas fa-check-circle"></i> 36 Canlı Simülatör</span>
                            <span><i class="fas fa-check-circle"></i> Vize-Final Sınav Arşivi</span>
                        </div>
                    </div>
                `;
                sec.appendChild(overlay);
            }
        },

        /**
         * Sayfa içi bölüm kilit örtüsünü kaldırır
         */
        removeSectionLockOverlay: function (sec) {
            sec.removeAttribute('data-access-locked');
            const overlay = sec.querySelector('.section-access-lock-overlay');
            if (overlay) {
                overlay.remove();
            }
        },

        /**
         * Giriş yapmamış kullanıcı kısıtlı bir alana tıkladığında gösterilen modern modal
         */
        showAccessGateModal: function (moduleId) {
            const mod = PAGE_MODULES.find(m => m.id === moduleId) || {
                name: 'Özel Mühendislik Alanı',
                icon: 'fas fa-lock',
                iconColor: '#fde047',
                description: 'Bu alan sadece sistemimize kayıtlı mühendis adaylarına ve öğrencilere açıktır.'
            };

            let modalOverlay = document.getElementById('pageAccessGateModal');
            if (!modalOverlay) {
                modalOverlay = document.createElement('div');
                modalOverlay.id = 'pageAccessGateModal';
                modalOverlay.className = 'access-gate-modal-overlay';
                document.body.appendChild(modalOverlay);
            }

            modalOverlay.innerHTML = `
                <div class="access-gate-modal-box">
                    <button class="access-gate-close" onclick="PageAccessControl.closeAccessGateModal()" title="Kapat">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="access-gate-header">
                        <div class="access-gate-shield-glow">
                            <i class="${mod.icon}" style="color:${mod.iconColor || '#38bdf8'};"></i>
                        </div>
                        <div class="access-gate-badge">
                            <i class="fas fa-lock"></i> SADECE ÜYELERE ÖZEL ALAN
                        </div>
                        <h2 class="access-gate-title">${mod.name}</h2>
                        <p class="access-gate-subtitle">${mod.subName || 'EEM Rehber & Devrem Studio'}</p>
                    </div>

                    <div class="access-gate-body">
                        <p class="access-gate-info-text">
                            <strong>${mod.name}</strong> içeriğine ve platformun gelişmiş mühendislik hesaplayıcılarına, ders kaynaklarına erişebilmek için üye girişi yapmanız gerekmektedir.
                        </p>

                        <div class="access-gate-benefits-grid">
                            <div class="benefit-item">
                                <i class="fas fa-book-reader" style="color:#818cf8;"></i>
                                <div>
                                    <strong>64+ Ders Kitabı</strong>
                                    <span>Tüm temel ders kaynakları & sınav arşivleri</span>
                                </div>
                            </div>
                            <div class="benefit-item">
                                <i class="fas fa-atom" style="color:#c084fc;"></i>
                                <div>
                                    <strong>36 Canlı Simülatör</strong>
                                    <span>Falstad, SPWM, Smith Chart, RLC, Filtreler</span>
                                </div>
                            </div>
                            <div class="benefit-item">
                                <i class="fas fa-chart-line" style="color:#34d399;"></i>
                                <div>
                                    <strong>Portfolyo & CV</strong>
                                    <span>GPA takipçisi, rozetler ve mühendislik ağı</span>
                                </div>
                            </div>
                        </div>

                        <div class="access-gate-actions">
                            <button class="btn btn-primary access-btn-large" onclick="PageAccessControl.closeAccessGateModal(); openAuthModal('login');">
                                <i class="fas fa-sign-in-alt"></i> Üye Girişi Yap
                            </button>
                            <button class="btn btn-secondary access-btn-large" onclick="PageAccessControl.closeAccessGateModal(); openAuthModal('register');">
                                <i class="fas fa-user-plus"></i> Ücretsiz Kayıt Ol (30 Saniye)
                            </button>
                        </div>
                        <div style="text-align:center;margin-top:14px;">
                            <a href="javascript:void(0)" onclick="PageAccessControl.closeAccessGateModal()" style="color:var(--text-muted);font-size:0.82rem;text-decoration:none;">
                                Şimdilik Misafir Olarak Gezinmeye Devam Et
                            </a>
                        </div>
                    </div>
                </div>
            `;

            modalOverlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        },

        closeAccessGateModal: function () {
            const modalOverlay = document.getElementById('pageAccessGateModal');
            if (modalOverlay) {
                modalOverlay.style.display = 'none';
                document.body.style.overflow = '';
            }
        },

        /**
         * Yönetici Paneli içindeki "Sayfa & Modül Görünürlük Masası" arayüzünü oluşturur ve render eder.
         */
        renderAdminPanelUI: function () {
            const container = document.getElementById('adminPageAccessControlContainer');
            if (!container) return;

            const user = this.getCurrentUser();
            if (!user || !user.isAdmin) {
                container.innerHTML = `
                    <div style="padding:24px;text-align:center;color:var(--text-muted);">
                        <i class="fas fa-lock" style="font-size:2rem;margin-bottom:12px;color:#ef4444;"></i>
                        <p>Bu alana yalnızca sistem yöneticisi erişebilir.</p>
                    </div>
                `;
                return;
            }

            const perms = this.getPermissions();

            // İstatistikler
            let total = PAGE_MODULES.length;
            let publicCount = 0;
            let memberCount = 0;
            let hiddenCount = 0;

            PAGE_MODULES.forEach(m => {
                const acc = perms[m.id] || 'public';
                if (acc === 'public') publicCount++;
                else if (acc === 'members_only') memberCount++;
                else if (acc === 'hidden') hiddenCount++;
            });

            // Aktif kategori veya arama filtresi
            const searchQuery = (document.getElementById('adminAccessSearchInput')?.value || '').toLowerCase().trim();
            const activeCategory = window._adminAccessCategoryFilter || 'all';

            const filteredModules = PAGE_MODULES.filter(m => {
                const matchSearch = !searchQuery || m.name.toLowerCase().includes(searchQuery) || m.description.toLowerCase().includes(searchQuery) || m.category.toLowerCase().includes(searchQuery);
                const matchCat = (activeCategory === 'all') || (m.category === activeCategory);
                return matchSearch && matchCat;
            });

            const categories = ['all', ...new Set(PAGE_MODULES.map(m => m.category))];

            container.innerHTML = `
                <!-- Sayfa Erişim Masası Ana Kartı -->
                <div class="admin-access-card" style="background:var(--card-bg);border:1px solid rgba(253,224,71,0.3);border-radius:var(--radius-md);padding:24px;margin-top:24px;box-shadow:0 8px 32px rgba(0,0,0,0.25);">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;margin-bottom:20px;border-bottom:1px solid var(--border-color);padding-bottom:18px;">
                        <div>
                            <div style="display:inline-flex;align-items:center;gap:6px;background:rgba(253,224,71,0.15);border:1px solid rgba(253,224,71,0.35);color:#fde047;padding:3px 10px;border-radius:12px;font-size:0.75rem;font-weight:700;margin-bottom:8px;">
                                <i class="fas fa-shield-alt"></i> YÖNETİCİ KONTROL MERKEZİ
                            </div>
                            <h3 style="font-size:1.35rem;font-weight:800;color:var(--text-primary);margin-bottom:6px;display:flex;align-items:center;gap:10px;">
                                <i class="fas fa-sliders-h" style="color:#fde047;"></i> Sayfa, Modül & Laboratuvar Erişim Kontrolü
                            </h3>
                            <p style="color:var(--text-secondary);font-size:0.88rem;max-width:760px;line-height:1.5;">
                                Hangi sayfaların <strong>herkese açık</strong> olacağını, hangilerinin <strong>sadece kayıtlı üyelere özel</strong> (örneğin ders kaynakları ve laboratuvar) tutulacağını veya platformdan <strong>tamamen gizleneceğini</strong> tek tıkla yapılandırın.
                            </p>
                        </div>

                        <!-- Hızlı Hazır Şablonlar (Presets) -->
                        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                            <button class="btn btn-sm" onclick="PageAccessControl.applyPreset('user_request')" 
                                style="background:rgba(253,224,71,0.2);border:1px solid #fde047;color:#fde047;font-weight:700;font-size:0.8rem;"
                                title="Ders Kaynakları ve Laboratuvarı Sadece Üyelere Yapar">
                                <i class="fas fa-magic"></i> ⭐ Kaynaklar & Lab Üyelere Özel
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="PageAccessControl.applyPreset('all_public')"
                                style="border-color:#10b981;color:#10b981;font-size:0.8rem;" title="Tüm Sayfaları Herkese Açar">
                                <i class="fas fa-globe"></i> Tümünü Herkese Aç
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="PageAccessControl.applyPreset('all_members')"
                                style="border-color:#38bdf8;color:#38bdf8;font-size:0.8rem;" title="Tüm Sayfaları Sadece Üyelere Kısıtlar">
                                <i class="fas fa-lock"></i> Tümünü Üyelere Özel Yap
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="PageAccessControl.resetPermissions()"
                                style="border-color:rgba(239,68,68,0.4);color:#ef4444;font-size:0.8rem;" title="Varsayılan Ayarlara Dön">
                                <i class="fas fa-undo"></i> Sıfırla
                            </button>
                        </div>
                    </div>

                    <!-- Canlı Durum İstatistik Çubukları -->
                    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:12px;margin-bottom:20px;">
                        <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:12px;display:flex;align-items:center;gap:12px;">
                            <div style="width:40px;height:40px;border-radius:8px;background:rgba(16,185,129,0.2);display:flex;align-items:center;justify-content:center;color:#34d399;font-size:1.2rem;">
                                <i class="fas fa-globe"></i>
                            </div>
                            <div>
                                <div style="font-size:1.25rem;font-weight:800;color:#34d399;">${publicCount}</div>
                                <div style="font-size:0.75rem;color:var(--text-secondary);font-weight:600;">Herkese Açık</div>
                            </div>
                        </div>

                        <div style="background:rgba(253,224,71,0.1);border:1px solid rgba(253,224,71,0.3);border-radius:10px;padding:12px;display:flex;align-items:center;gap:12px;">
                            <div style="width:40px;height:40px;border-radius:8px;background:rgba(253,224,71,0.2);display:flex;align-items:center;justify-content:center;color:#fde047;font-size:1.2rem;">
                                <i class="fas fa-lock"></i>
                            </div>
                            <div>
                                <div style="font-size:1.25rem;font-weight:800;color:#fde047;">${memberCount}</div>
                                <div style="font-size:0.75rem;color:var(--text-secondary);font-weight:600;">Sadece Üyelere Özel</div>
                            </div>
                        </div>

                        <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:12px;display:flex;align-items:center;gap:12px;">
                            <div style="width:40px;height:40px;border-radius:8px;background:rgba(239,68,68,0.2);display:flex;align-items:center;justify-content:center;color:#ef4444;font-size:1.2rem;">
                                <i class="fas fa-eye-slash"></i>
                            </div>
                            <div>
                                <div style="font-size:1.25rem;font-weight:800;color:#ef4444;">${hiddenCount}</div>
                                <div style="font-size:0.75rem;color:var(--text-secondary);font-weight:600;">Tamamen Gizli</div>
                            </div>
                        </div>

                        <div style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:10px;padding:12px;display:flex;align-items:center;gap:12px;">
                            <div style="width:40px;height:40px;border-radius:8px;background:rgba(99,102,241,0.2);display:flex;align-items:center;justify-content:center;color:#818cf8;font-size:1.2rem;">
                                <i class="fas fa-layer-group"></i>
                            </div>
                            <div>
                                <div style="font-size:1.25rem;font-weight:800;color:#818cf8;">${total}</div>
                                <div style="font-size:0.75rem;color:var(--text-secondary);font-weight:600;">Toplam Modül</div>
                            </div>
                        </div>
                    </div>

                    <!-- Filtreleme & Arama Çubuğu -->
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:18px;">
                        <!-- Kategori Sekmeleri -->
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                            ${categories.map(cat => `
                                <button class="btn btn-sm ${cat === activeCategory ? 'btn-primary' : 'btn-secondary'}"
                                    onclick="window._adminAccessCategoryFilter = '${cat}'; PageAccessControl.renderAdminPanelUI();"
                                    style="font-size:0.78rem;padding:4px 10px;border-radius:8px;">
                                    ${cat === 'all' ? 'Tümü (' + PAGE_MODULES.length + ')' : cat}
                                </button>
                            `).join('')}
                        </div>

                        <!-- Arama Girdisi -->
                        <div style="min-width:240px;flex:1;max-width:320px;position:relative;">
                            <i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:0.8rem;"></i>
                            <input type="text" id="adminAccessSearchInput" value="${escapeHtml(searchQuery)}" placeholder="Modül veya sayfa adı ara..."
                                oninput="PageAccessControl.renderAdminPanelUI()"
                                style="width:100%;padding:8px 12px 8px 30px;background:rgba(15,23,42,0.6);border:1px solid var(--border-color);border-radius:8px;color:var(--text-primary);font-size:0.85rem;">
                        </div>
                    </div>

                    <!-- Modül Listesi / Tablosu -->
                    <div style="display:flex;flex-direction:column;gap:10px;">
                        ${filteredModules.map(m => {
                const currentAccess = perms[m.id] || 'public';
                return `
                                <div class="admin-module-access-row ${currentAccess}" 
                                    style="background:rgba(15,23,42,0.4);border:1px solid ${currentAccess === 'members_only' ? 'rgba(253,224,71,0.3)' : (currentAccess === 'hidden' ? 'rgba(239,68,68,0.3)' : 'var(--border-color)')};border-radius:10px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;transition:all 0.2s;">
                                    
                                    <!-- Sol Bilgi -->
                                    <div style="display:flex;align-items:center;gap:14px;min-width:260px;flex:1;">
                                        <div style="width:42px;height:42px;border-radius:10px;background:rgba(255,255,255,0.05);border:1px solid var(--border-color);display:flex;align-items:center;justify-content:center;font-size:1.2rem;color:${m.iconColor || 'var(--accent)'};flex-shrink:0;">
                                            <i class="${m.icon}"></i>
                                        </div>
                                        <div>
                                            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                                <span style="font-weight:700;color:var(--text-primary);font-size:0.95rem;">${m.name}</span>
                                                <span style="font-size:0.7rem;padding:2px 7px;border-radius:6px;background:rgba(255,255,255,0.06);color:var(--text-muted);">${m.category}</span>
                                                ${m.badge ? `<span style="font-size:0.7rem;padding:2px 7px;border-radius:6px;background:rgba(56,189,248,0.15);color:#38bdf8;font-weight:600;">${m.badge}</span>` : ''}
                                            </div>
                                            <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;line-height:1.3;">
                                                ${m.description}
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Sağ Kontroller (3-Aşamalı Seçici Buton Grubu) -->
                                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                                        <div class="access-segmented-control" style="display:inline-flex;background:rgba(15,23,42,0.8);border:1px solid var(--border-color);border-radius:8px;padding:3px;gap:2px;">
                                            <button class="access-seg-btn ${currentAccess === 'public' ? 'active public' : ''}" 
                                                onclick="PageAccessControl.setModuleAccess('${m.id}', 'public')"
                                                title="Tüm ziyaretçi ve üyeler görüntüleyebilir">
                                                <i class="fas fa-globe"></i> Herkese Açık
                                            </button>
                                            <button class="access-seg-btn ${currentAccess === 'members_only' ? 'active members' : ''}" 
                                                onclick="PageAccessControl.setModuleAccess('${m.id}', 'members_only')"
                                                title="Sadece giriş yapmış üyeler erişebilir, misafire üyelik uyarısı gösterilir">
                                                <i class="fas fa-lock"></i> Sadece Üye
                                            </button>
                                            <button class="access-seg-btn ${currentAccess === 'hidden' ? 'active hidden' : ''}" 
                                                onclick="PageAccessControl.setModuleAccess('${m.id}', 'hidden')"
                                                title="Siteden ve menülerden tamamen gizlenir">
                                                <i class="fas fa-eye-slash"></i> Gizli
                                            </button>
                                        </div>

                                        <!-- Önizleme Butonu -->
                                        <button class="btn btn-sm btn-secondary" onclick="PageAccessControl.previewModule('${m.id}')"
                                            title="Bu modülü anında test et / aç"
                                            style="padding:6px 10px;font-size:0.78rem;display:inline-flex;align-items:center;gap:4px;">
                                            <i class="fas fa-external-link-alt"></i> İncele
                                        </button>
                                    </div>
                                </div>
                            `;
            }).join('')}
                    </div>

                    <!-- Alt Bilgilendirme Notu -->
                    <div style="margin-top:18px;padding:12px 14px;background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.25);border-radius:8px;font-size:0.8rem;color:var(--text-secondary);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <i class="fas fa-info-circle" style="color:#38bdf8;"></i>
                            <span>Değişiklikler tarayıcıda anında canlıya alınır ve tüm menülere uygulanır. Sayfayı yenilemeye gerek yoktur.</span>
                        </div>
                        <span style="font-weight:700;color:#38bdf8;">⚡ Reaktif Güvenlik Aktif</span>
                    </div>
                </div>
            `;
        },

        /**
         * Hızlı hazır şablon uygular
         */
        applyPreset: function (preset) {
            const user = this.getCurrentUser();
            if (!user || !user.isAdmin) return;

            const perms = {};
            if (preset === 'user_request') {
                // Kullanıcının talep ettiği ayar: Ders Kaynakları & Laboratuvar sadece üyelere, diğerleri herkese açık
                PAGE_MODULES.forEach(m => {
                    if (m.id === 'kaynaklar' || m.id === 'muhendislik-lab' || m.id === 'sinav-arsivi' || m.id === 'pratik' || m.id === 'cv-builder' || m.id === 'arkadaslar') {
                        perms[m.id] = 'members_only';
                    } else {
                        perms[m.id] = 'public';
                    }
                });
                this.savePermissions(perms);
                if (typeof window.showToast === 'function') {
                    window.showToast('⭐ Şablon uygulandı: Ders Kaynakları ve Laboratuvar SADECE ÜYELERE ÖZEL yapıldı!', 'success');
                }
            } else if (preset === 'all_public') {
                PAGE_MODULES.forEach(m => { perms[m.id] = 'public'; });
                this.savePermissions(perms);
                if (typeof window.showToast === 'function') {
                    window.showToast('🌍 Tüm sayfalar HERKESE AÇIK olarak ayarlandı.', 'info');
                }
            } else if (preset === 'all_members') {
                PAGE_MODULES.forEach(m => { perms[m.id] = 'members_only'; });
                this.savePermissions(perms);
                if (typeof window.showToast === 'function') {
                    window.showToast('🔒 Tüm sayfalar SADECE ÜYELERE ÖZEL olarak ayarlandı.', 'warning');
                }
            }
            this.renderAdminPanelUI();
        },

        /**
         * Varsayılan izinlere döndürür
         */
        resetPermissions: function () {
            if (!confirm('Tüm sayfa erişim izinlerini varsayılan fabrika ayarlarına döndürmek istiyor musunuz?')) return;
            localStorage.removeItem(STORAGE_KEY);
            this.applyPermissions();
            this.renderAdminPanelUI();
            if (typeof window.showToast === 'function') {
                window.showToast('Sayfa erişim izinleri varsayılan ayarlara sıfırlandı.', 'info');
            }
        },

        /**
         * Yönetici için modülü anında test eder
         */
        previewModule: function (moduleId) {
            const mod = PAGE_MODULES.find(m => m.id === moduleId);
            if (!mod) return;

            if (mod.modalType === 'resource') {
                if (typeof window.openResourceModal === 'function') {
                    window.openResourceModal('all');
                }
            } else if (mod.modalType === 'lab') {
                if (typeof window.openLabModal === 'function') {
                    window.openLabModal('hesaplayicilar');
                }
            } else if (mod.modalType === 'lab_sub' && mod.labSubTab) {
                if (typeof window.openLabModal === 'function') {
                    window.openLabModal(mod.labSubTab);
                }
            } else if (mod.sectionId) {
                if (typeof window.navigateTo === 'function') {
                    window.navigateTo(mod.sectionId);
                }
            } else if (mod.id === 'forum') {
                if (typeof window.openForumModal === 'function') {
                    window.openForumModal();
                }
            }
        },

        /**
         * Global fonksiyon sarmalayıcıları (Interceptors):
         * openResourceModal, openLabModal ve navigateTo çağrıldığında
         * yetki kontrolü yapar; yetkisiz ise otomatik erişim engeli ve üyelik modalı açar.
         */
        installInterceptors: function () {
            const self = this;

            // 1. openResourceModal sarmalama
            if (typeof window.openResourceModal === 'function' && !window.openResourceModal._isPatched) {
                const originalOpenResourceModal = window.openResourceModal;
                window.openResourceModal = function (cat, search) {
                    if (!self.canAccess('kaynaklar')) {
                        self.showAccessGateModal('kaynaklar');
                        return;
                    }
                    return originalOpenResourceModal.apply(this, arguments);
                };
                window.openResourceModal._isPatched = true;
            }

            // 2. openLabModal sarmalama
            if (typeof window.openLabModal === 'function' && !window.openLabModal._isPatched) {
                const originalOpenLabModal = window.openLabModal;
                window.openLabModal = function (subTabName) {
                    let targetModule = 'muhendislik-lab';
                    if (subTabName === 'sinav-arsivi') targetModule = 'sinav-arsivi';
                    else if (subTabName === 'mufredat') targetModule = 'mufredat';
                    else if (subTabName === 'gpa') targetModule = 'gpa';
                    else if (subTabName === 'formuller') targetModule = 'formuller';
                    else if (subTabName === 'pratik') targetModule = 'pratik';

                    if (!self.canAccess(targetModule)) {
                        self.showAccessGateModal(targetModule);
                        return;
                    }
                    return originalOpenLabModal.apply(this, arguments);
                };
                window.openLabModal._isPatched = true;
            }

            // 3. navigateTo sarmalama
            if (typeof window.navigateTo === 'function' && !window.navigateTo._isPatched) {
                const originalNavigateTo = window.navigateTo;
                window.navigateTo = function (sectionId) {
                    // Eşleşen modülü bul
                    const mod = PAGE_MODULES.find(m => m.id === sectionId || m.sectionId === sectionId);
                    if (mod && !self.canAccess(mod.id)) {
                        self.showAccessGateModal(mod.id);
                        return;
                    }
                    return originalNavigateTo.apply(this, arguments);
                };
                window.navigateTo._isPatched = true;
            }
        },

        /**
         * Başlatıcı fonksiyon
         */
        init: function () {
            this.installInterceptors();
            this.applyPermissions();

            // DOM yüklendiğinde tekrar izinleri doğrula ve uygula
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.installInterceptors();
                    this.applyPermissions();
                });
            } else {
                this.installInterceptors();
                this.applyPermissions();
            }

            // Kullanıcı değiştiğinde veya rol değiştirildiğinde izinleri reaktif güncelle
            window.addEventListener('storage', (e) => {
                if (e.key === 'eem-current-user' || e.key === STORAGE_KEY) {
                    this.applyPermissions();
                }
            });
        }
    };

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    window.PageAccessControl = PageAccessControl;
    PageAccessControl.init();

})(window);
