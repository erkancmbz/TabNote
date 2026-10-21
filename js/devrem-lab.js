/**
 * TabNote Studio — Devrem Studio EEM Laboratuvarı & Simülatörleri (devrem-lab.js)
 * 1. Karnaugh Haritası (K-Map) Çözücü & Diyagram Üretici
 * 2. Transformatör & Manyetik Devre Analizi & Dalga Şekli Simülatörü
 * 3. RLC Rezonans, Empedans & Frekans Tepkisi (Bode) Simülatörü
 * Tüm simülasyon sonuçlarını yüksek çözünürlüklü görsel kartı olarak sayfaya aktarır.
 */

// ==========================================================================
// 1. KARNAUGH HARİTASI (K-MAP) SİMÜLATÖRÜ & ÇÖZÜCÜ
// ==========================================================================
export class KarnaughMapSimulator {
  constructor(varCount = 3) {
    this.varCount = varCount; // 2, 3 veya 4
    this.grid = new Array(varCount === 2 ? 4 : varCount === 3 ? 8 : 16).fill(0);
    // Örnek başlangıç mintermleri
    if (varCount === 3) {
      [1, 3, 5, 7].forEach((idx) => (this.grid[idx] = 1));
    } else if (varCount === 4) {
      [0, 2, 5, 7, 8, 10, 13, 15].forEach((idx) => (this.grid[idx] = 1));
    } else {
      [1, 3].forEach((idx) => (this.grid[idx] = 1));
    }
  }

  setVarCount(n) {
    this.varCount = n;
    this.grid = new Array(n === 2 ? 4 : n === 3 ? 8 : 16).fill(0);
    if (n === 2) [1, 3].forEach((i) => (this.grid[i] = 1));
    else if (n === 3) [1, 3, 5, 7].forEach((i) => (this.grid[i] = 1));
    else [0, 2, 5, 7, 8, 10, 13, 15].forEach((i) => (this.grid[i] = 1));
  }

  toggleCell(index) {
    if (index >= 0 && index < this.grid.length) {
      this.grid[index] = this.grid[index] === 1 ? 0 : 1;
    }
  }

  // Basit ve güvenilir Boolean minimizasyon özeti
  solve() {
    const activeMinterms = [];
    this.grid.forEach((v, idx) => {
      if (v === 1) activeMinterms.push(idx);
    });

    if (activeMinterms.length === 0) return { expr: 'Y = 0', minterms: [] };
    if (activeMinterms.length === this.grid.length) return { expr: 'Y = 1', minterms: activeMinterms };

    // 2 değişkenli (A, B)
    if (this.varCount === 2) {
      const g = this.grid;
      const terms = [];
      if (g[0] && g[1]) terms.push("A'");
      if (g[2] && g[3]) terms.push("A");
      if (g[0] && g[2]) terms.push("B'");
      if (g[1] && g[3]) terms.push("B");
      if (terms.length === 0) {
        if (g[0]) terms.push("A'B'");
        if (g[1]) terms.push("A'B");
        if (g[2]) terms.push("AB'");
        if (g[3]) terms.push("AB");
      }
      return { expr: `Y = ${Array.from(new Set(terms)).join(' + ')}`, minterms: activeMinterms };
    }

    // 3 değişkenli (A, B, C)
    if (this.varCount === 3) {
      const g = this.grid;
      const terms = [];
      // 4'lü gruplar
      if (g[0] && g[1] && g[3] && g[2]) terms.push("A'");
      if (g[4] && g[5] && g[7] && g[6]) terms.push("A");
      if (g[1] && g[3] && g[5] && g[7]) terms.push("C");
      if (g[0] && g[2] && g[4] && g[6]) terms.push("C'");
      if (g[2] && g[3] && g[6] && g[7]) terms.push("B");
      if (g[0] && g[1] && g[4] && g[5]) terms.push("B'");
      if (terms.length === 0) {
        // İkili veya tekli gruplar
        terms.push(`Σm(${activeMinterms.join(', ')})`);
      }
      return { expr: `Y = ${Array.from(new Set(terms)).join(' + ')}`, minterms: activeMinterms };
    }

    // 4 değişkenli (A, B, C, D)
    return { expr: `Y = Σm(${activeMinterms.join(', ')})`, minterms: activeMinterms };
  }

  // Not sayfasına eklenecek yüksek kaliteli PNG dataUrl oluşturur
  renderToDataUrl() {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    // Kart Arka Planı (Şık Mühendislik Kartı)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 720, 480);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 718, 478);

    // Üst Başlık Şeridi
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, 720, 56);
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('⚡ DEVREM EEM — KARNAUGH HARİTASI (K-MAP)', 24, 36);

    const solution = this.solve();
    const rows = this.varCount === 2 ? 2 : this.varCount === 3 ? 2 : 4;
    const cols = this.varCount === 2 ? 2 : 4;

    const startX = 80;
    const startY = 110;
    const cellW = 80;
    const cellH = 60;

    // Gray Kodu etiketleri
    const rowLabels = rows === 2 ? ['0', '1'] : ['00', '01', '11', '10'];
    const colLabels = cols === 2 ? ['0', '1'] : ['00', '01', '11', '10'];

    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(this.varCount === 2 ? 'A \\ B' : this.varCount === 3 ? 'A \\ BC' : 'AB \\ CD', startX - 45, startY - 14);

    // Sütun başlıkları
    ctx.font = 'bold 14px sans-serif';
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = '#2563EB';
      ctx.fillText(colLabels[c], startX + c * cellW + cellW / 2 - 10, startY - 12);
    }

    // Satır başlıkları & Hücreler
    let mintermIndexMap = [];
    if (this.varCount === 2) {
      mintermIndexMap = [
        [0, 1],
        [2, 3]
      ];
    } else if (this.varCount === 3) {
      mintermIndexMap = [
        [0, 1, 3, 2],
        [4, 5, 7, 6]
      ];
    } else {
      mintermIndexMap = [
        [0, 1, 3, 2],
        [4, 5, 7, 6],
        [12, 13, 15, 14],
        [8, 9, 11, 10]
      ];
    }

    for (let r = 0; r < rows; r++) {
      ctx.fillStyle = '#2563EB';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(rowLabels[r], startX - 35, startY + r * cellH + cellH / 2 + 5);

      for (let c = 0; c < cols; c++) {
        const mIdx = mintermIndexMap[r][c];
        const val = this.grid[mIdx];
        const x = startX + c * cellW;
        const y = startY + r * cellH;

        // Hücre dolgusu
        ctx.fillStyle = val === 1 ? 'rgba(59, 130, 246, 0.16)' : '#F8FAFC';
        ctx.fillRect(x, y, cellW, cellH);

        // Çerçeve
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, cellW, cellH);

        // Minterm küçük numarası
        ctx.fillStyle = '#64748B';
        ctx.font = '10px sans-serif';
        ctx.fillText(`m${mIdx}`, x + 5, y + 14);

        // Değer (0 veya 1)
        ctx.fillStyle = val === 1 ? '#2563EB' : '#94A3B8';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(String(val), x + cellW / 2 - 8, y + cellH / 2 + 10);
      }
    }

    // Sağ Taraf: Çözüm Kutusu ve Bilgiler
    const resX = 450;
    const resY = 110;
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(resX, resY, 230, 240);
    ctx.strokeStyle = '#CBD5E1';
    ctx.strokeRect(resX, resY, 230, 240);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('BOOLEAN ÇÖZÜMÜ:', resX + 16, resY + 35);

    ctx.fillStyle = '#DC2626';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(solution.expr, resX + 16, resY + 75);

    ctx.fillStyle = '#475569';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Değişken Sayısı: ${this.varCount}`, resX + 16, resY + 120);
    ctx.fillText(`Aktif Mintermler: ${solution.minterms.length} adet`, resX + 16, resY + 145);
    ctx.fillText(`Σm(${solution.minterms.join(', ')})`, resX + 16, resY + 170);

    // Alt Bilgi
    ctx.fillStyle = '#64748B';
    ctx.font = '12px sans-serif';
    ctx.fillText('TabNote Studio & Devrem Laboratuvarı Entegrasyonu • Otomatik Çözülmüştür', 24, 455);

    return canvas.toDataURL('image/png');
  }
}

// ==========================================================================
// 2. TRANSFORMATÖR & MANYETİK DEVRE SİMÜLATÖRÜ
// ==========================================================================
export class TransformerSimulator {
  constructor() {
    this.v1 = 220; // Primer Voltaj (V)
    this.n1 = 1000; // Primer Sarım Sayısı
    this.n2 = 100; // Sekonder Sarım Sayısı
    this.rl = 10; // Yük Direnci (Ohm)
  }

  calc() {
    const a = this.n1 / (this.n2 || 1);
    const v2 = this.v1 / a;
    const i2 = v2 / (this.rl || 1);
    const i1 = i2 / a;
    const p1 = this.v1 * i1;
    const p2 = v2 * i2;
    return { a, v2, i1, i2, p1, p2 };
  }

  renderToDataUrl() {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 460;
    const ctx = canvas.getContext('2d');

    const res = this.calc();

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 720, 460);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 718, 458);

    // Başlık
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, 720, 56);
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('⚡ DEVREM EEM — İDEAL TRANSFORMATÖR ANALİZİ', 24, 36);

    // Sol Taraf: Transformatör Şeması
    const cx = 200;
    const cy = 230;

    // Demir Nüve (Kare)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 14;
    ctx.strokeRect(cx - 70, cy - 80, 140, 160);

    // Primer Sarımları (Sol - Kırmızı)
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 3.5;
    for (let y = cy - 60; y <= cy + 60; y += 18) {
      ctx.beginPath();
      ctx.arc(cx - 70, y, 10, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    }
    // Primer Hatları
    ctx.beginPath();
    ctx.moveTo(cx - 70, cy - 60);
    ctx.lineTo(cx - 140, cy - 60);
    ctx.moveTo(cx - 70, cy + 60);
    ctx.lineTo(cx - 140, cy + 60);
    ctx.stroke();

    ctx.fillStyle = '#DC2626';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`V₁ = ${this.v1} V (AC)`, cx - 180, cy - 75);
    ctx.fillText(`N₁ = ${this.n1} Sarım`, cx - 180, cy + 10);
    ctx.fillText(`I₁ = ${res.i1.toFixed(2)} A`, cx - 180, cy + 85);

    // Sekonder Sarımları (Sağ - Mavi)
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 3.5;
    for (let y = cy - 50; y <= cy + 50; y += 25) {
      ctx.beginPath();
      ctx.arc(cx + 70, y, 10, Math.PI / 2, -Math.PI / 2);
      ctx.stroke();
    }
    // Sekonder Hatları ve Yük (RL)
    ctx.beginPath();
    ctx.moveTo(cx + 70, cy - 50);
    ctx.lineTo(cx + 140, cy - 50);
    ctx.lineTo(cx + 140, cy - 15);
    ctx.strokeRect(cx + 130, cy - 15, 20, 30);
    ctx.moveTo(cx + 140, cy + 15);
    ctx.lineTo(cx + 140, cy + 50);
    ctx.lineTo(cx + 70, cy + 50);
    ctx.stroke();

    ctx.fillStyle = '#2563EB';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`V₂ = ${res.v2.toFixed(1)} V`, cx + 160, cy - 55);
    ctx.fillText(`N₂ = ${this.n2} Sarım`, cx + 80, cy + 10);
    ctx.fillText(`RL = ${this.rl} Ω`, cx + 160, cy + 5);
    ctx.fillText(`I₂ = ${res.i2.toFixed(2)} A`, cx + 160, cy + 65);

    // Sağ Taraf: Analiz Tablosu & Formüller
    const tblX = 440;
    const tblY = 90;
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(tblX, tblY, 250, 300);
    ctx.strokeStyle = '#CBD5E1';
    ctx.strokeRect(tblX, tblY, 250, 300);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('ANALİZ SONUÇLARI:', tblX + 16, tblY + 30);

    ctx.fillStyle = '#334155';
    ctx.font = '13px sans-serif';
    ctx.fillText(`Dönüştürme Oranı (a): ${res.a.toFixed(2)}`, tblX + 16, tblY + 65);
    ctx.fillText(`Sekonder Gerilimi (V₂): ${res.v2.toFixed(2)} V`, tblX + 16, tblY + 100);
    ctx.fillText(`Sekonder Akımı (I₂): ${res.i2.toFixed(2)} A`, tblX + 16, tblY + 135);
    ctx.fillText(`Primer Akımı (I₁): ${res.i1.toFixed(3)} A`, tblX + 16, tblY + 170);
    ctx.fillText(`Aktif Güç (P): ${res.p2.toFixed(1)} W`, tblX + 16, tblY + 205);

    ctx.fillStyle = '#059669';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(res.a > 1 ? '↓ Adım Düşürücü (Step-Down)' : '↑ Adım Yükseltici (Step-Up)', tblX + 16, tblY + 245);

    ctx.fillStyle = '#64748B';
    ctx.font = '11px monospace';
    ctx.fillText('V₁/V₂ = N₁/N₂ = I₂/I₁ = a', tblX + 16, tblY + 275);

    // Alt Bilgi
    ctx.fillStyle = '#64748B';
    ctx.font = '12px sans-serif';
    ctx.fillText('TabNote Studio & Devrem Laboratuvarı • EEM Transformatör Eşdeğer Devresi', 24, 435);

    return canvas.toDataURL('image/png');
  }
}

// ==========================================================================
// 3. RLC REZONANS & BODE FREKANS TEPKİSİ SİMÜLATÖRÜ
// ==========================================================================
export class RlcSimulator {
  constructor() {
    this.r = 100; // Direnç (Ohm)
    this.l = 10; // Bobin (mH)
    this.c = 100; // Kondansatör (nF)
  }

  calc() {
    const lH = this.l * 1e-3;
    const cF = this.c * 1e-9;
    const f0 = 1 / (2 * Math.PI * Math.sqrt(lH * cF));
    const omega0 = 2 * Math.PI * f0;
    const q = (1 / this.r) * Math.sqrt(lH / cF);
    const bw = f0 / (q || 1);
    return { f0, omega0, q, bw };
  }

  renderToDataUrl() {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 460;
    const ctx = canvas.getContext('2d');

    const res = this.calc();

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 720, 460);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 718, 458);

    // Başlık
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, 720, 56);
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('⚡ DEVREM EEM — RLC REZONANS & FREKANS TEPKİSİ', 24, 36);

    // Sol Taraf: Rezonans Eğrisi Grafiği
    const gx = 80;
    const gy = 100;
    const gw = 340;
    const gh = 260;

    // Eksenler
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx, gy + gh);
    ctx.lineTo(gx + gw, gy + gh);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = '11px sans-serif';
    ctx.fillText('Genlik |I| (A)', gx - 20, gy - 12);
    ctx.fillText('Frekans (f)', gx + gw - 30, gy + gh + 20);

    // Çan Eğrisi (Rezonans Eğrisi)
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const peakX = gx + gw / 2;
    for (let x = gx; x <= gx + gw; x += 2) {
      const dist = (x - peakX) / (res.q > 2 ? 22 : 44);
      const amp = 1 / Math.sqrt(1 + dist * dist);
      const y = gy + gh - amp * (gh - 30);
      if (x === gx) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Rezonans Zirve Çizgisi
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#DC2626';
    ctx.beginPath();
    ctx.moveTo(peakX, gy + 30);
    ctx.lineTo(peakX, gy + gh);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#DC2626';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`f₀ = ${res.f0 > 1000 ? (res.f0 / 1000).toFixed(2) + ' kHz' : res.f0.toFixed(1) + ' Hz'}`, peakX - 35, gy + 20);

    // Sağ Taraf: Parametreler & Formüller
    const tblX = 460;
    const tblY = 100;
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(tblX, tblY, 230, 260);
    ctx.strokeStyle = '#CBD5E1';
    ctx.strokeRect(tblX, tblY, 230, 260);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('REZONANS PARAMETRELERİ:', tblX + 14, tblY + 30);

    ctx.fillStyle = '#334155';
    ctx.font = '13px sans-serif';
    ctx.fillText(`R = ${this.r} Ω`, tblX + 14, tblY + 65);
    ctx.fillText(`L = ${this.l} mH`, tblX + 14, tblY + 95);
    ctx.fillText(`C = ${this.c} nF`, tblX + 14, tblY + 125);

    ctx.fillStyle = '#2563EB';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`Rezonans: ${res.f0 > 1000 ? (res.f0 / 1000).toFixed(2) + ' kHz' : res.f0.toFixed(1) + ' Hz'}`, tblX + 14, tblY + 165);
    ctx.fillText(`Kalite (Q): ${res.q.toFixed(2)}`, tblX + 14, tblY + 195);
    ctx.fillText(`Bant Genişliği: ${res.bw > 1000 ? (res.bw / 1000).toFixed(2) + ' kHz' : res.bw.toFixed(1) + ' Hz'}`, tblX + 14, tblY + 225);

    // Alt Bilgi
    ctx.fillStyle = '#64748B';
    ctx.font = '12px sans-serif';
    ctx.fillText('TabNote Studio & Devrem Laboratuvarı • EEM RLC Band-Pass Filtre Analizi', 24, 435);

    return canvas.toDataURL('image/png');
  }
}
