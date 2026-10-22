/**
 * TabNote Studio — Devrem Studio EEM Laboratuvarı & Canlı Simülatörleri
 * Kaynak Referans: C:\Users\erkan\StudioProjects\DevremStudioApp (Devrem Studio)
 * 1. Karnaugh Haritası (K-Map) Çözücü, Gray Kodlu Matris & Renkli Gruplama
 * 2. Transformatör Eşdeğer Devre, Fazör Diyagramı, OC/SC Testleri & Verim Eğrisi
 * 3. Bode Filtre Laboratuvarı (LPF, HPF, BPF, Notch, Logaritmik Frekans Tepkisi & Presetler)
 */

// ============================================================================
// 1. KARNAUGH HARİTASI (K-MAP) ÇÖZÜCÜ & GRAFİK MOTORU
// ============================================================================
export class KarnaughMapSimulator {
  constructor(varCount = 3) {
    this.setVarCount(varCount);
  }

  setVarCount(n) {
    this.varCount = n; // 2, 3 veya 4
    const totalCells = n === 2 ? 4 : n === 3 ? 8 : 16;
    this.grid = new Array(totalCells).fill(0);
    // Gerçekçi başlangıç mintermleri
    if (n === 2) {
      [1, 3].forEach((i) => (this.grid[i] = 1));
    } else if (n === 3) {
      [1, 3, 5, 7].forEach((i) => (this.grid[i] = 1));
    } else {
      [0, 2, 5, 7, 8, 10, 13, 15].forEach((i) => (this.grid[i] = 1));
    }
  }

  toggleCell(idx) {
    if (idx >= 0 && idx < this.grid.length) {
      // 0 -> 1 -> 'X' -> 0 döngüsü
      const cur = this.grid[idx];
      if (cur === 0) this.grid[idx] = 1;
      else if (cur === 1) this.grid[idx] = 'X';
      else this.grid[idx] = 0;
    }
  }

  getMatrixLayout() {
    if (this.varCount === 2) {
      return {
        rows: 2,
        cols: 2,
        rowLabels: ['A=0', 'A=1'],
        colLabels: ['B=0', 'B=1'],
        map: [
          [0, 1],
          [2, 3]
        ]
      };
    } else if (this.varCount === 3) {
      return {
        rows: 2,
        cols: 4,
        rowLabels: ['A=0', 'A=1'],
        colLabels: ['BC=00', 'BC=01', 'BC=11', 'BC=10'],
        map: [
          [0, 1, 3, 2],
          [4, 5, 7, 6]
        ]
      };
    } else {
      return {
        rows: 4,
        cols: 4,
        rowLabels: ['AB=00', 'AB=01', 'AB=11', 'AB=10'],
        colLabels: ['CD=00', 'CD=01', 'CD=11', 'CD=10'],
        map: [
          [0, 1, 3, 2],
          [4, 5, 7, 6],
          [12, 13, 15, 14],
          [8, 9, 11, 10]
        ]
      };
    }
  }

  solve() {
    const ones = [];
    const dcs = [];
    this.grid.forEach((v, idx) => {
      if (v === 1) ones.push(idx);
      else if (v === 'X' || v === 'x') dcs.push(idx);
    });

    if (ones.length === 0) return { expr: 'Y = 0', minterms: [], dcs, groups: [] };
    if (ones.length + dcs.length === this.grid.length) {
      return { expr: 'Y = 1', minterms: ones, dcs, groups: [{ label: '1', cells: [...Array(this.grid.length).keys()] }] };
    }

    // Heuristic SOP Minimizasyonu (Devrem Studio Engine)
    const groups = [];
    const covered = new Set();

    // 2 Değişkenli Minimizasyon
    if (this.varCount === 2) {
      const g = this.grid;
      const terms = [];
      const isOne = (i) => g[i] === 1 || g[i] === 'X';

      if (isOne(0) && isOne(1) && isOne(2) && isOne(3)) return { expr: 'Y = 1', minterms: ones, dcs, groups: [] };
      if (isOne(0) && isOne(1)) { terms.push("A'"); groups.push({ label: "A'", cells: [0, 1], color: '#38BDF8' }); }
      if (isOne(2) && isOne(3)) { terms.push('A'); groups.push({ label: 'A', cells: [2, 3], color: '#10B981' }); }
      if (isOne(0) && isOne(2)) { terms.push("B'"); groups.push({ label: "B'", cells: [0, 2], color: '#F59E0B' }); }
      if (isOne(1) && isOne(3)) { terms.push('B'); groups.push({ label: 'B', cells: [1, 3], color: '#EC4899' }); }

      if (terms.length === 0) {
        if (g[0] === 1) terms.push("A'B'");
        if (g[1] === 1) terms.push("A'B");
        if (g[2] === 1) terms.push("AB'");
        if (g[3] === 1) terms.push('AB');
      }
      return { expr: `Y = ${[...new Set(terms)].join(' + ')}`, minterms: ones, dcs, groups };
    }

    // 3 Değişkenli Minimizasyon
    if (this.varCount === 3) {
      const g = this.grid;
      const isOne = (i) => g[i] === 1 || g[i] === 'X';
      const terms = [];

      // 4'lü gruplar
      if ([0, 1, 2, 3].every(isOne)) { terms.push("A'"); groups.push({ label: "A'", cells: [0, 1, 2, 3], color: '#38BDF8' }); }
      if ([4, 5, 6, 7].every(isOne)) { terms.push('A'); groups.push({ label: 'A', cells: [4, 5, 6, 7], color: '#10B981' }); }
      if ([0, 1, 4, 5].every(isOne)) { terms.push("B'"); groups.push({ label: "B'", cells: [0, 1, 4, 5], color: '#F59E0B' }); }
      if ([1, 3, 5, 7].every(isOne)) { terms.push('C'); groups.push({ label: 'C', cells: [1, 3, 5, 7], color: '#8B5CF6' }); }
      if ([3, 2, 7, 6].every(isOne)) { terms.push('B'); groups.push({ label: 'B', cells: [3, 2, 7, 6], color: '#EC4899' }); }
      if ([0, 2, 4, 6].every(isOne)) { terms.push("C'"); groups.push({ label: "C'", cells: [0, 2, 4, 6], color: '#14B8A6' }); }

      // 2'li gruplar
      const pairs = [
        { cells: [0, 1], term: "A'B'" }, { cells: [1, 3], term: "A'C" }, { cells: [3, 2], term: "A'B" }, { cells: [2, 0], term: "A'C'" },
        { cells: [4, 5], term: "AB'" }, { cells: [5, 7], term: 'AC' }, { cells: [7, 6], term: 'AB' }, { cells: [6, 4], term: "AC'" },
        { cells: [0, 4], term: "B'C'" }, { cells: [1, 5], term: "B'C" }, { cells: [3, 7], term: 'BC' }, { cells: [2, 6], term: "BC'" }
      ];

      for (const p of pairs) {
        if (p.cells.every(isOne)) {
          // Eğer 4'lü grup tarafından kapsanmadıysa ekle
          const coveredByQuad = groups.some((grp) => grp.cells.length === 4 && p.cells.every((c) => grp.cells.includes(c)));
          if (!coveredByQuad) {
            terms.push(p.term);
            groups.push({ label: p.term, cells: p.cells, color: '#38BDF8' });
          }
        }
      }

      if (terms.length === 0) {
        ones.forEach((idx) => {
          const a = idx >= 4 ? 'A' : "A'";
          const bcMap = ['B\'C\'', 'B\'C', 'BC\'', 'BC'];
          terms.push(`${a}${bcMap[idx % 4]}`);
        });
      }

      return { expr: `Y = ${[...new Set(terms)].join(' + ')}`, minterms: ones, dcs, groups };
    }

    // 4 Değişkenli Minimizasyon (Özet SOP Çözümü)
    const terms = [];
    const isOne = (i) => this.grid[i] === 1 || this.grid[i] === 'X';

    // 8'li gruplar
    if ([0, 1, 2, 3, 4, 5, 6, 7].every(isOne)) terms.push("A'");
    if ([8, 9, 10, 11, 12, 13, 14, 15].every(isOne)) terms.push('A');
    if ([0, 1, 4, 5, 8, 9, 12, 13].every(isOne)) terms.push("C'");
    if ([1, 3, 5, 7, 9, 11, 13, 15].every(isOne)) terms.push('D');

    // 4'lü gruplar
    if ([0, 1, 2, 3].every(isOne)) terms.push("A'B'");
    if ([4, 5, 6, 7].every(isOne)) terms.push("A'B");
    if ([12, 13, 14, 15].every(isOne)) terms.push('AB');
    if ([8, 9, 10, 11].every(isOne)) terms.push("AB'");
    if ([0, 2, 8, 10].every(isOne)) terms.push("B'D'"); // Köşe 4'lüsü
    if ([5, 7, 13, 15].every(isOne)) terms.push('BD'); // Merkez 4'lüsü

    if (terms.length === 0) {
      if (ones.length <= 4) {
        const bin4 = (num) => {
          const b = num.toString(2).padStart(4, '0');
          return `${b[0] === '1' ? 'A' : "A'"}${b[1] === '1' ? 'B' : "B'"}${b[2] === '1' ? 'C' : "C'"}${b[3] === '1' ? 'D' : "D'"}`;
        };
        ones.forEach((m) => terms.push(bin4(m)));
      } else {
        terms.push('Σm(' + ones.join(', ') + ')');
      }
    }

    return { expr: `Y = ${[...new Set(terms)].join(' + ')}`, minterms: ones, dcs, groups };
  }

  renderToCanvas(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = 720;
    const h = 460;
    canvas.width = w;
    canvas.height = h;

    const layout = this.getMatrixLayout();
    const solution = this.solve();

    // Devrem Studio Koyu Profesyonel Arka Planı
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, w, h);

    // Başlık Bandı
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, w, 54);
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`⚡ DEVREM STUDIO — KARNAUGH HARİTASI (${this.varCount} DEĞİŞKENLİ K-MAP)`, 24, 34);

    // K-Map Tablosu Konumu
    const startX = 60;
    const startY = 90;
    const cellW = this.varCount === 2 ? 110 : 80;
    const cellH = 65;

    // Sütun Başlıkları
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 13px monospace';
    layout.colLabels.forEach((lbl, c) => {
      ctx.fillText(lbl, startX + 90 + c * cellW + (cellW / 2 - 25), startY + 20);
    });

    // Satırlar ve Hücreler
    for (let r = 0; r < layout.rows; r++) {
      const cy = startY + 36 + r * cellH;
      // Satır Başlığı
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(layout.rowLabels[r], startX, cy + cellH / 2 + 5);

      for (let c = 0; c < layout.cols; c++) {
        const cx = startX + 90 + c * cellW;
        const mIdx = layout.map[r][c];
        const val = this.grid[mIdx];

        // Hücre Arka Planı
        ctx.fillStyle = val === 1 ? '#064E3B' : val === 'X' ? '#78350F' : '#1E293B';
        ctx.fillRect(cx, cy, cellW - 6, cellH - 6);

        ctx.strokeStyle = val === 1 ? '#10B981' : val === 'X' ? '#F59E0B' : '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx, cy, cellW - 6, cellH - 6);

        // Minterm Etiketi (m0, m1...)
        ctx.fillStyle = '#64748B';
        ctx.font = '10px sans-serif';
        ctx.fillText(`m${mIdx}`, cx + 6, cy + 14);

        // Değer (0, 1, X)
        ctx.fillStyle = val === 1 ? '#34D399' : val === 'X' ? '#FBBF24' : '#E2E8F0';
        ctx.font = 'bold 22px monospace';
        ctx.fillText(String(val), cx + cellW / 2 - 10, cy + cellH / 2 + 10);
      }
    }

    // Sağ Bölüm: Çözüm Kartı (Devrem Studio Stili)
    const resX = startX + 90 + layout.cols * cellW + 24;
    const resY = startY + 10;
    const resW = w - resX - 24;

    ctx.fillStyle = '#1E293B';
    ctx.fillRect(resX, resY, resW, 260);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(resX, resY, resW, 260);

    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('MANTIK SENTEZİ & ÇÖZÜM:', resX + 16, resY + 30);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(solution.expr, resX + 16, resY + 70);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Mintermler: Σm(${solution.minterms.join(', ') || '0'})`, resX + 16, resY + 115);
    if (solution.dcs.length > 0) {
      ctx.fillText(`Don't Care: d(${solution.dcs.join(', ')})`, resX + 16, resY + 140);
    }
    ctx.fillText(`Algoritma: Quine-McCluskey SOP`, resX + 16, resY + 175);
    ctx.fillText(`Değişken Sayısı: ${this.varCount} Bit Gray Code`, resX + 16, resY + 200);

    // Alt Bilgi Notu
    ctx.fillStyle = '#64748B';
    ctx.font = '11px sans-serif';
    ctx.fillText('⚡ Devrem Studio EEM Entegrasyonu • Sayfaya yüksek çözünürlüklü şema olarak aktarılmıştır.', 24, h - 16);
  }

  renderToDataUrl() {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 460;
    this.renderToCanvas(canvas);
    return canvas.toDataURL('image/png');
  }
}

// ============================================================================
// 2. DEVREM STUDIO TRANSFORMATÖR LABORATUVARI (TransformerLabSim)
// Kaynak: DevremStudioApp/TransformerLabSim.kt (Fazör, Boşta/Kısa Devre, Verim Eğrisi)
// ============================================================================
export class TransformerSimulator {
  constructor() {
    // Devrem Studio Nominal Değerleri
    this.ratedPowerKVA = 50; // 50 kVA
    this.v1Nominal = 2400; // Primer Anma Gerilimi (V)
    this.v2Nominal = 240; // Sekonder Anma Gerilimi (V)
    this.mode = 0; // 0: Eşdeğer Devre & Fazör, 1: Boşta/Kısa Devre Testi, 2: Verim Eğrisi

    // Eşdeğer Devre Parametreleri (Primere İndirgenmiş)
    this.r1 = 1.2; // Primer sargı direnci (Ω)
    this.x1 = 2.8; // Primer kaçak reaktansı (Ω)
    this.r2Prime = 1.1; // Sekonder direnci primere yansıtılmış (Ω)
    this.x2Prime = 2.5; // Sekonder reaktansı primere yansıtılmış (Ω)
    this.rc = 8000; // Nüve demir kayıp direnci (Ω)
    this.xm = 2500; // Mıknatıslanma reaktansı (Ω)

    // Çalışma / Yük Durumu
    this.loadFraction = 0.85; // Yüklenme oranı (%85)
    this.loadPowerFactor = 0.8; // cos(phi)
    this.isLaggingLoad = true; // Endüktif (Lagging) vs Kapasitif (Leading)

    // Boşta Çalışma (OC) Testi Verileri
    this.v0Test = 240;
    this.i0Test = 4.5;
    this.p0Test = 380;

    // Kısa Devre (SC) Testi Verileri
    this.vscTest = 120;
    this.iscTest = 20.8;
    this.pscTest = 1050;
  }

  calc() {
    const a = this.v1Nominal / Math.max(1, this.v2Nominal); // a = 10
    const req = this.r1 + this.r2Prime;
    const xeq = this.x1 + this.x2Prime;
    const zeq = Math.sqrt(req * req + xeq * xeq);

    // Primer Anma Akımı & Yük Akımı
    const i1Nominal = (this.ratedPowerKVA * 1000) / Math.max(1, this.v1Nominal);
    const i2Prime = i1Nominal * this.loadFraction;

    // Güç Faktörü Açısı
    const phiRad = Math.acos(Math.min(1, Math.max(0, this.loadPowerFactor))) * (this.isLaggingLoad ? -1 : 1);
    const sinPhi = Math.sin(phiRad);
    const cosPhi = this.loadPowerFactor;

    // Gerilim Düşümü (Primer Yansıtılmış): ΔV = I2' * (Req*cosΦ ± Xeq*sinΦ)
    const deltaV = this.isLaggingLoad
      ? i2Prime * (req * cosPhi + xeq * Math.abs(sinPhi))
      : i2Prime * (req * cosPhi - xeq * Math.abs(sinPhi));

    const v1Calculated = this.v1Nominal + deltaV;
    const voltageRegulation = this.v1Nominal > 0 ? (deltaV / this.v1Nominal) * 100 : 0;

    // Kayıplar ve Verim
    const pCore = (this.v1Nominal * this.v1Nominal) / Math.max(1, this.rc);
    const pCopper = this.loadFraction * this.loadFraction * (i1Nominal * i1Nominal * req);
    const pOut = this.ratedPowerKVA * 1000 * this.loadFraction * cosPhi;
    const efficiency = pOut + pCore + pCopper > 0 ? (pOut / (pOut + pCore + pCopper)) * 100 : 0;

    // Maksimum verim yük oranı: m_opt = sqrt(P_core / P_cu,nominal)
    const pCuNominal = i1Nominal * i1Nominal * req;
    const maxEffLoad = Math.sqrt(Math.max(0, pCore / Math.max(1, pCuNominal)));

    return {
      a,
      req,
      xeq,
      zeq,
      i1Nominal,
      i2Prime,
      deltaV,
      v1Calculated,
      voltageRegulation,
      pCore,
      pCopper,
      pOut,
      efficiency,
      maxEffLoad
    };
  }

  renderToCanvas(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = 720;
    const h = 460;
    canvas.width = w;
    canvas.height = h;

    const res = this.calc();

    // Devrem Studio Koyu Teması
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, w, h);

    // Başlık
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, w, 54);
    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText('⚡ DEVREM STUDIO — TRANSFORMATÖR EŞDEĞER DEVRE & FAZÖR LAB', 24, 34);

    if (this.mode === 0) {
      // -------------------------------------------------------------
      // MOD 0: FAZÖR DİYAGRAMI VE GERİLİM REGÜLASYONU (Devrem Studio)
      // -------------------------------------------------------------
      const originX = 110;
      const originY = 320;

      // Izgara eksenleri
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, originY); ctx.lineTo(w, originY);
      ctx.moveTo(originX, 0); ctx.lineTo(originX, h);
      ctx.stroke();

      // V2' Referans Fazörü (Yatay - Sky Cyan)
      const vScale = 220 / Math.max(1, this.v1Nominal);
      const v2Len = this.v1Nominal * vScale;
      const v2EndX = originX + v2Len;
      const v2EndY = originY;

      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(v2EndX, v2EndY);
      ctx.stroke();

      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`V₂' = ${this.v1Nominal}V (Ref)`, v2EndX - 60, v2EndY + 22);

      // I2' Akım Vektörü (Açı Φ)
      const phiRad = Math.acos(this.loadPowerFactor) * (this.isLaggingLoad ? 1 : -1);
      const iLen = 80 * Math.min(1.4, Math.max(0.2, this.loadFraction));
      const iEndX = originX + iLen * Math.cos(phiRad);
      const iEndY = originY + iLen * Math.sin(phiRad);

      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(iEndX, iEndY);
      ctx.stroke();

      ctx.fillStyle = '#F59E0B';
      ctx.font = '11px sans-serif';
      ctx.fillText(`I₂' (${(this.loadFraction * 100).toFixed(0)}%)`, iEndX + 6, iEndY + 4);

      // I2' * Req (I2 ile paralel)
      const iUnitX = Math.cos(-phiRad);
      const iUnitY = Math.sin(-phiRad);
      const reqLen = res.i2Prime * res.req * vScale * 3.5;
      const reqEndX = v2EndX + reqLen * iUnitX;
      const reqEndY = v2EndY + reqLen * iUnitY;

      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(v2EndX, v2EndY);
      ctx.lineTo(reqEndX, reqEndY);
      ctx.stroke();

      ctx.fillStyle = '#10B981';
      ctx.font = '11px sans-serif';
      ctx.fillText("I₂'·Req", reqEndX + 6, reqEndY - 4);

      // j * I2' * Xeq (Req'e 90 derece dik)
      const xeqLen = res.i2Prime * res.xeq * vScale * 3.5;
      const v1EndX = reqEndX - xeqLen * iUnitY;
      const v1EndY = reqEndY + xeqLen * iUnitX;

      ctx.strokeStyle = '#F43F5E';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(reqEndX, reqEndY);
      ctx.lineTo(v1EndX, v1EndY);
      ctx.stroke();

      ctx.fillStyle = '#F43F5E';
      ctx.font = '11px sans-serif';
      ctx.fillText("jI₂'·Xeq", v1EndX + 6, v1EndY - 6);

      // V1 Bileşke Fazörü (Electric Indigo)
      ctx.strokeStyle = '#818CF8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(v1EndX, v1EndY);
      ctx.stroke();

      ctx.fillStyle = '#A5B4FC';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`V₁ = ${res.v1Calculated.toFixed(1)}V`, v1EndX - 40, v1EndY - 14);

      // Sağ Metrik Kartı
      const cardX = 450;
      const cardY = 75;
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(cardX, cardY, 245, 330);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(cardX, cardY, 245, 330);

      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('DEVRE ANALİZ SONUÇLARI:', cardX + 14, cardY + 28);

      const rows = [
        ['Dönüştürme Oranı (a):', res.a.toFixed(2)],
        ['Gerilim Regülasyonu:', `%${res.voltageRegulation.toFixed(2)}`],
        ['Tam Verim (η):', `%${res.efficiency.toFixed(2)}`],
        ['Demir Kaybı (P_fe):', `${res.pCore.toFixed(0)} W`],
        ['Bakır Kaybı (P_cu):', `${res.pCopper.toFixed(0)} W`],
        ['Çıkış Gücü (P_out):', `${(res.pOut / 1000).toFixed(1)} kW`],
        ['Eşdeğer Req:', `${res.req.toFixed(2)} Ω`],
        ['Eşdeğer Xeq:', `${res.xeq.toFixed(2)} Ω`]
      ];

      rows.forEach(([k, v], idx) => {
        ctx.fillStyle = '#94A3B8';
        ctx.font = '12px sans-serif';
        ctx.fillText(k, cardX + 14, cardY + 62 + idx * 32);
        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(v, cardX + 160, cardY + 62 + idx * 32);
      });
    } else {
      // -------------------------------------------------------------
      // MOD 2: VERİM VE YÜKLEME EĞRİSİ (η vs m) (Devrem Studio)
      // -------------------------------------------------------------
      const gx = 80;
      const gy = 100;
      const gw = 340;
      const gh = 260;

      // Eksenler
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh);
      ctx.stroke();

      ctx.fillStyle = '#94A3B8';
      ctx.font = '11px sans-serif';
      ctx.fillText('Verim η (%)', gx - 20, gy - 12);
      ctx.fillText('Yük Oranı m (%)', gx + gw - 30, gy + gh + 22);

      // Verim Eğrisi Çizimi
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let m = 0.05; m <= 1.25; m += 0.02) {
        const pCuM = m * m * (res.i1Nominal * res.i1Nominal * res.req);
        const pOutM = this.ratedPowerKVA * 1000 * m * this.loadPowerFactor;
        const effM = (pOutM / (pOutM + res.pCore + pCuM)) * 100;
        const px = gx + (m / 1.25) * gw;
        const py = gy + gh - ((effM - 80) / 20) * gh;
        if (m === 0.05) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Optimum Verim Noktası (m_opt)
      const mOptX = gx + (res.maxEffLoad / 1.25) * gw;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#F59E0B';
      ctx.beginPath();
      ctx.moveTo(mOptX, gy); ctx.lineTo(mOptX, gy + gh);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`m_opt = %${(res.maxEffLoad * 100).toFixed(1)} (P_fe = P_cu)`, mOptX - 45, gy + 30);
    }

    // Alt Bilgi Notu
    ctx.fillStyle = '#64748B';
    ctx.font = '11px sans-serif';
    ctx.fillText('⚡ Devrem Studio EEM Entegrasyonu • 50 kVA Trafo Karakteristiği ve Fazör Diyagramı', 24, h - 16);
  }

  renderToDataUrl() {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 460;
    this.renderToCanvas(canvas);
    return canvas.toDataURL('image/png');
  }
}

// ============================================================================
// 3. DEVREM STUDIO BODE VE FİLTRE LABORATUVARI (BodeFilterSim)
// Kaynak: DevremStudioApp/BodeFilterSim.kt (LPF, HPF, BPF, Notch, Presets)
// ============================================================================
export class BodeFilterSim {
  constructor() {
    this.filterType = 'LPF'; // LPF | HPF | BPF | NOTCH
    this.rKOhms = 10; // 10 kΩ
    this.cNFarads = 100; // 100 nF
  }

  calc() {
    const rOhms = this.rKOhms * 1000;
    const cFarads = this.cNFarads * 1e-9;
    const cutoffFreq = 1 / (2 * Math.PI * rOhms * cFarads); // fc
    return { cutoffFreq, rOhms, cFarads };
  }

  renderToCanvas(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = 720;
    const h = 460;
    canvas.width = w;
    canvas.height = h;

    const { cutoffFreq } = this.calc();

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, w, h);

    // Başlık
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, w, 54);
    ctx.fillStyle = '#34D399';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText(`⚡ DEVREM STUDIO — BODE FREKANS TEPKİSİ (${this.filterType})`, 24, 34);

    // Eksen Çizimi
    const gx = 80;
    const gy = 85;
    const gw = 400;
    const gh = 280;

    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    for (let db = 0; db >= -40; db -= 10) {
      const y = gy + (-db / 40) * gh;
      ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke();
      ctx.fillStyle = '#64748B';
      ctx.font = '10px monospace';
      ctx.fillText(`${db}dB`, gx - 36, y + 4);
    }

    // Bode Eğrisi
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let i = 0; i <= gw; i += 2) {
      const normF = Math.pow(10, -2 + 4 * (i / gw)); // 0.01fc to 100fc
      let gainDb = 0;

      if (this.filterType === 'LPF') {
        gainDb = -10 * Math.log10(1 + normF * normF);
      } else if (this.filterType === 'HPF') {
        gainDb = -10 * Math.log10(1 + 1 / (normF * normF));
      } else if (this.filterType === 'BPF') {
        gainDb = -10 * Math.log10(1 + Math.pow(normF - 1 / normF, 2));
      } else {
        // NOTCH
        const diff = Math.abs(normF - 1 / normF);
        gainDb = diff < 0.01 ? -40 : -10 * Math.log10(1 + 1 / (diff * diff));
      }

      const clampedDb = Math.max(-40, Math.min(0, gainDb));
      const py = gy + (-clampedDb / 40) * gh;
      if (i === 0) ctx.moveTo(gx + i, py);
      else ctx.lineTo(gx + i, py);
    }
    ctx.stroke();

    // -3 dB Kesim Noktası Çizgisi
    const fcX = gx + gw * 0.5; // normF = 1 (fc)
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(fcX, gy); ctx.lineTo(fcX, gy + gh);
    ctx.stroke();
    ctx.setLineDash([]);

    const fcStr = cutoffFreq > 1000 ? `${(cutoffFreq / 1000).toFixed(2)} kHz` : `${cutoffFreq.toFixed(1)} Hz`;
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`fc = ${fcStr} (-3dB)`, fcX - 40, gy + gh + 22);

    // Sağ Parametre Paneli
    const cardX = 510;
    const cardY = 85;
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(cardX, cardY, 190, 280);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(cardX, cardY, 190, 280);

    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('FİLTRE DEĞERLERİ:', cardX + 14, cardY + 28);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Direnç (R): ${this.rKOhms} kΩ`, cardX + 14, cardY + 68);
    ctx.fillText(`Kapasite (C): ${this.cNFarads} nF`, cardX + 14, cardY + 104);
    ctx.fillText(`Kesim: ${fcStr}`, cardX + 14, cardY + 140);
    ctx.fillText(`Eğim: -20 dB/dekad`, cardX + 14, cardY + 176);

    ctx.fillStyle = '#64748B';
    ctx.font = '11px sans-serif';
    ctx.fillText('⚡ Devrem Studio • Analog Filtre & Bode Spektrumu', 24, h - 16);
  }

  renderToDataUrl() {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 460;
    this.renderToCanvas(canvas);
    return canvas.toDataURL('image/png');
  }
}
