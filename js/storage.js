/**
 * TabNote Studio — IndexedDB & Otomatik Kayıt Depolama Katmanı
 * Çoklu klasör, çoklu not defteri, çok sayfalı vektörel çizimler, metin kutuları ve görselleri saklar.
 */

const DB_NAME = 'TabNoteStudioDB';
const DB_VERSION = 1;
const STORE_NOTEBOOKS = 'notebooks';
const STORE_META = 'meta';

export const DEFAULT_FOLDERS = [
  { id: 'all', name: 'Tüm Notlar', icon: 'notes', color: '#3B82F6', system: true },
  { id: 'favorites', name: 'Favoriler', icon: 'star', color: '#F59E0B', system: true },
  { id: 'study', name: 'Ders & Akademik', icon: 'folder', color: '#3B82F6', system: false },
  { id: 'work', name: 'Proje & Toplantı', icon: 'folder', color: '#10B981', system: false },
  { id: 'sketch', name: 'Eskiz & Tasarım', icon: 'folder', color: '#8B5CF6', system: false },
  { id: 'personal', name: 'Kişisel Günlük', icon: 'folder', color: '#EC4899', system: false }
];

function createDemoHandwritingStrokes() {
  // "TabNote" el yazısı karşılama vektörü ve fosforlu vurgu örneği
  return [
    // Alt fosforlu kalem vurgusu
    {
      id: 'st-demo-hl-1',
      tool: 'highlighter',
      color: '#FACC15',
      size: 24,
      opacity: 0.38,
      points: [
        { x: 112, y: 148, p: 0.6 },
        { x: 240, y: 148, p: 0.6 },
        { x: 390, y: 147, p: 0.6 },
        { x: 525, y: 148, p: 0.6 }
      ]
    },
    // Dolma kalem örnek imza / dalga çizgisi
    {
      id: 'st-demo-pen-1',
      tool: 'fountain',
      color: '#1E3A8A',
      size: 4.5,
      opacity: 1,
      points: [
        { x: 115, y: 238, p: 0.25 },
        { x: 135, y: 210, p: 0.75 },
        { x: 155, y: 242, p: 0.45 },
        { x: 182, y: 215, p: 0.85 },
        { x: 210, y: 240, p: 0.35 },
        { x: 245, y: 218, p: 0.8 },
        { x: 280, y: 238, p: 0.4 },
        { x: 325, y: 222, p: 0.65 },
        { x: 375, y: 234, p: 0.25 }
      ]
    }
  ];
}

export function createStarterNotebooks() {
  const now = Date.now();
  return [
    {
      id: 'nb-welcome',
      title: 'TabNote Studio — Kalem & Not Rehberi',
      folderId: 'study',
      favorite: true,
      coverColor: '#2563EB',
      createdAt: now - 3600000 * 4,
      updatedAt: now,
      activePageIndex: 0,
      pages: [
        {
          id: 'pg-welcome-1',
          template: 'ruled',
          paperColor: 'ivory',
          bgImageData: null,
          strokes: createDemoHandwritingStrokes(),
          shapes: [
            {
              id: 'sh-demo-1',
              shapeType: 'rectangle',
              x1: 545,
              y1: 118,
              x2: 835,
              y2: 266,
              color: '#2563EB',
              size: 2.5,
              fill: 'rgba(37, 99, 235, 0.06)'
            },
            {
              id: 'sh-demo-2',
              shapeType: 'arrow',
              x1: 425,
              y1: 225,
              x2: 532,
              y2: 195,
              color: '#DC2626',
              size: 2.5,
              fill: 'transparent'
            }
          ],
          textBoxes: [
            {
              id: 'tb-demo-1',
              x: 110,
              y: 120,
              width: 420,
              text: 'Merhaba! Tabletinle Özgürce Yaz ✍️',
              fontSize: 24,
              fontFamily: 'Newsreader, Georgia, serif',
              color: '#0F172A',
              bold: true,
              italic: false
            },
            {
              id: 'tb-demo-2',
              x: 562,
              y: 132,
              width: 258,
              text: '💡 İpucu: Üst çubuktan "Kalem Aktif / Kalem Aktif Değil" durumunu değiştirebilir, parmağınla sayfayı aşağı-yukarı kaydırabilirsin!',
              fontSize: 14,
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              color: '#1E3A8A',
              bold: false,
              italic: false
            },
            {
              id: 'tb-demo-3',
              x: 110,
              y: 292,
              width: 720,
              text: '• "İçeri Ekle" butonundan sayfaya Fotoğraf, çok sayfalı PDF belgesi veya Dosya ekleyip üzerine kalemle notlar alabilirsin.\n• Çizgi sonunda kalemi 0.5 sn basılı tutarsan çizdiğin çizgi, daire veya dikdörtgen otomatik düzgün şekle dönüşür!\n• Kement (Lasso) aracıyla istediğin el yazısını daire içine alıp taşıyabilir, rengini değiştirebilir veya kopyalayabilirsin.',
              fontSize: 15,
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              color: '#334155',
              bold: false,
              italic: false
            }
          ],
          images: []
        },
        {
          id: 'pg-welcome-2',
          template: 'cornell',
          paperColor: 'ivory',
          bgImageData: null,
          strokes: [],
          shapes: [],
          textBoxes: [
            {
              id: 'tb-cornell-1',
              x: 256,
              y: 132,
              width: 580,
              text: 'Cornell Not Şablonu Örneği\nSol sütuna anahtar kavramları ve soruları, sağ alana detaylı ders/toplantı notlarını, alt bölüme ise sayfa özetini kaleminle yazabilirsin.',
              fontSize: 16,
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              color: '#1E293B',
              bold: false,
              italic: false
            }
          ],
          images: []
        }
      ]
    },
    {
      id: 'nb-math-sketch',
      title: 'Geometri & Mimari Eskiz Defteri',
      folderId: 'sketch',
      favorite: false,
      coverColor: '#8B5CF6',
      createdAt: now - 3600000 * 24,
      updatedAt: now - 3600000 * 2,
      activePageIndex: 0,
      pages: [
        {
          id: 'pg-math-1',
          template: 'grid',
          paperColor: 'dark-slate',
          bgImageData: null,
          strokes: [],
          shapes: [
            {
              id: 'sh-math-1',
              shapeType: 'ellipse',
              x1: 160,
              y1: 168,
              x2: 384,
              y2: 392,
              color: '#38BDF8',
              size: 2.5,
              fill: 'rgba(56, 189, 248, 0.08)'
            },
            {
              id: 'sh-math-2',
              shapeType: 'triangle',
              x1: 448,
              y1: 168,
              x2: 700,
              y2: 392,
              color: '#A78BFA',
              size: 2.5,
              fill: 'rgba(167, 139, 250, 0.08)'
            }
          ],
          textBoxes: [
            {
              id: 'tb-math-1',
              x: 160,
              y: 96,
              width: 540,
              text: 'OLED Gece Modu & Kareli Mühendislik Sayfası',
              fontSize: 20,
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              color: '#F8FAFC',
              bold: true,
              italic: false
            }
          ],
          images: []
        }
      ]
    }
  ];
}

class StorageManager {
  constructor() {
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        resolve(null);
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NOTEBOOKS)) {
          db.createObjectStore(STORE_NOTEBOOKS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' });
        }
      };
      req.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };
      req.onerror = () => {
        resolve(null);
      };
    });
  }

  async getFolders() {
    await this.init();
    if (this.db) {
      return new Promise((resolve) => {
        const tx = this.db.transaction(STORE_META, 'readonly');
        const req = tx.objectStore(STORE_META).get('folders');
        req.onsuccess = () => {
          if (req.result && Array.isArray(req.result.value)) {
            resolve(req.result.value);
          } else {
            resolve([...DEFAULT_FOLDERS]);
          }
        };
        req.onerror = () => resolve([...DEFAULT_FOLDERS]);
      });
    }
    const raw = localStorage.getItem('tabnote_folders');
    return raw ? JSON.parse(raw) : [...DEFAULT_FOLDERS];
  }

  async saveFolders(folders) {
    await this.init();
    if (this.db) {
      return new Promise((resolve) => {
        const tx = this.db.transaction(STORE_META, 'readwrite');
        tx.objectStore(STORE_META).put({ key: 'folders', value: folders });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    }
    localStorage.setItem('tabnote_folders', JSON.stringify(folders));
    return true;
  }

  async getAllNotebooks() {
    await this.init();
    if (this.db) {
      return new Promise((resolve) => {
        const tx = this.db.transaction(STORE_NOTEBOOKS, 'readonly');
        const req = tx.objectStore(STORE_NOTEBOOKS).getAll();
        req.onsuccess = async () => {
          const list = req.result || [];
          if (list.length === 0) {
            const starters = createStarterNotebooks();
            for (const nb of starters) {
              await this.saveNotebook(nb);
            }
            resolve(starters);
          } else {
            list.sort((a, b) => b.updatedAt - a.updatedAt);
            resolve(list);
          }
        };
        req.onerror = () => resolve(createStarterNotebooks());
      });
    }

    const raw = localStorage.getItem('tabnote_notebooks');
    if (!raw) {
      const starters = createStarterNotebooks();
      localStorage.setItem('tabnote_notebooks', JSON.stringify(starters));
      return starters;
    }
    const list = JSON.parse(raw);
    list.sort((a, b) => b.updatedAt - a.updatedAt);
    return list;
  }

  async saveNotebook(notebook) {
    notebook.updatedAt = Date.now();
    await this.init();
    if (this.db) {
      return new Promise((resolve) => {
        const tx = this.db.transaction(STORE_NOTEBOOKS, 'readwrite');
        tx.objectStore(STORE_NOTEBOOKS).put(notebook);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    }
    const all = await this.getAllNotebooks();
    const idx = all.findIndex((n) => n.id === notebook.id);
    if (idx >= 0) all[idx] = notebook;
    else all.unshift(notebook);
    localStorage.setItem('tabnote_notebooks', JSON.stringify(all));
    return true;
  }

  async deleteNotebook(id) {
    await this.init();
    if (this.db) {
      return new Promise((resolve) => {
        const tx = this.db.transaction(STORE_NOTEBOOKS, 'readwrite');
        tx.objectStore(STORE_NOTEBOOKS).delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    }
    const all = await this.getAllNotebooks();
    const filtered = all.filter((n) => n.id !== id);
    localStorage.setItem('tabnote_notebooks', JSON.stringify(filtered));
    return true;
  }
}

export const storage = new StorageManager();
