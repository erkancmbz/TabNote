/**
 * EEM REHBER / DEVREM STUDIO - PEDAGOJİK BAĞLANTILI KONU & LABORATUVAR KÖPRÜLERİ (PEDAGOGICAL BRIDGES)
 *
 * Amaç: Mühendislik araçlarını izole hesaplayıcılardan çıkarıp, birbiri ardına bağlanan
 * lisans müfredat akışına ve sanayi Ar-Ge tasarım döngüsüne dönüştürmek.
 * 
 * WCAG 2.2 AAA & UI/UX Pro Max Uyumlu Tasarım
 */

const PEDAGOGICAL_BRIDGES = {
    // ═══════════════════════════════════════════════════════════════
    // 1. DEVRE ANALİZİ & TEMEL AC AĞLARI
    // ═══════════════════════════════════════════════════════════════
    calcCircuitAnalysis1Card: {
        track: "Devre Teorisi & Ağ Analizi",
        step: "Adım 2 / 6 • DC'den AC Ağlarına & Dengesiz Köprülere",
        nextId: "calcCircuitAnalysis2Card",
        title: "Devre Analizi 2: Yıldız-Üçgen (Y-Δ) & AC Fazör",
        desc: "Thevenin ve Norton eşdeğerleriyle DC lineer ağ analizini tamamladınız. Şimdi köprü devreleri, Yıldız-Üçgen dönüşümleri ve AC fazör empedans analizine geçin.",
        actionText: "Devre Analizi 2 Laboratuvarına Geç",
        icon: "fas fa-bezier-curve",
        badgeColor: "#06b6d4"
    },
    calcCircuitAnalysis2Card: {
        track: "Devre Teorisi & Ağ Analizi",
        step: "Adım 3 / 6 • Karmaşık Empedans & Rezonans",
        nextId: "calcImpedanceCard",
        title: "AC Empedans, Fazörler & RLC Rezonansı",
        desc: "Y-Δ dönüşümlerini incelediniz. Sinüsoidal kaynaklar altında direnç, bobin ve kondansatörün reaktanslarını (XL, XC), rezonans frekansını (f₀) ve güç üçgenini (P, Q, S) hesaplayın.",
        actionText: "AC Empedans Laboratuvarına Geç",
        icon: "fas fa-wave-square",
        badgeColor: "#38bdf8"
    },
    calcImpedanceCard: {
        track: "Devre Teorisi & Ağ Analizi",
        step: "Adım 4 / 6 • Sürekli Halden Geçici Rejime (Transients)",
        nextId: "calcTransientRlcCard",
        title: "RLC Geçici Rejim (Transient) Simülatörü",
        desc: "Sürekli hal AC analizini tamamladınız. Anahtarlama anlarında depolanan enerjinin salınımını ve diferansiyel basamak yanıtını (Aşırı, Kritik, Eksik Sönümlü) canlı simüle edin.",
        actionText: "RLC Geçici Rejim Laboratuvarına Geç",
        icon: "fas fa-chart-line",
        badgeColor: "#818cf8"
    },
    calcTransientRlcCard: {
        track: "Devre Teorisi & Ağ Analizi",
        step: "Adım 5 / 6 • Frekans Seçici Ağlar & Bode Analizi",
        nextId: "calcFilterCard",
        title: "Aktif & Pasif Filtre Tasarımı (Bode Diyagramı)",
        desc: "Zaman bölgesindeki sönümlemeyi gözlemlediniz. Şimdi bu RLC devrelerini frekans bölgesine taşıyarak Alçak/Yüksek/Bant Geçiren filtrelerin genlik ve faz eğrilerini inceleyin.",
        actionText: "Filtre Laboratuvarına Geç",
        icon: "fas fa-filter",
        badgeColor: "#a855f7"
    },

    // ═══════════════════════════════════════════════════════════════
    // 2. SAYISAL MANTIK & DİJİTAL ELEKTRONİK
    // ═══════════════════════════════════════════════════════════════
    calcKarnaughCard: {
        track: "Sayısal Mantık & Dijital Tasarım",
        step: "Adım 2 / 3 • Kombinezonsal Mantıktan Ardışıl Mantığa (FSM)",
        nextId: "calcFsmDesignerCard",
        title: "Görsel FSM Tasarımcısı & Verilog Üreteci",
        desc: "Karnaugh haritası ile Boolean ifadelerini en aza indirdiniz. Şimdi durum geçişlerini ve bellekli ardışıl devreleri (Moore/Mealy Durum Makineleri) modelleyin.",
        actionText: "FSM Tasarımcısına Geç",
        icon: "fas fa-project-diagram",
        badgeColor: "#10b981"
    },
    calcFsmDesignerCard: {
        track: "Sayısal Mantık & Dijital Tasarım",
        step: "Adım 3 / 3 • Donanım Zamanlaması & Metastabilite Doğrulama",
        nextId: "calcLogicTimingCard",
        title: "Dijital Mantık & Setup/Hold Zamanlama Analizörü",
        desc: "Durum makinenizi sentezlediniz. Gerçek silisyum yongalarda saat darbesi (clock skew), kurulum/tutma süreleri (setup/hold) ve metastabilite risklerini test edin.",
        actionText: "Zamanlama Analizörüne Geç",
        icon: "fas fa-stopwatch",
        badgeColor: "#f59e0b"
    },

    // ═══════════════════════════════════════════════════════════════
    // 3. ANALOG ELEKTRONİK & KUVVETLENDİRİCİLER
    // ═══════════════════════════════════════════════════════════════
    calcTransistorCard: {
        track: "Analog Elektronik & Kuvvetlendiriciler",
        step: "Adım 2 / 3 • Ayrık Yarıiletkenden Entegre Devreye (Op-Amp)",
        nextId: "calcOpampCard",
        title: "Op-Amp Topolojileri, Geribesleme & Doyum",
        desc: "BJT küçük sinyal modelini ve kazancını incelediniz. Entegre fark kuvvetlendiricisi mantığıyla çalışan ideal/pratik operasyonel kuvvetlendirici devrelerine geçiş yapın.",
        actionText: "Op-Amp Laboratuvarına Geç",
        icon: "fas fa-microchip",
        badgeColor: "#ec4899"
    },
    calcOpampCard: {
        track: "Analog Elektronik & Kuvvetlendiriciler",
        step: "Adım 3 / 3 • Aktif Sallen-Key Filtreler & Sinyal İyileştirme",
        nextId: "calcFilterCard",
        title: "Aktif Op-Amp Filtre Tasarımı (Sallen-Key & MFB)",
        desc: "Op-Amp kazanç ve geribeslemesini kurdunuz. Şimdi bu kuvvetlendiriciyi frekans seçici aktif filtrelere dönüştürerek gürültüleri bastırın.",
        actionText: "Aktif Filtre Laboratuvarına Geç",
        icon: "fas fa-bezier-curve",
        badgeColor: "#a855f7"
    },

    // ═══════════════════════════════════════════════════════════════
    // 4. SİNYALLER, SİSTEMLER, DSP & RF
    // ═══════════════════════════════════════════════════════════════
    calcConvolutionLabCard: {
        track: "Sinyaller & Sistemler (LTI Analizi)",
        step: "Adım 2 / 3 • Zaman Bölgesi Konvolüsyonundan Frekans Spektrumuna",
        nextId: "calcFourierHarmonicsCard",
        title: "Fourier Serisi & Gibbs Fenomeni Analizörü",
        desc: "Kayan integral ile x(t)*h(t) konvolüsyonunu çözdünüz. Sinyalleri harmoniklerine ayırmak ve Fourier katsayılarını spektral barlarla görmek için Fourier laboratuvarına geçin.",
        actionText: "Fourier Harmonik Laboratuvarına Geç",
        icon: "fas fa-chart-bar",
        badgeColor: "#06b6d4"
    },
    calcFourierHarmonicsCard: {
        track: "Sinyaller & Sistemler (LTI Analizi)",
        step: "Adım 3 / 3 • Harmonik Bastırma & Filtre Seçiciliği",
        nextId: "calcFilterCard",
        title: "Aktif & Pasif Filtre Tasarımı (Bode Diyagramı)",
        desc: "Kare ve üçgen dalgalardaki harmonik katsayılarını ve Gibbs aşımını tespit ettiniz. İstenmeyen frekans bileşenlerini Butterworth/Chebyshev filtrelerle bastırın.",
        actionText: "Filtre Laboratuvarına Geç",
        icon: "fas fa-filter",
        badgeColor: "#38bdf8"
    },
    calcMicrostripCard: {
        track: "RF, Mikrodalga & Yüksek Frekans",
        step: "Adım 2 / 3 • Hat Empedansından Smith Chart Eşlemesine",
        nextId: "calcSmithCard",
        title: "Smith Chart RF & İletim Hattı Empedans Eşleme",
        desc: "50 Ohm PCB mikroşerit hat genişliğini hesapladınız. Yük empedansı ile hat arasındaki yansımayı (SWR, Gamma) minimize etmek için Smith Chart laboratuvarına geçin.",
        actionText: "Smith Chart Laboratuvarına Geç",
        icon: "fas fa-circle-notch",
        badgeColor: "#f59e0b"
    },
    calcSmithCard: {
        track: "RF, Mikrodalga & Yüksek Frekans",
        step: "Adım 3 / 3 • İletim Hatlarından Uzay Yayılımına (EM Dalgalar)",
        nextId: "calcEmWavesCard",
        title: "Elektromanyetik Dalga & Polarizasyon Laboratuvarı",
        desc: "İletim hattında duran dalga (VSWR) profilini analiz ettiniz. Şimdi serbest uzayda ve dielektrik ortamlarda elektromanyetik dalgaların yayılımını ve polarizasyonunu (RHCP/LHCP) gözlemleyin.",
        actionText: "EM Dalga Laboratuvarına Geç",
        icon: "fas fa-satellite-dish",
        badgeColor: "#8b5cf6"
    },

    // ═══════════════════════════════════════════════════════════════
    // 5. GÜÇ ELEKTRONİĞİ, MAKİNELER & GÜÇ DÖNÜŞÜM DÖNGÜSÜ
    // ═══════════════════════════════════════════════════════════════
    calcTransformerCard: {
        track: "Güç Elektroniği & Enerji Dönüşümü",
        step: "Adım 2 / 6 • AC-AC İzolasyondan AC-DC Doğrultmaya",
        nextId: "calcRectifierCard",
        title: "AC-DC Kontrollü Doğrultucu Simülatörü",
        desc: "Trafodan aldığınız izole ve adımlanmış AC gerilimi (V2), güç elektroniği DC yüklerine aktarmak üzere tristörlü veya diyotlu köprü doğrultucudan geçirin.",
        actionText: "Doğrultucu Laboratuvarına Geç",
        icon: "fas fa-bolt",
        badgeColor: "#38bdf8"
    },
    calcRectifierCard: {
        track: "Güç Elektroniği & Enerji Dönüşümü",
        step: "Adım 3 / 6 • Dalgalı DC Baradan Hassas Regülasyona",
        nextId: "calcDcDcCard",
        title: "Güç Elektroniği DC-DC Dönüştürücü Laboratuvarı",
        desc: "Köprü doğrultucudan çıkan dalgalı DC gerilimi sabit ve istenen gerilim seviyesine anahtarlamalı olarak indirmek/yükseltmek için DC-DC Buck/Boost laboratuvarına geçin.",
        actionText: "DC-DC Laboratuvarına Geç",
        icon: "fas fa-charging-station",
        badgeColor: "#06b6d4"
    },
    calcDcDcCard: {
        track: "Güç Elektroniği & Enerji Dönüşümü",
        step: "Adım 4 / 6 • Temel Çeviriciden Endüstriyel SMPS Güç Kaynağına",
        nextId: "calcSmpsCard",
        title: "Buck / Boost SMPS Güç Kaynağı Tasarım Aracı",
        desc: "DC-DC teorisini tamamladınız. Endüstriyel bir SMPS devresi için minimum bobin (Lmin), çıkış kapasitörü (Cmin), ESR ve CCM/DCM sınırlarını boyutlandırın.",
        actionText: "SMPS Tasarım Simülatörüne Geç",
        icon: "fas fa-microchip",
        badgeColor: "#10b981"
    },
    calcSmpsCard: {
        track: "Güç Elektroniği & Enerji Dönüşümü",
        step: "Adım 5 / 6 • DC Baradan Sinüsoidal AC Üretimine (İnvertör)",
        nextId: "calcSpwmCard",
        title: "İnvertör Sinüzoidal PWM (SPWM) Simülatörü",
        desc: "Kararlı DC gerilim barası kurdunuz. Şimdi elektrikli araçlar, solar santraller ve motor sürücüleri için saf AC üreten SPWM H-Köprüsü laboratuvarına geçin.",
        actionText: "SPWM İnvertör Laboratuvarına Geç",
        icon: "fas fa-wave-square",
        badgeColor: "#818cf8"
    },
    calcSpwmCard: {
        track: "Güç Elektroniği & Enerji Dönüşümü",
        step: "Adım 6 / 6 • İnvertör Çıkışıyla Asenkron Motor Hız Kontrolü (V/f)",
        nextId: "calcInductionMotorCard",
        title: "Asenkron Motor Tork-Hız & V/f Frekans Sürücüsü",
        desc: "SPWM ile değişken genlik ve frekanslı 3-faz AC ürettiniz. Şimdi bu gerilimle sanayi tipi asenkron motorun tork-hız karakteristiğini ve skaler V/f kontrolünü simüle edin.",
        actionText: "Asenkron Motor Simülatörüne Geç",
        icon: "fas fa-cogs",
        badgeColor: "#f59e0b"
    },
    calcDcMotorCard: {
        track: "Elektrik Makineleri & Sürücüler",
        step: "Adım 2 / 2 • Motor Hız & Konumunu Kapalı Çevrim PID ile Kontrol Edin",
        nextId: "calcPidControllerCard",
        title: "İnteraktif PID Kontrolcü & Adım Yanıtı",
        desc: "H-Bridge ile DC motor sürüşünü tamamladınız. Şimdi motor devrini veya robot eklem konumunu hedef referansta sabit tutmak için PID parametrelerini (Kp, Ki, Kd) optimize edin.",
        actionText: "PID Kontrolcü Laboratuvarına Geç",
        icon: "fas fa-sliders-h",
        badgeColor: "#ec4899"
    },

    // ═══════════════════════════════════════════════════════════════
    // 6. KONTROL SİSTEMLERİ & DONANIM
    // ═══════════════════════════════════════════════════════════════
    calcPidControllerCard: {
        track: "Otomatik Kontrol & Dinamik Sistemler",
        step: "Adım 2 / 2 • Zaman Bölgesi PID'sinden 2. Derece Sistem Kutuplarına",
        nextId: "calcControlCard",
        title: "2. Derece Sistem Yanıtı & Sönüm Oranı (Zeta, Wn)",
        desc: "PID kazançlarıyla aşımı azalttınız. Sistemin doğal frekansını (ωn), sönüm oranını (ζ), tepe zamanını (tp) ve kutupların s-düzlemindeki yerini inceleyin.",
        actionText: "2. Derece Sistem Yanıtına Geç",
        icon: "fas fa-chart-line",
        badgeColor: "#6366f1"
    },
    calcPcbTraceCard: {
        track: "Donanım Tasarımı, PCB & İmalat",
        step: "Adım 2 / 2 • DC Akım Taşıyan Yollardan RF Mikroşerit Hatlara",
        nextId: "calcMicrostripCard",
        title: "RF Mikroşerit Hat (Microstrip) 50 Ohm Empedansı",
        desc: "IPC-2152 standardına göre bakır yolların akım taşıma kapasitesini ve sıcaklık artışını hesapladınız. Yüksek hızlı ve RF sinyal hatları için 50 Ohm empedans kontrolüne geçin.",
        actionText: "Mikroşerit Hat Laboratuvarına Geç",
        icon: "fas fa-broadcast-tower",
        badgeColor: "#06b6d4"
    }
};

const PedagogicalBridgesModule = (function() {
    function injectBridges() {
        const grid = document.getElementById('labCalculatorsContainer');
        if (!grid) return;

        Object.keys(PEDAGOGICAL_BRIDGES).forEach(cardId => {
            const card = document.getElementById(cardId);
            if (!card) return;
            if (card.querySelector('.lab-next-topic-bridge')) return;

            const info = PEDAGOGICAL_BRIDGES[cardId];
            const bridgeEl = document.createElement('div');
            bridgeEl.className = 'lab-next-topic-bridge';
            bridgeEl.setAttribute('data-target-tool', info.nextId);
            bridgeEl.innerHTML = `
                <div class="next-bridge-header">
                    <span class="next-bridge-badge" style="border-color:${info.badgeColor || '#06b6d4'}; color:${info.badgeColor || '#06b6d4'};">
                        <i class="fas fa-graduation-cap"></i> ${info.track || 'Mühendislik Öğrenim Akışı'}
                    </span>
                    <span class="next-bridge-step">${info.step}</span>
                </div>
                <div class="next-bridge-body">
                    <div class="next-bridge-info">
                        <h4 class="next-bridge-title">
                            <i class="${info.icon || 'fas fa-arrow-circle-right'}" style="color:${info.badgeColor || '#06b6d4'};"></i>
                            ${info.title}
                        </h4>
                        <p class="next-bridge-desc">${info.desc}</p>
                    </div>
                    <button type="button" class="btn-next-bridge" onclick="PedagogicalBridgesModule.navigateTo('${info.nextId}')">
                        <span>${info.actionText}</span>
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            `;
            card.appendChild(bridgeEl);
        });
    }

    function navigateTo(targetId) {
        if (typeof selectLabTool === 'function') {
            selectLabTool(targetId, true);
        }
        // Smoothly scroll the stage / card into view
        setTimeout(() => {
            const stage = document.querySelector('.lab-ide-stage');
            if (stage) {
                stage.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                const targetCard = document.getElementById(targetId);
                if (targetCard) {
                    targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        }, 80);
    }

    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', injectBridges);
        } else {
            injectBridges();
        }
    }

    return {
        init: init,
        injectBridges: injectBridges,
        navigateTo: navigateTo,
        bridges: PEDAGOGICAL_BRIDGES
    };
})();

if (typeof window !== 'undefined') {
    window.PedagogicalBridgesModule = PedagogicalBridgesModule;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PedagogicalBridgesModule, PEDAGOGICAL_BRIDGES };
}
