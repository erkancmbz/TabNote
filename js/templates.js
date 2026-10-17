/**
 * TabNote Studio — Kağıt Şablonları ve Sayfa Rengi Motoru
 * Yüksek DPI tuval ve PDF dışa aktarma için vektörel şablon çizimleri
 */

export const PAPER_TEMPLATES = [
  { id: 'ruled', name: 'Çizgili Kağıt', desc: 'Standart 32px satır aralığı ve sol kenar çizgisi', icon: 'ruled' },
  { id: 'ruled-wide', name: 'Geniş Çizgili', desc: 'Rahat el yazısı için 46px geniş satır aralığı', icon: 'ruled-wide' },
  { id: 'grid', name: 'Kareli (Matematik)', desc: '5mm hassas mühendislik ve matematik ızgarası', icon: 'grid' },
  { id: 'dotted', name: 'Noktalı (Bullet)', desc: 'Eskiz ve bullet journal için nokta matrisi', icon: 'dotted' },
  { id: 'cornell', name: 'Cornell Not Sistemi', desc: 'Sol ipucu sütunu, ana not alanı ve alt özet bölümü', icon: 'cornell' },
  { id: 'blank', name: 'Düz Kağıt', desc: 'Serbest eskiz ve diyagramlar için çizgisiz yüzey', icon: 'blank' },
  { id: 'isometric', name: 'İzometrik Noktalı', desc: '3B teknik çizim ve mimari eskiz matrisi', icon: 'isometric' },
  { id: 'planner', name: 'Günlük / Görev Planı', desc: 'Saat çizelgesi, öncelikli işler ve kontrol listesi', icon: 'planner' },
  { id: 'music', name: 'Müzik Portesi', desc: 'Beste ve nota yazımı için 5 çizgili porte dizisi', icon: 'music' }
];

export const PAPER_COLORS = [
  {
    id: 'ivory',
    name: 'Sıcak Fildişi',
    bg: '#FCFBF7',
    line: 'rgba(148, 163, 184, 0.34)',
    accentLine: 'rgba(239, 68, 68, 0.36)',
    textMuted: '#64748B',
    isDark: false
  },
  {
    id: 'white',
    name: 'Saf Beyaz',
    bg: '#FFFFFF',
    line: 'rgba(148, 163, 184, 0.32)',
    accentLine: 'rgba(244, 63, 94, 0.35)',
    textMuted: '#64748B',
    isDark: false
  },
  {
    id: 'legal-yellow',
    name: 'Sarı Bloknot',
    bg: '#FEFCE8',
    line: 'rgba(59, 130, 246, 0.24)',
    accentLine: 'rgba(239, 68, 68, 0.42)',
    textMuted: '#854D0E',
    isDark: false
  },
  {
    id: 'sage',
    name: 'Göz Yormayan Yeşil',
    bg: '#F2F7F4',
    line: 'rgba(100, 140, 118, 0.28)',
    accentLine: 'rgba(217, 119, 6, 0.35)',
    textMuted: '#476956',
    isDark: false
  },
  {
    id: 'dark-slate',
    name: 'OLED Gece Siyahı',
    bg: '#15181E',
    line: 'rgba(148, 163, 184, 0.16)',
    accentLine: 'rgba(239, 68, 68, 0.32)',
    textMuted: '#94A3B8',
    isDark: true
  },
  {
    id: 'blueprint',
    name: 'Mimari Blueprint',
    bg: '#0D253F',
    line: 'rgba(125, 211, 252, 0.20)',
    accentLine: 'rgba(253, 224, 71, 0.35)',
    textMuted: '#7DD3FC',
    isDark: true
  }
];

export function getPaperColorObj(colorId) {
  return PAPER_COLORS.find((c) => c.id === colorId) || PAPER_COLORS[0];
}

/**
 * Verilen 2D canvas context üzerine kağıt arka planını ve kılavuz çizgilerini çizer.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width Mantıksal genişlik (örn: 900)
 * @param {number} height Mantıksal yükseklik (örn: 1200)
 * @param {string} templateId Şablon ID
 * @param {string} colorId Kağıt rengi ID
 * @param {HTMLImageElement|null} bgImage Varsa sayfa arka plan görseli
 */
export function renderPaperBackground(ctx, width, height, templateId = 'ruled', colorId = 'ivory', bgImage = null) {
  const palette = getPaperColorObj(colorId);

  ctx.save();
  // Temel kağıt dolgusu
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  // Eğer arka plan görseli (ör. içe aktarılan ders notu/fotoğraf) varsa çiz
  if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
    const imgRatio = bgImage.naturalWidth / bgImage.naturalHeight;
    const pageRatio = width / height;
    let drawW = width;
    let drawH = height;
    let offsetX = 0;
    let offsetY = 0;
    if (imgRatio > pageRatio) {
      drawH = width / imgRatio;
      offsetY = (height - drawH) / 2;
    } else {
      drawW = height * imgRatio;
      offsetX = (width - drawW) / 2;
    }
    ctx.drawImage(bgImage, offsetX, offsetY, drawW, drawH);
  }

  ctx.strokeStyle = palette.line;
  ctx.fillStyle = palette.line;
  ctx.lineWidth = 1;

  const headerMargin = 84;

  switch (templateId) {
    case 'blank':
      break;

    case 'ruled':
    case 'ruled-wide': {
      const step = templateId === 'ruled-wide' ? 46 : 32;
      // Üst başlık çift çizgisi
      ctx.beginPath();
      ctx.strokeStyle = palette.accentLine;
      ctx.lineWidth = 1.4;
      ctx.moveTo(0, headerMargin);
      ctx.lineTo(width, headerMargin);
      ctx.moveTo(0, headerMargin + 4);
      ctx.lineTo(width, headerMargin + 4);
      ctx.stroke();

      // Yatay satırlar
      ctx.beginPath();
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1;
      for (let y = headerMargin + step; y < height - 28; y += step) {
        ctx.moveTo(0, Math.floor(y) + 0.5);
        ctx.lineTo(width, Math.floor(y) + 0.5);
      }
      ctx.stroke();

      // Sol kırmızı/aksan marj çizgisi
      ctx.beginPath();
      ctx.strokeStyle = palette.accentLine;
      ctx.lineWidth = 1.25;
      ctx.moveTo(86.5, 0);
      ctx.lineTo(86.5, height);
      ctx.stroke();
      break;
    }

    case 'grid': {
      const gridStep = 28;
      ctx.beginPath();
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 0.85;
      for (let x = gridStep; x < width; x += gridStep) {
        ctx.moveTo(Math.floor(x) + 0.5, 0);
        ctx.lineTo(Math.floor(x) + 0.5, height);
      }
      for (let y = gridStep; y < height; y += gridStep) {
        ctx.moveTo(0, Math.floor(y) + 0.5);
        ctx.lineTo(width, Math.floor(y) + 0.5);
      }
      ctx.stroke();

      // 5'li ana kare vurgusu
      ctx.beginPath();
      ctx.strokeStyle = palette.accentLine;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1.1;
      for (let x = gridStep * 5; x < width; x += gridStep * 5) {
        ctx.moveTo(Math.floor(x) + 0.5, 0);
        ctx.lineTo(Math.floor(x) + 0.5, height);
      }
      for (let y = gridStep * 5; y < height; y += gridStep * 5) {
        ctx.moveTo(0, Math.floor(y) + 0.5);
        ctx.lineTo(width, Math.floor(y) + 0.5);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }

    case 'dotted': {
      const dotStep = 28;
      ctx.fillStyle = palette.isDark ? 'rgba(148, 163, 184, 0.30)' : 'rgba(100, 116, 139, 0.38)';
      for (let y = dotStep; y < height - 16; y += dotStep) {
        for (let x = dotStep; x < width - 16; x += dotStep) {
          ctx.beginPath();
          ctx.arc(x, y, 1.35, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case 'isometric': {
      const spacing = 30;
      const rowH = spacing * Math.sin(Math.PI / 3);
      ctx.fillStyle = palette.isDark ? 'rgba(148, 163, 184, 0.30)' : 'rgba(100, 116, 139, 0.38)';
      let row = 0;
      for (let y = 28; y < height - 20; y += rowH) {
        const offsetX = (row % 2) * (spacing / 2);
        for (let x = 28 + offsetX; x < width - 20; x += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
        row++;
      }
      break;
    }

    case 'cornell': {
      const topY = 92;
      const bottomY = height - 190;
      const cueX = 240;
      const step = 32;

      // Sağ not alanı yatay çizgileri
      ctx.beginPath();
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1;
      for (let y = topY + step; y < bottomY; y += step) {
        ctx.moveTo(cueX, Math.floor(y) + 0.5);
        ctx.lineTo(width - 28, Math.floor(y) + 0.5);
      }
      ctx.stroke();

      // Ana Cornell çerçeve çizgileri
      ctx.beginPath();
      ctx.strokeStyle = palette.accentLine;
      ctx.lineWidth = 1.6;
      // Üst başlık ayırıcı
      ctx.moveTo(28, topY);
      ctx.lineTo(width - 28, topY);
      // Alt özet ayırıcı
      ctx.moveTo(28, bottomY);
      ctx.lineTo(width - 28, bottomY);
      // Sol İpucu/Kavram dikey ayırıcı
      ctx.moveTo(cueX, topY);
      ctx.lineTo(cueX, bottomY);
      ctx.stroke();

      // Bölüm etiketleri
      ctx.fillStyle = palette.textMuted;
      ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('KONU / TARİH', 36, 42);
      ctx.fillText('ANAHTAR KAVRAMLAR & SORULAR', 36, topY + 24);
      ctx.fillText('DERS & TOPLANTI NOTLARI', cueX + 16, topY + 24);
      ctx.fillText('ÖZET & ÇIKARIMLAR', 36, bottomY + 24);
      break;
    }

    case 'planner': {
      const topY = 88;
      const midX = Math.floor(width * 0.52);
      const step = 34;

      ctx.strokeStyle = palette.accentLine;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(32, topY);
      ctx.lineTo(width - 32, topY);
      ctx.moveTo(midX, topY + 16);
      ctx.lineTo(midX, height - 40);
      ctx.stroke();

      ctx.fillStyle = palette.textMuted;
      ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('GÜNLÜK ZAMAN ÇİZELGESİ (08:00 - 22:00)', 36, topY + 26);
      ctx.fillText('ÖNCELİKLİ GÖREVLER & KONTROL LİSTESİ', midX + 20, topY + 26);

      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1;
      let hour = 8;
      for (let y = topY + 56; y < height - 48; y += step * 2) {
        // Sol saat çizelgesi
        if (hour <= 22) {
          ctx.fillStyle = palette.textMuted;
          ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
          const hStr = `${String(hour).padStart(2, '0')}:00`;
          ctx.fillText(hStr, 36, y - 6);
          hour++;
        }
        ctx.beginPath();
        ctx.moveTo(36, Math.floor(y) + 0.5);
        ctx.lineTo(midX - 20, Math.floor(y) + 0.5);
        ctx.stroke();
      }

      // Sağ taraf görev satırları ve onay kutucukları
      for (let y = topY + 56; y < height - 48; y += step) {
        ctx.beginPath();
        ctx.strokeRect(midX + 22, y - 15, 13, 13);
        ctx.moveTo(midX + 44, Math.floor(y) + 0.5);
        ctx.lineTo(width - 36, Math.floor(y) + 0.5);
        ctx.stroke();
      }
      break;
    }

    case 'music': {
      const staffTop = 96;
      const lineGap = 10;
      const staffSpacing = 96;
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1.05;
      for (let s = staffTop; s < height - 70; s += staffSpacing) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const y = s + i * lineGap;
          ctx.moveTo(44, Math.floor(y) + 0.5);
          ctx.lineTo(width - 44, Math.floor(y) + 0.5);
        }
        // Porte başı ve sonu dikey kapama çizgisi
        ctx.moveTo(44.5, s);
        ctx.lineTo(44.5, s + 4 * lineGap);
        ctx.moveTo(width - 44.5, s);
        ctx.lineTo(width - 44.5, s + 4 * lineGap);
        ctx.stroke();
      }
      break;
    }
  }

  ctx.restore();
}
