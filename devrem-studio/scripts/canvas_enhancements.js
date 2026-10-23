/**
 * EEM REHBER / DEVREM STUDIO - MASTER KANVAS MOTORU & ETKİLEŞİM GELİŞTİRMELERİ
 * - HiDPI Retina Ekran Desteği (window.devicePixelRatio)
 * - Kristal Netliğinde Tipografi & Vektörel Çizim (Inter & JetBrains Mono)
 * - Ultra-Net HUD Telemetri Tooltip & Kılcal Osiloskop Şebekeleri
 * - Dokunmatik Kaydırma Kilidi (Touch Scroll Guard) & Tam Ekran Laboratuvar Modu
 */
(function(window) {
    'use strict';

    /**
     * ══════════════════════════════════════════════════════════════════════════
     * MERKEZİ SİMÜLASYON YÖNETİCİSİ (SIMULATION LIFECYCLE MANAGER)
     * Başka bir simülasyon açıldığında veya araç/sekme değiştirildiğinde
     * önceki simülasyonu anında durdurur; arka planda boşa CPU/GPU harcanmasını önler.
     * ══════════════════════════════════════════════════════════════════════════
     */
    const SimManager = {
        activeSimId: null,
        pausedByVisibility: false,
        registry: {},

        // Yeni simülatör motorunu kaydet
        register: function(id, handlers) {
            // handlers: { stop: Function, isRunning: Function, resume?: Function }
            this.registry[id] = handlers;
        },

        // Belirtilen (exceptId) dışındaki veya TÜM aktif simülasyonları anında durdur
        stopAll: function(exceptId = null) {
            Object.keys(this.registry).forEach(id => {
                if (id !== exceptId) {
                    try {
                        const sim = this.registry[id];
                        if (sim && typeof sim.stop === 'function') {
                            sim.stop();
                        }
                    } catch (err) {
                        console.warn('[SimManager] Simülasyon durdurulurken hata (' + id + '):', err);
                    }
                }
            });

            // index.html içindeki yardımcı simülasyon ve ses motorlarını da durdur
            if (exceptId !== 'zigzag' && typeof window.stopZigzagSimulation === 'function') {
                window.stopZigzagSimulation();
            }
            if (exceptId !== 'plotter3d' && typeof window.stopPlotter3DAutoRotate === 'function') {
                window.stopPlotter3DAutoRotate();
            }
            if (exceptId !== 'signal_gen' && typeof window.stopSignalGenAudio === 'function') {
                window.stopSignalGenAudio();
            }
            if (typeof window.cancelAllTransientSimFrames === 'function') {
                window.cancelAllTransientSimFrames();
            }

            if (exceptId) {
                this.activeSimId = exceptId;
            } else {
                this.activeSimId = null;
            }
        },

        // Bir simülasyon başlatıldığında diğer tüm simülasyonları otomatik olarak kapatır
        notifyStarted: function(id) {
            this.stopAll(id);
            this.activeSimId = id;
            this.pausedByVisibility = false;
        },

        // Bir simülasyon kullanıcı tarafından veya doğal olarak durduğunda
        notifyStopped: function(id) {
            if (this.activeSimId === id) {
                this.activeSimId = null;
            }
        },

        // Sekme arka plana atıldığında (minimize/arka plan) tüm canlı döngüleri dondurur
        pauseAll: function() {
            if (this.activeSimId) {
                this.pausedByVisibility = this.activeSimId;
                this.stopAll();
            }
        },

        // Sekme tekrar öne geldiğinde gerekiyorsa son aktif simülasyonu uyandırır
        resumeActive: function() {
            if (this.pausedByVisibility && this.registry[this.pausedByVisibility]) {
                const sim = this.registry[this.pausedByVisibility];
                if (sim && typeof sim.resume === 'function') {
                    sim.resume();
                }
                this.pausedByVisibility = false;
            }
        }
    };

    // Sekme görünürlüğü değiştiğinde arka planda boşa dönmeyi engelle
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                SimManager.pauseAll();
            }
        });
    }

    window.SimManager = SimManager;

    /**
     * HiDPI Retina Ekran Canvas Hazırlayıcı (GPU Donanım Hızlandırma Destekli)
     * - DPR'yi maksimum 2.0 ile sınırlandırarak aşırı mobil GPU piksel yükünü engeller
     * - desynchronized ve opaque buffer optimizasyonlarını devreye alır
     * - CSS transform: translateZ(0) ile bağımsız GPU Compositor Layer oluşturur
     */
    window.setupHiDpiCanvas = function(canvas) {
        if (!canvas) return null;
        // Donanım hızlandırma için DPR tavanı (2x Retina kristal netliğindedir, 3x-4x GPU'yu boğar)
        const rawDpr = window.devicePixelRatio || 1;
        const dpr = Math.min(2.0, Math.max(1.0, rawDpr));
        const rect = canvas.getBoundingClientRect();
        
        // CSS genişlik ve yüksekliğini al (Gizli/arka plan sekmelerde 0px çökmesini engellemek için minimum koruma)
        const displayWidth = Math.max(300, (rect.width > 20 ? rect.width : (canvas.clientWidth > 20 ? canvas.clientWidth : (canvas.width > 20 ? canvas.width : 760))));
        const displayHeight = Math.max(200, (rect.height > 20 ? rect.height : (canvas.clientHeight > 20 ? canvas.clientHeight : (canvas.height > 20 ? canvas.height : 340))));
        
        const targetW = Math.round(displayWidth * dpr);
        const targetH = Math.round(displayHeight * dpr);
        
        if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
        }

        // GPU Donanım Hızlandırma için layer promosyonu
        if (!canvas.classList.contains('hardware-accelerated')) {
            canvas.classList.add('hardware-accelerated');
        }
        if (canvas.style.transform !== 'translateZ(0px)' && canvas.style.transform !== 'translateZ(0)') {
            canvas.style.transform = 'translateZ(0)';
            canvas.style.willChange = 'transform';
        }
        
        // Düşük gecikmeli desynchronized 2D çizim bağlamı
        const isTransparent = canvas.getAttribute('data-transparent') === 'true';
        let ctx = null;
        try {
            ctx = canvas.getContext('2d', {
                alpha: isTransparent,
                desynchronized: true
            });
        } catch (e) {
            ctx = canvas.getContext('2d');
        }
        if (!ctx) ctx = canvas.getContext('2d');

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        
        // Kristal netlikte vektörel çizim
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        return { ctx, w: displayWidth, h: displayHeight, dpr };
    };

    /**
     * Mouse/Dokunma koordinatlarını mantıksal piksel koordinatlarına dönüştürür.
     */
    window.getCanvasLogicalCoords = function(e, canvas) {
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: Math.max(0, Math.min(rect.width, e.clientX - rect.left)),
            y: Math.max(0, Math.min(rect.height, e.clientY - rect.top))
        };
    };

    /**
     * Laboratuvar Cihazı Kalitesinde HUD Hover Telemetri Tooltip'i
     */
    window.renderCanvasHoverTooltip = function(ctx, w, h, x, y, lines, accentColor = '#38bdf8') {
        if (!lines || lines.length === 0) return;
        ctx.save();
        
        let maxTextW = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const text = typeof line === 'string' ? line : line.text;
            ctx.font = (typeof line === 'object' && line.bold ? '700 11.5px' : '500 11.5px') + ' "JetBrains Mono", Inter, monospace';
            const tw = ctx.measureText(text).width;
            if (tw > maxTextW) maxTextW = tw;
        }
        
        const tipPadX = 14;
        const tipPadY = 10;
        const lineHeight = 20;
        const boxW = Math.max(170, maxTextW + tipPadX * 2 + 12);
        const boxH = lines.length * lineHeight + tipPadY * 2;
        
        let tipX = x + 16;
        if (tipX + boxW > w - 12) {
            tipX = x - boxW - 16;
        }
        if (tipX < 10) tipX = 10;
        
        let tipY = y - boxH / 2;
        if (tipY < 10) tipY = 10;
        if (tipY + boxH > h - 10) tipY = h - boxH - 10;
        
        // Dış derinlik gölgesi
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 6;
        
        // Camgöbeği/Obsidian arka plan
        ctx.fillStyle = 'rgba(6, 11, 22, 0.96)';
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(tipX, tipY, boxW, boxH, 8);
        } else {
            ctx.rect(tipX, tipY, boxW, boxH);
        }
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.stroke();
        
        // Sol neon vurgu şeridi
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(tipX + 4, tipY + 5, 3.5, boxH - 10, 2);
        } else {
            ctx.fillRect(tipX + 4, tipY + 5, 3.5, boxH - 10);
        }
        ctx.fill();
        
        // Metin satırlarını yaz
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const text = typeof line === 'string' ? line : line.text;
            const color = typeof line === 'string' ? '#f8fafc' : (line.color || '#f8fafc');
            const isBold = typeof line === 'object' && line.bold;
            ctx.font = (isBold ? '700 11.5px' : '500 11.5px') + ' "JetBrains Mono", Inter, monospace';
            ctx.fillStyle = color;
            ctx.fillText(text, tipX + tipPadX + 8, tipY + tipPadY + i * lineHeight + lineHeight / 2);
        }
        
        ctx.restore();
    };

    /**
     * Hassas Osiloskop ve Laboratuvar Izgarası Çizici
     */
    window.drawOscilloscopeGrid = function(ctx, w, h, opts = {}) {
        const gridX = opts.gridX || 10;
        const gridY = opts.gridY || 6;
        const strokeColor = opts.strokeColor || 'rgba(56, 189, 248, 0.08)';
        const crosshairColor = opts.crosshairColor || 'rgba(255, 255, 255, 0.18)';
        
        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1;
        
        // Dikey çizgiler
        for (let i = 1; i < gridX; i++) {
            const x = Math.round(i * (w / gridX)) + 0.5;
            ctx.beginPath();
            ctx.moveTo(x, 0); ctx.lineTo(x, h);
            ctx.stroke();
        }
        // Yatay çizgiler
        for (let j = 1; j < gridY; j++) {
            const y = Math.round(j * (h / gridY)) + 0.5;
            ctx.beginPath();
            ctx.moveTo(0, y); ctx.lineTo(w, y);
            ctx.stroke();
        }
        
        // Merkez ekseni (varsa)
        if (opts.showCenter) {
            ctx.strokeStyle = crosshairColor;
            ctx.setLineDash([4, 4]);
            const midY = Math.round(h * (opts.centerRatio || 0.5)) + 0.5;
            ctx.beginPath();
            ctx.moveTo(0, midY); ctx.lineTo(w, midY);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        ctx.restore();
    };

    const CanvasEnhancer = {
        fullscreenActive: false,
        activeCanvasWrap: null,

        init: function() {
            this.bindAllCanvases();
            this.bindResizeObserver();
        },

        bindAllCanvases: function() {
            if (typeof document === 'undefined') return;

            const targetCanvases = [
                'smithChartCanvas', 'opampScopeCanvas', 'filterBodeCanvas',
                'phasorCanvas', 'threePhaseCanvas', 'stepResponseCanvas',
                'signalGenCanvas', 'dcdcCanvas', 'smpsCanvas', 'dcMotorCanvas',
                'transformerCanvas', 'uStripCanvas', 'spwmScopeCanvas',
                'fourierScopeCanvas', 'emWavesCanvas', 'pidScopeCanvas', 'logicScopeCanvas',
                'rectifierScopeCanvas', 'acControllerCanvas', 'convLabCanvas', 'fsmCanvas',
                'circuitAnalysis1Canvas', 'circuitAnalysis2Canvas',
                'transCoreCanvas', 'transScopeCanvas',
                'protocolScopeCanvas', 'diodeScopeCanvas', 'dspZplaneCanvas', 'solarMpptCanvas'
            ];

            targetCanvases.forEach(id => {
                const canvas = document.getElementById(id);
                if (canvas && !canvas.parentElement.querySelector('.canvas-actions-overlay')) {
                    this.injectOverlay(canvas);
                }
            });
        },

        bindResizeObserver: function() {
            if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
            let resizeTimer = null;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    this.triggerActiveRerenders();
                }, 150);
            });
        },

        triggerActiveRerenders: function() {
            if (window.ProtocolAnalyzerModule && typeof window.ProtocolAnalyzerModule.render === 'function') window.ProtocolAnalyzerModule.render();
            if (window.DiodeLabModule && typeof window.DiodeLabModule.render === 'function') window.DiodeLabModule.render();
            if (window.DspZplaneModule && typeof window.DspZplaneModule.render === 'function') window.DspZplaneModule.render();
            if (window.SolarMpptModule && typeof window.SolarMpptModule.render === 'function') window.SolarMpptModule.render();
            if (window.CircuitAnalysis1Module && typeof window.CircuitAnalysis1Module.render === 'function') window.CircuitAnalysis1Module.render();
            if (window.CircuitAnalysis2Module && typeof window.CircuitAnalysis2Module.render === 'function') window.CircuitAnalysis2Module.render();
            if (window.TransformerLabModule && typeof window.TransformerLabModule.render === 'function') window.TransformerLabModule.render();
            if (window.PidSimModule && typeof window.PidSimModule.render === 'function') window.PidSimModule.render();
            if (window.SpwmModule && typeof window.SpwmModule.render === 'function') window.SpwmModule.render();
            if (window.FourierModule && typeof window.FourierModule.render === 'function') window.FourierModule.render();
            if (window.ConvolutionLabModule && typeof window.ConvolutionLabModule.render === 'function') window.ConvolutionLabModule.render();
            if (window.RectifierModule && typeof window.RectifierModule.render === 'function') window.RectifierModule.render();
            if (window.AcControllerModule && typeof window.AcControllerModule.render === 'function') window.AcControllerModule.render();
            if (window.LogicTimingModule && typeof window.LogicTimingModule.render === 'function') window.LogicTimingModule.render();
            if (window.FsmDesignerModule && typeof window.FsmDesignerModule.render === 'function') window.FsmDesignerModule.render();
            if (window.EmWavesModule && typeof window.EmWavesModule.render === 'function') window.EmWavesModule.render();
            if (typeof window.drawTransformerCanvas === 'function') window.drawTransformerCanvas(null, 1);
        },

        injectOverlay: function(canvas) {
            const parent = canvas.parentElement;
            if (!parent) return;

            parent.style.position = 'relative';

            const overlay = document.createElement('div');
            overlay.className = 'canvas-actions-overlay';
            overlay.innerHTML = `
                <button class="canvas-btn-action btn-touch-lock" onclick="CanvasEnhancer.toggleTouchLock(this, '${canvas.id}')" title="Mobilde parmakla kaydırma / çizim kilidi">
                    <i class="fas fa-lock-open"></i> <span class="btn-txt">Dokunmatik Kilit</span>
                </button>
                <button class="canvas-btn-action btn-fullscreen" onclick="CanvasEnhancer.toggleFullscreen('${canvas.id}')" title="Kanvası tam ekranda aç">
                    <i class="fas fa-expand"></i> <span class="btn-txt">Tam Ekran</span>
                </button>
            `;
            parent.appendChild(overlay);

            canvas.style.touchAction = 'pan-y';
        },

        toggleTouchLock: function(btn, canvasId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            const isLocked = canvas.classList.toggle('touch-locked');
            if (isLocked) {
                canvas.style.touchAction = 'none';
                btn.classList.add('active');
                btn.innerHTML = '<i class="fas fa-lock"></i> <span class="btn-txt">Kilitli (Çizim Aktif)</span>';
            } else {
                canvas.style.touchAction = 'pan-y';
                btn.classList.remove('active');
                btn.innerHTML = '<i class="fas fa-lock-open"></i> <span class="btn-txt">Kaydırma Serbest</span>';
            }
        },

        toggleFullscreen: function(canvasId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const parentCard = canvas.closest('.calc-card') || canvas.parentElement;

            if (!this.fullscreenActive) {
                parentCard.classList.add('canvas-fullscreen-modal');
                this.fullscreenActive = true;
                this.activeCanvasWrap = parentCard;

                let closeBtn = parentCard.querySelector('.canvas-fs-close-btn');
                if (!closeBtn) {
                    closeBtn = document.createElement('button');
                    closeBtn.className = 'canvas-fs-close-btn';
                    closeBtn.innerHTML = '<i class="fas fa-compress"></i> Tam Ekrandan Çık (ESC)';
                    closeBtn.onclick = () => CanvasEnhancer.exitFullscreen();
                    parentCard.appendChild(closeBtn);
                }
                closeBtn.style.display = 'inline-flex';
                document.body.style.overflow = 'hidden';

                setTimeout(() => {
                    this.triggerActiveRerenders();
                }, 60);
            } else {
                this.exitFullscreen();
            }
        },

        exitFullscreen: function() {
            if (this.activeCanvasWrap) {
                this.activeCanvasWrap.classList.remove('canvas-fullscreen-modal');
                const closeBtn = this.activeCanvasWrap.querySelector('.canvas-fs-close-btn');
                if (closeBtn) closeBtn.style.display = 'none';
            }
            this.fullscreenActive = false;
            this.activeCanvasWrap = null;
            document.body.style.overflow = '';

            setTimeout(() => {
                this.triggerActiveRerenders();
            }, 60);
        }
    };

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && CanvasEnhancer.fullscreenActive) {
                CanvasEnhancer.exitFullscreen();
            }
        });
        // DOM hazır olduğunda başlat
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => CanvasEnhancer.init());
        } else {
            CanvasEnhancer.init();
        }
    }

    window.CanvasEnhancer = CanvasEnhancer;

})(window);
