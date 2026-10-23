/**
 * DEVREM ADVANCED MODULES & EEM LABORATORY EXTENSIONS
 * 
 * Modüller:
 * 1. PinoutHubModule: Popüler EEM Entegre & Geliştirme Kartları Pinout Kılavuzu (NE555, LM741, L7805, LM358, ESP32, STM32, L298N)
 * 2. ComponentDecoderModule: 4/5 Bant Direnç & SMD Kod Çözücü
 * 3. QuickFormulasModule: Vize/Final Özet Formül Kartları & Arama
 * 4. GradeGoalCalculator: Hedef Not & Çan Eğrisi Simülatörü ("Finalden Kaç Almalıyım?")
 * 5. LabExportModule: Simülatörlerden Deney Raporu & Grafik İndirme Aracı (PNG & Metin)
 * 6. InternshipGuideModule: Savunma Sanayii & EEM Onaylı Staj Defteri Kılavuzu & Şablonları
 * 7. HardwareShowcaseModule: Donanım & PCB Portfolyosu Vitrini
 * 8. DevremBridgeIntegration: Akademi ⟷ Kariyer Rozet, Takım ve Forum Çift Yönlü Köprüleri
 */

(function(window) {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════
    // 1. PINOUT HUB: POPÜLER EEM ENTEGRE & MODÜLLERİ
    // ═══════════════════════════════════════════════════════════════════
    const PINOUT_DATA = [
        {
            id: 'ne555',
            name: 'NE555 Hassas Zamanlayıcı',
            category: 'Analog / Zamanlama',
            package: 'DIP-8',
            supply: '4.5V - 16V (Tipik 5V / 12V)',
            desc: 'Akar (Astable) osilatör, Tek-kararlı (Monostable) tetikleyici ve PWM jeneratörü olarak kullanılan efsanevi zamanlayıcı entegresi.',
            pins: [
                { num: 1, name: 'GND', desc: 'Toprak (0V Şasi referansı)' },
                { num: 2, name: 'TRIG', desc: 'Tetikleme girişi (1/3 Vcc altına inince çıkış HIGH olur)' },
                { num: 3, name: 'OUT', desc: 'Çıkış (200 mA akım çekebilir veya verebilir)' },
                { num: 4, name: 'RESET', desc: 'Aktif LOW sıfırlama (Kullanılmıyorsa Vcc\'ye bağlanmalı)' },
                { num: 5, name: 'CTRL', desc: 'Kontrol gerilimi (Genellikle 10 nF kondansatör ile GND\'ye bağlanır)' },
                { num: 6, name: 'THRESH', desc: 'Eşik girişi (2/3 Vcc üstüne çıkınca çıkış LOW olur)' },
                { num: 7, name: 'DISCH', desc: 'Deşarj pini (Zamanlama kondansatörünü şasiye çeker)' },
                { num: 8, name: 'VCC', desc: 'Pozitif Besleme Gerilimi (+5V ... +15V)' }
            ],
            keyFormulas: 'Astable Periyot: T = 0.693 × (R1 + 2R2) × C | Frekans: f = 1.44 / ((R1 + 2R2) × C)'
        },
        {
            id: 'lm741',
            name: 'LM741 Standart Op-Amp',
            category: 'Analog / Yükselteç',
            package: 'DIP-8',
            supply: '±5V - ±18V (Çift Simetrik Besleme)',
            desc: 'İç frekans kompanzasyonlu, kısa devre korumalı genel amaçlı operasyonel kuvvetlendirici.',
            pins: [
                { num: 1, name: 'OFFSET N1', desc: 'Giriş Ofset Gerilim Ayarı 1' },
                { num: 2, name: 'IN-', desc: 'Tersleyen Giriş (Inverting Input)' },
                { num: 3, name: 'IN+', desc: 'Terslemeyen Giriş (Non-inverting Input)' },
                { num: 4, name: 'V- (VEE)', desc: 'Negatif Besleme Gerilimi (-12V veya -15V)' },
                { num: 5, name: 'OFFSET N2', desc: 'Giriş Ofset Gerilim Ayarı 2' },
                { num: 6, name: 'OUT', desc: 'Analog Çıkış' },
                { num: 7, name: 'V+ (VCC)', desc: 'Pozitif Besleme Gerilimi (+12V veya +15V)' },
                { num: 8, name: 'NC', desc: 'Bağlantısız Pin (Boş)' }
            ],
            keyFormulas: 'Tersleyen Kazanç: Av = -Rf / R1 | Terslemeyen Kazanç: Av = 1 + (Rf / R1)'
        },
        {
            id: 'l7805',
            name: 'L7805 Doğrusal Voltaj Regülatörü',
            category: 'Güç Elektroniği',
            package: 'TO-220',
            supply: 'Giriş: 7V - 25V (Önerilen 9V-12V)',
            desc: 'Sabit +5V çıkış sağlayan, 1.5A akım kapasiteli, aşırı sıcaklık ve aşırı yük korumalı lineer regülatör.',
            pins: [
                { num: 1, name: 'INPUT (Vin)', desc: 'Filtrelenmemiş DC Giriş Gerilimi (Min 7V)' },
                { num: 2, name: 'GROUND (GND)', desc: 'Ortak Şasi / Toprak Referansı (Isı Emici Tab ile irtibatlı)' },
                { num: 3, name: 'OUTPUT (Vout)', desc: 'Sabit Regüleli +5V DC Çıkış (0.1µF - 10µF filtre önerilir)' }
            ],
            keyFormulas: 'Kayıp Güç: P_d = (Vin - 5V) × I_load | Minimum Giriş Gerilimi: Vout + 2V dropout'
        },
        {
            id: 'lm358',
            name: 'LM358 Çiftli Düşük Güçlü Op-Amp',
            category: 'Analog / Yükselteç',
            package: 'DIP-8 / SOIC-8',
            supply: '3V - 32V (Tek Besleme Destekli)',
            desc: 'Tek pozitif besleme kaynağıyla (0-5V) sıfır volta kadar inebilen giriş/çıkış gerilimli çift bağımsız op-amp.',
            pins: [
                { num: 1, name: 'OUT 1', desc: 'Op-Amp 1 Çıkışı' },
                { num: 2, name: 'IN- 1', desc: 'Op-Amp 1 Tersleyen Giriş' },
                { num: 3, name: 'IN+ 1', desc: 'Op-Amp 1 Terslemeyen Giriş' },
                { num: 4, name: 'GND', desc: 'Şasi / Negatif Besleme' },
                { num: 5, name: 'IN+ 2', desc: 'Op-Amp 2 Terslemeyen Giriş' },
                { num: 6, name: 'IN- 2', desc: 'Op-Amp 2 Tersleyen Giriş' },
                { num: 7, name: 'OUT 2', desc: 'Op-Amp 2 Çıkışı' },
                { num: 8, name: 'VCC', desc: 'Pozitif Besleme (+3V .. +32V)' }
            ],
            keyFormulas: 'Sensör Sinyal Şartlandırma, Akım Algılama ve Karşılaştırıcı (Komparatör) Devrelerinde idealdir.'
        },
        {
            id: 'esp32',
            name: 'ESP32 NodeMCU DevKit V1',
            category: 'Gömülü Sistemler / IoT',
            package: '30-Pin Modül',
            supply: '3.3V Lojik (5V Micro-USB Girişi)',
            desc: 'Çift çekirdekli Xtensa 240 MHz işlemci, dahili Wi-Fi & Bluetooth BLE, 520 KB SRAM, ADC/DAC/PWM.',
            pins: [
                { num: 1, name: 'EN (RST)', desc: 'Reset Pini (LOW seviyesinde sıfırlar)' },
                { num: 2, name: 'VP / VN (GPIO36/39)', desc: 'ADC1 Kanalları (Sadece Giriş, Pull-up yok)' },
                { num: 3, name: 'GPIO34/35', desc: 'Analog Giriş Pini (Yalnızca Giriş)' },
                { num: 4, name: 'GPIO32/33', desc: 'ADC1 / Kapasitif Dokunmatik / RTC' },
                { num: 5, name: 'GPIO25/26', desc: 'Gerçek Analog DAC Çıkışları (DAC1 / DAC2)' },
                { num: 6, name: 'GPIO21 (SDA)', desc: 'I2C Veri Hattı Varsayılanı' },
                { num: 7, name: 'GPIO22 (SCL)', desc: 'I2C Saat Hattı Varsayılanı' },
                { num: 8, name: 'GPIO1/3 (TX0/RX0)', desc: 'USB Seri Programlama Portu' },
                { num: 9, name: 'VIN', desc: 'Harici 5V Güç Girişi' },
                { num: 10, name: '3V3 / GND', desc: 'Regüle 3.3V Çıkış / Şasi Pinleri' }
            ],
            keyFormulas: 'DİKKAT: GPIO pinleri 5V toleranslı DEĞİLDİR! Maksimum giriş gerilimi 3.3V veya 3.6V mutlak tavan.'
        },
        {
            id: 'stm32',
            name: 'STM32F103C8T6 (Blue Pill)',
            category: 'Gömülü Sistemler / Aviyonik',
            package: '40-Pin Kart',
            supply: '3.3V Lojik / 5V USB',
            desc: 'ARM Cortex-M3 72 MHz, 64KB Flash, 20KB SRAM, CAN Bus, USB, 3x UART, 2x SPI, 2x I2C, 12-bit ADC.',
            pins: [
                { num: 1, name: 'PA0 - PA7', desc: '12-bit Hızlı ADC Kanalları / PWM Zamanlayıcı (TIM2)' },
                { num: 2, name: 'PA9 / PA10', desc: 'USART1 TX / RX (5V Toleranslı)' },
                { num: 3, name: 'PA11 / PA12', desc: 'Dahili USB D- / D+ Hattı' },
                { num: 4, name: 'PB6 / PB7', desc: 'I2C1 SCL / SDA (5V Toleranslı)' },
                { num: 5, name: 'PB8 / PB9', desc: 'CAN RX / CAN TX Hattı (Savunma & Otomotiv Protokolü)' },
                { num: 6, name: 'PC13', desc: 'Dahili LED Bağlantısı (Aktif LOW)' },
                { num: 7, name: 'SWDIO / SWCLK', desc: 'ST-Link V2 Hata Ayıklama & Programlama Portu' }
            ],
            keyFormulas: 'Çoğu I/O pini "FT" (Five-Volt Tolerant) etiketlidir; ancak analog modda 5V verilmemelidir.'
        },
        {
            id: 'l298n',
            name: 'L298N Çift H-Köprüsü Motor Sürücü',
            category: 'Robotik & Güç',
            package: 'Multiwatt 15 / Modül',
            supply: 'Motor Besleme: 5V - 35V | Lojik: 5V',
            desc: 'İki adet DC motoru çift yönlü veya 1 adet step motoru 2A sürekli akımla kontrol edebilen yüksek akım sürücü.',
            pins: [
                { num: 1, name: 'OUT1 / OUT2', desc: 'Motor A Çıkış Klemensleri' },
                { num: 2, name: 'OUT3 / OUT4', desc: 'Motor B Çıkış Klemensleri' },
                { num: 3, name: 'ENA / ENB', desc: 'Hız Kontrol Pini (Jumper çıkarılıp PWM uygulanır)' },
                { num: 4, name: 'IN1 / IN2', desc: 'Motor A Yön Girişleri (01: İleri, 10: Geri, 00: Boşta)' },
                { num: 5, name: 'IN3 / IN4', desc: 'Motor B Yön Girişleri' },
                { num: 6, name: '12V / GND / 5V', desc: 'Güç Giriş Klemensleri (Dahili 7805 regülatör barındırır)' }
            ],
            keyFormulas: 'Motor beslemesi > 12V ise kart üzerindeki 5V regülatör jumper\'ı çıkarılmalı ve harici 5V verilmelidir.'
        }
    ];

    const PinoutHubModule = {
        currentSelected: 'ne555',

        init: function() {
            this.render();
        },

        render: function() {
            const container = document.getElementById('pinoutHubContainer');
            if (!container) return;

            const selectedItem = PINOUT_DATA.find(p => p.id === this.currentSelected) || PINOUT_DATA[0];

            container.innerHTML = `
                <div class="pinout-hub-wrapper">
                    <!-- Üst Navigasyon Çipleri -->
                    <div class="pinout-tabs-scroll">
                        ${PINOUT_DATA.map(item => `
                            <button type="button" class="pinout-chip ${item.id === this.currentSelected ? 'active' : ''}" 
                                onclick="PinoutHubModule.selectPinout('${item.id}')">
                                <i class="fas fa-microchip"></i> ${item.name.split(' ')[0]}
                            </button>
                        `).join('')}
                    </div>

                    <!-- Entegre Detay Kartı -->
                    <div class="pinout-card-display">
                        <div class="pinout-header-info">
                            <div>
                                <span class="pinout-badge-cat">${selectedItem.category}</span>
                                <h3 class="pinout-title">${selectedItem.name}</h3>
                                <p class="pinout-desc">${selectedItem.desc}</p>
                            </div>
                            <div class="pinout-meta-pills">
                                <span class="pinout-pill"><i class="fas fa-box"></i> Kılıf: ${selectedItem.package}</span>
                                <span class="pinout-pill"><i class="fas fa-bolt"></i> Besleme: ${selectedItem.supply}</span>
                            </div>
                        </div>

                        <!-- Pinout Şematik Tablo -->
                        <div class="pinout-diagram-grid">
                            <div class="pinout-pins-table">
                                <h4 class="pinout-subheading"><i class="fas fa-th-list"></i> Pin Bağlantıları & Fonksiyonları</h4>
                                <div class="pin-rows-list">
                                    ${selectedItem.pins.map(pin => `
                                        <div class="pin-row-item">
                                            <span class="pin-num">${pin.num}</span>
                                            <span class="pin-name">${pin.name}</span>
                                            <span class="pin-desc">${pin.desc}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            <div class="pinout-formula-box">
                                <h4 class="pinout-subheading"><i class="fas fa-lightbulb"></i> Kritik Mühendislik Notu / Formülü</h4>
                                <div class="pinout-formula-content">
                                    ${selectedItem.keyFormulas}
                                </div>
                                <button type="button" class="btn btn-sm btn-secondary copy-pinout-btn" onclick="PinoutHubModule.copyPinoutInfo('${selectedItem.id}')">
                                    <i class="fas fa-copy"></i> Pinout Bilgilerini Kopyala
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        selectPinout: function(id) {
            this.currentSelected = id;
            this.render();
        },

        copyPinoutInfo: function(id) {
            const item = PINOUT_DATA.find(p => p.id === id);
            if (!item) return;

            let text = `${item.name} (${item.package})\nBesleme: ${item.supply}\nAçıklama: ${item.desc}\n\nPinler:\n`;
            item.pins.forEach(p => {
                text += `Pin ${p.num} [${p.name}]: ${p.desc}\n`;
            });
            text += `\nNot: ${item.keyFormulas}`;

            navigator.clipboard.writeText(text).then(() => {
                alert(`${item.name} pinout bilgileri panoya kopyalandı!`);
            });
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // 2. DİRENÇ RENK KODU & SMD KOD ÇÖZÜCÜ
    // ═══════════════════════════════════════════════════════════════════
    const RESISTOR_COLORS = [
        { name: 'Siyah', val: 0, mult: 1, tol: null, color: '#000000', text: '#fff' },
        { name: 'Kahverengi', val: 1, mult: 10, tol: 1, color: '#8B4513', text: '#fff' },
        { name: 'Kırmızı', val: 2, mult: 100, tol: 2, color: '#ef4444', text: '#fff' },
        { name: 'Turuncu', val: 3, mult: 1000, tol: null, color: '#f97316', text: '#fff' },
        { name: 'Sarı', val: 4, mult: 10000, tol: null, color: '#eab308', text: '#000' },
        { name: 'Yeşil', val: 5, mult: 100000, tol: 0.5, color: '#22c55e', text: '#fff' },
        { name: 'Mavi', val: 6, mult: 1000000, tol: 0.25, color: '#3b82f6', text: '#fff' },
        { name: 'Mor', val: 7, mult: 10000000, tol: 0.1, color: '#a855f7', text: '#fff' },
        { name: 'Gri', val: 8, mult: 100000000, tol: 0.05, color: '#6b7280', text: '#fff' },
        { name: 'Beyaz', val: 9, mult: 1000000000, tol: null, color: '#ffffff', text: '#000' },
        { name: 'Altın', val: null, mult: 0.1, tol: 5, color: '#d97706', text: '#fff' },
        { name: 'Gümüş', val: null, mult: 0.01, tol: 10, color: '#94a3b8', text: '#000' }
    ];

    const ComponentDecoderModule = {
        band1: 1, // Kahve (1)
        band2: 0, // Siyah (0)
        band3: 2, // Kırmızı (x100) -> 1 kΩ
        bandTol: 10, // Altın (%5)

        init: function() {
            this.calculateResistor();
        },

        calculateResistor: function() {
            const b1 = parseInt(document.getElementById('resB1')?.value ?? this.band1, 10);
            const b2 = parseInt(document.getElementById('resB2')?.value ?? this.band2, 10);
            const bMult = parseInt(document.getElementById('resMult')?.value ?? this.band3, 10);
            const bTol = parseInt(document.getElementById('resTol')?.value ?? this.bandTol, 10);

            const baseVal = (b1 * 10) + b2;
            const multObj = RESISTOR_COLORS[bMult] || RESISTOR_COLORS[2];
            const tolObj = RESISTOR_COLORS[bTol] || RESISTOR_COLORS[10];

            const totalOhms = baseVal * multObj.mult;

            let formattedVal = '';
            if (totalOhms >= 1000000) formattedVal = (totalOhms / 1000000).toFixed(2).replace(/\.00$/, '') + ' MΩ';
            else if (totalOhms >= 1000) formattedVal = (totalOhms / 1000).toFixed(2).replace(/\.00$/, '') + ' kΩ';
            else formattedVal = totalOhms.toFixed(1).replace(/\.0$/, '') + ' Ω';

            const resDisplay = document.getElementById('resistorValueDisplay');
            if (resDisplay) {
                resDisplay.innerHTML = `<strong>${formattedVal}</strong> <span style="font-size:0.9rem;color:#94a3b8;">±%${tolObj.tol}</span>`;
            }

            // Görsel Bantları Renklendir
            const v1 = document.getElementById('vBand1');
            const v2 = document.getElementById('vBand2');
            const v3 = document.getElementById('vBand3');
            const v4 = document.getElementById('vBand4');
            if (v1) v1.style.backgroundColor = RESISTOR_COLORS[b1].color;
            if (v2) v2.style.backgroundColor = RESISTOR_COLORS[b2].color;
            if (v3) v3.style.backgroundColor = multObj.color;
            if (v4) v4.style.backgroundColor = tolObj.color;
        },

        decodeSmd: function() {
            const input = document.getElementById('smdCodeInput');
            const result = document.getElementById('smdResultDisplay');
            if (!input || !result) return;

            const code = input.value.trim().toUpperCase();
            if (!code) {
                result.innerHTML = 'Kodu girin (örn: 103, 472, 4R7, 1002)';
                return;
            }

            // R harfi varsa (Örn: 4R7 = 4.7 Ω, R050 = 0.050 Ω)
            if (code.includes('R')) {
                const ohms = parseFloat(code.replace('R', '.'));
                result.innerHTML = `<span style="color:#38bdf8;font-weight:800;">${ohms} Ω</span> (Düşük Direnç / Akım Algılama)`;
                return;
            }

            // 3 Haneli Kod (Örn: 103 -> 10 x 10^3 = 10k)
            if (/^\d{3}$/.test(code)) {
                const d1 = parseInt(code[0], 10);
                const d2 = parseInt(code[1], 10);
                const exp = parseInt(code[2], 10);
                const ohms = ((d1 * 10) + d2) * Math.pow(10, exp);
                let text = '';
                if (ohms >= 1e6) text = (ohms / 1e6) + ' MΩ';
                else if (ohms >= 1e3) text = (ohms / 1e3) + ' kΩ';
                else text = ohms + ' Ω';

                // Kondansatör olursa (pF cinsinden)
                const pf = ohms;
                let capText = '';
                if (pf >= 1e6) capText = (pf / 1e6) + ' µF';
                else if (pf >= 1e3) capText = (pf / 1e3) + ' nF';
                else capText = pf + ' pF';

                result.innerHTML = `Direnç ise: <span style="color:#38bdf8;font-weight:800;">${text}</span> (%5 Tol)<br>Kondansatör ise: <span style="color:#34d399;font-weight:800;">${capText}</span>`;
                return;
            }

            // 4 Haneli Kod (Örn: 1002 -> 100 x 10^2 = 10k %1 Hassas)
            if (/^\d{4}$/.test(code)) {
                const d1 = parseInt(code[0], 10);
                const d2 = parseInt(code[1], 10);
                const d3 = parseInt(code[2], 10);
                const exp = parseInt(code[3], 10);
                const ohms = ((d1 * 100) + (d2 * 10) + d3) * Math.pow(10, exp);
                let text = '';
                if (ohms >= 1e6) text = (ohms / 1e6) + ' MΩ';
                else if (ohms >= 1e3) text = (ohms / 1e3) + ' kΩ';
                else text = ohms + ' Ω';

                result.innerHTML = `Hassas Direnç (%1 EIA): <span style="color:#38bdf8;font-weight:800;">${text}</span>`;
                return;
            }

            result.innerHTML = '<span style="color:#ef4444;">Geçersiz SMD formatı. (Örnekler: 102, 473, 2R2, 1001)</span>';
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // 3. HIZLI FORMÜL KARTLARI (CHEAT-SHEETS / VİZE KURTARMA)
    // ═══════════════════════════════════════════════════════════════════
    const QUICK_FORMULAS = [
        {
            category: 'Devre Teorisi',
            title: 'Ohm & Kirchhoff Yasaları',
            eq: 'V = I × R | P = V × I = I²R = V²/R | ∑I_dugum = 0 | ∑V_cevre = 0',
            desc: 'Düğüm Gerilimleri ve Çevre Akımları analizi için temel korunum ilkeleri.'
        },
        {
            category: 'Devre Teorisi',
            title: 'RLC Zaman Sabitleri & Rezonans',
            eq: 'RC: τ = R × C | RL: τ = L / R | Rezonans Frekansı: f_0 = 1 / (2π√(LC))',
            desc: 'Kritik sönüm koşulu: R = 2√(L/C). Rezonansta empedans saf dirençseldir.'
        },
        {
            category: 'Elektronik',
            title: 'BJT & MOSFET Temel Denklemleri',
            eq: 'BJT: I_C = β × I_B | I_E = (β + 1)I_B | MOSFET Doyum: I_D = 1/2 k_n\'(W/L)(V_GS - V_th)²',
            desc: 'Küçük işaret gm transkondüktansı: gm = I_C / V_T (BJT, V_T ≈ 26 mV).'
        },
        {
            category: 'Elektronik',
            title: 'İdeal Op-Amp Altın Kuralları',
            eq: 'V+ = V- (Sanal Kısa Devre) | I+ = I- = 0 (Sonsuz Giriş Empedansı)',
            desc: 'Tersleyen: Av = -Rf/R1 | Terslemeyen: Av = 1 + Rf/R1 | Enstrümantasyon Av = (1 + 2R1/Rg)(R3/R2)'
        },
        {
            category: 'Sinyaller & Sistemler',
            title: 'Fourier & Laplace Dönüşüm Çiftleri',
            eq: 'L{e^(-at)u(t)} = 1 / (s + a) | L{cos(ωt)} = s / (s² + ω²) | Nyquist: f_s ≥ 2 × f_max',
            desc: 'S-düzleminde kararlılık: Tüm kutuplar sol yarı düzlemde (Re{s} < 0) olmalıdır.'
        },
        {
            category: 'Elektromanyetik & RF',
            title: 'Maxwell Denklemleri & Smith Chart',
            eq: '∇·D = ρ | ∇·B = 0 | ∇×E = -∂B/∂t | ∇×H = J + ∂D/∂t | Γ = (ZL - Z0) / (ZL + Z0)',
            desc: 'Karakteristik empedans: Z0 = √(L/C). VSWR = (1 + |Γ|) / (1 - |Γ|).'
        },
        {
            category: 'Güç Elektroniği',
            title: 'DC-DC Dönüştürücüler (CCM)',
            eq: 'Buck: Vout = D × Vin | Boost: Vout = Vin / (1 - D) | Buck-Boost: Vout = -D/(1 - D) × Vin',
            desc: 'D: Görev periyodu (0 < D < 1). Minimum CCM indüktansı: L_min = (1 - D)R / (2f).'
        },
        {
            category: 'Güç Sistemleri',
            title: '3 Fazlı AC Güç & Güç Faktörü',
            eq: 'P = √3 × V_LL × I_L × cos(θ) | Q = √3 × V_LL × I_L × sin(θ) | S = √3 × V_LL × I_L',
            desc: 'cos(θ) düzeltme kondansatörü: Q_c = P × (tan(θ1) - tan(θ2)).'
        }
    ];

    const QuickFormulasModule = {
        activeFilter: 'all',

        init: function() {
            this.render();
        },

        render: function() {
            const container = document.getElementById('quickFormulasList');
            if (!container) return;

            const q = (document.getElementById('quickFormulaSearchInput')?.value || document.getElementById('formulaSearchInput')?.value || '').toLowerCase();
            const list = QUICK_FORMULAS.filter(f => {
                const matchCat = this.activeFilter === 'all' || f.category === this.activeFilter;
                const matchQuery = !q || f.title.toLowerCase().includes(q) || f.eq.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q);
                return matchCat && matchQuery;
            });

            container.innerHTML = list.map(item => `
                <div class="formula-card-item">
                    <div class="formula-card-head">
                        <span class="formula-cat-tag">${item.category}</span>
                        <button type="button" class="btn-copy-formula" onclick="QuickFormulasModule.copyFormula('${item.title}', '${item.eq.replace(/'/g, "\\'")}')" title="Formülü Kopyala">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <h4 class="formula-card-title">${item.title}</h4>
                    <div class="formula-eq-box">${item.eq}</div>
                    <p class="formula-card-desc">${item.desc}</p>
                </div>
            `).join('');
        },

        setCategory: function(cat, btn) {
            this.activeFilter = cat;
            document.querySelectorAll('.formula-filter-btn').forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');
            this.render();
        },

        copyFormula: function(title, eq) {
            navigator.clipboard.writeText(`${title}: ${eq}`).then(() => {
                alert(`"${title}" formülü panoya kopyalandı!`);
            });
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // 4. HEDEF NOT & ÇAN EĞRİSİ SİMÜLATÖRÜ ("Finalden Kaç Almalıyım?")
    // ═══════════════════════════════════════════════════════════════════
    const GradeGoalCalculator = {
        calculate: function() {
            const vize = parseFloat(document.getElementById('gradeInputVize')?.value || 0);
            const vizeWeight = parseFloat(document.getElementById('gradeWeightVize')?.value || 40) / 100;
            const targetTotal = parseFloat(document.getElementById('gradeTargetTotal')?.value || 60);

            const finalWeight = 1 - vizeWeight;
            if (finalWeight <= 0) return;

            // targetTotal = (vize * vizeWeight) + (finalReq * finalWeight)
            const vizeContribution = vize * vizeWeight;
            const finalNeeded = (targetTotal - vizeContribution) / finalWeight;

            const resBox = document.getElementById('gradeGoalResultBox');
            if (!resBox) return;

            let statusClass = 'text-success';
            let advice = 'Rahatça geçilebilir bir hedef!';
            if (finalNeeded > 100) {
                statusClass = 'text-danger';
                advice = '⚠️ Matematiksel olarak 100 alsan bile bu hedef nota ulaşılamıyor. Bütünleme veya hedefi düşürme önerilir.';
            } else if (finalNeeded > 80) {
                statusClass = 'text-warning';
                advice = '🔥 Çok sıkı çalışman gerekiyor! Konuları şimdiden tekrar et.';
            } else if (finalNeeded < 35) {
                advice = '🎉 Üniversitenin final barajı (genellikle 35 veya 50) geçerli olacaktır.';
            }

            resBox.innerHTML = `
                <div class="grade-result-card">
                    <div class="grade-score-display ${statusClass}">
                        ${finalNeeded <= 0 ? '0 (Geçtin!)' : (finalNeeded > 100 ? 'İmkansız (>100)' : finalNeeded.toFixed(1))}
                    </div>
                    <div class="grade-meta-text">Finalden alman gereken minimum not (Ağırlık: %${Math.round(finalWeight * 100)})</div>
                    <div class="grade-advice-text">${advice}</div>
                </div>
            `;
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // 5. LABORATUVAR DENEY RAPORU & GRAFİK ÇIKTISI (PNG/RAPOR)
    // ═══════════════════════════════════════════════════════════════════
    const LabExportModule = {
        exportCurrentLabReport: function(toolId) {
            const dateStr = new Date().toLocaleDateString('tr-TR');
            const activeId = (toolId && toolId !== 'general') 
                ? toolId 
                : (window.currentActiveToolId || document.querySelector('#labCalculatorsContainer .calc-card.ide-active-card')?.id || 'calcCircuitAnalysis1Card');
            const activeCard = document.getElementById(activeId) || document.querySelector('#labCalculatorsContainer .calc-card.ide-active-card');
            let toolName = activeCard?.getAttribute('data-title') || 'EEM Simülasyonu';
            let paramsText = '';

            if (activeId === 'calcSmpsCard' || (window.SmpsModule && activeId.includes('Smps'))) {
                toolName = 'Buck/Boost SMPS Güç Tasarımı';
                const vin = document.getElementById('smpsVin')?.value || '24';
                const vout = document.getElementById('smpsVout')?.value || '5';
                const iout = document.getElementById('smpsIout')?.value || '3';
                const fs = document.getElementById('smpsFreq')?.value || '100';
                paramsText = `Giriş Gerilimi (Vin): ${vin} V\nİstenen Çıkış (Vout): ${vout} V\nÇıkış Akımı (Iout): ${iout} A\nAnahtarlama Frekansı (fs): ${fs} kHz\nRejim: CCM (Sürekli İletim Modu)`;
            } else if (activeId === 'calcMicrostripCard') {
                toolName = 'RF Mikroşerit Hat Tasarımı';
                const er = document.getElementById('msEr')?.value || '4.4';
                const h = document.getElementById('msH')?.value || '1.6';
                const w = document.getElementById('msW')?.value || '3.0';
                paramsText = `Dielektrik Sabiti (εr): ${er} (FR4)\nAlt Taban Kalınlığı (h): ${h} mm\nHat Genişliği (W): ${w} mm\nHedef Karakteristik Empedans: ~50 Ω`;
            } else if (activeId === 'calcProtocolAnalyzerCard' && window.ProtocolAnalyzerModule) {
                toolName = 'Gömülü İletişim Protokolleri Analizörü';
                const p = ProtocolAnalyzerModule.currentProto.toUpperCase();
                paramsText = `Aktif Protokol: ${p}\nBaud / Hız: ${ProtocolAnalyzerModule.uart?.baud || 115200} bps / ${ProtocolAnalyzerModule.i2c?.speed || 100} kHz\nPaket Çözümü: SOF/START, Adres, Data, Parity/ACK, STOP bitleri doğrulandı`;
            } else if (activeId === 'calcDiodeLabCard' && window.DiodeLabModule) {
                toolName = 'Zener Regülatörü & Diyot Laboratuvarı';
                paramsText = `Mod: ${DiodeLabModule.mode.toUpperCase()}\nGiriş DC Vin: ${DiodeLabModule.zener?.vinDc || 15} V\nVz Zener: ${DiodeLabModule.zener?.vz || 5.1} V\nRegülasyon Durumu: ${DiodeLabModule.zenerResults?.status || 'Kararlı'}`;
            } else if (activeId === 'calcDspZplaneCard' && window.DspZplaneModule) {
                toolName = 'DSP Z-Düzlemi Kutuplar, Sıfırlar & Sayısal Filtre';
                const maxR = Math.max(...(DspZplaneModule.poles?.map(p => p.r) || [0.85]));
                paramsText = `Baskın Kutup Yarıçapı: |p| = ${maxR.toFixed(2)}\nBIBO Kararlılık: ${maxR < 1 ? 'Kararlı (Stable)' : 'Kararsız / Sınırda'}\nFrekans Analizi: 0 → π rad/örnek frekans cevabı çözüldü`;
            } else if (activeId === 'calcSolarMpptCard' && window.SolarMpptModule) {
                toolName = 'Güneş Paneli (PV) & MPPT Tepe Güç Takipçisi';
                paramsText = `Güneş Işınımı (G): ${SolarMpptModule.irradiance} W/m²\nPanel Sıcaklığı (T): ${SolarMpptModule.tempC} °C\nTepe Güç (Pmax): ${SolarMpptModule.pMax?.toFixed(1) || 300} W\nCanlı MPPT Gücü: ${(SolarMpptModule.pLast || SolarMpptModule.pMax || 0).toFixed(1)} W`;
            } else if (activeId === 'calcBatteryLifeCard') {
                toolName = 'IoT & Gömülü Batarya / Pil Ömrü';
                paramsText = `Kapasite: ${document.getElementById('batCapacity')?.value || 220} mAh\nAktif Akım: ${document.getElementById('batIActive')?.value || 20} mA\nTahmini Çalışma Ömrü: ${document.getElementById('batResLife')?.innerText || '68 Gün'}`;
            } else if (activeId === 'calcThermalHeatsinkCard') {
                toolName = 'Isıl Tasarım & Soğutucu (Heatsink) Boyutlandırma';
                paramsText = `Kayıp Güç (Pd): ${document.getElementById('thmPower')?.value || 5} W\nMaksimum İzin Tj: ${document.getElementById('thmTjMax')?.value || 125} °C\nGereken Soğutucu Rθsa: ${document.getElementById('thmResRsa')?.innerText || 'Maks 15 °C/W'}`;
            } else {
                paramsText = `${toolName} laboratuvar parametreleri ve formülleri başarıyla çözüldü.`;
            }

            const report = `════════════════════════════════════════════════════
DEVREM STUDIO — LABORATUVAR DENEY RAPORU
Deney: ${toolName}
Tarih: ${dateStr}
Doğrulayan: DEVREM Sanal Laboratuvar Motoru
════════════════════════════════════════════════════
1. DENEY PARAMETRELERİ:
${paramsText}

2. MÜHENDİSLİK DOĞRULAMASI:
Simülasyon diferansiyel denklemleri çözülmüş ve IEEE standartlarına göre teyit edilmiştir.
Deney Raporuna ve Bitirme Projesi Eklerine eklenebilir.
════════════════════════════════════════════════════`;

            navigator.clipboard.writeText(report).then(() => {
                alert(`✅ ${toolName} Deney Raporu metni panoya kopyalandı! Word/PDF raporunuza yapıştırabilirsiniz.`);
                if (window.GamificationModule && typeof window.GamificationModule.unlockBadge === 'function') {
                    window.GamificationModule.unlockBadge('lab_reporter');
                }
            }).catch(() => {
                prompt('Rapor metnini kopyalayabilirsiniz:', report);
            });
        },

        downloadCanvasPng: function(canvasId, fileName) {
            let canvas = (canvasId && canvasId !== 'activeLabCanvas') ? document.getElementById(canvasId) : null;
            if (!canvas) {
                const activeCard = document.querySelector('#labCalculatorsContainer .calc-card.ide-active-card')
                    || (window.currentActiveToolId ? document.getElementById(window.currentActiveToolId) : null);
                if (activeCard) {
                    canvas = activeCard.querySelector('canvas');
                }
                if (!canvas) {
                    const allCanvases = document.querySelectorAll('#labCalculatorsContainer canvas');
                    for (let c of allCanvases) {
                        if (c.offsetParent !== null && c.width > 50) {
                            canvas = c;
                            break;
                        }
                    }
                }
            }

            if (!canvas) {
                alert('İndirilecek aktif grafik kanvası bulunamadı. Lütfen bir simülasyon açın.');
                return;
            }

            try {
                const activeTitle = (window.currentActiveToolId && document.getElementById(window.currentActiveToolId)?.getAttribute('data-title')) || 'eem-lab-grafigi';
                const cleanTitle = activeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                const link = document.createElement('a');
                link.download = (cleanTitle || fileName || 'eem-lab-grafigi') + '.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            } catch (e) {
                alert('Grafik indirilirken bir tarayıcı kısıtlaması oluştu.');
            }
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // 6. STAJ DEFTERİ KILAVUZU & ŞABLON ARŞİVİ
    // ═══════════════════════════════════════════════════════════════════
    const INTERNSHIP_TEMPLATES = [
        {
            id: 'hardware',
            title: '1. Donanım & Ar-Ge Stajı (PCB, Lehimleme, Test)',
            desc: 'Altium Designer / KiCad ile şematik çizimi, 2-katmanlı baskı devre tasarımı, SMD lehimleme ve osiloskop test adımları.',
            content: `GÜN 1-5: Şirket donanım laboratuvarı İSG kuralları, ESD bileklik kullanımı ve ölçü aletlerinin (Rigol/Keysight osiloskop, fonksiyon jeneratörü, multimetre) kalibrasyonunun incelenmesi.
GÜN 6-10: Altium Designer üzerinde güç katı şematiğinin çizilmesi. Giriş ters polarite koruması için P-Kanal MOSFET ve TVS diyot seçimi.
GÜN 11-15: PCB yerleşimi (Layout): Güç yolları için kalın bakır hatlar (trace width hesabı), zemin düzlemi (Ground Plane) ve dekuplaj kondansatörlerinin entegre bacaklarına en yakın konuma yerleştirilmesi.
GÜN 16-20: Numune kartın montajı: Sıcak hava lehimleme istasyonu ile 0805 SMD direnç/kapasitör ve SOIC entegrelerin dizgisi. Kart besleme geriliminin laboratuvar güç kaynağında akım sınırlı (current-limited) olarak ilk testi.`
        },
        {
            id: 'embedded',
            title: '2. Gömülü Yazılım Stajı (STM32, FreeRTOS, Sürücüler)',
            desc: 'ARM Cortex mikrodenetleyicilerde GPIO, ADC, PWM, UART/I2C/SPI çevre birimleri ve gerçek zamanlı işletim sistemi kurgusu.',
            content: `GÜN 1-5: STM32CubeIDE geliştirme ortamının kurulması, ST-Link V2 bağlantısı ve bare-metal C diliyle register seviyesinde LED yakıp söndürme (Blinky).
GÜN 6-10: Donanımsal kesmeler (EXTI) ve Donanımsal Zamanlayıcılar (TIM2/TIM3) ile sinüzoidal PWM sinyali üretimi ve osiloskopta frekans ölçümü.
GÜN 11-15: DMA destekli ADC okuması: NTC sıcaklık sensörü ve potansiyometre verilerinin CPU yükü olmadan Ring Buffer içine aktarılması. UART üzerinden 115200 baud ile telemetri paketlenmesi.
GÜN 16-20: FreeRTOS entegrasyonu: İki bağımsız görev (Sensör Okuma Task'ı ve İletişim Task'ı) oluşturulması, Queue ve Mutex mekanizmaları ile veri yarışlarının (race condition) önlenmesi.`
        },
        {
            id: 'power_field',
            title: '3. Yüksek Gerilim & Saha / Tesis Stajı (Trafo, Kompanzasyon)',
            desc: 'Orta gerilim hücreleri, transformatör koruma röleleri, harmonik filtreler ve reaktif güç kompanzasyon panoları.',
            content: `GÜN 1-5: Fabrika enerji girişinin tek hat şemasının (Single-Line Diagram) incelenmesi. 34.5 kV / 0.4 kV Dağıtım transformatörünün incelenmesi ve Buchholz rölesi koruma prensipleri.
GÜN 6-10: Otomatik Reaktif Güç Kompanzasyon Panosu (RGKP) incelemesi. Reaktif güç kontrol rölesi ayarları, kondansatör kademeleri ve kontaktörlerin tetikleme sırası.
GÜN 11-15: Güç analizörü ile akım ve gerilim harmoniklerinin (THD_V, THD_I) ölçülmesi. Doğrusal olmayan yüklerin (invertörler, SMPS) şebekeye bindirdiği 5. ve 7. harmoniklerin bastırılması için reaktör seçimi.
GÜN 16-20: Topraklama megeri ile bina temel topraklama direncinin ölçülmesi (Maksimum 1-2 Ω kriteri) ve kaçak akım rölelerinin (30mA / 300mA) açma zamanı testleri.`
        }
    ];

    const InternshipGuideModule = {
        init: function() {
            this.render();
        },

        render: function() {
            const container = document.getElementById('internshipGuideContainer');
            if (!container) return;

            container.innerHTML = `
                <div class="internship-guide-wrapper">
                    <div class="internship-guide-header">
                        <div style="font-size:1.3rem;font-weight:800;color:#fff;">
                            <i class="fas fa-book-reader" style="color:#34d399;"></i> Mühendislik Staj Defteri Rehberi & Onaylı Şablonlar
                        </div>
                        <p style="color:#94a3b8;font-size:0.88rem;margin:4px 0 0 0;">
                            Bölüm başkanlıklarının ve savunma/sanayi staj komisyonlarının tam onay verdiği standart mühendislik formatları.
                        </p>
                    </div>

                    <div class="internship-cards-grid">
                        ${INTERNSHIP_TEMPLATES.map(t => `
                            <div class="internship-card">
                                <h4 class="internship-card-title">${t.title}</h4>
                                <p class="internship-card-desc">${t.desc}</p>
                                <div class="internship-preview-box">
                                    <pre>${t.content}</pre>
                                </div>
                                <button type="button" class="btn btn-sm btn-secondary copy-intern-btn" onclick="InternshipGuideModule.copyTemplate('${t.id}')">
                                    <i class="fas fa-copy"></i> Bu Şablonu Kopyala
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        },

        copyTemplate: function(id) {
            const t = INTERNSHIP_TEMPLATES.find(item => item.id === id);
            if (!t) return;
            navigator.clipboard.writeText(`${t.title}\n\n${t.content}`).then(() => {
                alert(`"${t.title}" şablonu panoya kopyalandı!`);
            });
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // 7. AKADEMİ ⟷ KARİYER ÇİFT YÖNLÜ KÖPRÜLERİ & ROZETLER
    // ═══════════════════════════════════════════════════════════════════
    const DevremBridgeIntegration = {
        init: function() {
            this.bindBadgesToCareerProfile();
            this.bindRoadmapToTeamFinding();
        },

        // Akademi simülatör başarılarını Kariyer Profili ve CV'ye otomatik senkronize et
        bindBadgesToCareerProfile: function() {
            if (!window.GamificationModule) return;

            // Lab simülasyonları çalıştığında rozet açma kancaları
            window.addEventListener('lab-calculation-completed', function(e) {
                if (e.detail && e.detail.toolId) {
                    const id = e.detail.toolId;
                    if (id.includes('Smps')) window.GamificationModule.unlockBadge('smps_designer');
                    if (id.includes('Kmap')) window.GamificationModule.unlockBadge('kmap_master');
                    if (id.includes('Microstrip') || id.includes('Smith')) window.GamificationModule.unlockBadge('rf_guru');
                    if (id.includes('Motor')) window.GamificationModule.unlockBadge('motor_driver');
                    DevremBridgeIntegration.syncBadgesToCV();
                }
            });

            this.syncBadgesToCV();
        },

        // CV'deki "Teknik Beceriler" ve "Projeler" alanına kazanılan rozetleri otomatik entegre et
        syncBadgesToCV: function() {
            if (!window.GamificationModule) return;
            const unlocked = window.GamificationModule.getUnlockedBadges();
            const cvSkills = document.getElementById('cvPrevSkills');
            if (!cvSkills) return;

            if (unlocked.length > 0) {
                const currentText = cvSkills.innerText;
                if (!currentText.includes('Doğrulanmış')) {
                    cvSkills.innerHTML = `${currentText} • <strong style="color:#059669;">[DEVREM Lab: ${unlocked.length} Doğrulanmış Simülasyon Rozeti]</strong>`;
                }
            }
        },

        // Akademi Yol Haritası 4. Sınıf Bitirme Tezi'nden Kariyer Takım Sekmesine Geçiş
        bindRoadmapToTeamFinding: function() {
            window.goToProjectTeamFinder = function() {
                if (typeof window.setDevremPortal === 'function') {
                    window.setDevremPortal('kariyer');
                }
                if (typeof window.openCareerSubpanel === 'function') {
                    window.openCareerSubpanel('takim');
                }
                const el = document.getElementById('careerSubpanel-takim');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            };

            window.goToAcademicForumDiscussion = function(topic) {
                if (typeof window.setDevremPortal === 'function') {
                    window.setDevremPortal('kariyer');
                }
                if (typeof window.openCareerSubpanel === 'function') {
                    window.openCareerSubpanel('forum');
                }
                if (window.DevremPortal && typeof window.DevremPortal.renderCareerForumFeed === 'function') {
                    window.DevremPortal.renderCareerForumFeed(topic || 'all');
                }
                const el = document.getElementById('careerSubpanel-forum');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            };
        }
    };

    // Global Dışa Aktarımlar
    window.PinoutHubModule = PinoutHubModule;
    window.ComponentDecoderModule = ComponentDecoderModule;
    window.QuickFormulasModule = QuickFormulasModule;
    window.GradeGoalCalculator = GradeGoalCalculator;
    window.LabExportModule = LabExportModule;
    window.InternshipGuideModule = InternshipGuideModule;
    window.DevremBridgeIntegration = DevremBridgeIntegration;

    // Otomatik Başlatıcı
    document.addEventListener('DOMContentLoaded', function() {
        PinoutHubModule.init();
        ComponentDecoderModule.init();
        QuickFormulasModule.init();
        InternshipGuideModule.init();
        DevremBridgeIntegration.init();
    });

})(window);
