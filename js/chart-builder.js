/**
 * TabNote Studio — Grafik Oluşturucu
 * Çubuk, çizgi, pasta ve fonksiyon (y = f(x)) grafiklerini canvas üzerine çizer.
 * Harici kütüphane gerektirmez.
 */

export const CHART_COLORS = [
  '#2563EB', // mavi
  '#DC2626', // kırmızı
  '#059669', // yeşil
  '#D97706', // turuncu
  '#7C3AED', // mor
  '#0284C7', // camgöbeği
  '#DB2777', // pembe
  '#475569' // gri
];

const FONT = '"Plus Jakarta Sans", -apple-system, "Segoe UI", sans-serif';

/** Güvenli fonksiyon derleyici: yalnızca matematik ifadelerine izin verir. */
export function compileFunction(expr) {
  let src = String(expr || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/π/g, 'pi')
    .replace(/\^/g, '**')
    .replace(/(\d)(x|pi|\()/g, '$1*$2')
    .replace(/\)(x|pi|\d|\()/g, ')*$1');

  if (!src || !/^[0-9a-z+\-*/().,]*$/.test(src)) return null;

  const allowed = new Set([
    'x', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sqrt', 'abs',
    'ln', 'log', 'exp', 'pi', 'e', 'pow', 'min', 'max', 'floor', 'ceil'
  ]);
  const ids = src.match(/[a-z]+/g) || [];
  if (ids.some((id) => !allowed.has(id))) return null;

  const names = [
    'x', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sqrt', 'abs',
    'ln', 'log', 'exp', 'pi', 'e', 'pow', 'min', 'max', 'floor', 'ceil'
  ];
  const values = [
    null, Math.sin, Math.cos, Math.tan, Math.asin, Math.acos, Math.atan, Math.sqrt, Math.abs,
    Math.log, Math.log10, Math.exp, Math.PI, Math.E, Math.pow, Math.min, Math.max, Math.floor, Math.ceil
  ];

  const tryBuild = (code) => {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function(...names, `return (${code});`);
      fn(1, ...values.slice(1));
      return (x) => fn(x, ...values.slice(1));
    } catch {
      return null;
    }
  };

  let compiled = tryBuild(src);
  // "-x**2" gibi JavaScript'te geçersiz olan işaretli üs ifadesini "-(x**2)" olarak düzelt
  if (!compiled && src.startsWith('-')) {
    compiled = tryBuild(`-(${src.slice(1)})`);
  }
  return compiled;
}

function niceStep(range, targetTicks) {
  const rough = range / Math.max(1, targetTicks);
  const pow10 = Math.pow(10, Math.floor(Math.log10(rough || 1)));
  const norm = rough / pow10;
  let nice;
  if (norm <= 1) nice = 1;
  else if (norm <= 2) nice = 2;
  else if (norm <= 2.5) nice = 2.5;
  else if (norm <= 5) nice = 5;
  else nice = 10;
  return nice * pow10;
}

function niceScale(min, max, ticks = 5) {
  if (!isFinite(min) || !isFinite(max)) return { min: 0, max: 1, step: 0.2 };
  if (min === max) {
    max = min + 1;
  }
  const step = niceStep(max - min, ticks);
  return {
    min: Math.floor(min / step) * step,
    max: Math.ceil(max / step) * step,
    step
  };
}

function fmt(n) {
  if (Math.abs(n) >= 1000) return String(Math.round(n));
  const r = Math.round(n * 100) / 100;
  return String(r).replace('.', ',');
}

function clipText(ctx, text, maxWidth) {
  let t = String(text);
  if (ctx.measureText(t).width <= maxWidth) return t;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) {
    t = t.slice(0, -1);
  }
  return `${t}…`;
}

function drawFrame(ctx, W, H, title) {
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);
  let top = 20;
  if (title) {
    ctx.fillStyle = '#0F172A';
    ctx.font = `700 ${Math.round(W / 31)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(clipText(ctx, title, W - 40), W / 2, 30);
    top = 58;
  }
  ctx.restore();
  return top;
}

function drawAxesChart(ctx, W, H, spec, kind) {
  const labels = spec.labels;
  const values = spec.values;
  const color = spec.color || CHART_COLORS[0];
  const top = drawFrame(ctx, W, H, spec.title);

  const m = { l: 56, r: 26, t: top + 8, b: 54 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;

  const dataMin = Math.min(0, ...values);
  const dataMax = Math.max(0, ...values);
  const sc = niceScale(dataMin, dataMax === 0 && dataMin === 0 ? 1 : dataMax, 5);
  const yOf = (v) => m.t + ph - ((v - sc.min) / (sc.max - sc.min)) * ph;

  ctx.save();
  ctx.font = `500 ${Math.round(W / 50)}px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  for (let v = sc.min; v <= sc.max + sc.step / 2; v += sc.step) {
    const y = yOf(v);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(m.l, y);
    ctx.lineTo(m.l + pw, y);
    ctx.stroke();
    ctx.fillStyle = '#475569';
    ctx.fillText(fmt(v), m.l - 8, y);
  }

  // eksenler
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(m.l, m.t);
  ctx.lineTo(m.l, m.t + ph);
  ctx.stroke();
  const zeroY = yOf(0);
  ctx.beginPath();
  ctx.moveTo(m.l, zeroY);
  ctx.lineTo(m.l + pw, zeroY);
  ctx.stroke();

  const n = values.length;
  const slot = pw / n;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  if (kind === 'bar') {
    const bw = Math.min(70, slot * 0.62);
    values.forEach((v, i) => {
      const cx = m.l + slot * i + slot / 2;
      const y = yOf(v);
      ctx.fillStyle = color;
      const x0 = cx - bw / 2;
      const hTop = Math.min(y, zeroY);
      const hh = Math.max(1, Math.abs(zeroY - y));
      ctx.beginPath();
      ctx.roundRect(x0, hTop, bw, hh, 4);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.font = `700 ${Math.round(W / 52)}px ${FONT}`;
      ctx.textBaseline = v >= 0 ? 'bottom' : 'top';
      ctx.fillText(fmt(v), cx, v >= 0 ? hTop - 4 : hTop + hh + 4);
      ctx.fillStyle = '#334155';
      ctx.font = `500 ${Math.round(W / 50)}px ${FONT}`;
      ctx.textBaseline = 'top';
      ctx.fillText(clipText(ctx, labels[i], slot - 4), cx, m.t + ph + 10);
    });
  } else {
    // çizgi grafiği
    const pts = values.map((v, i) => ({ x: m.l + slot * i + slot / 2, y: yOf(v) }));
    if (pts.length > 1) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, zeroY);
      pts.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, zeroY);
      ctx.closePath();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    pts.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.font = `700 ${Math.round(W / 52)}px ${FONT}`;
      ctx.textBaseline = 'bottom';
      ctx.fillText(fmt(values[i]), p.x, p.y - 9);
      ctx.fillStyle = '#334155';
      ctx.font = `500 ${Math.round(W / 50)}px ${FONT}`;
      ctx.textBaseline = 'top';
      ctx.fillText(clipText(ctx, labels[i], slot - 4), p.x, m.t + ph + 10);
    });
  }
  ctx.restore();
}

function drawPie(ctx, W, H, spec) {
  const top = drawFrame(ctx, W, H, spec.title);
  const vals = spec.values.map((v) => Math.max(0, v));
  const total = vals.reduce((a, b) => a + b, 0);
  const cx = W * 0.32;
  const cy = top + (H - top) / 2;
  const r = Math.min((H - top - 28) / 2, W * 0.25);

  ctx.save();
  if (total <= 0) {
    ctx.fillStyle = '#64748B';
    ctx.font = `600 ${Math.round(W / 40)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('Pasta grafiği için pozitif değer girin', W / 2, H / 2);
    ctx.restore();
    return;
  }

  let angle = -Math.PI / 2;
  vals.forEach((v, i) => {
    const slice = (v / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const pct = (v / total) * 100;
    if (pct >= 6) {
      const mid = angle + slice / 2;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `700 ${Math.round(W / 46)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`%${Math.round(pct)}`, cx + Math.cos(mid) * r * 0.62, cy + Math.sin(mid) * r * 0.62);
    }
    angle += slice;
  });

  // gösterge
  const lx = W * 0.62;
  const rowH = Math.min(30, (H - top - 30) / Math.max(1, vals.length));
  let ly = cy - (rowH * vals.length) / 2 + rowH / 2;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(W / 50)}px ${FONT}`;
  vals.forEach((v, i) => {
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.beginPath();
    ctx.roundRect(lx, ly - 7, 14, 14, 3);
    ctx.fill();
    ctx.fillStyle = '#0F172A';
    ctx.fillText(clipText(ctx, `${spec.labels[i]} (${fmt(spec.values[i])})`, W - lx - 40), lx + 22, ly);
    ly += rowH;
  });
  ctx.restore();
}

function drawFunctionPlot(ctx, W, H, spec) {
  const top = drawFrame(ctx, W, H, spec.title);
  const fn = compileFunction(spec.expr);
  const m = { l: 44, r: 26, t: top + 6, b: 36 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  let xmin = Number(spec.xmin);
  let xmax = Number(spec.xmax);
  if (!isFinite(xmin) || !isFinite(xmax) || xmin >= xmax) {
    xmin = -6.3;
    xmax = 6.3;
  }

  const samples = [];
  let ymin = Infinity;
  let ymax = -Infinity;
  const N = 480;
  if (fn) {
    for (let i = 0; i <= N; i++) {
      const x = xmin + ((xmax - xmin) * i) / N;
      let y = NaN;
      try {
        y = Number(fn(x));
      } catch {
        y = NaN;
      }
      if (isFinite(y)) {
        samples.push({ x, y });
        if (y < ymin) ymin = y;
        if (y > ymax) ymax = y;
      } else {
        samples.push({ x, y: NaN });
      }
    }
  }
  if (!isFinite(ymin) || !isFinite(ymax)) {
    ymin = -1;
    ymax = 1;
  }
  // çok büyük değerleri sınırla (örn. tan, 1/x)
  const lim = 1000;
  ymin = Math.max(ymin, -lim);
  ymax = Math.min(ymax, lim);
  const pad = (ymax - ymin) * 0.08 || 1;
  const ysc = niceScale(ymin - pad, ymax + pad, 6);
  const xsc = niceScale(xmin, xmax, 8);

  const px = (x) => m.l + ((x - xmin) / (xmax - xmin)) * pw;
  const py = (y) => m.t + ph - ((y - ysc.min) / (ysc.max - ysc.min)) * ph;

  ctx.save();
  ctx.beginPath();
  ctx.rect(m.l, m.t, pw, ph);
  ctx.clip();

  ctx.lineWidth = 1;
  ctx.strokeStyle = '#E2E8F0';
  for (let v = Math.ceil(xmin / xsc.step) * xsc.step; v <= xmax + 1e-9; v += xsc.step) {
    ctx.beginPath();
    ctx.moveTo(px(v), m.t);
    ctx.lineTo(px(v), m.t + ph);
    ctx.stroke();
  }
  for (let v = ysc.min; v <= ysc.max + ysc.step / 2; v += ysc.step) {
    ctx.beginPath();
    ctx.moveTo(m.l, py(v));
    ctx.lineTo(m.l + pw, py(v));
    ctx.stroke();
  }

  // eksenler (x=0, y=0)
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.6;
  if (xmin <= 0 && xmax >= 0) {
    ctx.beginPath();
    ctx.moveTo(px(0), m.t);
    ctx.lineTo(px(0), m.t + ph);
    ctx.stroke();
  }
  if (ysc.min <= 0 && ysc.max >= 0) {
    ctx.beginPath();
    ctx.moveTo(m.l, py(0));
    ctx.lineTo(m.l + pw, py(0));
    ctx.stroke();
  }

  // eğri
  ctx.strokeStyle = spec.color || CHART_COLORS[0];
  ctx.lineWidth = 3.2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  let pen = false;
  let prevY = null;
  samples.forEach((s) => {
    if (!isFinite(s.y) || Math.abs(s.y) > lim) {
      pen = false;
      prevY = null;
      return;
    }
    // süreksizlik (tan gibi) için büyük sıçramalarda çizgiyi kes
    if (prevY !== null && Math.abs(s.y - prevY) > (ysc.max - ysc.min) * 0.8) {
      pen = false;
    }
    if (!pen) {
      ctx.moveTo(px(s.x), py(s.y));
      pen = true;
    } else {
      ctx.lineTo(px(s.x), py(s.y));
    }
    prevY = s.y;
  });
  ctx.stroke();
  ctx.restore();

  // eksen çerçevesi ve etiketler
  ctx.save();
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(m.l, m.t, pw, ph);
  ctx.fillStyle = '#475569';
  ctx.font = `500 ${Math.round(W / 55)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let v = Math.ceil(xmin / xsc.step) * xsc.step; v <= xmax + 1e-9; v += xsc.step) {
    ctx.fillText(fmt(v), px(v), m.t + ph + 6);
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let v = ysc.min; v <= ysc.max + ysc.step / 2; v += ysc.step) {
    ctx.fillText(fmt(v), m.l - 6, py(v));
  }
  if (!fn) {
    ctx.fillStyle = '#DC2626';
    ctx.font = `700 ${Math.round(W / 44)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('Geçersiz fonksiyon', W / 2, H / 2);
  }
  ctx.restore();
}

/** Seçilen türe göre grafiği verilen canvas bağlamına çizer. */
export function drawChart(ctx, W, H, spec) {
  ctx.clearRect(0, 0, W, H);
  if (spec.type === 'pie') {
    drawPie(ctx, W, H, spec);
  } else if (spec.type === 'func') {
    drawFunctionPlot(ctx, W, H, spec);
  } else {
    if (!spec.values || spec.values.length === 0) {
      drawFrame(ctx, W, H, spec.title);
      ctx.save();
      ctx.fillStyle = '#64748B';
      ctx.font = `600 ${Math.round(W / 40)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('Grafik için en az bir sayısal veri girin', W / 2, H / 2);
      ctx.restore();
      return;
    }
    drawAxesChart(ctx, W, H, spec, spec.type === 'line' ? 'line' : 'bar');
  }
}

/** Grafiği yüksek çözünürlüklü PNG data URL olarak üretir. */
export function renderChartDataUrl(spec, W = 720, H = 480, scale = 2) {
  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  drawChart(ctx, W, H, spec);
  return { dataUrl: canvas.toDataURL('image/png'), width: W, height: H };
}
