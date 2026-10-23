/**
 * EEM REHBER / DEVREM STUDIO - GÖRSEL SONLU DURUM MAKİNESİ (FSM) & VERILOG HDL ÜRETECİ
 * 
 * FPGA & Sayısal Tasarım:
 * - Moore & Mealy FSM Durum Diyagramı Çizici
 * - Canlı Adım Adım Durum Simülasyonu (Clock & Giriş Tetikleme)
 * - 2-Process Sentezlenebilir (Synthesizable) Verilog HDL Kod Üretimi
 * - Popüler EEM Mülakat Şablonları (1011 Dizi Detektörü, Trafik Işıkları, Otomat)
 */
(function(window) {
    'use strict';

    const FsmDesignerModule = {
        fsmType: 'moore', // 'moore' veya 'mealy'
        preset: 'seq_1011',

        states: [],
        transitions: [],
        activeStateId: 0,
        currentInput: 1,
        isRunning: false,
        clockIntervalId: null,

        init: function() {
            this.bindEvents();
            this.loadPreset('seq_1011');
            this.render();
            this.updatePlayButton();
        },

        updatePlayButton: function() {
            const btn = document.getElementById('btnFsmPlay');
            if (btn) {
                btn.innerHTML = this.isRunning ? '<i class="fas fa-pause"></i> <span>Durdur</span>' : '<i class="fas fa-play"></i> <span>Simülasyonu Başlat</span>';
                btn.classList.toggle('is-running', this.isRunning);
            }
        },

        togglePlay: function() {
            this.isRunning = !this.isRunning;
            this.updatePlayButton();
            if (this.isRunning) {
                if (this.clockIntervalId) clearInterval(this.clockIntervalId);
                this.clockIntervalId = setInterval(() => {
                    this.stepClock();
                }, 900);
            } else {
                if (this.clockIntervalId) {
                    clearInterval(this.clockIntervalId);
                    this.clockIntervalId = null;
                }
            }
        },

        bindEvents: function() {
            if (typeof document === 'undefined') return;

            const canvas = document.getElementById('fsmCanvas');
            if (canvas) {
                canvas.addEventListener('click', (e) => this.handleClick(e, canvas));
            }
        },

        handleClick: function(e, canvas) {
            const coords = window.getCanvasLogicalCoords ? window.getCanvasLogicalCoords(e, canvas) : { x: e.clientX, y: e.clientY };
            const x = coords.x;
            const y = coords.y;

            // Düğümlere tıklandı mı kontrol et
            for (let i = 0; i < this.states.length; i++) {
                const s = this.states[i];
                const dist = Math.hypot(x - s.x, y - s.y);
                if (dist <= 34) {
                    this.activeStateId = s.id;
                    this.generateVerilog();
                    this.render();
                    break;
                }
            }
        },

        setFsmType: function(type) {
            this.fsmType = type;
            const btnMoore = document.getElementById('btnFsmMoore');
            const btnMealy = document.getElementById('btnFsmMealy');
            if (btnMoore && btnMealy) {
                btnMoore.classList.toggle('active', type === 'moore');
                btnMealy.classList.toggle('active', type === 'mealy');
            }
            this.generateVerilog();
            this.render();
        },

        loadPreset: function(pName) {
            this.preset = pName;

            if (pName === 'seq_1011') {
                // '1011' Dizi Detektörü (Overlap İzinli)
                this.states = [
                    { id: 0, name: 'S0_IDLE', x: 100, y: 150, out: '0' },
                    { id: 1, name: 'S1_GOT1', x: 260, y: 150, out: '0' },
                    { id: 2, name: 'S2_GOT10', x: 420, y: 150, out: '0' },
                    { id: 3, name: 'S3_GOT101', x: 580, y: 150, out: '0' },
                    { id: 4, name: 'S4_DETECT', x: 580, y: 250, out: '1' }
                ];
                this.transitions = [
                    { from: 0, to: 0, in: '0', label: 'in=0' },
                    { from: 0, to: 1, in: '1', label: 'in=1' },
                    { from: 1, to: 2, in: '0', label: 'in=0' },
                    { from: 1, to: 1, in: '1', label: 'in=1' },
                    { from: 2, to: 0, in: '0', label: 'in=0' },
                    { from: 2, to: 3, in: '1', label: 'in=1' },
                    { from: 3, to: 2, in: '0', label: 'in=0' },
                    { from: 3, to: 4, in: '1', label: 'in=1' },
                    { from: 4, to: 2, in: '0', label: 'in=0' },
                    { from: 4, to: 1, in: '1', label: 'in=1' }
                ];
            } else if (pName === 'traffic_light') {
                // Trafik Işığı Kontrolcüsü
                this.states = [
                    { id: 0, name: 'RED', x: 140, y: 180, out: '3\'b100' },
                    { id: 1, name: 'RED_YELLOW', x: 300, y: 100, out: '3\'b110' },
                    { id: 2, name: 'GREEN', x: 480, y: 180, out: '3\'b001' },
                    { id: 3, name: 'YELLOW', x: 300, y: 260, out: '3\'b010' }
                ];
                this.transitions = [
                    { from: 0, to: 1, in: '1', label: 'timer_done' },
                    { from: 1, to: 2, in: '1', label: 'timer_done' },
                    { from: 2, to: 3, in: '1', label: 'timer_done' },
                    { from: 3, to: 0, in: '1', label: 'timer_done' }
                ];
            } else {
                // 3-Durumlu Otomat (Vending Machine: 1TL, 2TL, İçecek)
                this.states = [
                    { id: 0, name: 'S_0TL', x: 160, y: 180, out: '0' },
                    { id: 1, name: 'S_1TL', x: 360, y: 100, out: '0' },
                    { id: 2, name: 'S_2TL_DISPENSE', x: 520, y: 180, out: '1' }
                ];
                this.transitions = [
                    { from: 0, to: 1, in: '1', label: 'coin=1TL' },
                    { from: 1, to: 2, in: '1', label: 'coin=1TL' },
                    { from: 2, to: 0, in: '1', label: 'dispense_done' }
                ];
            }

            this.activeStateId = 0;

            document.querySelectorAll('.fsm-preset-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-preset') === pName);
            });

            this.generateVerilog();
            this.render();
        },

        stepClock: function(inVal) {
            if (inVal !== undefined) this.currentInput = inVal;

            // Mevcut durumdan geçerli geçişi bul
            const trans = this.transitions.find(t => t.from === this.activeStateId && t.in === String(this.currentInput));
            if (trans) {
                this.activeStateId = trans.to;
            }

            const activeSt = this.states.find(s => s.id === this.activeStateId);
            const elCurState = document.getElementById('fsmResCurrentState');
            const elCurOut = document.getElementById('fsmResOutput');

            if (elCurState && activeSt) elCurState.textContent = activeSt.name;
            if (elCurOut && activeSt) elCurOut.textContent = activeSt.out;

            if (window.GamificationModule && activeSt && activeSt.out === '1') {
                GamificationModule.unlockBadge('fsm_designer_master');
            }

            this.render();
        },

        resetFsm: function() {
            this.activeStateId = 0;
            const activeSt = this.states[0];
            const elCurState = document.getElementById('fsmResCurrentState');
            const elCurOut = document.getElementById('fsmResOutput');
            if (elCurState) elCurState.textContent = activeSt.name;
            if (elCurOut) elCurOut.textContent = activeSt.out;
            this.render();
        },

        generateVerilog: function() {
            const stateNames = this.states.map(s => s.name);
            const numStates = this.states.length;
            const width = Math.ceil(Math.log2(numStates)) || 1;

            let code = `// ═══════════════════════════════════════════════════════════\n`;
            code += `// Sentezlenebilir 2-Process ${this.fsmType.toUpperCase()} FSM (Devrem Studio)\n`;
            code += `// ═══════════════════════════════════════════════════════════\n`;
            code += `module fsm_controller (\n`;
            code += `    input  wire clk,\n`;
            code += `    input  wire rst_n,\n`;
            code += `    input  wire in_signal,\n`;
            code += `    output reg  out_signal\n`;
            code += `);\n\n`;

            code += `    // Durum Tanımları (Localparam Encoding)\n`;
            stateNames.forEach((sName, idx) => {
                code += `    localparam [${width - 1}:0] ${sName.padEnd(16)} = ${width}'d${idx};\n`;
            });

            code += `\n    reg [${width - 1}:0] current_state, next_state;\n\n`;

            code += `    // 1. Durum Kaydedicisi (Senkron Saat & Asenkron Reset)\n`;
            code += `    always @(posedge clk or negedge rst_n) begin\n`;
            code += `        if (!rst_n) begin\n`;
            code += `            current_state <= ${stateNames[0]};\n`;
            code += `        end else begin\n`;
            code += `            current_state <= next_state;\n`;
            code += `        end\n`;
            code += `    end\n\n`;

            code += `    // 2. Gelecek Durum Mantığı (Kombinasyonel)\n`;
            code += `    always @(*) begin\n`;
            code += `        next_state = current_state;\n`;
            code += `        case (current_state)\n`;

            this.states.forEach(st => {
                code += `            ${st.name}: begin\n`;
                const outgoing = this.transitions.filter(t => t.from === st.id);
                outgoing.forEach(tr => {
                    const toState = this.states.find(s => s.id === tr.to);
                    code += `                if (in_signal == 1'b${tr.in}) next_state = ${toState.name};\n`;
                });
                code += `            end\n`;
            });

            code += `            default: next_state = ${stateNames[0]};\n`;
            code += `        endcase\n`;
            code += `    end\n\n`;

            code += `    // 3. Çıkış Mantığı\n`;
            code += `    always @(*) begin\n`;
            code += `        case (current_state)\n`;
            this.states.forEach(st => {
                code += `            ${st.name.padEnd(16)}: out_signal = ${st.out};\n`;
            });
            code += `            default: out_signal = 1'b0;\n`;
            code += `        endcase\n`;
            code += `    end\n\n`;
            code += `endmodule\n`;

            const elCode = document.getElementById('fsmVerilogCode');
            if (elCode) elCode.textContent = code;
        },

        copyVerilog: function() {
            const elCode = document.getElementById('fsmVerilogCode');
            if (elCode && navigator.clipboard) {
                navigator.clipboard.writeText(elCode.textContent).then(() => {
                    alert('Verilog FSM Kodu panoya kopyalandı!');
                });
            }
        },

        render: function() {
            const canvas = document.getElementById('fsmCanvas');
            if (!canvas) return;
            const hi = window.setupHiDpiCanvas ? window.setupHiDpiCanvas(canvas) : null;
            const ctx = hi ? hi.ctx : canvas.getContext('2d');
            const w = hi ? hi.w : canvas.width;
            const h = hi ? hi.h : canvas.height;

            ctx.fillStyle = '#060a14';
            ctx.fillRect(0, 0, w, h);

            // İnce Şebeke Kılavuz Noktaları (Teknik Şematik Çizim Hissi)
            ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
            for (let x = 30; x < w; x += 40) {
                for (let y = 30; y < h; y += 40) {
                    ctx.fillRect(x, y, 1.5, 1.5);
                }
            }

            // Geçiş Oklarını Çiz (Bezier & Ok Başları)
            this.transitions.forEach(tr => {
                const fromSt = this.states.find(s => s.id === tr.from);
                const toSt = this.states.find(s => s.id === tr.to);
                if (!fromSt || !toSt) return;

                ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
                ctx.lineWidth = 1.8;

                if (tr.from === tr.to) {
                    // Kendi kendine dönen döngü
                    ctx.beginPath();
                    ctx.arc(fromSt.x, fromSt.y - 36, 18, 0, 2 * Math.PI);
                    ctx.stroke();

                    // Ok ucu
                    ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
                    ctx.beginPath();
                    ctx.moveTo(fromSt.x + 18, fromSt.y - 36);
                    ctx.lineTo(fromSt.x + 14, fromSt.y - 42);
                    ctx.lineTo(fromSt.x + 22, fromSt.y - 42);
                    ctx.closePath();
                    ctx.fill();

                    // Etiket
                    ctx.fillStyle = '#38bdf8';
                    ctx.font = '600 11px "JetBrains Mono", monospace';
                    ctx.fillText(tr.label, fromSt.x - 16, fromSt.y - 60);
                } else {
                    // İki durum arası yönlü ok
                    const dx = toSt.x - fromSt.x;
                    const dy = toSt.y - fromSt.y;
                    const angle = Math.atan2(dy, dx);
                    const dist = Math.hypot(dx, dy);

                    // Çember sınırları
                    const r = 30;
                    const startX = fromSt.x + r * Math.cos(angle);
                    const startY = fromSt.y + r * Math.sin(angle);
                    const endX = toSt.x - r * Math.cos(angle);
                    const endY = toSt.y - r * Math.sin(angle);

                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();

                    // Ok Ucu (Arrowhead)
                    const arrowLen = 10;
                    ctx.fillStyle = '#94a3b8';
                    ctx.beginPath();
                    ctx.moveTo(endX, endY);
                    ctx.lineTo(endX - arrowLen * Math.cos(angle - Math.PI / 7), endY - arrowLen * Math.sin(angle - Math.PI / 7));
                    ctx.lineTo(endX - arrowLen * Math.cos(angle + Math.PI / 7), endY - arrowLen * Math.sin(angle + Math.PI / 7));
                    ctx.closePath();
                    ctx.fill();

                    // Etiket Rozeti
                    const midX = (startX + endX) / 2;
                    const midY = (startY + endY) / 2;

                    ctx.save();
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
                    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
                    ctx.lineWidth = 1;
                    const lblW = 44;
                    const lblH = 18;
                    if (ctx.roundRect) ctx.roundRect(midX - lblW / 2, midY - lblH / 2 - 10, lblW, lblH, 4);
                    else ctx.rect(midX - lblW / 2, midY - lblH / 2 - 10, lblW, lblH);
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = '#38bdf8';
                    ctx.font = '600 10.5px "JetBrains Mono", monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(tr.label, midX, midY - 10);
                    ctx.restore();
                }
            });

            // Durum Düğümlerini Çiz (States)
            this.states.forEach(st => {
                const isActive = st.id === this.activeStateId;

                // Dış Çember ve Glow
                ctx.save();
                ctx.beginPath();
                ctx.arc(st.x, st.y, 30, 0, 2 * Math.PI);

                if (isActive) {
                    ctx.shadowColor = 'rgba(56, 189, 248, 0.7)';
                    ctx.shadowBlur = 18;
                    ctx.fillStyle = 'rgba(14, 165, 233, 0.22)';
                    ctx.fill();
                    ctx.strokeStyle = '#38bdf8';
                    ctx.lineWidth = 3;
                } else {
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
                    ctx.lineWidth = 1.6;
                }
                ctx.stroke();
                ctx.restore();

                // Durum İsmi
                ctx.fillStyle = isActive ? '#ffffff' : '#f1f5f9';
                ctx.font = '700 11px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(st.name, st.x, st.y - 2);

                // Çıktı / Değer Rozeti
                ctx.fillStyle = isActive ? '#38bdf8' : '#94a3b8';
                ctx.font = '600 10px "JetBrains Mono", monospace';
                ctx.fillText('out=' + st.out, st.x, st.y + 14);
            });
            ctx.textAlign = 'left';

            // Üst Bilgi Başlığı (Inter)
            ctx.font = '600 11.5px "Inter", sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('💡 Durumlara tıklayarak seçebilir veya "Saat Darbesi (Clock)" butonuyla adım adım geçişleri izleyebilirsiniz.', 14, 22);
        }
    };

    window.FsmDesignerModule = FsmDesignerModule;
})(window);
