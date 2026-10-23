/**
 * EEM REHBER - BULUT VERİTABANI & SUPABASE ADAPTÖRÜ (FAZ 4)
 * Çevrimdışı öncelikli (Offline-first) mimari:
 * Supabase yapılandırılmışsa bulut ile anlık çift yönlü senkronizasyon sağlar,
 * yapılandırılmamışsa veya internet kesintilerinde kesintisiz localStorage ile çalışır.
 */

(function (window) {
    'use strict';

    const CONFIG_KEY = 'eem_supabase_config';
    const LOCAL_QUESTIONS_KEY = 'eem_forum_questions';

    const EEMCloudSync = {
        /**
         * Kayıtlı bulut yapılandırmasını getirir
         */
        getConfig: function () {
            try {
                const raw = localStorage.getItem(CONFIG_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    return {
                        url: (parsed.url || '').trim().replace(/\/+$/, ''),
                        key: (parsed.key || '').trim(),
                        isEnabled: parsed.isEnabled !== false
                    };
                }
            } catch (e) {
                console.warn('[EEMCloudSync] Config okuma hatası:', e);
            }
            return { url: '', key: '', isEnabled: false };
        },

        /**
         * Bulut yapılandırmasını kaydeder
         */
        saveConfig: function (url, key, isEnabled = true) {
            const cleanUrl = (url || '').trim().replace(/\/+$/, '');
            const cleanKey = (key || '').trim();
            const config = {
                url: cleanUrl,
                key: cleanKey,
                isEnabled: Boolean(isEnabled && cleanUrl && cleanKey)
            };
            try {
                localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
                return true;
            } catch (e) {
                console.error('[EEMCloudSync] Config kaydetme hatası:', e);
                return false;
            }
        },

        /**
         * Bulut senkronizasyonunun aktif ve geçerli olup olmadığını döner
         */
        isConfigured: function () {
            const cfg = this.getConfig();
            return Boolean(cfg.isEnabled && cfg.url && cfg.key);
        },

        /**
         * Mevcut çalışma modu bilgisini döner
         */
        getStatus: function () {
            const isConf = this.isConfigured();
            return {
                mode: isConf ? 'cloud' : 'local',
                icon: isConf ? 'fa-cloud' : 'fa-database',
                title: isConf ? 'Bulut Senkronize (Supabase Aktif)' : 'Yerel Hafıza (Çevrimdışı / LocalStorage)',
                color: isConf ? '#10b981' : '#38bdf8'
            };
        },

        /**
         * Supabase REST bağlantısını test eder
         */
        testConnection: async function (url, key) {
            const cleanUrl = (url || '').trim().replace(/\/+$/, '');
            const cleanKey = (key || '').trim();

            if (!cleanUrl || !cleanKey) {
                return { success: false, message: 'Lütfen Supabase URL ve Anon Key alanlarını doldurun.' };
            }

            try {
                const endpoint = `${cleanUrl}/rest/v1/eem_questions?select=id&limit=1`;
                const resp = await fetch(endpoint, {
                    method: 'GET',
                    headers: {
                        'apikey': cleanKey,
                        'Authorization': `Bearer ${cleanKey}`,
                        'Accept': 'application/json'
                    }
                });

                if (resp.ok) {
                    const data = await resp.json();
                    return {
                        success: true,
                        message: 'Bağlantı başarılı! eem_questions tablosuna başarıyla erişildi.',
                        count: Array.isArray(data) ? data.length : 0
                    };
                } else if (resp.status === 404 || resp.status === 400) {
                    const errBody = await resp.text();
                    return {
                        success: false,
                        message: `Tablo bulunamadı veya şema eksik (HTTP ${resp.status}). Lütfen aşağıdaki SQL şablonunu Supabase SQL Editor'da çalıştırın.\n${errBody}`
                    };
                } else {
                    return {
                        success: false,
                        message: `Yetkilendirme hatası (HTTP ${resp.status}). Lütfen URL ve Key değerlerinizi kontrol edin.`
                    };
                }
            } catch (err) {
                return {
                    success: false,
                    message: `Ağ hatası: ${err.message || 'Supabase sunucusuna ulaşılamadı.'}`
                };
            }
        },

        /**
         * Buluttan soruları çeker; başarısızsa veya yapılandırılmamışsa null döner
         */
        fetchQuestionsFromCloud: async function () {
            if (!this.isConfigured()) return null;
            const cfg = this.getConfig();

            try {
                const endpoint = `${cfg.url}/rest/v1/eem_questions?select=*&order=created_at.desc`;
                const resp = await fetch(endpoint, {
                    method: 'GET',
                    headers: {
                        'apikey': cfg.key,
                        'Authorization': `Bearer ${cfg.key}`,
                        'Accept': 'application/json'
                    }
                });

                if (!resp.ok) {
                    console.warn('[EEMCloudSync] Soruları buluttan çekme başarısız (HTTP ' + resp.status + ')');
                    return null;
                }

                const cloudItems = await resp.json();
                if (Array.isArray(cloudItems)) {
                    // Supabase snake_case kolonları camelCase frontend modellerine uyarla
                    const formatted = cloudItems.map(item => ({
                        id: item.id,
                        title: item.title,
                        grade: item.grade || 'all',
                        gradeLabel: item.grade_label || (item.grade ? item.grade + '. Sınıf' : 'Tüm Sınıflar'),
                        course: item.course || 'genel',
                        courseLabel: item.course_label || 'EEM',
                        desc: item.description || item.desc || '',
                        tags: Array.isArray(item.tags) ? item.tags : [],
                        author: item.author || 'Mühendis Adayı',
                        role: item.role || 'user',
                        isAdmin: Boolean(item.is_admin || item.isAdmin),
                        avatarLetter: item.avatar_letter || (item.author ? item.author.trim()[0].toUpperCase() : 'M'),
                        avatarColor: item.avatar_color || 'linear-gradient(135deg, #3b82f6, #6366f1)',
                        uni: item.uni || 'EEM Topluluğu',
                        date: item.date || 'Yakın zamanda',
                        likes: Number(item.likes) || 0,
                        solved: Boolean(item.solved),
                        replies: Array.isArray(item.replies) ? item.replies : []
                    }));

                    // Yerel önbelleğe yaz
                    try {
                        localStorage.setItem(LOCAL_QUESTIONS_KEY, JSON.stringify(formatted));
                    } catch (e) {}

                    return formatted;
                }
            } catch (err) {
                console.warn('[EEMCloudSync] Ağ kesintisi, yerel hafızaya geçiliyor:', err.message);
            }
            return null;
        },

        /**
         * Yeni soru yayınlandığında hem buluta hem yerel hafızaya yazar
         */
        syncNewQuestion: async function (question) {
            if (!this.isConfigured()) return false;
            const cfg = this.getConfig();

            const payload = {
                id: question.id,
                title: question.title,
                grade: question.grade,
                grade_label: question.gradeLabel,
                course: question.course,
                course_label: question.courseLabel,
                description: question.desc,
                tags: question.tags || [],
                author: question.author,
                role: question.role || (question.isAdmin ? 'admin' : 'user'),
                is_admin: Boolean(question.isAdmin),
                avatar_letter: question.avatarLetter,
                avatar_color: question.avatarColor,
                uni: question.uni,
                date: question.date,
                likes: Number(question.likes) || 0,
                solved: Boolean(question.solved),
                replies: question.replies || []
            };

            try {
                const endpoint = `${cfg.url}/rest/v1/eem_questions`;
                const resp = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'apikey': cfg.key,
                        'Authorization': `Bearer ${cfg.key}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify(payload)
                });
                return resp.ok;
            } catch (err) {
                console.warn('[EEMCloudSync] Soru buluta yüklenemedi, yerelde tutuldu:', err.message);
                return false;
            }
        },

        /**
         * Soruya yeni yanıt eklendiğinde buluttaki replies kolonunu günceller
         */
        syncQuestionReplies: async function (qId, allReplies) {
            if (!this.isConfigured()) return false;
            const cfg = this.getConfig();

            try {
                const endpoint = `${cfg.url}/rest/v1/eem_questions?id=eq.${encodeURIComponent(qId)}`;
                const resp = await fetch(endpoint, {
                    method: 'PATCH',
                    headers: {
                        'apikey': cfg.key,
                        'Authorization': `Bearer ${cfg.key}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ replies: allReplies })
                });
                return resp.ok;
            } catch (err) {
                console.warn('[EEMCloudSync] Yanıt buluta eşitlenemedi:', err.message);
                return false;
            }
        },

        /**
         * Beğeni sayısını bulutta günceller
         */
        syncQuestionLikes: async function (qId, newLikesCount) {
            if (!this.isConfigured()) return false;
            const cfg = this.getConfig();

            try {
                const endpoint = `${cfg.url}/rest/v1/eem_questions?id=eq.${encodeURIComponent(qId)}`;
                const resp = await fetch(endpoint, {
                    method: 'PATCH',
                    headers: {
                        'apikey': cfg.key,
                        'Authorization': `Bearer ${cfg.key}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ likes: newLikesCount })
                });
                return resp.ok;
            } catch (err) {
                console.warn('[EEMCloudSync] Beğeni buluta eşitlenemedi:', err.message);
                return false;
            }
        },

        /**
         * Supabase SQL Editor için tek tıkla çalıştırılabilir PostgreSQL şablonunu döner
         */
        getSqlSchemaScript: function () {
            return `-- ═══════════════════════════════════════════════════════════════════
-- EEM REHBER: FORUM & DAYANIŞMA BULUT TABLOSU (POSTGRESQL / SUPABASE)
-- Bu kodu Supabase Dashboard -> SQL Editor alanına yapıştırıp "Run" butonuna basın.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.eem_questions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    grade TEXT DEFAULT 'all',
    grade_label TEXT,
    course TEXT DEFAULT 'genel',
    course_label TEXT,
    description TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    author TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    is_admin BOOLEAN DEFAULT false,
    avatar_letter TEXT,
    avatar_color TEXT,
    uni TEXT,
    date TEXT,
    likes INTEGER DEFAULT 0,
    solved BOOLEAN DEFAULT false,
    replies JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Hızlı arama için indeksler
CREATE INDEX IF NOT EXISTS idx_eem_questions_created_at ON public.eem_questions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eem_questions_grade ON public.eem_questions (grade);
CREATE INDEX IF NOT EXISTS idx_eem_questions_course ON public.eem_questions (course);

-- RLS (Row Level Security) Açma & Güvenlik Politikaları
ALTER TABLE public.eem_questions ENABLE ROW LEVEL SECURITY;

-- Herkes soruları ve yanıtları okuyabilir (Anonim / Öğrenciler)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'eem_questions' AND policyname = 'Public Read Questions'
    ) THEN
        CREATE POLICY "Public Read Questions" ON public.eem_questions
            FOR SELECT USING (true);
    END IF;
END $$;

-- Herkes soru ekleyebilir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'eem_questions' AND policyname = 'Public Insert Questions'
    ) THEN
        CREATE POLICY "Public Insert Questions" ON public.eem_questions
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Herkes yanıt veya beğeni ekleyebilir (güncelleyebilir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'eem_questions' AND policyname = 'Public Update Questions'
    ) THEN
        CREATE POLICY "Public Update Questions" ON public.eem_questions
            FOR UPDATE USING (true);
    END IF;
END $$;
`;
        },

        /**
         * Tek Tıkla Taşınabilir Veri Yedekleme (Tüm Notlar, Profil, Rozetler & Streak)
         */
        exportBackup: function() {
            const dataToExport = {};
            const keysToSync = [
                'eem_grades', 'eem_user_profile', 'eem_saved_formulas',
                'eem_daily_streak', 'eem_daily_answered_date', 'eem_unlocked_badges',
                'eem_cv_data', 'eem_curriculum_custom', 'eem_community_notes', 'eem_user_focus'
            ];
            keysToSync.forEach(k => {
                const val = localStorage.getItem(k);
                if (val !== null) dataToExport[k] = val;
            });

            const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'devrem_studio_yedek_' + new Date().toISOString().slice(0, 10) + '.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return true;
        },

        /**
         * Yedeklenmiş JSON Dosyasını İçe Aktarma
         */
        importBackup: function(fileInput, onComplete) {
            const file = fileInput?.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const parsed = JSON.parse(e.target.result);
                    let count = 0;
                    for (const [key, val] of Object.entries(parsed)) {
                        localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
                        count++;
                    }
                    if (typeof onComplete === 'function') onComplete(true, count);
                    else alert('Başarılı! ' + count + ' adet kayıtlı profil ve ders verisi geri yüklendi.');
                } catch(err) {
                    if (typeof onComplete === 'function') onComplete(false, err.message);
                    else alert('Hata: Geçersiz yedek dosyası! ' + err.message);
                }
            };
            reader.readAsText(file);
        }
    };

    window.EEMCloudSync = EEMCloudSync;

})(typeof window !== 'undefined' ? window : this);
