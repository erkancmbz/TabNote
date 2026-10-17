/**
 * TabNote Studio — Kalem Basınç Hassasiyetli Çizim, Parmakla Kaydırma, Otomatik Şekil, Kement ve Sesli Not Motoru
 */

import { renderPaperBackground } from './templates.js';

export const PAGE_WIDTH = 900;
export const PAGE_HEIGHT = 1240;

export class CanvasEngine {
  constructor({
    viewportEl,
    pageWrapperEl,
    mainCanvas,
    liveCanvas,
    overlayLayer,
    selectionToolbarEl,
    onChange,
    onPenStateChange,
    onStatusUpdate,
    onLineVoiceTrigger,
    onLineVoiceStop,
    onLineVoiceCancel
  }) {
    this.viewportEl = viewportEl;
    this.pageWrapperEl = pageWrapperEl;
    this.mainCanvas = mainCanvas;
    this.liveCanvas = liveCanvas;
    this.overlayLayer = overlayLayer;
    this.selectionToolbarEl = selectionToolbarEl;
    this.onChange = onChange || (() => {});
    this.onPenStateChange = onPenStateChange || (() => {});
    this.onStatusUpdate = onStatusUpdate || (() => {});
    this.onLineVoiceTrigger = onLineVoiceTrigger || (() => {});
    this.onLineVoiceStop = onLineVoiceStop || (() => {});
    this.onLineVoiceCancel = onLineVoiceCancel || (() => {});

    // Satır bazlı ses kaydı durumu
    this.lastActiveLineY = 116; // Son yazı yazılan satırın Y koordinatı
    this.activeRecordingLineY = null; // Şu an kayıt yapılan satırın Y koordinatı
    this.activeRecordingTargetX = 94;
    this.activeRecordingTimeText = '00:00';

    this.mainCtx = this.mainCanvas.getContext('2d');
    // desynchronized: kalem çizgisini ekrana tarayıcı kompozisyonunu beklemeden gönderir (düşük gecikme)
    this.liveCtx = this.liveCanvas.getContext('2d', { desynchronized: true });

    // Aktif sayfa verisi
    this.page = null;
    this.bgImageCache = new Map();

    // Kalem ve Parmak Durumu
    this.penActive = true; // true: Kalem Aktif, false: Kalem Aktif Değil (Kaydırma/Okuma Modu)
    this.fingerScrollMode = true; // true: Parmak dokunuşu (touch) sayfayı kaydırır, kalem (pen) çizer

    // Araç durumu
    this.tool = 'fountain'; // fountain | ballpoint | pencil | highlighter | eraser | shape | lasso | text | voice | pan | laser
    this.eraserMode = 'stroke'; // 'stroke' | 'partial'
    this.shapeType = 'rectangle'; // line | arrow | rectangle | ellipse | triangle | axes
    this.shapeFill = false;
    this.color = '#1E293B';
    this.strokeSize = 4;
    this.opacity = 1;
    this.pressureEnabled = true;
    this.autoShapeHold = true;

    // Görünüm / Zoom & Pan
    this.zoom = 1;
    this.isPanning = false;
    this.panStart = { x: 0, y: 0, scrollLeft: 0, scrollTop: 0 };
    this.activePointers = new Map();
    this.initialPinchDist = null;
    this.initialPinchZoom = 1;
    this.initialPinchMid = null;

    // Çizim durumu
    this.isDrawing = false;
    this.activePointerId = null;
    this.currentPoints = [];
    this.holdTimer = null;
    this.snappedShapePreview = null;

    // Lazer izleri
    this.laserTrails = [];
    this.laserAnimFrame = null;

    // Lasso seçimi durumu
    this.lassoPolygon = [];
    this.selection = null;
    this.selectionDragMode = null;
    this.selectionDragStart = null;

    // Undo / Redo yığınları (sayfa bazlı)
    this.undoStacks = new Map();
    this.redoStacks = new Map();

    this.initCanvases();
    this.bindEvents();
  }

  /**
   * Sayfadaki satır Y koordinatlarını döndürür (şablona göre hizalı)
   */
  getPageLineRows() {
    const templateId = this.page?.template || 'ruled';
    const headerMargin = 84;
    const step = templateId === 'ruled-wide' ? 46 : templateId === 'grid' ? 28 : 32;
    const rows = [];
    let idx = 1;
    for (let y = headerMargin + step; y < PAGE_HEIGHT - 28; y += step) {
      rows.push({ index: idx++, lineY: Math.floor(y), step });
    }
    return rows;
  }

  /**
   * Verilen Y koordinatını en yakın satır çizgisine (lineY) hizalar
   */
  snapYToLine(rawY) {
    const rows = this.getPageLineRows();
    if (rows.length === 0) return Math.round(rawY);
    let best = rows[0].lineY;
    let bestDiff = Math.abs(rawY - best);
    for (const r of rows) {
      const diff = Math.abs(rawY - r.lineY);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = r.lineY;
      }
    }
    return best;
  }

  initCanvases() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.dpr = dpr;

    [this.mainCanvas, this.liveCanvas].forEach((canvas) => {
      canvas.width = PAGE_WIDTH * dpr;
      canvas.height = PAGE_HEIGHT * dpr;
      canvas.style.width = `${PAGE_WIDTH}px`;
      canvas.style.height = `${PAGE_HEIGHT}px`;
    });

    this.mainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.liveCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Kağıt arka planını önbelleğe almak için offscreen canvas (sıfır gecikmeli çizim için)
    this.paperBgCanvas = document.createElement('canvas');
    this.paperBgCanvas.width = PAGE_WIDTH * dpr;
    this.paperBgCanvas.height = PAGE_HEIGHT * dpr;
    this.paperBgCtx = this.paperBgCanvas.getContext('2d');
    this.paperBgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.paperBgCacheKey = null;

    this.activeCanvasRect = null;
    this.lastPressureHudTime = 0;
  }

  loadPage(pageObj) {
    if (!pageObj) return;
    this.clearSelection();
    this.page = pageObj;
    if (!this.page.strokes) this.page.strokes = [];
    if (!this.page.shapes) this.page.shapes = [];
    if (!this.page.textBoxes) this.page.textBoxes = [];
    if (!this.page.images) this.page.images = [];
    if (!this.page.attachments) this.page.attachments = [];
    if (!this.page.audioNotes) this.page.audioNotes = [];

    if (!this.undoStacks.has(pageObj.id)) {
      this.undoStacks.set(pageObj.id, []);
      this.redoStacks.set(pageObj.id, []);
    }

    if (pageObj.bgImageData) {
      if (!this.bgImageCache.has(pageObj.id)) {
        const img = new Image();
        img.onload = () => {
          this.bgImageCache.set(pageObj.id, img);
          this.paperBgCacheKey = null;
          if (this.page?.id === pageObj.id) {
            this.renderMain();
          }
        };
        img.src = pageObj.bgImageData;
      }
    } else {
      this.bgImageCache.delete(pageObj.id);
    }

    this.paperBgCacheKey = null;
    this.renderMain();
    this.renderLive();
    this.renderDOMOverlays();
  }

  setPageBackgroundImage(dataUrl) {
    if (!this.page) return;
    const targetPage = this.page;
    this.pushUndoSnapshot();
    targetPage.bgImageData = dataUrl;
    const img = new Image();
    img.onload = () => {
      this.bgImageCache.set(targetPage.id, img);
      this.paperBgCacheKey = null;
      this.renderMain();
      this.onChange();
    };
    img.src = dataUrl;
  }

  /**
   * Hızlı Yapısal Anlık Görüntü (Base64 PDF/Görsel/Ses verilerini JSON.stringify ile kopyalamadan referansla tutar)
   */
  createPageSnapshot(fastAppendOnly = false) {
    if (!this.page) return null;
    return {
      strokes: fastAppendOnly
        ? [...(this.page.strokes || [])]
        : (this.page.strokes || []).map((st) => ({
            ...st,
            points: st.points.map((pt) => ({ x: pt.x, y: pt.y, p: pt.p }))
          })),
      shapes: fastAppendOnly
        ? [...(this.page.shapes || [])]
        : (this.page.shapes || []).map((sh) => ({ ...sh })),
      textBoxes: (this.page.textBoxes || []).map((tb) => ({ ...tb })),
      images: (this.page.images || []).map((im) => ({ ...im })),
      attachments: (this.page.attachments || []).map((at) => ({ ...at })),
      audioNotes: (this.page.audioNotes || []).map((au) => ({ ...au })),
      template: this.page.template,
      paperColor: this.page.paperColor,
      bgImageData: this.page.bgImageData
    };
  }

  applyPageSnapshot(snap) {
    if (!this.page || !snap) return;
    this.page.strokes = (snap.strokes || []).map((st) => ({
      ...st,
      points: st.points.map((pt) => ({ x: pt.x, y: pt.y, p: pt.p }))
    }));
    this.page.shapes = (snap.shapes || []).map((sh) => ({ ...sh }));
    this.page.textBoxes = (snap.textBoxes || []).map((tb) => ({ ...tb }));
    this.page.images = (snap.images || []).map((im) => ({ ...im }));
    this.page.attachments = (snap.attachments || []).map((at) => ({ ...at }));
    this.page.audioNotes = (snap.audioNotes || []).map((au) => ({ ...au }));
    this.page.template = snap.template;
    this.page.paperColor = snap.paperColor;
    this.page.bgImageData = snap.bgImageData;
    this.paperBgCacheKey = null;
  }

  pushUndoSnapshot(fastAppendOnly = false) {
    if (!this.page) return;
    const stack = this.undoStacks.get(this.page.id) || [];
    const snapshot = this.createPageSnapshot(fastAppendOnly);
    if (!fastAppendOnly) {
      this.page.strokes = (this.page.strokes || []).map((st) => ({
        ...st,
        points: st.points.map((pt) => ({ x: pt.x, y: pt.y, p: pt.p }))
      }));
      this.page.shapes = (this.page.shapes || []).map((sh) => ({ ...sh }));
    }
    if (snapshot) {
      stack.push(snapshot);
      if (stack.length > 35) stack.shift();
      this.undoStacks.set(this.page.id, stack);
      this.redoStacks.set(this.page.id, []);
    }
  }

  undo() {
    if (!this.page) return false;
    const undoStack = this.undoStacks.get(this.page.id) || [];
    if (undoStack.length === 0) return false;

    const redoStack = this.redoStacks.get(this.page.id) || [];
    const currentSnap = this.createPageSnapshot();
    if (currentSnap) redoStack.push(currentSnap);
    this.redoStacks.set(this.page.id, redoStack);

    const prev = undoStack.pop();
    this.applyPageSnapshot(prev);
    this.loadPage(this.page);
    this.onChange();
    return true;
  }

  redo() {
    if (!this.page) return false;
    const redoStack = this.redoStacks.get(this.page.id) || [];
    if (redoStack.length === 0) return false;

    const undoStack = this.undoStacks.get(this.page.id) || [];
    const currentSnap = this.createPageSnapshot();
    if (currentSnap) undoStack.push(currentSnap);
    this.undoStacks.set(this.page.id, undoStack);

    const next = redoStack.pop();
    this.applyPageSnapshot(next);
    this.loadPage(this.page);
    this.onChange();
    return true;
  }

  canUndo() {
    if (!this.page) return false;
    return (this.undoStacks.get(this.page.id) || []).length > 0;
  }

  canRedo() {
    if (!this.page) return false;
    return (this.redoStacks.get(this.page.id) || []).length > 0;
  }

  setZoom(newZoom) {
    this.zoom = Math.max(0.45, Math.min(3.0, Number(newZoom.toFixed(2))));
    this.pageWrapperEl.style.transform = `scale(${this.zoom})`;
    this.pageWrapperEl.style.transformOrigin = 'top center';
    this.pageWrapperEl.style.marginBottom = `${Math.max(420, (this.zoom - 1) * PAGE_HEIGHT + 420)}px`;
    this.activeCanvasRect = null;
    this.updateSelectionToolbarPosition();
    this.onStatusUpdate({ zoom: Math.round(this.zoom * 100) });
  }

  scrollByOffset(dx, dy, smooth = false) {
    if (!this.viewportEl) return;
    this.activeCanvasRect = null;
    if (smooth && typeof this.viewportEl.scrollBy === 'function') {
      this.viewportEl.scrollBy({ left: dx, top: dy, behavior: 'smooth' });
    } else {
      this.viewportEl.scrollLeft += dx;
      this.viewportEl.scrollTop += dy;
    }
  }

  getCanvasCoords(clientX, clientY) {
    const rect =
      this.isDrawing && this.activeCanvasRect
        ? this.activeCanvasRect
        : this.liveCanvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (PAGE_WIDTH / rect.width);
    const y = (clientY - rect.top) * (PAGE_HEIGHT / rect.height);
    return {
      x: Math.max(0, Math.min(PAGE_WIDTH, x)),
      y: Math.max(0, Math.min(PAGE_HEIGHT, y))
    };
  }

  bindEvents() {
    const surface = this.liveCanvas;
    this.isOverlayDragging = false;

    surface.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    surface.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    surface.addEventListener('pointerup', (e) => this.handlePointerUp(e));
    surface.addEventListener('pointercancel', (e) => this.handlePointerUp(e));

    this.viewportEl.addEventListener('pointerdown', (e) => {
      if (this.isOverlayDragging || this.selectionDragMode || this.isDrawing) return;
      if (
        e.target === this.viewportEl ||
        e.target === this.pageWrapperEl ||
        e.target === this.paperContainerEl
      ) {
        this.isPanning = true;
        this.activePointerId = e.pointerId;
        this.panStart = {
          x: e.clientX,
          y: e.clientY,
          scrollLeft: this.viewportEl.scrollLeft,
          scrollTop: this.viewportEl.scrollTop
        };
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (this.isOverlayDragging || this.selectionDragMode || this.isDrawing) {
        this.isPanning = false;
        this.touchPanStart = null;
        return;
      }
      if (this.isPanning && e.pointerId === this.activePointerId && this.panStart) {
        const dx = e.clientX - this.panStart.x;
        const dy = e.clientY - this.panStart.y;
        this.viewportEl.scrollLeft = this.panStart.scrollLeft - dx;
        this.viewportEl.scrollTop = this.panStart.scrollTop - dy;
      }
    });

    window.addEventListener('pointerup', (e) => {
      if (this.isPanning && e.pointerId === this.activePointerId) {
        this.isPanning = false;
        this.activePointerId = null;
      }
    });

    // Android WebView için ek doğrudan dokunmatik (touch) dikey+yatay kaydırma güvencesi
    this.viewportEl.addEventListener(
      'touchstart',
      (e) => {
        // Sesli not kartı, görsel, metin kutusu, dosya kartı veya kement çubuğu tutuluyorsa sayfayı ASLA kaydırma
        if (
          this.isOverlayDragging ||
          this.selectionDragMode ||
          e.target.closest(
            '.draggable-voice-card, .canvas-image-item, .canvas-textbox-item, .canvas-attachment-card, .lasso-action-bar'
          )
        ) {
          this.touchPanStart = null;
          this.isPanning = false;
          return;
        }

        if (e.touches.length === 1) {
          const t = e.touches[0];

          // Kement (Lasso) seçimi kutusu içindeyse veya Kement aracı seçiliyse sayfayı kaydırma!
          if (this.penActive) {
            if (this.tool === 'lasso') {
              this.touchPanStart = null;
              return;
            }
            if (this.selection && this.selection.bounds) {
              const pt = this.getCanvasCoords(t.clientX, t.clientY);
              const b = this.selection.bounds;
              const pad = 24;
              if (
                pt.x >= b.x - pad &&
                pt.x <= b.x + b.w + pad &&
                pt.y >= b.y - pad &&
                pt.y <= b.y + b.h + pad
              ) {
                this.touchPanStart = null;
                return;
              }
            }
          }

          const shouldPan = !this.penActive || this.tool === 'pan' || this.fingerScrollMode;
          if (shouldPan) {
            this.touchPanStart = {
              x: t.clientX,
              y: t.clientY,
              scrollLeft: this.viewportEl.scrollLeft,
              scrollTop: this.viewportEl.scrollTop
            };
          } else {
            this.touchPanStart = null;
          }
        } else {
          this.touchPanStart = null;
        }
      },
      { passive: true }
    );

    this.viewportEl.addEventListener(
      'touchmove',
      (e) => {
        if (
          this.isOverlayDragging ||
          this.selectionDragMode ||
          this.isDrawing ||
          (this.penActive && this.tool === 'lasso')
        ) {
          this.touchPanStart = null;
          if (e.cancelable) e.preventDefault();
          return;
        }
        if (this.touchPanStart && e.touches.length === 1) {
          const t = e.touches[0];
          const dx = t.clientX - this.touchPanStart.x;
          const dy = t.clientY - this.touchPanStart.y;
          this.viewportEl.scrollLeft = this.touchPanStart.scrollLeft - dx;
          this.viewportEl.scrollTop = this.touchPanStart.scrollTop - dy;
          if (e.cancelable) e.preventDefault();
        }
      },
      { passive: false }
    );

    this.viewportEl.addEventListener(
      'touchend',
      () => {
        this.touchPanStart = null;
      },
      { passive: true }
    );

    this.viewportEl.addEventListener(
      'wheel',
      (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const delta = e.deltaY < 0 ? 0.1 : -0.1;
          this.setZoom(this.zoom + delta);
        }
      },
      { passive: false }
    );
  }

  startPanGesture(e) {
    this.isPanning = true;
    this.activePointerId = e.pointerId;
    this.panStart = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: this.viewportEl.scrollLeft,
      scrollTop: this.viewportEl.scrollTop
    };
    try {
      this.liveCanvas.setPointerCapture(e.pointerId);
    } catch {}
  }

  handlePointerDown(e) {
    if (!this.page || this.isOverlayDragging) return;

    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });

    // 2 parmakla kaydırma ve yakınlaştırma (Pinch-to-Zoom + 2-Finger Scroll)
    if (this.activePointers.size >= 2) {
      this.cancelCurrentStroke();
      this.isPanning = false;
      this.touchPanStart = null;
      const pts = Array.from(this.activePointers.values());
      this.initialPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      this.initialPinchZoom = this.zoom;
      this.initialPinchMid = {
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2,
        scrollLeft: this.viewportEl.scrollLeft,
        scrollTop: this.viewportEl.scrollTop
      };
      return;
    }

    // DURUM 1: "Kalem Aktif Değil" modundaysak -> Dokunuş her zaman sayfayı kaydırır!
    if (!this.penActive) {
      this.startPanGesture(e);
      return;
    }

    // DURUM 2: "Kaydır (El)" aracı seçiliyse veya orta fare tuşuysa -> Sayfayı kaydırır!
    if (this.tool === 'pan' || e.button === 1) {
      this.startPanGesture(e);
      return;
    }

    const pt = this.getCanvasCoords(e.clientX, e.clientY);

    // ÖNCELİK: Aktif bir Kement (Lasso) seçimi varsa, parmakla veya kalemle seçim kutusunun içinden tutup taşımaya izin ver (sayfa kaymasın!)
    if (this.selection && this.selection.bounds) {
      const b = this.selection.bounds;
      const handleSize = 24;
      if (
        Math.abs(pt.x - (b.x + b.w)) <= handleSize &&
        Math.abs(pt.y - (b.y + b.h)) <= handleSize
      ) {
        this.touchPanStart = null;
        this.isPanning = false;
        try {
          this.liveCanvas.setPointerCapture(e.pointerId);
        } catch {}
        this.pushUndoSnapshot();
        this.selectionDragMode = 'scale';
        this.selectionDragStart = { x: pt.x, y: pt.y, origBounds: { ...b } };
        this.activePointerId = e.pointerId;
        return;
      }
      if (pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h) {
        this.touchPanStart = null;
        this.isPanning = false;
        try {
          this.liveCanvas.setPointerCapture(e.pointerId);
        } catch {}
        this.pushUndoSnapshot();
        this.selectionDragMode = 'move';
        this.selectionDragStart = { x: pt.x, y: pt.y, lastX: pt.x, lastY: pt.y };
        this.activePointerId = e.pointerId;
        return;
      }
      this.clearSelection();
    }

    // DURUM 3: "Parmak Kaydırır" aktifse ve ekrana parmakla (touch) dokunulduysa -> (Kement aracı hariç) sayfayı kaydırır!
    if (this.fingerScrollMode && e.pointerType === 'touch' && this.tool !== 'lasso') {
      this.startPanGesture(e);
      return;
    }

    this.touchPanStart = null;
    this.isPanning = false;
    try {
      this.liveCanvas.setPointerCapture(e.pointerId);
    } catch {}

    if (this.tool === 'voice') {
      const snappedLineY = this.snapYToLine(pt.y);
      this.lastActiveLineY = snappedLineY;
      const targetX = Math.max(92, Math.min(PAGE_WIDTH - 290, Math.round(pt.x)));
      this.onLineVoiceTrigger({ lineY: snappedLineY, x: targetX });
      return;
    }

    if (this.tool === 'text') {
      this.lastActiveLineY = this.snapYToLine(pt.y);
      this.createTextBoxAt(pt.x, pt.y);
      return;
    }

    this.tempBarrelEraser = e.pointerType === 'pen' && (e.buttons === 32 || e.button === 5);

    this.activeCanvasRect = this.liveCanvas.getBoundingClientRect();
    this.isDrawing = true;
    this.activePointerId = e.pointerId;
    this.snappedShapePreview = null;
    this.lastLivePointIndex = 0;

    const pressure = this.computePressure(e, null);
    const point = {
      x: pt.x,
      y: pt.y,
      p: pressure,
      t: performance.now(),
      tiltX: e.tiltX || 0,
      tiltY: e.tiltY || 0
    };

    const effectiveTool = this.tempBarrelEraser ? 'eraser' : this.tool;

    if (effectiveTool === 'eraser') {
      this.pushUndoSnapshot(false);
      this.eraseAtPoint(point.x, point.y);
      this.renderLive({ eraserCursor: point });
      return;
    }

    if (effectiveTool === 'lasso') {
      this.lassoPolygon = [point];
      this.renderLive();
      return;
    }

    if (effectiveTool === 'laser') {
      this.currentPoints = [point];
      this.laserTrails.push({ points: this.currentPoints, lastUpdated: performance.now() });
      this.startLaserLoop();
      return;
    }

    this.currentPoints = [point];
    this.scheduleAutoShapeHold();
    this.renderLive();
    this.lastLivePointIndex = 1;
  }

  handlePointerMove(e) {
    if (this.isOverlayDragging) return;
    if (this.activePointers.has(e.pointerId)) {
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
    }

    if (this.activePointers.size >= 2 && this.initialPinchMid) {
      const pts = Array.from(this.activePointers.values());
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;

      const dx = midX - this.initialPinchMid.x;
      const dy = midY - this.initialPinchMid.y;
      this.viewportEl.scrollLeft = this.initialPinchMid.scrollLeft - dx;
      this.viewportEl.scrollTop = this.initialPinchMid.scrollTop - dy;

      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (this.initialPinchDist && this.initialPinchDist > 25) {
        const scale = dist / this.initialPinchDist;
        this.setZoom(this.initialPinchZoom * scale);
      }
      return;
    }

    if (this.selectionDragMode && e.pointerId === this.activePointerId) {
      this.touchPanStart = null;
      this.isPanning = false;
      const pt = this.getCanvasCoords(e.clientX, e.clientY);
      if (this.selectionDragMode === 'move') {
        const dx = pt.x - this.selectionDragStart.lastX;
        const dy = pt.y - this.selectionDragStart.lastY;
        this.selectionDragStart.lastX = pt.x;
        this.selectionDragStart.lastY = pt.y;
        this.translateSelectedItems(dx, dy);
      } else if (this.selectionDragMode === 'scale') {
        this.scaleSelectedItemsTo(pt.x, pt.y);
      }
      return;
    }

    if (this.isPanning && e.pointerId === this.activePointerId) {
      const dx = e.clientX - this.panStart.x;
      const dy = e.clientY - this.panStart.y;
      this.viewportEl.scrollLeft = this.panStart.scrollLeft - dx;
      this.viewportEl.scrollTop = this.panStart.scrollTop - dy;
      return;
    }

    if (!this.isDrawing || e.pointerId !== this.activePointerId) return;

    const effectiveTool = this.tempBarrelEraser ? 'eraser' : this.tool;
    const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e];
    const sampleList = events.length > 0 ? events : [e];
    const now = performance.now();

    for (const ev of sampleList) {
      const pt = this.getCanvasCoords(ev.clientX, ev.clientY);
      const prevPt = this.currentPoints[this.currentPoints.length - 1] || null;
      const pressure = this.computePressure(
        ev,
        prevPt ? { x: pt.x, y: pt.y, prev: prevPt, t: now } : null
      );

      const newPoint = {
        x: pt.x,
        y: pt.y,
        p: pressure,
        t: now,
        tiltX: ev.tiltX || 0,
        tiltY: ev.tiltY || 0
      };

      if (effectiveTool === 'eraser') {
        this.eraseAtPoint(newPoint.x, newPoint.y);
        this.renderLive({ eraserCursor: newPoint });
        continue;
      }

      if (effectiveTool === 'lasso') {
        this.lassoPolygon.push(newPoint);
        continue;
      }

      if (effectiveTool === 'laser') {
        this.currentPoints.push(newPoint);
        const activeTrail = this.laserTrails[this.laserTrails.length - 1];
        if (activeTrail) activeTrail.lastUpdated = now;
        continue;
      }

      if (prevPt && Math.hypot(newPoint.x - prevPt.x, newPoint.y - prevPt.y) < 1.1) {
        continue;
      }

      if (this.snappedShapePreview) {
        this.snappedShapePreview.x2 = newPoint.x;
        this.snappedShapePreview.y2 = newPoint.y;
      } else {
        this.currentPoints.push(newPoint);
        this.scheduleAutoShapeHold();
      }
    }

    if (effectiveTool === 'eraser' || effectiveTool === 'laser') {
      return;
    }

    // Artımlı (Incremental) O(1) Canlı Kalem Çizimi: tüm sayfayı silmeden sadece yeni eklenen segmenti çiz
    if (
      (effectiveTool === 'fountain' || effectiveTool === 'ballpoint' || effectiveTool === 'pencil') &&
      !this.snappedShapePreview &&
      !this.selection &&
      this.laserTrails.length === 0 &&
      this.currentPoints.length > this.lastLivePointIndex
    ) {
      this.drawStrokeIncremental(
        this.liveCtx,
        {
          tool: effectiveTool,
          color: this.color,
          size: this.strokeSize,
          opacity: this.opacity,
          points: this.currentPoints
        },
        Math.max(1, this.lastLivePointIndex)
      );
      this.lastLivePointIndex = this.currentPoints.length;
      return;
    }

    this.renderLive();
  }

  handlePointerUp(e) {
    this.activePointers.delete(e.pointerId);
    try {
      if (this.liveCanvas.hasPointerCapture(e.pointerId)) {
        this.liveCanvas.releasePointerCapture(e.pointerId);
      }
    } catch {}

    if (this.activePointers.size < 2) {
      this.initialPinchDist = null;
      this.initialPinchMid = null;
    }

    if (this.isPanning && e.pointerId === this.activePointerId) {
      this.isPanning = false;
      this.activePointerId = null;
      return;
    }

    if (this.selectionDragMode && e.pointerId === this.activePointerId) {
      this.selectionDragMode = null;
      this.selectionDragStart = null;
      this.activePointerId = null;
      this.onChange();
      return;
    }

    if (!this.isDrawing || e.pointerId !== this.activePointerId) return;

    clearTimeout(this.holdTimer);
    const effectiveTool = this.tempBarrelEraser ? 'eraser' : this.tool;
    this.isDrawing = false;
    this.activePointerId = null;
    this.tempBarrelEraser = false;
    this.activeCanvasRect = null;
    this.lastLivePointIndex = 0;

    if (effectiveTool === 'eraser') {
      this.renderLive();
      this.onChange();
      return;
    }

    if (effectiveTool === 'lasso') {
      this.finalizeLassoSelection();
      this.lassoPolygon = [];
      this.renderLive();
      return;
    }

    if (effectiveTool === 'laser') {
      this.currentPoints = [];
      return;
    }

    if (effectiveTool === 'shape') {
      if (this.currentPoints.length >= 2) {
        const first = this.currentPoints[0];
        const last = this.currentPoints[this.currentPoints.length - 1];
        if (Math.hypot(last.x - first.x, last.y - first.y) > 6) {
          this.pushUndoSnapshot(true);
          const newShape = {
            id: `sh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            shapeType: this.shapeType,
            x1: first.x,
            y1: first.y,
            x2: last.x,
            y2: last.y,
            color: this.color,
            size: this.strokeSize,
            fill: this.shapeFill ? this.hexToRgba(this.color, 0.14) : 'transparent'
          };
          this.page.shapes.push(newShape);
          this.renderMain();
          this.onChange();
        }
      }
      this.currentPoints = [];
      this.renderLive();
      return;
    }

    if (this.snappedShapePreview) {
      this.pushUndoSnapshot(true);
      this.page.shapes.push(this.snappedShapePreview);
      this.snappedShapePreview = null;
      this.currentPoints = [];
      this.renderMain();
      this.renderLive();
      this.onChange();
      return;
    }

    if (this.currentPoints.length >= 1) {
      this.pushUndoSnapshot(true);
      const lastPt = this.currentPoints[this.currentPoints.length - 1];
      if (lastPt) {
        this.lastActiveLineY = this.snapYToLine(lastPt.y);
      }
      const newStroke = {
        id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tool: effectiveTool,
        color: this.color,
        size: this.strokeSize,
        opacity: effectiveTool === 'highlighter' ? 0.36 : this.opacity,
        points: this.currentPoints.map((p) => ({
          x: Number(p.x.toFixed(1)),
          y: Number(p.y.toFixed(1)),
          p: Number(p.p.toFixed(3))
        }))
      };
      this.page.strokes.push(newStroke);
      if (effectiveTool === 'highlighter') {
        this.renderMain();
      } else {
        this.drawStroke(this.mainCtx, newStroke);
      }
      this.onChange();
    }

    this.currentPoints = [];
    this.renderLive();
  }

  cancelCurrentStroke() {
    clearTimeout(this.holdTimer);
    this.isDrawing = false;
    this.activePointerId = null;
    this.activeCanvasRect = null;
    this.lastLivePointIndex = 0;
    this.currentPoints = [];
    this.lassoPolygon = [];
    this.snappedShapePreview = null;
    this.renderLive();
  }

  computePressure(e, velocityInfo) {
    if (!this.pressureEnabled) return 0.55;

    const now = performance.now();
    if (e.pointerType === 'pen' && typeof e.pressure === 'number' && e.pressure > 0) {
      const clamped = Math.max(0.12, Math.min(1.0, e.pressure));
      if (now - this.lastPressureHudTime > 140) {
        this.lastPressureHudTime = now;
        this.onStatusUpdate({ pressure: Math.round(clamped * 100) });
      }
      return clamped;
    }

    if (velocityInfo && velocityInfo.prev) {
      const dt = Math.max(1, velocityInfo.t - (velocityInfo.prev.t || velocityInfo.t - 16));
      const dist = Math.hypot(
        velocityInfo.x - velocityInfo.prev.x,
        velocityInfo.y - velocityInfo.prev.y
      );
      const speed = dist / dt;
      const targetP = Math.max(0.22, Math.min(0.88, 0.78 - speed * 0.22));
      const smoothed = velocityInfo.prev.p * 0.65 + targetP * 0.35;
      if (now - this.lastPressureHudTime > 140) {
        this.lastPressureHudTime = now;
        this.onStatusUpdate({ pressure: Math.round(smoothed * 100) });
      }
      return smoothed;
    }

    return 0.55;
  }

  scheduleAutoShapeHold() {
    clearTimeout(this.holdTimer);
    if (!this.autoShapeHold) return;
    if (!['fountain', 'ballpoint', 'pencil', 'highlighter'].includes(this.tool)) return;
    if (this.currentPoints.length < 10) return;

    this.holdTimer = setTimeout(() => {
      if (!this.isDrawing || this.currentPoints.length < 10) return;
      const recognized = this.recognizeGeometricShape(this.currentPoints);
      if (recognized) {
        this.snappedShapePreview = {
          id: `sh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          shapeType: recognized.shapeType,
          x1: recognized.x1,
          y1: recognized.y1,
          x2: recognized.x2,
          y2: recognized.y2,
          color: this.color,
          size: this.tool === 'highlighter' ? Math.max(4, this.strokeSize * 0.4) : this.strokeSize,
          fill: this.shapeFill ? this.hexToRgba(this.color, 0.12) : 'transparent'
        };
        this.renderLive();
        this.onStatusUpdate({ autoShape: recognized.label });
      }
    }, 430);
  }

  recognizeGeometricShape(pts) {
    const first = pts[0];
    const last = pts[pts.length - 1];

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    let pathLen = 0;

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
      if (i > 0) {
        pathLen += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y);
      }
    }

    const w = maxX - minX;
    const h = maxY - minY;
    const diag = Math.hypot(w, h);
    if (diag < 32) return null;

    const directDist = Math.hypot(last.x - first.x, last.y - first.y);

    if (directDist / pathLen > 0.89) {
      return {
        shapeType: 'line',
        label: 'Düz Çizgiye Dönüştürüldü',
        x1: first.x,
        y1: first.y,
        x2: last.x,
        y2: last.y
      };
    }

    if (directDist < diag * 0.36 && w > 24 && h > 24) {
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const rx = w / 2;
      const ry = h / 2;

      let ellipseError = 0;
      for (const p of pts) {
        const norm = Math.hypot((p.x - cx) / rx, (p.y - cy) / ry);
        ellipseError += Math.abs(norm - 1);
      }
      ellipseError /= pts.length;

      if (ellipseError < 0.22) {
        return {
          shapeType: 'ellipse',
          label: 'Daire / Elipse Dönüştürüldü',
          x1: minX,
          y1: minY,
          x2: maxX,
          y2: maxY
        };
      }

      return {
        shapeType: 'rectangle',
        label: 'Dikdörtgene Dönüştürüldü',
        x1: minX,
        y1: minY,
        x2: maxX,
        y2: maxY
      };
    }

    return null;
  }

  eraseAtPoint(x, y) {
    const radius = Math.max(10, this.strokeSize * 2.2);
    let changed = false;

    if (this.eraserMode === 'stroke') {
      const beforeCount = this.page.strokes.length;
      this.page.strokes = this.page.strokes.filter((stroke) => {
        return !stroke.points.some(
          (pt) => Math.hypot(pt.x - x, pt.y - y) <= radius + stroke.size * 0.5
        );
      });
      if (this.page.strokes.length !== beforeCount) changed = true;
    } else {
      const nextStrokes = [];
      for (const stroke of this.page.strokes) {
        const hitRadius = radius + stroke.size * 0.4;
        const hasHit = stroke.points.some((pt) => Math.hypot(pt.x - x, pt.y - y) <= hitRadius);
        if (!hasHit) {
          nextStrokes.push(stroke);
          continue;
        }
        changed = true;
        let currentSegment = [];
        for (const pt of stroke.points) {
          if (Math.hypot(pt.x - x, pt.y - y) > hitRadius) {
            currentSegment.push(pt);
          } else {
            if (currentSegment.length >= 2) {
              nextStrokes.push({
                ...stroke,
                id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                points: currentSegment
              });
            }
            currentSegment = [];
          }
        }
        if (currentSegment.length >= 2) {
          nextStrokes.push({
            ...stroke,
            id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            points: currentSegment
          });
        }
      }
      this.page.strokes = nextStrokes;
    }

    const beforeShapes = this.page.shapes.length;
    this.page.shapes = this.page.shapes.filter((sh) => {
      const minX = Math.min(sh.x1, sh.x2) - radius;
      const maxX = Math.max(sh.x1, sh.x2) + radius;
      const minY = Math.min(sh.y1, sh.y2) - radius;
      const maxY = Math.max(sh.y1, sh.y2) + radius;
      return !(x >= minX && x <= maxX && y >= minY && y <= maxY);
    });
    if (this.page.shapes.length !== beforeShapes) changed = true;

    if (changed) {
      this.renderMain();
    }
  }

  finalizeLassoSelection() {
    if (this.lassoPolygon.length < 5) {
      this.clearSelection();
      return;
    }

    const poly = this.lassoPolygon;
    const strokeIds = new Set();
    const shapeIds = new Set();
    const textIds = new Set();
    const imageIds = new Set();
    const audioIds = new Set();

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    const expandBounds = (x, y) => {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    };

    for (const st of this.page.strokes) {
      const insideCount = st.points.filter((pt) => this.pointInPolygon(pt.x, pt.y, poly)).length;
      if (insideCount > 0 && insideCount >= Math.min(3, Math.ceil(st.points.length * 0.35))) {
        strokeIds.add(st.id);
        st.points.forEach((pt) => expandBounds(pt.x, pt.y));
      }
    }

    for (const sh of this.page.shapes) {
      const cx = (sh.x1 + sh.x2) / 2;
      const cy = (sh.y1 + sh.y2) / 2;
      if (this.pointInPolygon(cx, cy, poly)) {
        shapeIds.add(sh.id);
        expandBounds(sh.x1, sh.y1);
        expandBounds(sh.x2, sh.y2);
      }
    }

    for (const tb of this.page.textBoxes) {
      const cx = tb.x + (tb.width || 200) / 2;
      const cy = tb.y + 24;
      if (this.pointInPolygon(cx, cy, poly)) {
        textIds.add(tb.id);
        expandBounds(tb.x, tb.y);
        expandBounds(tb.x + (tb.width || 220), tb.y + 64);
      }
    }

    for (const img of this.page.images) {
      const cx = img.x + img.width / 2;
      const cy = img.y + img.height / 2;
      if (this.pointInPolygon(cx, cy, poly)) {
        imageIds.add(img.id);
        expandBounds(img.x, img.y);
        expandBounds(img.x + img.width, img.y + img.height);
      }
    }

    for (const aud of this.page.audioNotes || []) {
      const ax = typeof aud.x === 'number' ? aud.x : 110;
      const ay = typeof aud.y === 'number' ? aud.y : 120;
      const cx = ax + 150;
      const cy = ay + 52;
      if (this.pointInPolygon(cx, cy, poly) || this.pointInPolygon(ax + 40, ay + 20, poly)) {
        audioIds.add(aud.id);
        expandBounds(ax, ay);
        expandBounds(ax + 300, ay + 108);
      }
    }

    if (
      strokeIds.size === 0 &&
      shapeIds.size === 0 &&
      textIds.size === 0 &&
      imageIds.size === 0 &&
      audioIds.size === 0
    ) {
      this.clearSelection();
      return;
    }

    const pad = 12;
    this.selection = {
      strokeIds,
      shapeIds,
      textIds,
      imageIds,
      audioIds,
      bounds: {
        x: minX - pad,
        y: minY - pad,
        w: Math.max(32, maxX - minX + pad * 2),
        h: Math.max(32, maxY - minY + pad * 2)
      }
    };

    this.updateSelectionToolbarPosition();
    this.renderLive();
  }

  pointInPolygon(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x,
        yi = poly[i].y;
      const xj = poly[j].x,
        yj = poly[j].y;
      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.00001) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  translateSelectedItems(dx, dy) {
    if (!this.selection) return;
    const { strokeIds, shapeIds, textIds, imageIds, audioIds, bounds } = this.selection;

    for (const st of this.page.strokes) {
      if (strokeIds.has(st.id)) {
        for (const pt of st.points) {
          pt.x = Number((pt.x + dx).toFixed(1));
          pt.y = Number((pt.y + dy).toFixed(1));
        }
      }
    }

    for (const sh of this.page.shapes) {
      if (shapeIds.has(sh.id)) {
        sh.x1 += dx;
        sh.y1 += dy;
        sh.x2 += dx;
        sh.y2 += dy;
      }
    }

    for (const tb of this.page.textBoxes) {
      if (textIds.has(tb.id)) {
        tb.x += dx;
        tb.y += dy;
      }
    }

    for (const img of this.page.images) {
      if (imageIds.has(img.id)) {
        img.x += dx;
        img.y += dy;
      }
    }

    if (audioIds) {
      for (const aud of this.page.audioNotes || []) {
        if (audioIds.has(aud.id)) {
          aud.x = Math.max(0, Math.min(PAGE_WIDTH - 120, Math.round((aud.x || 110) + dx)));
          aud.y = Math.max(0, Math.min(PAGE_HEIGHT - 50, Math.round((aud.y || 120) + dy)));
        }
      }
    }

    bounds.x += dx;
    bounds.y += dy;

    this.renderMain();
    this.renderLive();
    if (textIds.size > 0 || imageIds.size > 0 || (audioIds && audioIds.size > 0)) {
      this.renderDOMOverlays();
    }
    this.updateSelectionToolbarPosition();
  }

  scaleSelectedItemsTo(targetX, targetY) {
    if (!this.selection || !this.selectionDragStart) return;
    const { strokeIds, shapeIds, bounds } = this.selection;
    const newW = Math.max(40, targetX - bounds.x);
    const newH = Math.max(40, targetY - bounds.y);
    const scaleX = newW / bounds.w;
    const scaleY = newH / bounds.h;

    for (const st of this.page.strokes) {
      if (strokeIds.has(st.id)) {
        for (const pt of st.points) {
          pt.x = Number((bounds.x + (pt.x - bounds.x) * scaleX).toFixed(1));
          pt.y = Number((bounds.y + (pt.y - bounds.y) * scaleY).toFixed(1));
        }
      }
    }

    for (const sh of this.page.shapes) {
      if (shapeIds.has(sh.id)) {
        sh.x1 = bounds.x + (sh.x1 - bounds.x) * scaleX;
        sh.y1 = bounds.y + (sh.y1 - bounds.y) * scaleY;
        sh.x2 = bounds.x + (sh.x2 - bounds.x) * scaleX;
        sh.y2 = bounds.y + (sh.y2 - bounds.y) * scaleY;
      }
    }

    bounds.w = newW;
    bounds.h = newH;

    this.renderMain();
    this.renderLive();
    this.updateSelectionToolbarPosition();
  }

  recolorSelection(newColor) {
    if (!this.selection) return;
    this.pushUndoSnapshot();
    const { strokeIds, shapeIds, textIds } = this.selection;
    for (const st of this.page.strokes) {
      if (strokeIds.has(st.id)) st.color = newColor;
    }
    for (const sh of this.page.shapes) {
      if (shapeIds.has(sh.id)) sh.color = newColor;
    }
    for (const tb of this.page.textBoxes) {
      if (textIds.has(tb.id)) tb.color = newColor;
    }
    this.renderMain();
    this.renderDOMOverlays();
    this.onChange();
  }

  duplicateSelection() {
    if (!this.selection) return;
    this.pushUndoSnapshot();
    const { strokeIds, shapeIds, textIds, audioIds, bounds } = this.selection;
    const offset = 28;
    const newStrokeIds = new Set();
    const newShapeIds = new Set();
    const newTextIds = new Set();
    const newAudioIds = new Set();

    for (const st of this.page.strokes) {
      if (strokeIds.has(st.id)) {
        const cloneId = `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        this.page.strokes.push({
          ...st,
          id: cloneId,
          points: st.points.map((p) => ({ ...p, x: p.x + offset, y: p.y + offset }))
        });
        newStrokeIds.add(cloneId);
      }
    }

    for (const sh of this.page.shapes) {
      if (shapeIds.has(sh.id)) {
        const cloneId = `sh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        this.page.shapes.push({
          ...sh,
          id: cloneId,
          x1: sh.x1 + offset,
          y1: sh.y1 + offset,
          x2: sh.x2 + offset,
          y2: sh.y2 + offset
        });
        newShapeIds.add(cloneId);
      }
    }

    for (const tb of this.page.textBoxes) {
      if (textIds.has(tb.id)) {
        const cloneId = `tb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        this.page.textBoxes.push({
          ...tb,
          id: cloneId,
          x: tb.x + offset,
          y: tb.y + offset
        });
        newTextIds.add(cloneId);
      }
    }

    if (audioIds) {
      for (const aud of this.page.audioNotes || []) {
        if (audioIds.has(aud.id)) {
          const cloneId = `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          this.page.audioNotes.push({
            ...aud,
            id: cloneId,
            x: (aud.x || 110) + offset,
            y: (aud.y || 120) + offset
          });
          newAudioIds.add(cloneId);
        }
      }
    }

    this.selection = {
      strokeIds: newStrokeIds,
      shapeIds: newShapeIds,
      textIds: newTextIds,
      imageIds: new Set(),
      audioIds: newAudioIds,
      bounds: {
        x: bounds.x + offset,
        y: bounds.y + offset,
        w: bounds.w,
        h: bounds.h
      }
    };

    this.renderMain();
    this.renderLive();
    this.renderDOMOverlays();
    this.updateSelectionToolbarPosition();
    this.onChange();
  }

  deleteSelection() {
    if (!this.selection) return;
    this.pushUndoSnapshot();
    const { strokeIds, shapeIds, textIds, imageIds, audioIds } = this.selection;
    this.page.strokes = this.page.strokes.filter((s) => !strokeIds.has(s.id));
    this.page.shapes = this.page.shapes.filter((s) => !shapeIds.has(s.id));
    this.page.textBoxes = this.page.textBoxes.filter((t) => !textIds.has(t.id));
    this.page.images = this.page.images.filter((i) => !imageIds.has(i.id));
    if (audioIds && this.page.audioNotes) {
      this.page.audioNotes = this.page.audioNotes.filter((a) => !audioIds.has(a.id));
    }
    this.clearSelection();
    this.renderMain();
    this.renderDOMOverlays();
    this.onChange();
  }

  clearSelection() {
    this.selection = null;
    this.selectionDragMode = null;
    if (this.selectionToolbarEl) {
      this.selectionToolbarEl.classList.add('hidden');
    }
    this.renderLive();
  }

  updateSelectionToolbarPosition() {
    if (!this.selectionToolbarEl) return;
    if (!this.selection || !this.selection.bounds) {
      this.selectionToolbarEl.classList.add('hidden');
      return;
    }
    const b = this.selection.bounds;
    this.selectionToolbarEl.classList.remove('hidden');
    const topPx = Math.max(12, b.y - 48);
    const leftPx = Math.max(16, Math.min(PAGE_WIDTH - 240, b.x + b.w / 2 - 110));
    this.selectionToolbarEl.style.top = `${topPx}px`;
    this.selectionToolbarEl.style.left = `${leftPx}px`;
  }

  renderMain() {
    if (!this.page) return;
    const ctx = this.mainCtx;
    ctx.clearRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

    const bgImg = this.bgImageCache.get(this.page.id) || null;
    const tpl = this.page.template || 'ruled';
    const pColor = this.page.paperColor || 'ivory';
    const cacheKey = `${this.page.id}_${tpl}_${pColor}_${bgImg ? 'img' : 'noimg'}`;

    if (this.paperBgCanvas && this.paperBgCtx) {
      if (this.paperBgCacheKey !== cacheKey) {
        this.paperBgCtx.clearRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
        renderPaperBackground(this.paperBgCtx, PAGE_WIDTH, PAGE_HEIGHT, tpl, pColor, bgImg);
        this.paperBgCacheKey = cacheKey;
      }
      ctx.drawImage(this.paperBgCanvas, 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    } else {
      renderPaperBackground(ctx, PAGE_WIDTH, PAGE_HEIGHT, tpl, pColor, bgImg);
    }

    for (const stroke of this.page.strokes) {
      if (stroke.tool === 'highlighter') {
        this.drawStroke(ctx, stroke);
      }
    }

    for (const sh of this.page.shapes) {
      this.drawGeometricShape(ctx, sh);
    }

    for (const stroke of this.page.strokes) {
      if (stroke.tool !== 'highlighter') {
        this.drawStroke(ctx, stroke);
      }
    }
  }

  renderLive(extra = {}) {
    const ctx = this.liveCtx;
    ctx.clearRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

    const effectiveTool = this.tempBarrelEraser ? 'eraser' : this.tool;

    if (this.isDrawing && this.currentPoints.length > 0) {
      if (effectiveTool === 'shape') {
        const first = this.currentPoints[0];
        const last = this.currentPoints[this.currentPoints.length - 1];
        this.drawGeometricShape(ctx, {
          shapeType: this.shapeType,
          x1: first.x,
          y1: first.y,
          x2: last.x,
          y2: last.y,
          color: this.color,
          size: this.strokeSize,
          fill: this.shapeFill ? this.hexToRgba(this.color, 0.14) : 'transparent'
        });
      } else if (this.snappedShapePreview) {
        this.drawGeometricShape(ctx, this.snappedShapePreview);
      } else if (['fountain', 'ballpoint', 'pencil', 'highlighter'].includes(effectiveTool)) {
        this.drawStroke(ctx, {
          tool: effectiveTool,
          color: this.color,
          size: this.strokeSize,
          opacity: effectiveTool === 'highlighter' ? 0.36 : this.opacity,
          points: this.currentPoints
        });
      }
    }

    if (extra.eraserCursor) {
      const r = Math.max(10, this.strokeSize * 2.2);
      ctx.save();
      ctx.beginPath();
      ctx.arc(extra.eraserCursor.x, extra.eraserCursor.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 1.8;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    if (this.lassoPolygon.length > 1) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.lassoPolygon[0].x, this.lassoPolygon[0].y);
      for (let i = 1; i < this.lassoPolygon.length; i++) {
        ctx.lineTo(this.lassoPolygon[i].x, this.lassoPolygon[i].y);
      }
      ctx.closePath();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    if (this.selection && this.selection.bounds) {
      const b = this.selection.bounds;
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 1.8;
      ctx.fillStyle = 'rgba(37, 99, 235, 0.04)';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeRect(b.x, b.y, b.w, b.h);

      ctx.setLineDash([]);
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 2;
      const corners = [
        [b.x, b.y],
        [b.x + b.w, b.y],
        [b.x, b.y + b.h],
        [b.x + b.w, b.y + b.h]
      ];
      corners.forEach(([cx, cy], idx) => {
        ctx.beginPath();
        ctx.arc(cx, cy, idx === 3 ? 7 : 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
      ctx.restore();
    }

    if (this.laserTrails.length > 0) {
      const now = performance.now();
      for (const trail of this.laserTrails) {
        const age = now - trail.lastUpdated;
        const alpha = Math.max(0, 1 - age / 1400);
        if (alpha <= 0 || trail.points.length < 2) continue;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#EF4444';
        ctx.shadowBlur = 14;
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(trail.points[0].x, trail.points[0].y);
        for (let i = 1; i < trail.points.length; i++) {
          ctx.lineTo(trail.points[i].x, trail.points[i].y);
        }
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#FECACA';
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  startLaserLoop() {
    if (this.laserAnimFrame) return;
    const step = () => {
      const now = performance.now();
      this.laserTrails = this.laserTrails.filter((t) => now - t.lastUpdated < 1400);
      this.renderLive();
      if (this.laserTrails.length > 0 || (this.isDrawing && this.tool === 'laser')) {
        this.laserAnimFrame = requestAnimationFrame(step);
      } else {
        this.laserAnimFrame = null;
      }
    };
    this.laserAnimFrame = requestAnimationFrame(step);
  }

  drawStrokeIncremental(ctx, stroke, startIdx) {
    const pts = stroke.points;
    if (!pts || pts.length <= startIdx) return;

    ctx.save();
    ctx.globalAlpha = stroke.opacity ?? 1;
    ctx.fillStyle = stroke.color;
    ctx.strokeStyle = stroke.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = Math.max(1, startIdx); i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];

      if (stroke.tool === 'pencil') {
        const pressure = ((p0.p || 0.5) + (p1.p || 0.5)) / 2;
        ctx.globalAlpha = Math.min(0.88, 0.32 + pressure * 0.55);
        ctx.lineWidth = stroke.size * (0.65 + pressure * 0.55);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
        continue;
      }

      const mx = (p0.x + p1.x) / 2;
      const my = (p0.y + p1.y) / 2;
      const prevMidX = i > 1 ? (pts[i - 2].x + p0.x) / 2 : p0.x;
      const prevMidY = i > 1 ? (pts[i - 2].y + p0.y) / 2 : p0.y;

      if (stroke.tool === 'ballpoint') {
        ctx.lineWidth = stroke.size;
      } else {
        const pressure = ((p0.p || 0.5) + (p1.p || 0.5)) / 2;
        ctx.lineWidth = Math.max(0.9, stroke.size * (0.32 + pressure * 1.15));
      }

      ctx.beginPath();
      ctx.moveTo(prevMidX, prevMidY);
      ctx.quadraticCurveTo(p0.x, p0.y, mx, my);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawStroke(ctx, stroke) {
    const pts = stroke.points;
    if (!pts || pts.length === 0) return;

    ctx.save();
    ctx.globalAlpha = stroke.opacity ?? 1;
    ctx.fillStyle = stroke.color;
    ctx.strokeStyle = stroke.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (pts.length === 1) {
      const r = Math.max(1, (stroke.size * (pts[0].p || 0.5)) / 1.5);
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (stroke.tool === 'highlighter') {
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.size;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2;
        const my = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (stroke.tool === 'ballpoint') {
      ctx.lineWidth = stroke.size;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2;
        const my = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (stroke.tool === 'pencil') {
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1];
        const p1 = pts[i];
        const pressure = ((p0.p || 0.5) + (p1.p || 0.5)) / 2;
        ctx.globalAlpha = Math.min(0.88, 0.32 + pressure * 0.55);
        ctx.lineWidth = stroke.size * (0.65 + pressure * 0.55);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const mx = (p0.x + p1.x) / 2;
      const my = (p0.y + p1.y) / 2;
      const prevMidX = i > 1 ? (pts[i - 2].x + p0.x) / 2 : p0.x;
      const prevMidY = i > 1 ? (pts[i - 2].y + p0.y) / 2 : p0.y;

      const pressure = ((p0.p || 0.5) + (p1.p || 0.5)) / 2;
      const dynamicWidth = Math.max(0.9, stroke.size * (0.32 + pressure * 1.15));

      ctx.lineWidth = dynamicWidth;
      ctx.beginPath();
      ctx.moveTo(prevMidX, prevMidY);
      ctx.quadraticCurveTo(p0.x, p0.y, mx, my);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawGeometricShape(ctx, sh) {
    ctx.save();
    ctx.strokeStyle = sh.color || '#1E293B';
    ctx.fillStyle = sh.fill || 'transparent';
    ctx.lineWidth = sh.size || 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const { x1, y1, x2, y2, shapeType } = sh;
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);

    switch (shapeType) {
      case 'line':
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        break;

      case 'arrow': {
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLen = Math.max(12, sh.size * 4);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(
          x2 - headLen * Math.cos(angle - Math.PI / 6),
          y2 - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(x2, y2);
        ctx.lineTo(
          x2 - headLen * Math.cos(angle + Math.PI / 6),
          y2 - headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
        break;
      }

      case 'rectangle':
        ctx.beginPath();
        ctx.roundRect(minX, minY, w, h, 4);
        if (sh.fill && sh.fill !== 'transparent') ctx.fill();
        ctx.stroke();
        break;

      case 'ellipse':
        ctx.beginPath();
        ctx.ellipse(minX + w / 2, minY + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        if (sh.fill && sh.fill !== 'transparent') ctx.fill();
        ctx.stroke();
        break;

      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(minX + w / 2, minY);
        ctx.lineTo(minX + w, minY + h);
        ctx.lineTo(minX, minY + h);
        ctx.closePath();
        if (sh.fill && sh.fill !== 'transparent') ctx.fill();
        ctx.stroke();
        break;

      case 'axes':
        ctx.beginPath();
        ctx.moveTo(minX, minY);
        ctx.lineTo(minX, minY + h);
        ctx.lineTo(minX + w, minY + h);
        ctx.stroke();
        break;
    }

    ctx.restore();
  }

  /**
   * DOM Katmanı: Serbest Taşınabilir Ses & Not Kartları, Görseller, Dosya Kartları ve Metin Kutuları
   */
  renderDOMOverlays() {
    if (!this.overlayLayer || !this.page) return;
    this.overlayLayer.innerHTML = '';

    // 1. Sayfa içi serbest görseller
    for (const imgObj of this.page.images) {
      const wrap = document.createElement('div');
      wrap.className = 'canvas-image-item';
      wrap.style.left = `${imgObj.x}px`;
      wrap.style.top = `${imgObj.y}px`;
      wrap.style.width = `${imgObj.width}px`;
      wrap.style.height = `${imgObj.height}px`;

      const imgEl = document.createElement('img');
      imgEl.src = imgObj.src;
      imgEl.draggable = false;

      const controls = document.createElement('div');
      controls.className = 'overlay-item-controls';

      const dragBtn = document.createElement('button');
      dragBtn.className = 'overlay-ctrl-btn';
      dragBtn.title = 'Görseli Taşı';
      dragBtn.innerHTML = '✥';

      const resizeBtn = document.createElement('button');
      resizeBtn.className = 'overlay-ctrl-btn resize-handle';
      resizeBtn.title = 'Boyutlandır';
      resizeBtn.innerHTML = '↘';

      const delBtn = document.createElement('button');
      delBtn.className = 'overlay-ctrl-btn danger';
      delBtn.title = 'Görseli Sil';
      delBtn.innerHTML = '✕';

      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.pushUndoSnapshot();
        this.page.images = this.page.images.filter((i) => i.id !== imgObj.id);
        this.renderDOMOverlays();
        this.onChange();
      });

      this.makeElementDraggable(dragBtn, wrap, imgObj, () => this.onChange());
      this.makeImageResizable(resizeBtn, wrap, imgObj, () => this.onChange());

      controls.append(dragBtn, delBtn);
      wrap.append(imgEl, controls, resizeBtn);
      this.overlayLayer.appendChild(wrap);
    }

    // 2. SERBEST TAŞINABİLİR SES VE NOT KARTLARI (Sayfa Üzerinde İstediğin Yere Sürüklenebilir)
    for (const audioObj of this.page.audioNotes || []) {
      if (typeof audioObj.x !== 'number') audioObj.x = 110;
      if (typeof audioObj.y !== 'number') {
        audioObj.y = typeof audioObj.lineY === 'number' ? Math.max(40, audioObj.lineY - 24) : 120;
      }

      const card = document.createElement('div');
      card.className = 'draggable-voice-card';
      card.style.left = `${audioObj.x}px`;
      card.style.top = `${audioObj.y}px`;

      const audioEl = new Audio(audioObj.dataUrl);
      audioEl.preload = 'metadata';

      // Üst Taşıma Çubuğu
      const headerBar = document.createElement('div');
      headerBar.className = 'voice-card-header';

      const dragGrip = document.createElement('span');
      dragGrip.className = 'voice-card-grip';
      dragGrip.title = 'Basılı tutup sayfa üzerinde istediğiniz yere taşıyın';
      dragGrip.innerHTML = '⋮⋮ 🎙️ Sesli Not (Taşı)';

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'voice-card-del-btn';
      delBtn.textContent = '✕';
      delBtn.title = 'Ses kaydını sil';

      headerBar.append(dragGrip, delBtn);

      // Oynatıcı Kontrolleri Satırı
      const playerRow = document.createElement('div');
      playerRow.className = 'voice-card-player-row';

      const playBtn = document.createElement('button');
      playBtn.type = 'button';
      playBtn.className = 'line-audio-play-btn';
      playBtn.textContent = '▶';
      playBtn.title = 'Oynat / Duraklat';

      const timeLabel = document.createElement('span');
      timeLabel.className = 'line-audio-time';
      timeLabel.textContent = this.formatSeconds(audioObj.durationSec || 0);

      const seekSlider = document.createElement('input');
      seekSlider.type = 'range';
      seekSlider.className = 'line-audio-slider';
      seekSlider.min = '0';
      seekSlider.max = '100';
      seekSlider.value = '0';

      const speedBtn = document.createElement('button');
      speedBtn.type = 'button';
      speedBtn.className = 'line-audio-speed';
      speedBtn.textContent = '1x';

      playerRow.append(playBtn, timeLabel, seekSlider, speedBtn);

      // Ses Kaydı Notu / Açıklaması Alanı
      const noteInput = document.createElement('input');
      noteInput.type = 'text';
      noteInput.className = 'voice-card-note-input';
      noteInput.value = audioObj.title || '';
      noteInput.placeholder = 'Ses kaydı notu yazın...';
      noteInput.addEventListener('pointerdown', (e) => e.stopPropagation());
      noteInput.addEventListener('input', () => {
        audioObj.title = noteInput.value;
        this.onChange();
      });

      const speeds = [1, 1.5, 2];
      let speedIdx = 0;
      speedBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
      speedBtn.onclick = (e) => {
        e.stopPropagation();
        speedIdx = (speedIdx + 1) % speeds.length;
        audioEl.playbackRate = speeds[speedIdx];
        speedBtn.textContent = `${speeds[speedIdx]}x`;
      };

      playBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
      playBtn.onclick = (e) => {
        e.stopPropagation();
        if (audioEl.paused) {
          audioEl.play().catch(() => {});
          playBtn.textContent = '⏸';
          card.classList.add('playing');
        } else {
          audioEl.pause();
          playBtn.textContent = '▶';
          card.classList.remove('playing');
        }
      };

      audioEl.addEventListener('timeupdate', () => {
        const dur =
          audioEl.duration && isFinite(audioEl.duration)
            ? audioEl.duration
            : audioObj.durationSec || 1;
        seekSlider.value = String(Math.min(100, Math.round((audioEl.currentTime / dur) * 100)));
        timeLabel.textContent = `${this.formatSeconds(audioEl.currentTime)}/${this.formatSeconds(dur)}`;
      });

      audioEl.addEventListener('ended', () => {
        playBtn.textContent = '▶';
        seekSlider.value = '0';
        card.classList.remove('playing');
        timeLabel.textContent = this.formatSeconds(audioObj.durationSec || 0);
      });

      seekSlider.addEventListener('pointerdown', (e) => e.stopPropagation());
      seekSlider.addEventListener('input', () => {
        const dur =
          audioEl.duration && isFinite(audioEl.duration)
            ? audioEl.duration
            : audioObj.durationSec || 1;
        audioEl.currentTime = (Number(seekSlider.value) / 100) * dur;
      });

      delBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
      delBtn.onclick = (e) => {
        e.stopPropagation();
        audioEl.pause();
        this.pushUndoSnapshot();
        this.page.audioNotes = this.page.audioNotes.filter((a) => a.id !== audioObj.id);
        this.renderDOMOverlays();
        this.onChange();
      };

      card.append(headerBar, playerRow, noteInput);

      // Kartı üst çubuğundan veya kart gövdesinden tutarak sayfanın her yerine serbestçe taşıyabilme (sayfa kaymadan)
      this.makeElementDraggable(card, card, audioObj, () => {
        this.onChange();
      });

      this.overlayLayer.appendChild(card);
    }

    // 3. Sayfaya Eklenen Dosya Kartları (Attachments)
    for (const att of this.page.attachments || []) {
      const card = document.createElement('div');
      card.className = 'canvas-attachment-card';
      card.style.left = `${att.x || 100}px`;
      card.style.top = `${att.y || 140}px`;

      const iconBox = document.createElement('div');
      iconBox.className = 'att-icon-badge';
      iconBox.textContent = (att.ext || 'DOSYA').toUpperCase().slice(0, 5);

      const metaBox = document.createElement('div');
      metaBox.className = 'att-meta-info';
      const nameEl = document.createElement('strong');
      nameEl.textContent = att.name || 'Ekli Dosya';
      const sizeEl = document.createElement('span');
      sizeEl.textContent = att.sizeLabel || '';
      metaBox.append(nameEl, sizeEl);

      const actBox = document.createElement('div');
      actBox.className = 'att-card-actions';

      if (att.dataUrl) {
        const openBtn = document.createElement('a');
        openBtn.className = 'att-btn';
        openBtn.href = att.dataUrl;
        openBtn.download = att.name || 'dosya';
        openBtn.textContent = 'İndir/Aç';
        actBox.appendChild(openBtn);
      }

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'att-btn danger';
      delBtn.textContent = '✕';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        this.pushUndoSnapshot();
        this.page.attachments = this.page.attachments.filter((a) => a.id !== att.id);
        this.renderDOMOverlays();
        this.onChange();
      };
      actBox.appendChild(delBtn);

      card.append(iconBox, metaBox, actBox);
      this.makeElementDraggable(iconBox, card, att, () => this.onChange());
      this.overlayLayer.appendChild(card);
    }

    // 4. Sayfa içi Zengin Metin Kutuları
    for (const tb of this.page.textBoxes) {
      const box = document.createElement('div');
      box.className = 'canvas-textbox-item';
      box.style.left = `${tb.x}px`;
      box.style.top = `${tb.y}px`;
      box.style.width = `${tb.width || 320}px`;

      const bar = document.createElement('div');
      bar.className = 'textbox-header-bar';

      const dragHandle = document.createElement('span');
      dragHandle.className = 'textbox-drag-grip';
      dragHandle.innerHTML = '⋮⋮ Taşı';

      const actions = document.createElement('div');
      actions.className = 'textbox-mini-actions';

      const fontDownBtn = document.createElement('button');
      fontDownBtn.type = 'button';
      fontDownBtn.textContent = 'A-';
      fontDownBtn.onclick = () => {
        tb.fontSize = Math.max(11, (tb.fontSize || 16) - 2);
        editor.style.fontSize = `${tb.fontSize}px`;
        this.onChange();
      };

      const fontUpBtn = document.createElement('button');
      fontUpBtn.type = 'button';
      fontUpBtn.textContent = 'A+';
      fontUpBtn.onclick = () => {
        tb.fontSize = Math.min(48, (tb.fontSize || 16) + 2);
        editor.style.fontSize = `${tb.fontSize}px`;
        this.onChange();
      };

      const boldBtn = document.createElement('button');
      boldBtn.type = 'button';
      boldBtn.textContent = 'B';
      boldBtn.onclick = () => {
        tb.bold = !tb.bold;
        editor.style.fontWeight = tb.bold ? '700' : '400';
        this.onChange();
      };

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'danger';
      delBtn.textContent = '✕';
      delBtn.onclick = () => {
        this.pushUndoSnapshot();
        this.page.textBoxes = this.page.textBoxes.filter((t) => t.id !== tb.id);
        this.renderDOMOverlays();
        this.onChange();
      };

      actions.append(fontDownBtn, fontUpBtn, boldBtn, delBtn);
      bar.append(dragHandle, actions);

      const editor = document.createElement('div');
      editor.className = 'textbox-editable';
      editor.contentEditable = 'true';
      editor.spellcheck = false;
      editor.innerText = tb.text || '';
      editor.style.fontSize = `${tb.fontSize || 16}px`;
      editor.style.fontFamily = tb.fontFamily || '"Plus Jakarta Sans", sans-serif';
      editor.style.color = tb.color || this.color;
      editor.style.fontWeight = tb.bold ? '700' : '400';

      editor.addEventListener('input', () => {
        tb.text = editor.innerText;
        this.onChange();
      });

      this.makeElementDraggable(dragHandle, box, tb, () => this.onChange());

      box.append(bar, editor);
      this.overlayLayer.appendChild(box);
    }
  }

  formatSeconds(sec) {
    const s = Math.max(0, Math.round(sec || 0));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }

  addAudioNoteToPage({ title, durationSec, dataUrl, x, y }) {
    if (!this.page) return;
    this.pushUndoSnapshot();
    if (!this.page.audioNotes) this.page.audioNotes = [];
    const count = this.page.audioNotes.length;

    const currentScrollTop = this.viewportEl ? this.viewportEl.scrollTop / (this.zoom || 1) : 0;
    const defaultX = typeof x === 'number' ? x : Math.min(PAGE_WIDTH - 340, 120 + (count % 3) * 36);
    const defaultY =
      typeof y === 'number'
        ? y
        : Math.min(PAGE_HEIGHT - 140, Math.max(60, Math.round(currentScrollTop + 140 + (count % 5) * 48)));

    this.page.audioNotes.push({
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title: title || `Sesli Not ${count + 1}`,
      durationSec: durationSec || 0,
      dataUrl,
      x: defaultX,
      y: defaultY
    });
    this.renderDOMOverlays();
    this.onChange();
  }

  createTextBoxAt(x, y, initialText = 'Notunuzu buraya yazın...') {
    this.pushUndoSnapshot();
    const newTb = {
      id: `tb-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      x: Math.min(PAGE_WIDTH - 320, Math.max(24, x)),
      y: Math.min(PAGE_HEIGHT - 120, Math.max(24, y)),
      width: 480,
      text: initialText,
      fontSize: 16,
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      color: this.color,
      bold: false,
      italic: false
    };
    this.page.textBoxes.push(newTb);
    this.renderDOMOverlays();
    this.onChange();
  }

  addImageToPage(dataUrl, offsetIndex = 0) {
    const img = new Image();
    img.onload = () => {
      this.pushUndoSnapshot();
      const maxW = 420;
      const ratio = img.naturalHeight / (img.naturalWidth || 1);
      const w = Math.min(maxW, img.naturalWidth || 340);
      const h = Math.round(w * ratio);
      const offset = offsetIndex * 28;
      this.page.images.push({
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        src: dataUrl,
        x: Math.min(PAGE_WIDTH - w - 20, Math.round((PAGE_WIDTH - w) / 2) + offset),
        y: Math.min(PAGE_HEIGHT - h - 20, 140 + offset),
        width: w,
        height: h
      });
      this.renderDOMOverlays();
      this.onChange();
    };
    img.src = dataUrl;
  }

  addAttachmentToPage({ name, ext, sizeLabel, dataUrl }) {
    if (!this.page) return;
    this.pushUndoSnapshot();
    if (!this.page.attachments) this.page.attachments = [];
    const count = this.page.attachments.length;
    this.page.attachments.push({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name,
      ext,
      sizeLabel,
      dataUrl,
      x: 96 + (count % 3) * 30,
      y: 140 + count * 68
    });
    this.renderDOMOverlays();
    this.onChange();
  }

  makeElementDraggable(handleEl, containerEl, dataModel, onSave) {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let origX = 0;
    let origY = 0;

    // Dokunmatik olayların arka plandaki sayfayı kaydırmasını engelle
    containerEl.addEventListener(
      'touchstart',
      (e) => {
        this.touchPanStart = null;
        this.isPanning = false;
        e.stopPropagation();
      },
      { passive: true }
    );

    containerEl.addEventListener(
      'touchmove',
      (e) => {
        this.touchPanStart = null;
        this.isPanning = false;
        e.stopPropagation();
        if (dragging && e.cancelable) {
          e.preventDefault();
        }
      },
      { passive: false }
    );

    handleEl.addEventListener('pointerdown', (e) => {
      if (
        handleEl === containerEl &&
        e.target.closest('button:not(.overlay-ctrl-btn), input, textarea, a, [contenteditable="true"]')
      ) {
        return;
      }
      e.stopPropagation();
      e.preventDefault();
      this.touchPanStart = null;
      this.isPanning = false;
      this.isOverlayDragging = true;
      this.pushUndoSnapshot();
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origX = dataModel.x || 0;
      origY = dataModel.y || 0;
      try {
        handleEl.setPointerCapture(e.pointerId);
      } catch {}
    });

    handleEl.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      e.stopPropagation();
      e.preventDefault();
      this.touchPanStart = null;
      this.isPanning = false;
      const dx = (e.clientX - startX) / this.zoom;
      const dy = (e.clientY - startY) / this.zoom;
      dataModel.x = Math.max(0, Math.min(PAGE_WIDTH - 80, Math.round(origX + dx)));
      dataModel.y = Math.max(0, Math.min(PAGE_HEIGHT - 40, Math.round(origY + dy)));
      containerEl.style.left = `${dataModel.x}px`;
      containerEl.style.top = `${dataModel.y}px`;
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      this.isOverlayDragging = false;
      try {
        if (e && e.pointerId !== undefined) {
          handleEl.releasePointerCapture(e.pointerId);
        }
      } catch {}
      onSave();
    };

    handleEl.addEventListener('pointerup', endDrag);
    handleEl.addEventListener('pointercancel', endDrag);
  }

  makeImageResizable(handleEl, containerEl, imgModel, onSave) {
    let resizing = false;
    let startX = 0;
    let origW = 0;
    let aspect = 1;

    handleEl.addEventListener(
      'touchstart',
      (e) => {
        this.touchPanStart = null;
        this.isPanning = false;
        e.stopPropagation();
      },
      { passive: true }
    );

    handleEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.touchPanStart = null;
      this.isPanning = false;
      this.isOverlayDragging = true;
      this.pushUndoSnapshot();
      resizing = true;
      startX = e.clientX;
      origW = imgModel.width;
      aspect = imgModel.height / (imgModel.width || 1);
      try {
        handleEl.setPointerCapture(e.pointerId);
      } catch {}
    });

    handleEl.addEventListener('pointermove', (e) => {
      if (!resizing) return;
      e.stopPropagation();
      e.preventDefault();
      this.touchPanStart = null;
      this.isPanning = false;
      const dx = (e.clientX - startX) / this.zoom;
      const nextW = Math.max(80, Math.min(PAGE_WIDTH - imgModel.x, Math.round(origW + dx)));
      const nextH = Math.round(nextW * aspect);
      imgModel.width = nextW;
      imgModel.height = nextH;
      containerEl.style.width = `${nextW}px`;
      containerEl.style.height = `${nextH}px`;
    });

    const endResize = (e) => {
      if (!resizing) return;
      resizing = false;
      this.isOverlayDragging = false;
      try {
        if (e && e.pointerId !== undefined) {
          handleEl.releasePointerCapture(e.pointerId);
        }
      } catch {}
      onSave();
    };

    handleEl.addEventListener('pointerup', endResize);
    handleEl.addEventListener('pointercancel', endResize);
  }

  async renderPageToExportCanvas(pageObj, scale = 2) {
    const outCanvas = document.createElement('canvas');
    outCanvas.width = PAGE_WIDTH * scale;
    outCanvas.height = PAGE_HEIGHT * scale;
    const ctx = outCanvas.getContext('2d');
    ctx.scale(scale, scale);

    let bgImg = null;
    if (pageObj.bgImageData) {
      bgImg = await this.loadImagePromise(pageObj.bgImageData);
    }

    renderPaperBackground(
      ctx,
      PAGE_WIDTH,
      PAGE_HEIGHT,
      pageObj.template || 'ruled',
      pageObj.paperColor || 'ivory',
      bgImg
    );

    for (const imgItem of pageObj.images || []) {
      const loaded = await this.loadImagePromise(imgItem.src);
      if (loaded) {
        ctx.drawImage(loaded, imgItem.x, imgItem.y, imgItem.width, imgItem.height);
      }
    }

    for (const st of pageObj.strokes || []) {
      if (st.tool === 'highlighter') this.drawStroke(ctx, st);
    }

    for (const sh of pageObj.shapes || []) {
      this.drawGeometricShape(ctx, sh);
    }

    for (const st of pageObj.strokes || []) {
      if (st.tool !== 'highlighter') this.drawStroke(ctx, st);
    }

    for (const tb of pageObj.textBoxes || []) {
      if (!tb.text) continue;
      ctx.save();
      ctx.fillStyle = tb.color || '#0F172A';
      const weight = tb.bold ? '700' : '400';
      const fSize = tb.fontSize || 16;
      ctx.font = `${weight} ${fSize}px ${tb.fontFamily || '"Plus Jakarta Sans", sans-serif'}`;
      const lines = tb.text.split('\n');
      let curY = tb.y + fSize + 10;
      const maxWidth = (tb.width || 300) - 16;
      for (const line of lines) {
        this.wrapCanvasText(ctx, line, tb.x + 8, curY, maxWidth, fSize * 1.42);
        curY += fSize * 1.42 * Math.max(1, Math.ceil(ctx.measureText(line).width / maxWidth));
      }
      ctx.restore();
    }

    return outCanvas;
  }

  wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let testY = y;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, testY);
        line = words[n] + ' ';
        testY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, testY);
  }

  loadImagePromise(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  hexToRgba(hex, alpha) {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
