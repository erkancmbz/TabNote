/**
 * EEM REHBER / DEVREM STUDIO - GÖMÜLÜ İLETİŞİM PROTOKOLLERİ & MANTIK ANALİZÖRÜ (PROTOCOL ANALYZER)
 * 
 * UART, I2C, SPI ve CAN Bus:
 * - Gerçek zamanlı HiDPI çok kanallı lojik analizör kanvası
 * - Start/Stop, Adres, ACK/NACK, Data ve CRC etiketli protokol çözücü (Protocol Decoder HUD)
 * - SPI 4-Mod (CPOL/CPHA), I2C 100k/400k, UART Baud & Parity, CAN 11-bit ID & Diferansiyel Vdiff
 * - Etkileşimli paket üretici & canlı tarama çizgisi animasyonu
 */
(function(window) {
    'use strict';

    const ProtocolAnalyzerModule = {
        currentProto: 'uart', // 'uart' | 'i2c' | 'spi' | 'can'
        isRunning: false,
        animFrameId: null,
        scanPos: 0, // 0 to 1
        hoverInfo: null,

        // UART Ayarları
        uart: {
            baud: 115200,
            parity: 'none', // 'none' | 'even' | 'odd'
            stopBits: 1,    // 1 | 2
            dataByte: 0x4B  // 'K' (01001011)
        },

        // I2C Ayarları
        i2c: {
            speed: 100,     // 100 kHz | 400 kHz
            addr: 0x3C,     // 7-bit OLED display
            rw: 0,          // 0: Write, 1: Read
            dataByte: 0x5A, // Byte
            ack: true
        },

        // SPI Ayarları
        spi: {
            mode: 0,        // 0 (CPOL=0,CPHA=0), 1 (0,1), 2 (1,0), 3 (1,1)
            mosiByte: 0x9F, // Flash Read ID
            misoByte: 0xEF  // Winbond ID
        },

        // CAN Bus Ayarları
        can: {
            id: 0x123,      // 11-bit Standart ID
            rtr: 0,
            dlc: 1,
            dataByte: 0xC4
        },

        init: function() {
            this.bindEvents();
            this.render();
            if (window.SimManager) {
                window.SimManager.register('protocol_analyzer', {
                    stop: () => this.stop(),
                    isRunning: () => this.isRunning,
                    resume: () => { if (this.isRunning) this.startLoop(); }
                });
            }
        },

        setProtocol: function(proto) {
            this.currentProto = proto;
            document.querySelectorAll('.btn-proto-select').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-proto') === proto);
            });
            document.querySelectorAll('.proto-settings-group').forEach(g => {
                g.style.display = (g.getAttribute('data-proto') === proto) ? 'block' : 'none';
            });
            this.scanPos = 0;
            this.render();
        },

        togglePlay: function() {
            this.isRunning = !this.isRunning;
            this.updatePlayButton();
            if (this.isRunning) {
                if (window.SimManager) window.SimManager.notifyStarted('protocol_analyzer');
                this.startLoop();
            } else {
                if (this.animFrameId) {
                    cancelAnimationFrame(this.animFrameId);
                    this.animFrameId = null;
                }
                if (window.SimManager) window.SimManager.notifyStopped('protocol_analyzer');
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
            const step = () => {
                if (!this.isRunning) return;
                this.scanPos += 0.006;
                if (this.scanPos > 1) this.scanPos = 0;
                this.render();
                this.animFrameId = requestAnimationFrame(step);
            };
            this.animFrameId = requestAnimationFrame(step);
        },

        updatePlayButton: function() {
            const btn = document.getElementById('btnProtoPlay');
            if (btn) {
                btn.innerHTML = this.isRunning
                    ? '<i class="fas fa-pause"></i> <span>Durdur</span>'
                    : '<i class="fas fa-play"></i> <span>Canlı Analizörü Başlat</span>';
                btn.classList.toggle('is-running', this.isRunning);
            }
        },

        loadPreset: function(presetKey) {
            if (presetKey === 'uart_hello') {
                this.setProtocol('uart');
                this.uart.baud = 115200;
                this.uart.parity = 'none';
                this.uart.stopBits = 1;
                this.uart.dataByte = 0x41; // 'A'
            } else if (presetKey === 'i2c_oled') {
                this.setProtocol('i2c');
                this.i2c.addr = 0x3C;
                this.i2c.rw = 0;
                this.i2c.dataByte = 0x00; // Command reg
            } else if (presetKey === 'spi_flash') {
                this.setProtocol('spi');
                this.spi.mode = 0;
                this.spi.mosiByte = 0x9F;
                this.spi.misoByte = 0x17;
            } else if (presetKey === 'can_rpm') {
                this.setProtocol('can');
                this.can.id = 0x280; // Motor RPM ID
                this.can.dataByte = 0x5E;
            }
            this.syncControls();
            this.render();
        },

        syncControls: function() {
            const uByte = document.getElementById('protoUartByte');
            if (uByte) uByte.value = '0x' + this.uart.dataByte.toString(16).toUpperCase();
            const iAddr = document.getElementById('protoI2cAddr');
            if (iAddr) iAddr.value = '0x' + this.i2c.addr.toString(16).toUpperCase();
            const sMosi = document.getElementById('protoSpiMosi');
            if (sMosi) sMosi.value = '0x' + this.spi.mosiByte.toString(16).toUpperCase();
            const cId = document.getElementById('protoCanId');
            if (cId) cId.value = '0x' + this.can.id.toString(16).toUpperCase();
        },

        bindEvents: function() {
            const canvas = document.getElementById('protocolScopeCanvas');
            if (canvas) {
                canvas.addEventListener('mousemove', (e) => {
                    const rect = canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    this.hoverInfo = { x, y, w: rect.width, h: rect.height };
                    if (!this.isRunning) this.render();
                });
                canvas.addEventListener('mouseleave', () => {
                    this.hoverInfo = null;
                    if (!this.isRunning) this.render();
                });
            }
        },

        render: function() {
            const canvas = document.getElementById('protocolScopeCanvas');
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
            const bgGrad = ctx.createLinearGradient(0, 0, 0, cssH);
            if (isLight) {
                bgGrad.addColorStop(0, '#f8fafc');
                bgGrad.addColorStop(1, '#f1f5f9');
            } else {
                bgGrad.addColorStop(0, '#020617');
                bgGrad.addColorStop(1, '#070f22');
            }
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, cssW, cssH);

            // Izgara (Grid)
            ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(56,189,248,0.07)';
            ctx.lineWidth = 1;
            const gridStep = 40;
            for (let x = 0; x < cssW; x += gridStep) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, cssH);
                ctx.stroke();
            }
            for (let y = 0; y < cssH; y += gridStep) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(cssW, y);
                ctx.stroke();
            }

            // Çizilecek protokol
            if (this.currentProto === 'uart') {
                this.renderUart(ctx, cssW, cssH, isLight);
            } else if (this.currentProto === 'i2c') {
                this.renderI2c(ctx, cssW, cssH, isLight);
            } else if (this.currentProto === 'spi') {
                this.renderSpi(ctx, cssW, cssH, isLight);
            } else if (this.currentProto === 'can') {
                this.renderCan(ctx, cssW, cssH, isLight);
            }

            // Canlı Tarama Çizgisi (Scan Line)
            if (this.isRunning) {
                const scanX = 90 + this.scanPos * (cssW - 110);
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(scanX, 20);
                ctx.lineTo(scanX, cssH - 20);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.fillStyle = '#ef4444';
                ctx.font = '600 10px JetBrains Mono, monospace';
                ctx.fillText('ANLIK ÖRNEKLEME', scanX - 45, 14);
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // UART RENDERER
        // ═══════════════════════════════════════════════════════════════
        renderUart: function(ctx, w, h, isLight) {
            const byte = this.uart.dataByte & 0xFF;
            const bits = [];
            // LSB first: D0 to D7
            let ones = 0;
            for (let i = 0; i < 8; i++) {
                const b = (byte >> i) & 1;
                bits.push(b);
                if (b === 1) ones++;
            }

            // Parity
            let parityBit = null;
            if (this.uart.parity === 'even') {
                parityBit = (ones % 2 === 0) ? 0 : 1;
            } else if (this.uart.parity === 'odd') {
                parityBit = (ones % 2 === 1) ? 0 : 1;
            }

            // Waveform segments: [Idle, Start=0, D0..D7, Parity?, Stop=1, Idle]
            const segments = [];
            segments.push({ name: 'IDLE', val: 1, color: '#64748b' });
            segments.push({ name: 'START', val: 0, color: '#f59e0b' });
            for (let i = 0; i < 8; i++) {
                segments.push({ name: 'D' + i + ' (' + bits[i] + ')', val: bits[i], color: '#38bdf8' });
            }
            if (parityBit !== null) {
                segments.push({ name: 'PAR (' + parityBit + ')', val: parityBit, color: '#a855f7' });
            }
            segments.push({ name: 'STOP', val: 1, color: '#10b981' });
            if (this.uart.stopBits === 2) {
                segments.push({ name: 'STOP2', val: 1, color: '#10b981' });
            }
            segments.push({ name: 'IDLE', val: 1, color: '#64748b' });

            this.drawDigitalChannel(ctx, 'TXD', '#38bdf8', segments, 90, 80, w - 110, 100, isLight);

            // Bilgi Kutusu & HUD
            this.drawTelemetryHUD(ctx, 90, 240, w - 110, [
                { label: 'Protokol', val: 'UART (Asenkron Seri)' },
                { label: 'Baud Rate', val: this.uart.baud + ' bps' },
                { label: 'Bit Süresi', val: (1e6 / this.uart.baud).toFixed(2) + ' µs' },
                { label: 'Gönderilen Byte', val: '0x' + byte.toString(16).toUpperCase() + ' (\'' + String.fromCharCode(byte) + '\')' },
                { label: 'Parity / Stop', val: this.uart.parity.toUpperCase() + ' / ' + this.uart.stopBits + ' Bit' }
            ], isLight);
        },

        // ═══════════════════════════════════════════════════════════════
        // I2C RENDERER (SCL + SDA)
        // ═══════════════════════════════════════════════════════════════
        renderI2c: function(ctx, w, h, isLight) {
            const addr = this.i2c.addr & 0x7F;
            const rw = this.i2c.rw;
            const data = this.i2c.dataByte & 0xFF;

            // SDA & SCL Segments
            const sclSegs = [];
            const sdaSegs = [];

            // START Koşulu: SCL=1 iken SDA 1->0 düşer
            sdaSegs.push({ name: 'IDLE', val: 1, color: '#64748b' });
            sclSegs.push({ name: 'IDLE', val: 1, color: '#64748b' });

            sdaSegs.push({ name: 'START', val: 0, color: '#f59e0b' });
            sclSegs.push({ name: 'START', val: 1, color: '#f59e0b' });

            // 7-Bit Adres (MSB first)
            for (let i = 6; i >= 0; i--) {
                const b = (addr >> i) & 1;
                sdaSegs.push({ name: 'A' + i + ' (' + b + ')', val: b, color: '#38bdf8' });
                sclSegs.push({ name: 'CLK', val: 1, isPulse: true, color: '#facc15' });
            }

            // R/W Biti
            sdaSegs.push({ name: rw ? 'R(1)' : 'W(0)', val: rw, color: '#ec4899' });
            sclSegs.push({ name: 'CLK', val: 1, isPulse: true, color: '#facc15' });

            // ACK (0)
            sdaSegs.push({ name: 'ACK (0)', val: 0, color: '#10b981' });
            sclSegs.push({ name: 'CLK', val: 1, isPulse: true, color: '#facc15' });

            // 8-Bit Data
            for (let i = 7; i >= 0; i--) {
                const b = (data >> i) & 1;
                sdaSegs.push({ name: 'D' + i + ' (' + b + ')', val: b, color: '#a855f7' });
                sclSegs.push({ name: 'CLK', val: 1, isPulse: true, color: '#facc15' });
            }

            // ACK
            sdaSegs.push({ name: 'ACK', val: 0, color: '#10b981' });
            sclSegs.push({ name: 'CLK', val: 1, isPulse: true, color: '#facc15' });

            // STOP Koşulu: SCL=1 iken SDA 0->1 yükselir
            sdaSegs.push({ name: 'STOP', val: 1, color: '#ef4444' });
            sclSegs.push({ name: 'STOP', val: 1, color: '#ef4444' });

            this.drawDigitalChannel(ctx, 'SCL (Saat)', '#facc15', sclSegs, 90, 45, w - 110, 65, isLight);
            this.drawDigitalChannel(ctx, 'SDA (Veri)', '#38bdf8', sdaSegs, 90, 130, w - 110, 65, isLight);

            this.drawTelemetryHUD(ctx, 90, 235, w - 110, [
                { label: 'Protokol', val: 'I²C (2-Telli Çift Yönlü)' },
                { label: 'Hız Modu', val: this.i2c.speed + ' kHz' },
                { label: 'Hedef 7-Bit Adres', val: '0x' + addr.toString(16).toUpperCase() },
                { label: 'İşlem Türü', val: rw ? 'READ (Okuma)' : 'WRITE (Yazma)' },
                { label: 'Veri Baytı', val: '0x' + data.toString(16).toUpperCase() }
            ], isLight);
        },

        // ═══════════════════════════════════════════════════════════════
        // SPI RENDERER (CS#, SCK, MOSI, MISO)
        // ═══════════════════════════════════════════════════════════════
        renderSpi: function(ctx, w, h, isLight) {
            const mosi = this.spi.mosiByte & 0xFF;
            const miso = this.spi.misoByte & 0xFF;

            const csSegs = [];
            const sckSegs = [];
            const mosiSegs = [];
            const misoSegs = [];

            // CS aktif LOW
            csSegs.push({ name: 'IDLE', val: 1, color: '#64748b' });
            sckSegs.push({ name: 'IDLE', val: (this.spi.mode >= 2) ? 1 : 0, color: '#64748b' });
            mosiSegs.push({ name: 'IDLE', val: 0, color: '#64748b' });
            misoSegs.push({ name: 'IDLE', val: 0, color: '#64748b' });

            // 8 Bit Aktarım
            for (let i = 7; i >= 0; i--) {
                const bOut = (mosi >> i) & 1;
                const bIn = (miso >> i) & 1;
                csSegs.push({ name: 'ACTIVE', val: 0, color: '#ef4444' });
                sckSegs.push({ name: 'CLK', val: 1, isPulse: true, color: '#facc15' });
                mosiSegs.push({ name: 'M' + i + '(' + bOut + ')', val: bOut, color: '#38bdf8' });
                misoSegs.push({ name: 'S' + i + '(' + bIn + ')', val: bIn, color: '#10b981' });
            }

            csSegs.push({ name: 'IDLE', val: 1, color: '#64748b' });
            sckSegs.push({ name: 'IDLE', val: (this.spi.mode >= 2) ? 1 : 0, color: '#64748b' });
            mosiSegs.push({ name: 'IDLE', val: 0, color: '#64748b' });
            misoSegs.push({ name: 'IDLE', val: 0, color: '#64748b' });

            this.drawDigitalChannel(ctx, 'CS#', '#ef4444', csSegs, 90, 35, w - 110, 45, isLight);
            this.drawDigitalChannel(ctx, 'SCK', '#facc15', sckSegs, 90, 85, w - 110, 45, isLight);
            this.drawDigitalChannel(ctx, 'MOSI', '#38bdf8', mosiSegs, 90, 135, w - 110, 45, isLight);
            this.drawDigitalChannel(ctx, 'MISO', '#10b981', misoSegs, 90, 185, w - 110, 45, isLight);

            const cpol = (this.spi.mode >= 2) ? 1 : 0;
            const cpha = (this.spi.mode % 2 === 1) ? 1 : 0;
            this.drawTelemetryHUD(ctx, 90, 260, w - 110, [
                { label: 'Protokol', val: 'SPI (4-Telli Tam Çift Yönlü Full-Duplex)' },
                { label: 'SPI Modu', val: 'Mod ' + this.spi.mode + ' (CPOL=' + cpol + ', CPHA=' + cpha + ')' },
                { label: 'MOSI Giden', val: '0x' + mosi.toString(16).toUpperCase() },
                { label: 'MISO Gelen', val: '0x' + miso.toString(16).toUpperCase() }
            ], isLight);
        },

        // ═══════════════════════════════════════════════════════════════
        // CAN BUS RENDERER (CAN_H, CAN_L & Diferansiyel)
        // ═══════════════════════════════════════════════════════════════
        renderCan: function(ctx, w, h, isLight) {
            const id = this.can.id & 0x7FF;
            const data = this.can.dataByte & 0xFF;

            // Segments: SOF (0), 11-Bit ID, RTR (0), IDE (0), r0 (0), DLC (4-bit), Data (8-bit), CRC, ACK, EOF
            const segs = [];
            segs.push({ name: 'RECESSIVE', val: 1, color: '#64748b' });
            segs.push({ name: 'SOF (0)', val: 0, color: '#f59e0b' }); // SOF dominant 0
            for (let i = 10; i >= 0; i--) {
                const b = (id >> i) & 1;
                segs.push({ name: 'ID' + i + '(' + b + ')', val: b, color: '#38bdf8' });
            }
            segs.push({ name: 'RTR(0)', val: 0, color: '#06b6d4' });
            segs.push({ name: 'DLC(1)', val: 0, color: '#8b5cf6' });
            for (let i = 7; i >= 0; i--) {
                const b = (data >> i) & 1;
                segs.push({ name: 'D' + i + '(' + b + ')', val: b, color: '#10b981' });
            }
            segs.push({ name: 'ACK(0)', val: 0, color: '#ec4899' });
            segs.push({ name: 'EOF', val: 1, color: '#64748b' });

            this.drawCanDifferentialChannels(ctx, segs, 90, 45, w - 110, 180, isLight);

            this.drawTelemetryHUD(ctx, 90, 260, w - 110, [
                { label: 'Protokol', val: 'CAN Bus 2.0A (ISO 11898)' },
                { label: 'Standart ID', val: '0x' + id.toString(16).toUpperCase() },
                { label: 'Dominant Seviye', val: 'Lojik 0 (CAN_H 3.5V, CAN_L 1.5V, Vdiff=2.0V)' },
                { label: 'Resesif Seviye', val: 'Lojik 1 (CAN_H 2.5V, CAN_L 2.5V, Vdiff=0.0V)' }
            ], isLight);
        },

        // Dijital Tek Kanal Çizici
        drawDigitalChannel: function(ctx, label, labelColor, segs, startX, startY, totalW, chH, isLight) {
            const highY = startY + 6;
            const lowY = startY + chH - 12;
            const segW = totalW / segs.length;

            // Etiket
            ctx.fillStyle = labelColor;
            ctx.font = 'bold 12px JetBrains Mono, monospace';
            ctx.fillText(label, 12, startY + chH / 2 + 4);

            // Zemin bandı
            ctx.fillStyle = isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.015)';
            ctx.fillRect(startX, startY, totalW, chH);

            ctx.strokeStyle = labelColor;
            ctx.lineWidth = 2.2;
            ctx.beginPath();

            let curY = segs[0].val ? highY : lowY;
            ctx.moveTo(startX, curY);

            for (let i = 0; i < segs.length; i++) {
                const s = segs[i];
                const x1 = startX + i * segW;
                const x2 = x1 + segW;

                if (s.isPulse) {
                    // Saat darbesi: LOW -> HIGH -> LOW
                    const midX = x1 + segW * 0.5;
                    ctx.lineTo(x1, lowY);
                    ctx.lineTo(x1, highY);
                    ctx.lineTo(midX, highY);
                    ctx.lineTo(midX, lowY);
                    ctx.lineTo(x2, lowY);
                    curY = lowY;
                } else {
                    const targetY = s.val ? highY : lowY;
                    if (targetY !== curY) {
                        ctx.lineTo(x1, targetY);
                        curY = targetY;
                    }
                    ctx.lineTo(x2, curY);
                }

                // Protokol çözücü kutusu (Decoder banner)
                ctx.fillStyle = s.color || '#38bdf8';
                ctx.fillRect(x1 + 1, startY + chH - 8, segW - 2, 4);

                ctx.font = '500 9px JetBrains Mono, monospace';
                ctx.fillStyle = isLight ? '#475569' : '#94a3b8';
                ctx.fillText(s.name, x1 + 2, startY - 2);
            }
            ctx.stroke();
        },

        // CAN Bus Diferansiyel Çizici (CAN_H, CAN_L, Vdiff)
        drawCanDifferentialChannels: function(ctx, segs, startX, startY, totalW, totalH, isLight) {
            const segW = totalW / segs.length;

            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 11px JetBrains Mono, monospace';
            ctx.fillText('CAN_H (3.5V)', 8, startY + 25);
            ctx.fillStyle = '#38bdf8';
            ctx.fillText('CAN_L (1.5V)', 8, startY + 80);
            ctx.fillStyle = '#10b981';
            ctx.fillText('V_diff (2.0V)', 8, startY + 140);

            // CAN_H & CAN_L
            ctx.lineWidth = 2;
            for (let i = 0; i < segs.length; i++) {
                const s = segs[i];
                const x1 = startX + i * segW;
                const x2 = x1 + segW;
                const isDominant = (s.val === 0);

                // CAN_H: Dominant 3.5V (üst), Recessive 2.5V (orta)
                const canHy = isDominant ? (startY + 15) : (startY + 40);
                ctx.strokeStyle = '#f59e0b';
                ctx.beginPath();
                ctx.moveTo(x1, canHy);
                ctx.lineTo(x2, canHy);
                ctx.stroke();

                // CAN_L: Dominant 1.5V (alt), Recessive 2.5V (orta)
                const canLy = isDominant ? (startY + 90) : (startY + 40);
                ctx.strokeStyle = '#38bdf8';
                ctx.beginPath();
                ctx.moveTo(x1, canLy);
                ctx.lineTo(x2, canLy);
                ctx.stroke();

                // V_diff
                const vDiffY = isDominant ? (startY + 130) : (startY + 160);
                ctx.strokeStyle = '#10b981';
                ctx.beginPath();
                ctx.moveTo(x1, vDiffY);
                ctx.lineTo(x2, vDiffY);
                ctx.stroke();

                // Decoder label
                ctx.fillStyle = isDominant ? '#10b981' : '#64748b';
                ctx.font = '500 8.5px JetBrains Mono, monospace';
                ctx.fillText(s.name, x1 + 1, startY + 5);
            }
        },

        // Alt Telemetri HUD Bilgi Kartı
        drawTelemetryHUD: function(ctx, x, y, w, items, isLight) {
            ctx.fillStyle = isLight ? 'rgba(255,255,255,0.92)' : 'rgba(15,23,42,0.88)';
            ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(56,189,248,0.25)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(x, y, w, 70, 8);
            ctx.fill();
            ctx.stroke();

            const colW = w / items.length;
            items.forEach((item, idx) => {
                const ix = x + idx * colW + 10;
                ctx.fillStyle = isLight ? '#64748b' : '#94a3b8';
                ctx.font = '500 10px Inter, sans-serif';
                ctx.fillText(item.label, ix, y + 24);

                ctx.fillStyle = isLight ? '#0f172a' : '#38bdf8';
                ctx.font = 'bold 12px JetBrains Mono, monospace';
                ctx.fillText(item.val, ix, y + 48);
            });
        }
    };

    window.ProtocolAnalyzerModule = ProtocolAnalyzerModule;
})(window);
