/**
 * TabNote Studio — Ana Uygulama Denetleyicisi
 * (UI, Klasörler, Çoklu Sayfa, Canlı Ses Kaydı ve Nota Ekleme, Foto/PDF/Dosya İçe Aktarma, PDF/PNG Export)
 */

import { storage } from './storage.js';
import { PAPER_TEMPLATES, PAPER_COLORS, renderPaperBackground } from './templates.js';
import { CanvasEngine, PAGE_WIDTH, PAGE_HEIGHT } from './canvas-engine.js';
import { drawChart, renderChartDataUrl, compileFunction, CHART_COLORS } from './chart-builder.js';
import { DEVREM_SYMBOLS, svgToDataUrl } from './devrem-symbols.js';

const SETTINGS_KEY = 'tabnote_studio_settings_v1';
const DEFAULT_SETTINGS = {
  pressure: true,
  autoShape: true,
  fingerScroll: true,
  dockOpen: true,
  showHud: true
};

const TOOL_DEFAULT_SIZES = {
  fountain: 4,
  ballpoint: 3,
  fineliner: 2,
  pencil: 3,
  brush: 10,
  calligraphy: 12,
  marker: 8,
  crayon: 14,
  highlighter: 22
};

const PEN_LIKE_TOOLS = Object.keys(TOOL_DEFAULT_SIZES);

const INK_PALETTE = [
  '#0F172A', // Gece Mürekkebi (Siyah/Lacivert)
  '#1D4ED8', // Kraliyet Mavisi
  '#DC2626', // Karmen Kırmızısı
  '#059669', // Zümrüt Yeşili
  '#7C3AED', // Ametist Moru
  '#D97706', // Kehribar Turuncu
  '#0284C7', // Okyanus Siyanı
  '#F8FAFC'  // Koyu Kağıt İçin Beyaz Mürekkep
];

const HIGHLIGHTER_PALETTE = [
  '#FACC15', // Neon Sarı
  '#4ADE80', // Fosforlu Yeşil
  '#38BDF8', // Açık Mavi
  '#F472B6', // Pembe
  '#FB923C', // Turuncu
  '#C084FC'  // Lavanta
];

class TabNoteApp {
  constructor() {
    this.folders = [];
    this.notebooks = [];
    this.activeFolderId = 'all';
    this.activeNotebook = null;
    this.searchQuery = '';
    this.homeSearchQuery = '';
    this.isHomeView = true;
    this.sidebarTab = 'notebooks';
    this.saveDebounce = null;
    this.engine = null;

    // Ses & Not Kayıt Stüdyosu Durumu
    this.mediaRecorder = null;
    this.audioStream = null;
    this.audioChunks = [];
    this.recStartTime = 0;
    this.recElapsedSec = 0;
    this.recTimerInterval = null;
    this.isRecPaused = false;
    this.recCancelled = false;
    this.recordedAudioDataUrl = null;
    this.recordedDurationSec = 0;
    this.autoDropAfterStop = false;

    // Ayarlar, Kalem Boyutları ve Grafik Durumu
    this.settings = { ...DEFAULT_SETTINGS };
    this.toolSizes = { ...TOOL_DEFAULT_SIZES };
    this.chartState = {
      type: 'bar',
      color: CHART_COLORS[0],
      rows: []
    };
  }

  async init() {
    this.settings = this.loadSettings();
    this.folders = await storage.getFolders();
    this.notebooks = await storage.getAllNotebooks();
    this.activeNotebook = this.notebooks[0];

    this.initCanvasEngine();
    this.bindUIEvents();
    this.bindDockAndSettings();
    this.bindDevremEvents();
    this.renderSidebar();
    this.renderHomeScreen();
    this.loadActiveNotebookIntoWorkspace();
    this.updatePenToolbarUI();
    this.updatePenActiveUI();
    this.applySettings();
    this.showHomeScreen();
    this.registerServiceWorker();

    // Android Donanımsal Geri Tuşu Desteği: Not içindeyken Ana Ekrana döner
    window.handleAndroidBack = () => {
      if (!this.isHomeView) {
        this.showHomeScreen();
        return true;
      }
      return false;
    };
  }

  showHomeScreen() {
    this.isHomeView = true;
    if (this.activeNotebook) {
      storage.saveNotebook(this.activeNotebook).catch(() => {});
    }
    document.getElementById('homeScreenView')?.classList.remove('hidden');
    document.getElementById('appShell')?.classList.add('hidden');
    this.renderHomeScreen();
  }

  openNotebookInEditor(notebook) {
    if (!notebook) return;
    this.activeNotebook = notebook;
    this.isHomeView = false;
    document.getElementById('homeScreenView')?.classList.add('hidden');
    document.getElementById('appShell')?.classList.remove('hidden');
    this.renderSidebar();
    this.loadActiveNotebookIntoWorkspace();
  }

  initCanvasEngine() {
    this.paperSheetEl = document.querySelector('.paper-sheet-container');
    this.engine = new CanvasEngine({
      viewportEl: document.getElementById('canvasViewport'),
      pageWrapperEl: document.getElementById('pageScaleWrapper'),
      mainCanvas: document.getElementById('mainCanvas'),
      liveCanvas: document.getElementById('liveCanvas'),
      overlayLayer: document.getElementById('domOverlayLayer'),
      selectionToolbarEl: document.getElementById('lassoActionBar'),
      onChange: () => {
        this.scheduleAutoSave();
        this.updateUndoRedoButtons();
      },
      onStatusUpdate: (info) => {
        if (info.zoom !== undefined) {
          document.getElementById('zoomValueLabel').textContent = `%${info.zoom}`;
        }
        if (info.pressure !== undefined) {
          const pEl = document.getElementById('pressureReadout');
          if (pEl) pEl.textContent = `Basınç: %${info.pressure}`;
        }
        if (info.autoShape) {
          this.showToast(`✨ ${info.autoShape}`);
        }
      }
    });

    // Sonsuz Dikey Sayfa Kaydırma: Kullanıcı aşağı/yukarı kaydırdıkça görünürdeki sayfayı aktif et
    const viewportEl = document.getElementById('canvasViewport');
    viewportEl?.addEventListener(
      'scroll',
      () => {
        if (!this.activeNotebook || this.engine?.isDrawing || this.isProgrammaticScroll) return;
        const container = document.getElementById('continuousPagesContainer');
        if (!container) return;
        const slots = container.querySelectorAll('.continuous-page-slot');
        if (slots.length <= 1) return;

        const vpRect = viewportEl.getBoundingClientRect();
        const vpCenterY = vpRect.top + vpRect.height * 0.45;

        let bestIdx = this.activeNotebook.activePageIndex || 0;
        let bestDist = Infinity;

        slots.forEach((slot) => {
          const rect = slot.getBoundingClientRect();
          const idx = Number(slot.dataset.pageIndex);
          if (vpCenterY >= rect.top && vpCenterY <= rect.bottom) {
            bestIdx = idx;
            bestDist = 0;
          } else if (bestDist > 0) {
            const center = (rect.top + rect.bottom) / 2;
            const d = Math.abs(center - vpCenterY);
            if (d < bestDist) {
              bestDist = d;
              bestIdx = idx;
            }
          }
        });

        if (bestIdx !== this.activeNotebook.activePageIndex) {
          this.activatePageSlot(bestIdx, false);
        }
      },
      { passive: true }
    );
  }

  updatePenActiveUI() {
    const btn = document.getElementById('penActiveToggleBtn');
    const txt = document.getElementById('penActiveStateText');
    const hudTxt = document.getElementById('penHudStatusText');
    const fingerBtn = document.getElementById('fingerScrollToggleBtn');

    if (this.engine.penActive) {
      btn.classList.add('is-active');
      btn.classList.remove('is-inactive');
      txt.textContent = 'Kalem Aktif';
      if (hudTxt) hudTxt.textContent = 'Kalem Aktif';
    } else {
      btn.classList.remove('is-active');
      btn.classList.add('is-inactive');
      txt.textContent = 'Kalem Aktif';
      if (hudTxt) hudTxt.textContent = 'Kalem Pasif (Kaydırma Modu)';
    }

    if (fingerBtn) {
      fingerBtn.classList.toggle('active', this.engine.fingerScrollMode);
      fingerBtn.querySelector('span').textContent = '👆 Parmakla Kaydır';
    }
  }

  loadActiveNotebookIntoWorkspace(scrollToActive = false) {
    if (!this.activeNotebook) return;

    const titleInput = document.getElementById('notebookTitleInput');
    titleInput.value = this.activeNotebook.title || 'Adsız Not Defteri';

    const favBtn = document.getElementById('toggleFavNotebookBtn');
    favBtn.classList.toggle('is-fav', !!this.activeNotebook.favorite);
    favBtn.title = this.activeNotebook.favorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle';

    const idx = Math.min(
      Math.max(0, this.activeNotebook.activePageIndex || 0),
      this.activeNotebook.pages.length - 1
    );
    this.activeNotebook.activePageIndex = idx;

    this.renderContinuousPagesStack(scrollToActive);

    this.updatePageCounterUI();
    this.updateUndoRedoButtons();
    if (this.sidebarTab === 'pages') {
      this.renderPageThumbnails();
    }
  }

  renderPageOntoPreviewCanvas(pg, canvas) {
    if (!pg || !canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

    const drawContents = (bgImg) => {
      renderPaperBackground(
        ctx,
        PAGE_WIDTH,
        PAGE_HEIGHT,
        pg.template || 'ruled',
        pg.paperColor || 'ivory',
        bgImg
      );
      if (this.engine) {
        for (const im of pg.images || []) {
          if (im.src) {
            const imEl = new Image();
            imEl.onload = () => ctx.drawImage(imEl, im.x, im.y, im.width, im.height);
            imEl.src = im.src;
          }
        }
        for (const st of pg.strokes || []) {
          this.engine.drawStroke(ctx, st);
        }
        for (const sh of pg.shapes || []) {
          this.engine.drawGeometricShape(ctx, sh);
        }
      }
    };

    if (pg.bgImageData) {
      const cached = this.engine?.bgImageCache?.get(pg.id);
      if (cached) {
        drawContents(cached);
      } else {
        drawContents(null);
        const img = new Image();
        img.onload = () => {
          this.engine?.bgImageCache?.set(pg.id, img);
          drawContents(img);
        };
        img.src = pg.bgImageData;
      }
    } else {
      drawContents(null);
    }
  }

  syncPagePreviewSlot(pageIndex) {
    if (!this.activeNotebook) return;
    const pg = this.activeNotebook.pages[pageIndex];
    const container = document.getElementById('continuousPagesContainer');
    if (!pg || !container) return;
    const slot = container.querySelector(`.continuous-page-slot[data-page-index="${pageIndex}"]`);
    const previewCanvas = slot?.querySelector('.page-slot-preview');
    if (previewCanvas) {
      this.renderPageOntoPreviewCanvas(pg, previewCanvas);
    }
  }

  renderContinuousPagesStack(scrollToActive = false) {
    const container = document.getElementById('continuousPagesContainer');
    if (!container || !this.activeNotebook) return;

    if (this.paperSheetEl && this.paperSheetEl.parentNode) {
      this.paperSheetEl.parentNode.removeChild(this.paperSheetEl);
    }
    container.innerHTML = '';

    const activeIdx = this.activeNotebook.activePageIndex || 0;
    const total = this.activeNotebook.pages.length;

    this.activeNotebook.pages.forEach((pg, index) => {
      const slot = document.createElement('div');
      slot.className = `continuous-page-slot ${index === activeIdx ? 'active-slot' : ''}`;
      slot.dataset.pageIndex = String(index);

      const badge = document.createElement('span');
      badge.className = 'page-slot-badge';
      badge.textContent = `Sayfa ${index + 1} / ${total}`;

      const previewCanvas = document.createElement('canvas');
      previewCanvas.className = 'page-slot-preview';
      previewCanvas.width = PAGE_WIDTH;
      previewCanvas.height = PAGE_HEIGHT;
      this.renderPageOntoPreviewCanvas(pg, previewCanvas);

      slot.append(badge, previewCanvas);

      slot.addEventListener('pointerdown', () => {
        if (this.activeNotebook && this.activeNotebook.activePageIndex !== index) {
          this.activatePageSlot(index, false);
        }
      });

      if (index === activeIdx && this.paperSheetEl) {
        slot.appendChild(this.paperSheetEl);
      }

      container.appendChild(slot);
    });

    const currentPage = this.activeNotebook.pages[activeIdx];
    if (currentPage) {
      this.engine.loadPage(currentPage);
    }

    if (scrollToActive) {
      const activeSlot = container.querySelector(
        `.continuous-page-slot[data-page-index="${activeIdx}"]`
      );
      if (activeSlot) {
        this.isProgrammaticScroll = true;
        activeSlot.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => {
          this.isProgrammaticScroll = false;
        }, 450);
      }
    }
  }

  activatePageSlot(newIndex, scrollIntoView = false) {
    if (!this.activeNotebook) return;
    if (newIndex < 0 || newIndex >= this.activeNotebook.pages.length) return;

    const oldIndex = this.activeNotebook.activePageIndex || 0;
    if (oldIndex !== newIndex) {
      this.syncPagePreviewSlot(oldIndex);
    }

    this.activeNotebook.activePageIndex = newIndex;
    const container = document.getElementById('continuousPagesContainer');
    if (container) {
      const slots = container.querySelectorAll('.continuous-page-slot');
      slots.forEach((slot) => {
        const idx = Number(slot.dataset.pageIndex);
        slot.classList.toggle('active-slot', idx === newIndex);
        if (idx === newIndex && this.paperSheetEl && slot !== this.paperSheetEl.parentNode) {
          slot.appendChild(this.paperSheetEl);
        }
      });

      if (scrollIntoView) {
        const targetSlot = container.querySelector(
          `.continuous-page-slot[data-page-index="${newIndex}"]`
        );
        if (targetSlot) {
          this.isProgrammaticScroll = true;
          targetSlot.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setTimeout(() => {
            this.isProgrammaticScroll = false;
          }, 450);
        }
      }
    }

    this.engine.loadPage(this.activeNotebook.pages[newIndex]);
    this.updatePageCounterUI();
    this.updateUndoRedoButtons();
    if (this.sidebarTab === 'pages') {
      document.querySelectorAll('#pageThumbnailsGrid .page-thumb-card').forEach((card, i) => {
        card.classList.toggle('active', i === newIndex);
      });
    }
  }

  updatePageCounterUI() {
    if (!this.activeNotebook) return;
    const idx = this.activeNotebook.activePageIndex || 0;
    const total = this.activeNotebook.pages.length;
    document.getElementById('pageIndicatorText').textContent = `Sayfa ${idx + 1} / ${total}`;
    document.getElementById('prevPageBtn').disabled = idx <= 0;
    document.getElementById('nextPageBtn').disabled = idx >= total - 1;
  }

  updateUndoRedoButtons() {
    if (!this.engine) return;
    document.getElementById('undoBtn').disabled = !this.engine.canUndo();
    document.getElementById('redoBtn').disabled = !this.engine.canRedo();
  }

  scheduleAutoSave() {
    clearTimeout(this.saveDebounce);
    this.saveDebounce = setTimeout(async () => {
      // Kullanıcı o an kalemle çizim yapıyorsa kaydı ertele, asla çizimi bölme!
      if (this.engine?.isDrawing) {
        this.scheduleAutoSave();
        return;
      }
      if (this.activeNotebook) {
        await storage.saveNotebook(this.activeNotebook);
        const statusEl = document.getElementById('saveStatusBadge');
        if (statusEl) {
          statusEl.textContent = 'Kaydedildi';
          statusEl.classList.remove('saving', 'fade-out');
          clearTimeout(this.saveBadgeFadeTimer);
          this.saveBadgeFadeTimer = setTimeout(() => {
            statusEl.classList.add('fade-out');
          }, 1200);
        }
        if (this.isHomeView) {
          this.renderHomeScreen();
        }
      }
    }, 1100);
  }

  promptCreateNewFolder(onComplete = null) {
    this.openPromptModal({
      title: 'Yeni Klasör Oluştur',
      placeholder: 'Örn: EEM Devre Analizi, Fizik 101, Müşteri Notları...',
      defaultValue: '',
      onConfirm: async (folderName) => {
        if (!folderName.trim()) return;
        const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B', '#06B6D4', '#EF4444'];
        const newFolder = {
          id: `fld-${Date.now()}`,
          name: folderName.trim(),
          icon: 'folder',
          color: colors[this.folders.length % colors.length],
          system: false
        };
        this.folders.push(newFolder);
        await storage.saveFolders(this.folders);
        this.activeFolderId = newFolder.id;
        this.renderSidebar();
        this.renderHomeScreen();
        this.showToast(`"${newFolder.name}" klasörü oluşturuldu.`);
        if (typeof onComplete === 'function') {
          onComplete(newFolder);
        }
      }
    });
  }

  bindUIEvents() {
    const appShell = document.getElementById('appShell');

    // Ana Ekrana Dön Butonu
    document.getElementById('backToHomeBtn')?.addEventListener('click', () => {
      this.showHomeScreen();
    });

    // Ana Ekran (Home View) Kontrolleri
    document.getElementById('homeNewFolderBtn')?.addEventListener('click', () => {
      this.promptCreateNewFolder();
    });

    document.getElementById('homeNewNotebookBtn')?.addEventListener('click', () => {
      this.openCreateNotebookModal();
    });

    document.getElementById('homeSearchInput')?.addEventListener('input', (e) => {
      this.homeSearchQuery = e.target.value.trim().toLowerCase();
      this.renderHomeNotebooksGrid();
    });

    document.getElementById('toggleSidebarBtn').addEventListener('click', () => {
      appShell.classList.toggle('sidebar-collapsed');
    });
    document.getElementById('closeSidebarMobileBtn').addEventListener('click', () => {
      appShell.classList.add('sidebar-collapsed');
    });

    // Kenar çubuğu sekmeleri
    document.querySelectorAll('.sidebar-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sidebar-tab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.sidebarTab = btn.dataset.tab;
        document
          .getElementById('notebooksTabPane')
          .classList.toggle('hidden', this.sidebarTab !== 'notebooks');
        document
          .getElementById('pagesTabPane')
          .classList.toggle('hidden', this.sidebarTab !== 'pages');
        if (this.sidebarTab === 'pages') {
          this.renderPageThumbnails();
        }
      });
    });

    document.getElementById('newNotebookBtn').addEventListener('click', () => {
      this.openCreateNotebookModal();
    });

    document.getElementById('closeCreateNbModalBtn')?.addEventListener('click', () => {
      document.getElementById('createNotebookModal')?.classList.add('hidden');
    });

    document.getElementById('cancelCreateNbBtn')?.addEventListener('click', () => {
      document.getElementById('createNotebookModal')?.classList.add('hidden');
    });

    document.getElementById('newFolderBtn').addEventListener('click', () => {
      this.promptCreateNewFolder();
    });

    document.getElementById('searchNotebooksInput').addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      this.renderNotebookList();
    });

    const titleInput = document.getElementById('notebookTitleInput');
    titleInput.addEventListener('input', () => {
      if (!this.activeNotebook) return;
      this.activeNotebook.title = titleInput.value.trim() || 'Adsız Not Defteri';
      this.scheduleAutoSave();
    });

    document.getElementById('toggleFavNotebookBtn').addEventListener('click', () => {
      if (!this.activeNotebook) return;
      this.activeNotebook.favorite = !this.activeNotebook.favorite;
      document
        .getElementById('toggleFavNotebookBtn')
        .classList.toggle('is-fav', this.activeNotebook.favorite);
      this.scheduleAutoSave();
      this.showToast(
        this.activeNotebook.favorite ? 'Favorilere eklendi ★' : 'Favorilerden çıkarıldı'
      );
    });

    // KALEM AKTİF / KALEM AKTİF DEĞİL BUTONU
    document.getElementById('penActiveToggleBtn').addEventListener('click', () => {
      this.engine.penActive = !this.engine.penActive;
      this.updatePenActiveUI();
      this.showToast(
        this.engine.penActive
          ? '✒️ Kalem Aktif: Sayfa üzerine yazabilirsiniz.'
          : '✋ Kalem Aktif Değil: Sayfayı parmakla veya kalemle rahatça kaydırabilirsiniz.'
      );
    });

    // PARMAK KAYDIRIR / PARMAK ÇİZER BUTONU
    document.getElementById('fingerScrollToggleBtn').addEventListener('click', () => {
      this.engine.fingerScrollMode = !this.engine.fingerScrollMode;
      this.updatePenActiveUI();
      this.showToast(
        this.engine.fingerScrollMode
          ? '👆 Parmak Kaydırır: Parmakla dokunup sürükleyerek sayfayı kaydırabilirsiniz.'
          : '👆 Parmak Çizer: Parmakla da çizim yapabilirsiniz (2 parmakla kaydırılır).'
      );
    });

    // Alt HUD Hızlı Yukarı / Aşağı Kaydırma Tuşları
    document.getElementById('scrollUpFastBtn').addEventListener('click', () => {
      this.engine.scrollByOffset(0, -280, true);
    });
    document.getElementById('scrollDownFastBtn').addEventListener('click', () => {
      this.engine.scrollByOffset(0, 280, true);
    });

    // MİKROFON, SES VE NOT KAYDET AÇILIŞ EKRANI (MODAL) BUTONLARI
    document.getElementById('openVoiceStudioModalBtn')?.addEventListener('click', () => {
      this.openVoiceStudioModal();
    });

    document.getElementById('closeVoiceStudioModalBtn')?.addEventListener('click', () => {
      this.closeVoiceStudioModal();
    });

    document.getElementById('voiceStudioCancelBtn')?.addEventListener('click', () => {
      this.closeVoiceStudioModal();
    });

    document.getElementById('voiceStudioStartStopBtn')?.addEventListener('click', () => {
      if (this.isCurrentlyRecording()) {
        this.stopVoiceRecordingInModal(false);
      } else {
        this.startVoiceRecordingInModal();
      }
    });

    document.getElementById('voiceStudioPauseBtn')?.addEventListener('click', () => {
      this.togglePauseVoiceRecording();
    });

    document.getElementById('voiceStudioDropToPageBtn')?.addEventListener('click', () => {
      this.dropVoiceAndNoteToPage();
    });

    // Geri Al / İleri Al
    document.getElementById('undoBtn').addEventListener('click', () => {
      this.engine.undo();
      this.updateUndoRedoButtons();
    });
    document.getElementById('redoBtn').addEventListener('click', () => {
      this.engine.redo();
      this.updateUndoRedoButtons();
    });

    // Sayfalar Arası Geçiş & Yeni Sayfa
    document.getElementById('prevPageBtn').addEventListener('click', () => {
      if (!this.activeNotebook || this.activeNotebook.activePageIndex <= 0) return;
      this.activatePageSlot(this.activeNotebook.activePageIndex - 1, true);
      this.scheduleAutoSave();
    });

    document.getElementById('nextPageBtn').addEventListener('click', () => {
      if (
        !this.activeNotebook ||
        this.activeNotebook.activePageIndex >= this.activeNotebook.pages.length - 1
      )
        return;
      this.activatePageSlot(this.activeNotebook.activePageIndex + 1, true);
      this.scheduleAutoSave();
    });

    document.getElementById('addPageBtn').addEventListener('click', () => {
      this.addNewPageToCurrentNotebook();
    });
    document.getElementById('sidebarAddPageBtn').addEventListener('click', () => {
      this.addNewPageToCurrentNotebook();
    });
    document.getElementById('continuousAddPageTrigger')?.addEventListener('click', () => {
      this.addNewPageToCurrentNotebook(true);
    });

    // Yakınlaştırma (Zoom) Kontrolleri
    document.getElementById('zoomOutBtn').addEventListener('click', () => {
      this.engine.setZoom(this.engine.zoom - 0.15);
    });
    document.getElementById('zoomInBtn').addEventListener('click', () => {
      this.engine.setZoom(this.engine.zoom + 0.15);
    });
    document.getElementById('zoomResetBtn').addEventListener('click', () => {
      this.engine.setZoom(1.0);
    });

    // Zen / Tam Ekran Modu
    document.getElementById('zenModeBtn').addEventListener('click', () => {
      appShell.classList.toggle('zen-mode');
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if (appShell.classList.contains('zen-mode')) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
    });

    // Kalem Araçları Seçimi
    document.querySelectorAll('.tool-dock-btn[data-tool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const selectedTool = btn.dataset.tool;
        if (selectedTool !== 'pan' && !this.engine.penActive) {
          this.engine.penActive = true;
          this.updatePenActiveUI();
        }
        this.selectTool(selectedTool);
      });
    });

    // Kalınlık Sürgüsü
    const sizeSlider = document.getElementById('strokeSizeSlider');
    sizeSlider.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      this.engine.strokeSize = val;
      document.getElementById('strokeSizeValue').textContent = `${val} px`;
      this.updateQuickWidthDots();
    });

    document.querySelectorAll('.width-preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const size = Number(btn.dataset.size);
        this.engine.strokeSize = size;
        sizeSlider.value = size;
        document.getElementById('strokeSizeValue').textContent = `${size} px`;
        this.updateQuickWidthDots();
      });
    });

    const customColorInput = document.getElementById('customColorPicker');
    customColorInput.addEventListener('input', (e) => {
      this.setInkColor(e.target.value);
    });

    document.getElementById('pressureToggleChk').addEventListener('change', (e) => {
      this.engine.pressureEnabled = e.target.checked;
    });
    document.getElementById('autoShapeToggleChk').addEventListener('change', (e) => {
      this.engine.autoShapeHold = e.target.checked;
    });

    document.querySelectorAll('input[name="eraserModeRadio"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        this.engine.eraserMode = e.target.value;
      });
    });

    document.getElementById('clearCurrentPageBtn').addEventListener('click', () => {
      if (!this.engine.page) return;
      this.engine.pushUndoSnapshot();
      this.engine.page.strokes = [];
      this.engine.page.shapes = [];
      this.engine.page.textBoxes = [];
      this.engine.page.images = [];
      this.engine.page.attachments = [];
      this.engine.page.audioNotes = [];
      this.engine.page.bgImageData = null;
      this.engine.bgImageCache.delete(this.engine.page.id);
      this.engine.clearSelection();
      this.engine.renderMain();
      this.engine.renderDOMOverlays();
      this.scheduleAutoSave();
      this.updateUndoRedoButtons();
      this.showToast('Sayfa temizlendi (Geri Al ile kurtarabilirsiniz).');
    });

    document.querySelectorAll('.shape-type-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.shape-type-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.engine.shapeType = btn.dataset.shape;
      });
    });

    document.getElementById('shapeFillChk').addEventListener('change', (e) => {
      this.engine.shapeFill = e.target.checked;
    });

    // Kement Seçim Aksiyon Çubuğu
    document.getElementById('lassoDuplicateBtn').addEventListener('click', () => {
      this.engine.duplicateSelection();
    });
    document.getElementById('lassoDeleteBtn').addEventListener('click', () => {
      this.engine.deleteSelection();
    });
    document.getElementById('lassoColorInput').addEventListener('input', (e) => {
      this.engine.recolorSelection(e.target.value);
    });

    // Kağıt Şablonu ve Rengi Modalı
    document.getElementById('openTemplateModalBtn').addEventListener('click', () => {
      this.openTemplateModal();
    });
    document.getElementById('closeTemplateModalBtn').addEventListener('click', () => {
      document.getElementById('templateModal').classList.add('hidden');
    });

    // İÇERİ EKLE (FOTOĞRAF / PDF / DOSYA) MODALI VE İŞLEYİCİLERİ
    const importModal = document.getElementById('importModal');
    const imageFileInput = document.getElementById('imageFileInput');
    const bgImageFileInput = document.getElementById('bgImageFileInput');
    const pdfFileInput = document.getElementById('pdfFileInput');
    const anyFileInput = document.getElementById('anyFileInput');

    document.getElementById('openImportModalBtn').addEventListener('click', () => {
      importModal.classList.remove('hidden');
    });
    document.getElementById('closeImportModalBtn').addEventListener('click', () => {
      importModal.classList.add('hidden');
    });

    // 1. Serbest Fotoğraf Ekle
    document.getElementById('triggerPhotoInsertBtn').addEventListener('click', () => {
      importModal.classList.add('hidden');
      imageFileInput.click();
    });
    imageFileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      files.forEach((file, idx) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          this.engine.addImageToPage(ev.target.result, idx);
        };
        reader.readAsDataURL(file);
      });
      this.showToast(`${files.length} fotoğraf sayfaya eklendi.`);
      imageFileInput.value = '';
    });

    // 2. Sayfa Arka Planı Fotoğrafı Ekle
    document.getElementById('triggerBgPhotoInsertBtn').addEventListener('click', () => {
      importModal.classList.add('hidden');
      bgImageFileInput.click();
    });
    bgImageFileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        this.engine.setPageBackgroundImage(ev.target.result);
        this.showToast('Görsel sayfa arka planı olarak ayarlandı.');
      };
      reader.readAsDataURL(file);
      bgImageFileInput.value = '';
    });

    // 3. PDF Belgesi İçe Aktar
    document.getElementById('triggerPdfImportBtn').addEventListener('click', () => {
      importModal.classList.add('hidden');
      pdfFileInput.click();
    });
    pdfFileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await this.handlePdfFileImport(file);
      pdfFileInput.value = '';
    });

    // 4. Genel Dosya / Belge Ekle
    document.getElementById('triggerAnyFileImportBtn').addEventListener('click', () => {
      importModal.classList.add('hidden');
      anyFileInput.click();
    });
    anyFileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await this.handleGenericFileImport(file);
      anyFileInput.value = '';
    });

    // Dışa Aktar Modalı
    document.getElementById('openExportModalBtn').addEventListener('click', () => {
      document.getElementById('exportModal').classList.remove('hidden');
    });
    document.getElementById('closeExportModalBtn').addEventListener('click', () => {
      document.getElementById('exportModal').classList.add('hidden');
    });

    document.getElementById('exportPdfBtn').addEventListener('click', () => {
      this.exportCurrentNotebookAsPDF();
    });
    document.getElementById('exportPngBtn').addEventListener('click', () => {
      this.exportCurrentPageAsPNG();
    });
    document.getElementById('exportJsonBtn').addEventListener('click', () => {
      this.exportNotebookBackupJSON();
    });

    const importJsonInput = document.getElementById('importJsonInput');
    document.getElementById('importJsonBtn').addEventListener('click', () => {
      importJsonInput.click();
    });
    importJsonInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      this.importJsonBackupFile(file);
      importJsonInput.value = '';
    });

    window.addEventListener('keydown', (e) => {
      if (e.target.isContentEditable || e.target.tagName === 'INPUT') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) this.engine.redo();
        else this.engine.undo();
        this.updateUndoRedoButtons();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.engine.redo();
        this.updateUndoRedoButtons();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.engine.selection) {
          e.preventDefault();
          this.engine.deleteSelection();
        }
      }
    });
  }

  /**
   * MİKROFON, SES VE NOT KAYDET AÇILIŞ EKRANI (MODAL) SİSTEMİ
   * (Android Native MediaRecorder Köprüsü + Web MediaRecorder)
   */
  isCurrentlyRecording() {
    return Boolean(
      this.isNativeRecording || (this.mediaRecorder && this.mediaRecorder.state !== 'inactive')
    );
  }

  openVoiceStudioModal() {
    this.recordedAudioDataUrl = null;
    this.recordedDurationSec = 0;
    this.recElapsedSec = 0;
    this.isRecPaused = false;
    this.recCancelled = false;
    this.autoDropAfterStop = false;

    const modal = document.getElementById('voiceNoteStudioModal');
    const noteInput = document.getElementById('voiceStudioNoteInput');
    const timerEl = document.getElementById('voiceStudioTimer');
    const stateEl = document.getElementById('voiceStudioStateText');
    const dotEl = document.getElementById('voiceStudioDot');
    const startStopBtn = document.getElementById('voiceStudioStartStopBtn');
    const startStopLbl = document.getElementById('voiceStudioStartStopLabel');
    const pauseBtn = document.getElementById('voiceStudioPauseBtn');
    const waveEl = document.getElementById('voiceStudioWave');

    if (noteInput) noteInput.value = '';
    if (timerEl) timerEl.textContent = '00:00';
    if (stateEl) stateEl.textContent = 'Mikrofon Hazır — Kaydı Başlatın';
    dotEl?.classList.remove('recording', 'ready');
    startStopBtn?.classList.remove('is-recording');
    if (startStopLbl) startStopLbl.textContent = 'Kaydı Başlat';
    pauseBtn?.classList.add('hidden');
    waveEl?.classList.remove('active', 'paused');

    modal?.classList.remove('hidden');
  }

  closeVoiceStudioModal() {
    if (this.isCurrentlyRecording()) {
      this.cancelVoiceRecording();
    }
    document.getElementById('voiceNoteStudioModal')?.classList.add('hidden');
  }

  async startVoiceRecordingInModal() {
    this.recordedAudioDataUrl = null;
    this.recordedDurationSec = 0;
    this.recCancelled = false;
    this.isRecPaused = false;
    this.recElapsedSec = 0;

    // 1. ÖNCELİK: Android APK İçindeki Doğrudan Native Mikrofon Köprüsü (AndroidVoiceBridge)
    if (window.AndroidVoiceBridge && typeof window.AndroidVoiceBridge.startNativeRecording === 'function') {
      window.onAndroidMicPermissionResult = (granted) => {
        if (granted) {
          this.startVoiceRecordingInModal();
        } else {
          this.showToast('Mikrofon izni reddedildi. Lütfen izin verip tekrar deneyin.');
        }
      };

      const status = window.AndroidVoiceBridge.startNativeRecording();
      if (status === 'PERMISSION_REQUESTED') {
        this.showToast('🎙️ Lütfen ekrana gelen mikrofon iznini onaylayın...');
        return;
      }
      if (status === 'OK') {
        this.isNativeRecording = true;
        this.activateModalRecordingUI();
        return;
      }
      this.showToast(`Mikrofon başlatılamadı (${status}).`);
      return;
    }

    // 2. Web Tarayıcı MediaRecorder Desteği
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.showToast('Bu ortamda doğrudan mikrofon erişimi bulunamadı.');
      return;
    }

    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];

      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', ''];
      let options = {};
      for (const mt of mimeTypes) {
        if (mt && typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(mt)) {
          options = { mimeType: mt };
          break;
        }
      }

      this.mediaRecorder = new MediaRecorder(this.audioStream, options);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.cleanupVoiceStream();
        if (this.recCancelled || this.audioChunks.length === 0) {
          return;
        }
        const blobType = this.mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: blobType });
        const duration = Math.max(1, this.recElapsedSec);

        const reader = new FileReader();
        reader.onload = (ev) => {
          this.recordedAudioDataUrl = ev.target.result;
          this.recordedDurationSec = duration;
          this.setModalReadyState(duration);
          if (this.autoDropAfterStop) {
            this.autoDropAfterStop = false;
            this.finalizeDropVoiceNoteToPage();
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      this.mediaRecorder.start(250);
      this.activateModalRecordingUI();
    } catch (err) {
      console.warn('Mikrofon erişim hatası:', err);
      this.showToast('Mikrofona erişilemedi. Lütfen mikrofon iznini kontrol edin.');
    }
  }

  activateModalRecordingUI() {
    const timerEl = document.getElementById('voiceStudioTimer');
    const stateEl = document.getElementById('voiceStudioStateText');
    const dotEl = document.getElementById('voiceStudioDot');
    const startStopBtn = document.getElementById('voiceStudioStartStopBtn');
    const startStopLbl = document.getElementById('voiceStudioStartStopLabel');
    const pauseBtn = document.getElementById('voiceStudioPauseBtn');
    const waveEl = document.getElementById('voiceStudioWave');

    if (timerEl) timerEl.textContent = '00:00';
    if (stateEl) stateEl.textContent = 'Ses Kaydediliyor...';
    dotEl?.classList.remove('ready');
    dotEl?.classList.add('recording');
    startStopBtn?.classList.add('is-recording');
    if (startStopLbl) startStopLbl.textContent = '⏹ Kaydı Durdur';
    if (pauseBtn) {
      pauseBtn.classList.remove('hidden');
      pauseBtn.textContent = '⏸ Duraklat';
    }
    waveEl?.classList.add('active');
    waveEl?.classList.remove('paused');

    clearInterval(this.recTimerInterval);
    this.recTimerInterval = setInterval(() => {
      if (!this.isRecPaused) {
        this.recElapsedSec++;
        const formatted = this.engine.formatSeconds(this.recElapsedSec);
        if (timerEl) timerEl.textContent = formatted;
      }
    }, 1000);
  }

  setModalReadyState(duration) {
    const stateEl = document.getElementById('voiceStudioStateText');
    const dotEl = document.getElementById('voiceStudioDot');
    const startStopBtn = document.getElementById('voiceStudioStartStopBtn');
    const startStopLbl = document.getElementById('voiceStudioStartStopLabel');
    const pauseBtn = document.getElementById('voiceStudioPauseBtn');
    const waveEl = document.getElementById('voiceStudioWave');

    if (stateEl) stateEl.textContent = `✓ Ses Kaydedildi (${this.engine.formatSeconds(duration)}) — Sayfaya Düşürmeye Hazır`;
    dotEl?.classList.remove('recording');
    dotEl?.classList.add('ready');
    startStopBtn?.classList.remove('is-recording');
    if (startStopLbl) startStopLbl.textContent = 'Yeniden Kaydet';
    pauseBtn?.classList.add('hidden');
    waveEl?.classList.remove('active', 'paused');
  }

  togglePauseVoiceRecording() {
    const pauseBtn = document.getElementById('voiceStudioPauseBtn');
    const stateLabel = document.getElementById('voiceStudioStateText');
    const waveBars = document.getElementById('voiceStudioWave');

    if (this.isNativeRecording && window.AndroidVoiceBridge) {
      if (!this.isRecPaused) {
        window.AndroidVoiceBridge.pauseNativeRecording?.();
        this.isRecPaused = true;
        if (pauseBtn) pauseBtn.textContent = '▶ Devam Et';
        if (stateLabel) stateLabel.textContent = 'Kayıt Duraklatıldı';
        waveBars?.classList.add('paused');
      } else {
        window.AndroidVoiceBridge.resumeNativeRecording?.();
        this.isRecPaused = false;
        if (pauseBtn) pauseBtn.textContent = '⏸ Duraklat';
        if (stateLabel) stateLabel.textContent = 'Ses Kaydediliyor...';
        waveBars?.classList.remove('paused');
      }
      return;
    }

    if (!this.mediaRecorder) return;
    if (this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.isRecPaused = true;
      if (pauseBtn) pauseBtn.textContent = '▶ Devam Et';
      if (stateLabel) stateLabel.textContent = 'Kayıt Duraklatıldı';
      waveBars?.classList.add('paused');
    } else if (this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.isRecPaused = false;
      if (pauseBtn) pauseBtn.textContent = '⏸ Duraklat';
      if (stateLabel) stateLabel.textContent = 'Ses Kaydediliyor...';
      waveBars?.classList.remove('paused');
    }
  }

  stopVoiceRecordingInModal(autoDrop = false) {
    clearInterval(this.recTimerInterval);
    const duration = Math.max(1, this.recElapsedSec || 1);

    if (this.isNativeRecording && window.AndroidVoiceBridge) {
      this.isNativeRecording = false;
      const dataUrl = window.AndroidVoiceBridge.stopNativeRecording();
      if (dataUrl && dataUrl.startsWith('data:audio')) {
        this.recordedAudioDataUrl = dataUrl;
        this.recordedDurationSec = duration;
        this.setModalReadyState(duration);
        if (autoDrop) {
          this.finalizeDropVoiceNoteToPage();
        }
      } else {
        this.showToast('Ses kaydı tamamlanamadı.');
      }
      return;
    }

    if (!this.mediaRecorder) return;
    this.recCancelled = false;
    this.autoDropAfterStop = autoDrop;
    if (this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  dropVoiceAndNoteToPage() {
    if (this.isCurrentlyRecording()) {
      this.stopVoiceRecordingInModal(true);
      return;
    }
    this.finalizeDropVoiceNoteToPage();
  }

  finalizeDropVoiceNoteToPage() {
    const noteInput = document.getElementById('voiceStudioNoteInput');
    const noteText = (noteInput?.value || '').trim();

    if (this.recordedAudioDataUrl) {
      const count = (this.engine.page?.audioNotes || []).length + 1;
      this.engine.addAudioNoteToPage({
        title: noteText || `Sesli Not ${count}`,
        durationSec: this.recordedDurationSec || 1,
        dataUrl: this.recordedAudioDataUrl
      });
      document.getElementById('voiceNoteStudioModal')?.classList.add('hidden');
      this.recordedAudioDataUrl = null;
      this.showToast('🎙️ Ses kaydı ve notunuz sayfaya eklendi! Üst çubuğundan tutup taşıyabilirsiniz.');
      return;
    }

    if (noteText) {
      const scrollY = this.engine.viewportEl ? this.engine.viewportEl.scrollTop / (this.engine.zoom || 1) : 0;
      this.engine.createTextBoxAt(120, Math.max(80, Math.round(scrollY + 140)), noteText);
      document.getElementById('voiceNoteStudioModal')?.classList.add('hidden');
      this.showToast('📝 Notunuz sayfaya taşınabilir metin kutusu olarak eklendi!');
      return;
    }

    this.showToast('Lütfen önce "Kaydı Başlat" butonuna basarak ses kaydedin veya bir not yazın.');
  }

  cancelVoiceRecording() {
    clearInterval(this.recTimerInterval);
    this.recCancelled = true;
    this.autoDropAfterStop = false;
    if (this.isNativeRecording && window.AndroidVoiceBridge) {
      this.isNativeRecording = false;
      window.AndroidVoiceBridge.cancelNativeRecording?.();
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.cleanupVoiceStream();
  }

  cleanupVoiceStream() {
    clearInterval(this.recTimerInterval);
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }
  }

  /**
   * PDF Dosyasını Sayfalara Dönüştürüp Not Defterine Aktarma
   */
  async handlePdfFileImport(file) {
    this.showToast(`"${file.name}" PDF belgesi işleniyor...`);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;

      if (pdfjsLib) {
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = Math.min(pdfDoc.numPages, 25);
        const insertedPages = [];

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const pdfPage = await pdfDoc.getPage(pageNum);
          const viewport = pdfPage.getViewport({ scale: 1.8 });
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = viewport.width;
          tempCanvas.height = viewport.height;
          const tempCtx = tempCanvas.getContext('2d');

          await pdfPage.render({ canvasContext: tempCtx, viewport }).promise;
          const pageDataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);

          insertedPages.push({
            id: `pg-pdf-${Date.now()}-${pageNum}`,
            template: 'blank',
            paperColor: 'white',
            bgImageData: pageDataUrl,
            strokes: [],
            shapes: [],
            textBoxes: [],
            images: [],
            attachments: [],
            audioNotes: []
          });
        }

        if (insertedPages.length > 0) {
          const curIdx = this.activeNotebook.activePageIndex || 0;
          const curPg = this.activeNotebook.pages[curIdx];
          const isCurPageEmpty =
            curPg &&
            curPg.strokes.length === 0 &&
            curPg.shapes.length === 0 &&
            curPg.textBoxes.length === 0 &&
            !curPg.bgImageData;

          if (isCurPageEmpty) {
            this.activeNotebook.pages.splice(curIdx, 1, ...insertedPages);
          } else {
            this.activeNotebook.pages.splice(curIdx + 1, 0, ...insertedPages);
            this.activeNotebook.activePageIndex = curIdx + 1;
          }

          this.loadActiveNotebookIntoWorkspace();
          this.scheduleAutoSave();
          this.showToast(`PDF (${insertedPages.length} sayfa) başarıyla eklendi! Üzerine yazabilirsiniz.`);
          return;
        }
      }
    } catch (err) {
      console.warn('PDF.js render hatası, dosya kartı olarak ekleniyor:', err);
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      this.engine.addAttachmentToPage({
        name: file.name,
        ext: 'PDF',
        sizeLabel: `${(file.size / 1024).toFixed(1)} KB`,
        dataUrl: ev.target.result
      });
      this.showToast(`"${file.name}" sayfaya PDF kartı olarak eklendi.`);
    };
    reader.readAsDataURL(file);
  }

  /**
   * Herhangi Bir Dosyayı (Görsel, Ses, PDF, TXT/MD, JSON veya Belge) Sayfaya Ekleme
   */
  async handleGenericFileImport(file) {
    const name = file.name || 'dosya';
    const ext = (name.split('.').pop() || 'DOSYA').toLowerCase();

    if (file.type.startsWith('audio/') || ['mp3', 'm4a', 'wav', 'ogg', 'aac'].includes(ext)) {
      this.handleAudioFileImport(file);
      return;
    }

    if (file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        this.engine.addImageToPage(ev.target.result);
        this.showToast(`"${name}" görseli sayfaya eklendi.`);
      };
      reader.readAsDataURL(file);
      return;
    }

    if (file.type === 'application/pdf' || ext === 'pdf') {
      await this.handlePdfFileImport(file);
      return;
    }

    if (ext === 'json' && name.includes('tabnote')) {
      this.importJsonBackupFile(file);
      return;
    }

    if (file.type.startsWith('text/') || ['txt', 'md', 'csv', 'log'].includes(ext)) {
      const textContent = await file.text();
      this.engine.createTextBoxAt(
        80,
        120,
        `📄 ${name}\n────────────────────\n${textContent.slice(0, 3000)}`
      );
      this.showToast(`"${name}" metin içeriği sayfaya eklendi.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const kb = (file.size / 1024).toFixed(1);
      this.engine.addAttachmentToPage({
        name,
        ext: ext.toUpperCase(),
        sizeLabel: `${kb} KB`,
        dataUrl: ev.target.result
      });
      this.showToast(`"${name}" dosyası sayfaya eklendi.`);
    };
    reader.readAsDataURL(file);
  }

  importJsonBackupFile(file) {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (imported && imported.pages && Array.isArray(imported.pages)) {
          imported.id = `nb-${Date.now()}`;
          imported.title = `${imported.title || 'İçe Aktarılan Not'}`;
          await storage.saveNotebook(imported);
          this.notebooks = await storage.getAllNotebooks();
          this.activeNotebook = imported;
          this.renderSidebar();
          this.loadActiveNotebookIntoWorkspace();
          document.getElementById('exportModal').classList.add('hidden');
          this.showToast('Not defteri başarıyla içe aktarıldı!');
        }
      } catch {
        this.showToast('Geçersiz yedek dosyası.');
      }
    };
    reader.readAsText(file);
  }

  selectTool(toolName) {
    const prevTool = this.engine.tool;
    if (PEN_LIKE_TOOLS.includes(prevTool)) {
      this.toolSizes[prevTool] = this.engine.strokeSize;
    }
    this.engine.tool = toolName;

    if (PEN_LIKE_TOOLS.includes(toolName)) {
      this.engine.strokeSize = this.toolSizes[toolName] ?? TOOL_DEFAULT_SIZES[toolName] ?? 4;
      if (toolName === 'highlighter') {
        if (!HIGHLIGHTER_PALETTE.includes(this.engine.color)) {
          this.engine.color = HIGHLIGHTER_PALETTE[0];
        }
      } else if (HIGHLIGHTER_PALETTE.includes(this.engine.color)) {
        this.engine.color = INK_PALETTE[0];
      }
    }

    document.getElementById('strokeSizeSlider').value = this.engine.strokeSize;
    document.getElementById('strokeSizeValue').textContent = `${this.engine.strokeSize} px`;

    document.getElementById('eraserSubPanel').classList.toggle('hidden', toolName !== 'eraser');
    document.getElementById('shapeSubPanel').classList.toggle('hidden', toolName !== 'shape');

    this.updatePenToolbarUI();
  }

  /**
   * KALEM İSTASYONU ÇENTİĞİ, AYARLAR PENCERESİ VE GRAFİK PENCERESİ
   */
  loadSettings() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {};
    } catch {
      saved = {};
    }
    return { ...DEFAULT_SETTINGS, ...saved };
  }

  saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {}
  }

  syncSettingsInputs() {
    const s = this.settings;
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.checked = !!val;
    };
    set('setPressure', s.pressure);
    set('setAutoShape', s.autoShape);
    set('setFingerScroll', s.fingerScroll);
    set('setDockOpen', s.dockOpen);
    set('setShowHud', s.showHud);
    set('pressureToggleChk', s.pressure);
    set('autoShapeToggleChk', s.autoShape);
  }

  applySettings() {
    const s = this.settings;
    this.engine.pressureEnabled = s.pressure;
    this.engine.autoShapeHold = s.autoShape;
    this.engine.fingerScrollMode = s.fingerScroll;
    document.querySelector('.studio-bottom-hud')?.classList.toggle('hidden', !s.showHud);
    this.setDockOpen(s.dockOpen, false);
    this.syncSettingsInputs();
    this.updatePenActiveUI();
  }

  setDockOpen(open, persist = true) {
    const wrap = document.getElementById('dockWrap');
    const btn = document.getElementById('dockToggleBtn');
    if (!wrap || !btn) return;
    wrap.classList.toggle('collapsed', !open);
    btn.setAttribute('aria-expanded', String(open));
    btn.title = open ? 'Kalem araçlarını gizle' : 'Kalem araçlarını göster';
    this.settings.dockOpen = open;
    const chk = document.getElementById('setDockOpen');
    if (chk) chk.checked = open;
    if (persist) this.saveSettings();
  }

  openSettingsModal() {
    this.syncSettingsInputs();
    document.getElementById('settingsModal')?.classList.remove('hidden');
  }

  closeSettingsModal() {
    document.getElementById('settingsModal')?.classList.add('hidden');
  }

  bindDockAndSettings() {
    const appShell = document.getElementById('appShell');

    // Çentik: kalem araçlarını aç / kapat
    document.getElementById('dockToggleBtn')?.addEventListener('click', () => {
      this.setDockOpen(document.getElementById('dockWrap').classList.contains('collapsed'));
    });

    // Dar ekranda sayfaya dokununca kenar çubuğu kapansın (beyaz alan ferah kalsın)
    document.getElementById('canvasViewport')?.addEventListener(
      'pointerdown',
      () => {
        if (window.innerWidth <= 1024) appShell?.classList.add('sidebar-collapsed');
      },
      { passive: true }
    );

    // Ayarlar penceresi
    ['homeSettingsBtn', 'sidebarSettingsBtn'].forEach((id) => {
      document.getElementById(id)?.addEventListener('click', () => this.openSettingsModal());
    });
    document
      .getElementById('closeSettingsModalBtn')
      ?.addEventListener('click', () => this.closeSettingsModal());
    document.getElementById('settingsModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'settingsModal') this.closeSettingsModal();
    });

    const bindToggle = (id, key, after) => {
      document.getElementById(id)?.addEventListener('change', (e) => {
        this.settings[key] = e.target.checked;
        this.saveSettings();
        if (after) after();
        this.syncSettingsInputs();
      });
    };
    bindToggle('setPressure', 'pressure', () => (this.engine.pressureEnabled = this.settings.pressure));
    bindToggle('setAutoShape', 'autoShape', () => (this.engine.autoShapeHold = this.settings.autoShape));
    bindToggle('setFingerScroll', 'fingerScroll', () => {
      this.engine.fingerScrollMode = this.settings.fingerScroll;
      this.updatePenActiveUI();
    });
    bindToggle('setDockOpen', 'dockOpen', () => this.setDockOpen(this.settings.dockOpen, false));
    bindToggle('setShowHud', 'showHud', () =>
      document.querySelector('.studio-bottom-hud')?.classList.toggle('hidden', !this.settings.showHud)
    );

    // Dock'taki kısayol anahtarları da ayarlara yansısın
    document.getElementById('pressureToggleChk')?.addEventListener('change', (e) => {
      this.settings.pressure = e.target.checked;
      this.saveSettings();
      this.syncSettingsInputs();
    });
    document.getElementById('autoShapeToggleChk')?.addEventListener('change', (e) => {
      this.settings.autoShape = e.target.checked;
      this.saveSettings();
      this.syncSettingsInputs();
    });
    document.getElementById('fingerScrollToggleBtn')?.addEventListener('click', () => {
      this.settings.fingerScroll = this.engine.fingerScrollMode;
      this.saveSettings();
      this.syncSettingsInputs();
    });

    // Tüm defterleri yedekle
    document.getElementById('settingsExportAllBtn')?.addEventListener('click', async () => {
      const all = await storage.getAllNotebooks();
      const blob = new Blob([JSON.stringify({ app: 'TabNote Studio', notebooks: all }, null, 2)], {
        type: 'application/json'
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `tabnote-tum-defterler-${new Date().toISOString().slice(0, 10)}.tabnote.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      this.showToast(`${all.length} defter yedeklendi.`);
    });

    // Tüm verileri sil (yazı ile onay)
    document.getElementById('settingsWipeBtn')?.addEventListener('click', () => {
      this.closeSettingsModal();
      this.openPromptModal({
        title: 'Tüm veriler silinecek! Onaylamak için SİL yazın',
        placeholder: 'SİL',
        defaultValue: '',
        onConfirm: async (val) => {
          if (val.trim().toLocaleLowerCase('tr') !== 'sil') {
            this.showToast('Onay yazılmadığı için hiçbir şey silinmedi.');
            return;
          }
          const all = await storage.getAllNotebooks();
          for (const nb of all) {
            await storage.deleteNotebook(nb.id);
          }
          this.notebooks = await storage.getAllNotebooks();
          this.activeNotebook = this.notebooks[0];
          this.renderSidebar();
          this.loadActiveNotebookIntoWorkspace();
          this.showHomeScreen();
          this.showToast('Tüm veriler silindi, örnek defterler yeniden oluşturuldu.');
        }
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      this.closeSettingsModal();
      this.closeChartModal();
    });

    this.bindChartEvents();
  }

  /**
   * GRAFİK EKLE PENCERESİ VE ÇİZİMİ
   */
  openChartModal() {
    if (!this.chartState.rows.length) {
      this.chartState.rows = [
        { l: 'Ocak', v: '12' },
        { l: 'Şubat', v: '19' },
        { l: 'Mart', v: '8' },
        { l: 'Nisan', v: '15' }
      ];
    }
    this.renderChartRows();
    this.renderChartSwatches();
    this.applyChartType(this.chartState.type);
    const canvas = document.getElementById('chartPreviewCanvas');
    if (canvas) {
      canvas.width = 720;
      canvas.height = 480;
    }
    document.getElementById('chartModal')?.classList.remove('hidden');
    this.updateChartPreview();
  }

  closeChartModal() {
    document.getElementById('chartModal')?.classList.add('hidden');
  }

  applyChartType(type) {
    this.chartState.type = type;
    document.querySelectorAll('.chart-type-btn').forEach((b) => {
      const on = b.dataset.chartType === type;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    document.getElementById('chartDataPanel')?.classList.toggle('hidden', type === 'func');
    document.getElementById('chartFuncPanel')?.classList.toggle('hidden', type !== 'func');
    document.getElementById('chartColorSwatches')?.parentElement
      ?.querySelectorAll('.chart-color-section')
      .forEach((el) => el.classList.toggle('hidden', type === 'pie'));
    this.updateChartPreview();
  }

  renderChartRows() {
    const host = document.getElementById('chartDataRows');
    if (!host) return;
    host.innerHTML = '';
    this.chartState.rows.forEach((row, idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'chart-row';

      const label = document.createElement('input');
      label.type = 'text';
      label.className = 'chart-row-label';
      label.placeholder = 'Etiket';
      label.value = row.l;
      label.setAttribute('aria-label', `Etiket ${idx + 1}`);
      label.addEventListener('input', () => {
        row.l = label.value;
        this.updateChartPreview();
      });

      const val = document.createElement('input');
      val.type = 'text';
      val.inputMode = 'decimal';
      val.className = 'chart-row-value';
      val.placeholder = 'Değer';
      val.value = row.v;
      val.setAttribute('aria-label', `Değer ${idx + 1}`);
      val.addEventListener('input', () => {
        row.v = val.value;
        this.updateChartPreview();
      });

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'chart-row-del';
      del.setAttribute('aria-label', `${idx + 1}. satırı sil`);
      del.textContent = '✕';
      del.addEventListener('click', () => {
        if (this.chartState.rows.length <= 1) return;
        this.chartState.rows.splice(idx, 1);
        this.renderChartRows();
        this.updateChartPreview();
      });

      wrap.append(label, val, del);
      host.appendChild(wrap);
    });
  }

  renderChartSwatches() {
    const host = document.getElementById('chartColorSwatches');
    if (!host) return;
    host.innerHTML = '';
    CHART_COLORS.forEach((hex) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chart-swatch';
      b.style.backgroundColor = hex;
      b.setAttribute('aria-label', `Grafik rengi ${hex}`);
      b.classList.toggle('active', hex === this.chartState.color);
      b.addEventListener('click', () => {
        this.chartState.color = hex;
        this.renderChartSwatches();
        this.updateChartPreview();
      });
      host.appendChild(b);
    });
  }

  getChartSpec() {
    const rows = this.chartState.rows
      .map((r) => ({
        label: (r.l || '').trim() || '-',
        value: parseFloat(String(r.v).replace(',', '.'))
      }))
      .filter((r) => isFinite(r.value));
    return {
      type: this.chartState.type,
      title: (document.getElementById('chartTitleInput')?.value || '').trim(),
      color: this.chartState.color,
      labels: rows.map((r) => r.label),
      values: rows.map((r) => r.value),
      expr: document.getElementById('chartFuncInput')?.value || '',
      xmin: Number(document.getElementById('chartXMin')?.value),
      xmax: Number(document.getElementById('chartXMax')?.value)
    };
  }

  updateChartPreview() {
    const canvas = document.getElementById('chartPreviewCanvas');
    if (!canvas) return;
    const spec = this.getChartSpec();
    drawChart(canvas.getContext('2d'), 720, 480, spec);
  }

  bindChartEvents() {
    document.getElementById('openChartModalBtn')?.addEventListener('click', () => this.openChartModal());
    ['closeChartModalBtn', 'chartCancelBtn'].forEach((id) =>
      document.getElementById(id)?.addEventListener('click', () => this.closeChartModal())
    );
    document.getElementById('chartModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'chartModal') this.closeChartModal();
    });

    document.querySelectorAll('.chart-type-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.applyChartType(btn.dataset.chartType));
    });

    document.getElementById('chartAddRowBtn')?.addEventListener('click', () => {
      if (this.chartState.rows.length >= 12) {
        this.showToast('En fazla 12 veri satırı eklenebilir.');
        return;
      }
      this.chartState.rows.push({ l: `Veri ${this.chartState.rows.length + 1}`, v: '' });
      this.renderChartRows();
    });

    ['chartTitleInput', 'chartFuncInput', 'chartXMin', 'chartXMax'].forEach((id) =>
      document.getElementById(id)?.addEventListener('input', () => this.updateChartPreview())
    );

    document.getElementById('chartInsertBtn')?.addEventListener('click', () => {
      const spec = this.getChartSpec();
      const err = document.getElementById('chartErrorText');
      let message = '';
      if (spec.type === 'func') {
        if (!compileFunction(spec.expr)) message = 'Fonksiyon anlaşılamadı. Örn: x^2, sin(x), 2*x+1';
        else if (!(spec.xmin < spec.xmax)) message = 'x min değeri x max değerinden küçük olmalı.';
      } else if (spec.values.length === 0) {
        message = 'Lütfen en az bir sayısal değer girin.';
      }
      if (message) {
        if (err) {
          err.textContent = message;
          err.classList.remove('hidden');
        }
        return;
      }
      err?.classList.add('hidden');
      const { dataUrl } = renderChartDataUrl(spec, 720, 480, 2);
      this.engine.addImageToPage(dataUrl, 0, 480);
      this.closeChartModal();
      this.showToast('📊 Grafik sayfaya eklendi. Taşıyabilir ve boyutlandırabilirsiniz.');
    });
  }

  /**
   * DEVREM STUDIO EEM DEVRE SEMBOLLERİ
   */
  openDevremModal() {
    this.renderDevremSymbols('all');
    document.getElementById('devremModal')?.classList.remove('hidden');
  }

  closeDevremModal() {
    document.getElementById('devremModal')?.classList.add('hidden');
  }

  renderDevremSymbols(category = 'all') {
    const grid = document.getElementById('devremSymbolsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const list = category === 'all'
      ? DEVREM_SYMBOLS
      : DEVREM_SYMBOLS.filter((s) => s.category === category);

    for (const sym of list) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'devrem-symbol-card';
      card.title = `${sym.name} sayfaya ekle`;
      card.innerHTML = `
        <div class="devrem-symbol-preview">
          ${sym.svg}
        </div>
        <span class="devrem-symbol-name">${sym.name}</span>
      `;

      card.addEventListener('click', () => {
        this.insertDevremSymbol(sym);
      });

      grid.appendChild(card);
    }
  }

  insertDevremSymbol(symbolObj) {
    if (!this.engine || !this.activeNotebook) return;
    const dataUrl = svgToDataUrl(symbolObj.svg);
    this.engine.addImageToPage(dataUrl, 0, symbolObj.width || 140);
    this.closeDevremModal();
    this.showToast(`⚡ ${symbolObj.name} devre sembolü sayfaya eklendi.`);
  }

  bindDevremEvents() {
    document.getElementById('openDevremModalBtn')?.addEventListener('click', () => {
      this.openDevremModal();
    });

    ['closeDevremModalBtn', 'devremCloseBtn'].forEach((id) => {
      document.getElementById(id)?.addEventListener('click', () => this.closeDevremModal());
    });

    document.getElementById('devremModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'devremModal') this.closeDevremModal();
    });

    document.querySelectorAll('.devrem-cat-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.devrem-cat-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderDevremSymbols(btn.dataset.cat);
      });
    });
  }

  setInkColor(hex) {
    this.engine.color = hex;
    document.getElementById('customColorPicker').value = hex;
    this.updatePenToolbarUI();
  }

  updatePenToolbarUI() {
    document.querySelectorAll('.tool-dock-btn[data-tool]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tool === this.engine.tool);
    });

    document.querySelectorAll('.dynamic-ink-nib').forEach((el) => {
      el.style.fill = this.engine.color;
      el.style.stroke = this.engine.color;
    });

    const paletteContainer = document.getElementById('colorSwatchesContainer');
    paletteContainer.innerHTML = '';
    const palette =
      this.engine.tool === 'highlighter' ? HIGHLIGHTER_PALETTE : INK_PALETTE;

    for (const hex of palette) {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'color-swatch-btn';
      if (hex.toLowerCase() === this.engine.color.toLowerCase()) {
        swatch.classList.add('active');
      }
      swatch.style.backgroundColor = hex;
      if (hex.toLowerCase() === '#f8fafc') {
        swatch.style.border = '1px solid #64748B';
      }
      swatch.title = `Mürekkep Rengi: ${hex}`;
      swatch.addEventListener('click', () => this.setInkColor(hex));
      paletteContainer.appendChild(swatch);
    }

    this.updateQuickWidthDots();
  }

  updateQuickWidthDots() {
    document.querySelectorAll('.width-preset-btn').forEach((btn) => {
      const s = Number(btn.dataset.size);
      btn.classList.toggle('active', Math.abs(s - this.engine.strokeSize) <= 1.5);
    });
  }

  renderHomeScreen() {
    this.renderHomeFoldersGrid();
    this.renderHomeNotebooksGrid();
  }

  renderHomeFoldersGrid() {
    const gridEl = document.getElementById('homeFoldersGrid');
    const countBadge = document.getElementById('homeFolderCountBadge');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    if (countBadge) {
      countBadge.textContent = `${this.folders.length} Klasör`;
    }

    for (const fld of this.folders) {
      const count = this.getNotebooksForFolder(fld.id).length;
      const isSelected = this.activeFolderId === fld.id;
      const card = document.createElement('div');
      card.className = `home-folder-card ${isSelected ? 'active' : ''}`;
      card.style.setProperty('--fld-color', fld.color || '#3B82F6');

      const iconSymbol = fld.id === 'all' ? '📚' : fld.id === 'favorites' ? '⭐' : '📁';

      card.innerHTML = `
        <div class="home-folder-card-top">
          <div class="home-folder-icon-wrap" style="background:${fld.color}22; color:${fld.color}">
            <span>${iconSymbol}</span>
          </div>
          ${
            !fld.system
              ? `<button type="button" class="home-folder-del-btn" title="Klasörü Sil">✕</button>`
              : ''
          }
        </div>
        <div class="home-folder-card-body">
          <h3 class="home-folder-title">${this.escapeHtml(fld.name)}</h3>
          <span class="home-folder-meta">${count} Not Defteri</span>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.home-folder-del-btn')) return;
        this.activeFolderId = fld.id;
        this.renderHomeScreen();
        this.renderSidebar();
      });

      const delBtn = card.querySelector('.home-folder-del-btn');
      if (delBtn) {
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          this.folders = this.folders.filter((f) => f.id !== fld.id);
          await storage.saveFolders(this.folders);
          if (this.activeFolderId === fld.id) {
            this.activeFolderId = 'all';
          }
          this.renderHomeScreen();
          this.renderSidebar();
          this.showToast(`"${fld.name}" klasörü silindi.`);
        });
      }

      gridEl.appendChild(card);
    }

    // Hızlı "+ Yeni Klasör" Kartı
    const addFolderCard = document.createElement('button');
    addFolderCard.type = 'button';
    addFolderCard.className = 'home-folder-card add-new-folder-card';
    addFolderCard.innerHTML = `
      <div class="add-folder-plus">+</div>
      <span>Yeni Klasör Oluştur</span>
    `;
    addFolderCard.addEventListener('click', () => {
      this.promptCreateNewFolder();
    });
    gridEl.appendChild(addFolderCard);
  }

  renderHomeNotebooksGrid() {
    const gridEl = document.getElementById('homeNotebooksGrid');
    const titleEl = document.getElementById('homeNotebooksSectionTitle');
    const countBadge = document.getElementById('homeNotebookCountBadge');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    const activeFldObj = this.folders.find((f) => f.id === this.activeFolderId) || this.folders[0];
    if (titleEl && activeFldObj) {
      titleEl.textContent = `Not Defterleri — ${activeFldObj.name}`;
    }

    let filtered = this.getNotebooksForFolder(this.activeFolderId);
    if (this.homeSearchQuery) {
      filtered = filtered.filter((nb) => {
        const inTitle = (nb.title || '').toLowerCase().includes(this.homeSearchQuery);
        const inText = (nb.pages || []).some((pg) =>
          (pg.textBoxes || []).some((tb) =>
            (tb.text || '').toLowerCase().includes(this.homeSearchQuery)
          )
        );
        return inTitle || inText;
      });
    }

    if (countBadge) {
      countBadge.textContent = `${filtered.length} Defter`;
    }

    // 1. "+ Yeni Not Defteri Oluştur" Kartı
    const createCard = document.createElement('button');
    createCard.type = 'button';
    createCard.className = 'home-notebook-create-card';
    createCard.innerHTML = `
      <div class="create-nb-circle">+</div>
      <strong>Yeni Not Defteri</strong>
      <span>${this.escapeHtml(activeFldObj?.name || 'Bu klasöre')} yeni defter aç</span>
    `;
    createCard.addEventListener('click', () => {
      this.openCreateNotebookModal();
    });
    gridEl.appendChild(createCard);

    // 2. Mevcut Not Defteri Kapak Kartları
    for (const nb of filtered) {
      const card = document.createElement('div');
      card.className = 'home-notebook-card';

      const folderObj =
        this.folders.find((f) => f.id === nb.folderId) ||
        this.folders.find((f) => !f.system) ||
        this.folders[0];

      const dateStr = new Date(nb.updatedAt || Date.now()).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });

      const previewWrap = document.createElement('div');
      previewWrap.className = 'home-nb-preview-wrap';

      const spine = document.createElement('div');
      spine.className = 'home-nb-spine';
      spine.style.background = nb.coverColor || folderObj?.color || '#2563EB';

      const previewCanvas = document.createElement('canvas');
      previewCanvas.width = 210;
      previewCanvas.height = 289;
      const pCtx = previewCanvas.getContext('2d');
      const scale = 210 / PAGE_WIDTH;
      pCtx.scale(scale, scale);

      const firstPage = (nb.pages && nb.pages[0]) || { template: 'ruled', paperColor: 'ivory' };
      const bgImg = this.engine?.bgImageCache?.get(firstPage.id) || null;
      renderPaperBackground(
        pCtx,
        PAGE_WIDTH,
        PAGE_HEIGHT,
        firstPage.template || 'ruled',
        firstPage.paperColor || 'ivory',
        bgImg
      );
      if (this.engine) {
        for (const st of firstPage.strokes || []) {
          this.engine.drawStroke(pCtx, st);
        }
        for (const sh of firstPage.shapes || []) {
          this.engine.drawGeometricShape(pCtx, sh);
        }
      }

      const favBadgeBtn = document.createElement('button');
      favBadgeBtn.type = 'button';
      favBadgeBtn.className = `home-nb-fav-btn ${nb.favorite ? 'is-fav' : ''}`;
      favBadgeBtn.textContent = '★';
      favBadgeBtn.title = nb.favorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle';
      favBadgeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        nb.favorite = !nb.favorite;
        await storage.saveNotebook(nb);
        this.renderHomeScreen();
        this.renderSidebar();
      });

      previewWrap.append(spine, previewCanvas, favBadgeBtn);

      const infoBody = document.createElement('div');
      infoBody.className = 'home-nb-info';
      infoBody.innerHTML = `
        <div class="home-nb-title-row">
          <h4 class="home-nb-title">${this.escapeHtml(nb.title || 'Adsız Not Defteri')}</h4>
          <button type="button" class="home-nb-del-btn" title="Not Defterini Sil">🗑 Sil</button>
        </div>
        <div class="home-nb-meta-row">
          <span class="home-nb-folder-chip" style="border-color:${folderObj?.color || '#3B82F6'}55">
            ${this.escapeHtml(folderObj?.name || 'Genel')}
          </span>
          <span>${nb.pages?.length || 1} sayfa</span>
          <span>• ${dateStr}</span>
        </div>
      `;

      infoBody.querySelector('.home-nb-del-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        await storage.deleteNotebook(nb.id);
        this.notebooks = await storage.getAllNotebooks();
        if (this.activeNotebook?.id === nb.id) {
          this.activeNotebook = this.notebooks[0] || null;
        }
        this.renderHomeScreen();
        this.renderSidebar();
        this.showToast(`"${nb.title || 'Not defteri'}" silindi.`);
      });

      card.append(previewWrap, infoBody);
      card.addEventListener('click', (e) => {
        if (e.target.closest('.home-nb-del-btn') || e.target.closest('.home-nb-fav-btn')) return;
        this.openNotebookInEditor(nb);
      });

      gridEl.appendChild(card);
    }
  }

  renderSidebar() {
    const folderListEl = document.getElementById('folderListContainer');
    folderListEl.innerHTML = '';

    for (const fld of this.folders) {
      const count = this.getNotebooksForFolder(fld.id).length;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `folder-nav-item ${this.activeFolderId === fld.id ? 'active' : ''}`;
      item.innerHTML = `
        <span class="folder-dot" style="background:${fld.color}"></span>
        <span class="folder-name">${this.escapeHtml(fld.name)}</span>
        <span class="folder-count">${count}</span>
      `;
      item.addEventListener('click', () => {
        this.activeFolderId = fld.id;
        this.renderSidebar();
        if (this.isHomeView) this.renderHomeScreen();
      });
      folderListEl.appendChild(item);
    }

    this.renderNotebookList();
  }

  getNotebooksForFolder(folderId) {
    return this.notebooks.filter((nb) => {
      if (folderId === 'all') return true;
      if (folderId === 'favorites') return !!nb.favorite;
      return nb.folderId === folderId;
    });
  }

  renderNotebookList() {
    const listEl = document.getElementById('notebookCardsContainer');
    listEl.innerHTML = '';

    let filtered = this.getNotebooksForFolder(this.activeFolderId);
    if (this.searchQuery) {
      filtered = filtered.filter((nb) => {
        const inTitle = (nb.title || '').toLowerCase().includes(this.searchQuery);
        const inText = (nb.pages || []).some((pg) =>
          (pg.textBoxes || []).some((tb) => (tb.text || '').toLowerCase().includes(this.searchQuery))
        );
        return inTitle || inText;
      });
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="empty-notebooks-state">
          <p>Bu klasörde henüz not defteri yok.</p>
          <button type="button" class="btn-secondary-sm" id="emptyCreateNbBtn">+ Yeni Not Defteri Aç</button>
        </div>
      `;
      document.getElementById('emptyCreateNbBtn')?.addEventListener('click', () => {
        this.openCreateNotebookModal();
      });
      return;
    }

    for (const nb of filtered) {
      const card = document.createElement('div');
      card.className = `notebook-card ${this.activeNotebook?.id === nb.id ? 'active' : ''}`;

      const folderObj =
        this.folders.find((f) => f.id === nb.folderId) ||
        this.folders.find((f) => !f.system) ||
        this.folders[0];
      const dateStr = new Date(nb.updatedAt || Date.now()).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });

      card.innerHTML = `
        <div class="nb-card-spine" style="background:${nb.coverColor || folderObj.color}"></div>
        <div class="nb-card-body">
          <div class="nb-card-top">
            <h4 class="nb-card-title">${this.escapeHtml(nb.title || 'Adsız Not Defteri')}</h4>
            ${nb.favorite ? '<span class="nb-fav-star" title="Favori">★</span>' : ''}
          </div>
          <div class="nb-card-meta">
            <span class="nb-folder-tag">${this.escapeHtml(folderObj.name)}</span>
            <span>• ${nb.pages?.length || 1} sayfa</span>
            <span>• ${dateStr}</span>
          </div>
        </div>
        <button type="button" class="nb-card-del-btn" title="Not Defterini Sil">🗑</button>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.nb-card-del-btn')) return;
        this.openNotebookInEditor(nb);
      });

      card.querySelector('.nb-card-del-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        await storage.deleteNotebook(nb.id);
        this.notebooks = await storage.getAllNotebooks();
        if (this.activeNotebook?.id === nb.id) {
          this.activeNotebook = this.notebooks[0] || null;
          if (this.activeNotebook) {
            this.loadActiveNotebookIntoWorkspace();
          } else {
            this.showHomeScreen();
          }
        }
        this.renderSidebar();
        this.renderHomeScreen();
        this.showToast(`"${nb.title || 'Not defteri'}" silindi.`);
      });

      listEl.appendChild(card);
    }
  }

  renderPageThumbnails() {
    const container = document.getElementById('pageThumbnailsGrid');
    if (!container || !this.activeNotebook) return;
    container.innerHTML = '';

    this.activeNotebook.pages.forEach((pg, index) => {
      const card = document.createElement('div');
      card.className = `page-thumb-card ${
        index === this.activeNotebook.activePageIndex ? 'active' : ''
      }`;

      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 180;
      thumbCanvas.height = 248;
      const tCtx = thumbCanvas.getContext('2d');
      const scale = 180 / PAGE_WIDTH;
      tCtx.scale(scale, scale);

      const bgImg = this.engine.bgImageCache.get(pg.id) || null;
      renderPaperBackground(
        tCtx,
        PAGE_WIDTH,
        PAGE_HEIGHT,
        pg.template || 'ruled',
        pg.paperColor || 'ivory',
        bgImg
      );

      for (const st of pg.strokes || []) {
        this.engine.drawStroke(tCtx, st);
      }
      for (const sh of pg.shapes || []) {
        this.engine.drawGeometricShape(tCtx, sh);
      }

      const footer = document.createElement('div');
      footer.className = 'page-thumb-footer';
      footer.innerHTML = `
        <span class="page-thumb-num">Sayfa ${index + 1}</span>
        <div class="page-thumb-actions">
          <button type="button" class="thumb-act-btn dup" title="Sayfayı Çoğalt">⧉</button>
          <button type="button" class="thumb-act-btn del" title="Sayfayı Sil">✕</button>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.thumb-act-btn')) return;
        this.activatePageSlot(index, true);
      });

      footer.querySelector('.dup').addEventListener('click', (e) => {
        e.stopPropagation();
        const cloned = JSON.parse(JSON.stringify(pg));
        cloned.id = `pg-${Date.now()}`;
        this.activeNotebook.pages.splice(index + 1, 0, cloned);
        this.activeNotebook.activePageIndex = index + 1;
        this.loadActiveNotebookIntoWorkspace(true);
        this.scheduleAutoSave();
        this.showToast(`Sayfa ${index + 1} çoğaltıldı.`);
      });

      footer.querySelector('.del').addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.activeNotebook.pages.length <= 1) {
          this.showToast('Not defterinde en az 1 sayfa bulunmalıdır.');
          return;
        }
        this.activeNotebook.pages.splice(index, 1);
        this.activeNotebook.activePageIndex = Math.max(
          0,
          Math.min(this.activeNotebook.activePageIndex, this.activeNotebook.pages.length - 1)
        );
        this.loadActiveNotebookIntoWorkspace();
        this.scheduleAutoSave();
        this.showToast('Sayfa silindi.');
      });

      card.append(thumbCanvas, footer);
      container.appendChild(card);
    });
  }

  openCreateNotebookModal() {
    const modal = document.getElementById('createNotebookModal');
    const titleInput = document.getElementById('newNbTitleInput');
    const folderChipsEl = document.getElementById('newNbFolderChips');
    const coverSwatchesEl = document.getElementById('newNbCoverColorSwatches');
    const paperColorsEl = document.getElementById('newNbPaperColorsGrid');
    const templatesEl = document.getElementById('newNbTemplatesGrid');
    const confirmBtn = document.getElementById('confirmCreateNbBtn');
    if (!modal) return;

    const coverColors = [
      '#2563EB',
      '#059669',
      '#8B5CF6',
      '#EC4899',
      '#D97706',
      '#DC2626',
      '#0891B2',
      '#4F46E5'
    ];

    const customFolders = this.folders.filter((f) => !f.system);
    const defaultFolderId =
      this.activeFolderId !== 'all' && this.activeFolderId !== 'favorites'
        ? this.activeFolderId
        : customFolders[0]?.id || 'study';

    const draft = {
      title: `Yeni Not Defteri ${this.notebooks.length + 1}`,
      folderId: defaultFolderId,
      coverColor: coverColors[this.notebooks.length % coverColors.length],
      paperColor: 'ivory',
      template: 'ruled'
    };

    if (titleInput) {
      titleInput.value = draft.title;
    }

    const renderDraftChoices = () => {
      // 1. Klasör çipleri
      if (folderChipsEl) {
        folderChipsEl.innerHTML = '';
        for (const fld of customFolders) {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = `create-nb-folder-chip ${draft.folderId === fld.id ? 'active' : ''}`;
          chip.innerHTML = `<span class="folder-dot" style="background:${fld.color}"></span><span>${this.escapeHtml(fld.name)}</span>`;
          chip.addEventListener('click', () => {
            draft.folderId = fld.id;
            renderDraftChoices();
          });
          folderChipsEl.appendChild(chip);
        }

        const addFldBtn = document.createElement('button');
        addFldBtn.type = 'button';
        addFldBtn.className = 'create-nb-folder-chip add-folder-chip-btn';
        addFldBtn.innerHTML = `<span>+ Yeni Klasör Ekle</span>`;
        addFldBtn.addEventListener('click', () => {
          this.promptCreateNewFolder((created) => {
            if (created) {
              customFolders.push(created);
              draft.folderId = created.id;
              renderDraftChoices();
            }
          });
        });
        folderChipsEl.appendChild(addFldBtn);
      }

      // 2. Kapak renkleri
      if (coverSwatchesEl) {
        coverSwatchesEl.innerHTML = '';
        for (const hex of coverColors) {
          const sw = document.createElement('button');
          sw.type = 'button';
          sw.className = `create-nb-cover-swatch ${draft.coverColor === hex ? 'active' : ''}`;
          sw.style.background = hex;
          sw.title = `Kapak Rengi: ${hex}`;
          sw.addEventListener('click', () => {
            draft.coverColor = hex;
            renderDraftChoices();
          });
          coverSwatchesEl.appendChild(sw);
        }
      }

      // 3. Sayfa kağıt renkleri
      if (paperColorsEl) {
        paperColorsEl.innerHTML = '';
        for (const c of PAPER_COLORS) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `paper-color-choice ${draft.paperColor === c.id ? 'active' : ''}`;
          btn.innerHTML = `
            <span class="paper-color-preview" style="background:${c.bg}; border-color:${c.line}"></span>
            <span class="paper-color-name">${c.name}</span>
          `;
          btn.addEventListener('click', () => {
            draft.paperColor = c.id;
            renderDraftChoices();
          });
          paperColorsEl.appendChild(btn);
        }
      }

      // 4. Kağıt şablonları (Çizgili, Kareli, İzometrik, Noktalı, Düz Boş vb.)
      if (templatesEl) {
        templatesEl.innerHTML = '';
        for (const tpl of PAPER_TEMPLATES) {
          const card = document.createElement('button');
          card.type = 'button';
          card.className = `template-choice-card ${draft.template === tpl.id ? 'active' : ''}`;

          const miniCanvas = document.createElement('canvas');
          miniCanvas.width = 150;
          miniCanvas.height = 190;
          const mCtx = miniCanvas.getContext('2d');
          mCtx.scale(0.32, 0.32);
          renderPaperBackground(mCtx, 470, 600, tpl.id, draft.paperColor);

          const info = document.createElement('div');
          info.className = 'template-choice-info';
          info.innerHTML = `
            <strong>${tpl.name}</strong>
            <span>${tpl.desc}</span>
          `;

          card.append(miniCanvas, info);
          card.addEventListener('click', () => {
            draft.template = tpl.id;
            renderDraftChoices();
          });
          templatesEl.appendChild(card);
        }
      }
    };

    renderDraftChoices();
    modal.classList.remove('hidden');

    if (confirmBtn) {
      confirmBtn.onclick = async () => {
        draft.title = (titleInput?.value || '').trim() || `Yeni Not Defteri ${this.notebooks.length + 1}`;
        modal.classList.add('hidden');
        await this.createNewNotebook(true, draft);
      };
    }
  }

  async createNewNotebook(openInEditor = true, customConfig = null) {
    const targetFolder =
      customConfig?.folderId ||
      (this.activeFolderId === 'all' || this.activeFolderId === 'favorites'
        ? 'study'
        : this.activeFolderId);

    const colors = ['#2563EB', '#059669', '#8B5CF6', '#EC4899', '#D97706'];
    const chosenPaperColor = customConfig?.paperColor || 'ivory';
    const chosenTemplate = customConfig?.template || 'ruled';

    const newNb = {
      id: `nb-${Date.now()}`,
      title: customConfig?.title || `Yeni Not Defteri ${this.notebooks.length + 1}`,
      folderId: targetFolder,
      favorite: this.activeFolderId === 'favorites',
      coverColor: customConfig?.coverColor || colors[this.notebooks.length % colors.length],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      activePageIndex: 0,
      pages: [
        {
          id: `pg-${Date.now()}`,
          template: chosenTemplate,
          paperColor: chosenPaperColor,
          bgImageData: null,
          strokes: [],
          shapes: [],
          textBoxes: [],
          images: [],
          attachments: [],
          audioNotes: []
        }
      ]
    };

    // Koyu kağıt seçildiyse mürekkebi otomatik beyaz yap
    const colorObj = PAPER_COLORS.find((c) => c.id === chosenPaperColor);
    if (colorObj?.isDark && this.engine?.color.toLowerCase() === '#0f172a') {
      this.setInkColor('#F8FAFC');
    } else if (!colorObj?.isDark && this.engine?.color.toLowerCase() === '#f8fafc') {
      this.setInkColor('#0F172A');
    }

    await storage.saveNotebook(newNb);
    this.notebooks = await storage.getAllNotebooks();
    this.activeNotebook = newNb;
    this.renderSidebar();
    this.renderHomeScreen();
    if (openInEditor) {
      this.openNotebookInEditor(newNb);
    }
    this.showToast(`"${newNb.title}" oluşturuldu ve açıldı.`);
  }

  addNewPageToCurrentNotebook(appendToBottom = false) {
    if (!this.activeNotebook) return;
    const currentPg =
      this.activeNotebook.pages[this.activeNotebook.activePageIndex] ||
      this.activeNotebook.pages[this.activeNotebook.pages.length - 1] ||
      this.activeNotebook.pages[0];

    const newPage = {
      id: `pg-${Date.now()}`,
      template: currentPg?.template || 'ruled',
      paperColor: currentPg?.paperColor || 'ivory',
      bgImageData: null,
      strokes: [],
      shapes: [],
      textBoxes: [],
      images: [],
      attachments: [],
      audioNotes: []
    };

    const insertIdx = appendToBottom
      ? this.activeNotebook.pages.length
      : (this.activeNotebook.activePageIndex || 0) + 1;
    this.activeNotebook.pages.splice(insertIdx, 0, newPage);
    this.activeNotebook.activePageIndex = insertIdx;
    this.loadActiveNotebookIntoWorkspace(true);
    this.scheduleAutoSave();
    this.showToast(`Sayfa ${insertIdx + 1} eklendi.`);
  }

  openTemplateModal() {
    const modal = document.getElementById('templateModal');
    const colorGrid = document.getElementById('paperColorsGrid');
    const templateGrid = document.getElementById('paperTemplatesGrid');
    if (!this.engine.page) return;

    const currentPage = this.engine.page;

    const renderModalChoices = () => {
      colorGrid.innerHTML = '';
      for (const c of PAPER_COLORS) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `paper-color-choice ${currentPage.paperColor === c.id ? 'active' : ''}`;
        btn.innerHTML = `
          <span class="paper-color-preview" style="background:${c.bg}; border-color:${c.line}"></span>
          <span class="paper-color-name">${c.name}</span>
        `;
        btn.addEventListener('click', () => {
          currentPage.paperColor = c.id;
          if (c.isDark && this.engine.color.toLowerCase() === '#0f172a') {
            this.setInkColor('#F8FAFC');
          } else if (!c.isDark && this.engine.color.toLowerCase() === '#f8fafc') {
            this.setInkColor('#0F172A');
          }
          this.engine.renderMain();
          if (this.activeNotebook) {
            this.syncPagePreviewSlot(this.activeNotebook.activePageIndex || 0);
          }
          this.scheduleAutoSave();
          renderModalChoices();
        });
        colorGrid.appendChild(btn);
      }

      templateGrid.innerHTML = '';
      for (const tpl of PAPER_TEMPLATES) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = `template-choice-card ${currentPage.template === tpl.id ? 'active' : ''}`;

        const miniCanvas = document.createElement('canvas');
        miniCanvas.width = 150;
        miniCanvas.height = 190;
        const mCtx = miniCanvas.getContext('2d');
        mCtx.scale(0.32, 0.32);
        renderPaperBackground(mCtx, 470, 600, tpl.id, currentPage.paperColor || 'ivory');

        const info = document.createElement('div');
        info.className = 'template-choice-info';
        info.innerHTML = `
          <strong>${tpl.name}</strong>
          <span>${tpl.desc}</span>
        `;

        card.append(miniCanvas, info);
        card.addEventListener('click', () => {
          currentPage.template = tpl.id;
          this.engine.renderMain();
          if (this.activeNotebook) {
            this.syncPagePreviewSlot(this.activeNotebook.activePageIndex || 0);
          }
          this.scheduleAutoSave();
          renderModalChoices();
        });
        templateGrid.appendChild(card);
      }
    };

    renderModalChoices();
    modal.classList.remove('hidden');
  }

  async exportCurrentPageAsPNG() {
    if (!this.engine.page || !this.activeNotebook) return;
    this.showToast('Yüksek çözünürlüklü PNG hazırlanıyor...');
    const outCanvas = await this.engine.renderPageToExportCanvas(this.engine.page, 2);
    const link = document.createElement('a');
    const safeName = (this.activeNotebook.title || 'tabnote').replace(/[^a-z0-9ğüşıöç]/gi, '_');
    link.download = `${safeName}_sayfa_${(this.activeNotebook.activePageIndex || 0) + 1}.png`;
    link.href = outCanvas.toDataURL('image/png');
    link.click();
    document.getElementById('exportModal').classList.add('hidden');
    this.showToast('PNG görseli indirildi!');
  }

  async exportCurrentNotebookAsPDF() {
    if (!this.activeNotebook) return;
    this.showToast('Tüm sayfalar PDF belgesine dönüştürülüyor...');

    const jspdfNS = window.jspdf;
    if (jspdfNS && jspdfNS.jsPDF) {
      const pdf = new jspdfNS.jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [PAGE_WIDTH, PAGE_HEIGHT]
      });

      for (let i = 0; i < this.activeNotebook.pages.length; i++) {
        if (i > 0) pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT], 'portrait');
        const pg = this.activeNotebook.pages[i];
        const canvas = await this.engine.renderPageToExportCanvas(pg, 2);
        const imgData = canvas.toDataURL('image/jpeg', 0.94);
        pdf.addImage(imgData, 'JPEG', 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
      }

      const safeName = (this.activeNotebook.title || 'TabNote_Notlar').replace(
        /[^a-z0-9ğüşıöç_-]/gi,
        '_'
      );
      pdf.save(`${safeName}.pdf`);
      document.getElementById('exportModal').classList.add('hidden');
      this.showToast('Çok sayfalı PDF başarıyla indirildi!');
    } else {
      window.print();
    }
  }

  exportNotebookBackupJSON() {
    if (!this.activeNotebook) return;
    const dataStr = JSON.stringify(this.activeNotebook, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (this.activeNotebook.title || 'tabnote').replace(/[^a-z0-9ğüşıöç]/gi, '_');
    a.href = url;
    a.download = `${safeName}.tabnote.json`;
    a.click();
    URL.revokeObjectURL(url);
    document.getElementById('exportModal').classList.add('hidden');
    this.showToast('Not defteri yedek dosyası indirildi.');
  }

  openPromptModal({ title, placeholder, defaultValue, onConfirm }) {
    const modal = document.getElementById('promptModal');
    const titleEl = document.getElementById('promptModalTitle');
    const inputEl = document.getElementById('promptModalInput');
    const confirmBtn = document.getElementById('promptModalConfirmBtn');
    const cancelBtn = document.getElementById('promptModalCancelBtn');

    titleEl.textContent = title;
    inputEl.placeholder = placeholder || '';
    inputEl.value = defaultValue || '';
    modal.classList.remove('hidden');
    setTimeout(() => inputEl.focus(), 40);

    const cleanup = () => {
      modal.classList.add('hidden');
      confirmBtn.onclick = null;
      cancelBtn.onclick = null;
      inputEl.onkeydown = null;
    };

    confirmBtn.onclick = () => {
      const val = inputEl.value;
      cleanup();
      onConfirm(val);
    };
    cancelBtn.onclick = cleanup;
    inputEl.onkeydown = (e) => {
      if (e.key === 'Enter') confirmBtn.click();
      if (e.key === 'Escape') cleanup();
    };
  }

  showToast(msg) {
    const toast = document.getElementById('statusToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, 2800);
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new TabNoteApp();
  app.init();
});
