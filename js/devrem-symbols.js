/**
 * TabNote Studio — Devrem Studio EEM Entegrasyonu (devrem-symbols.js)
 * Elektrik-Elektronik Mühendisliği devre şeması çizimleri için vektörel bileşen kütüphanesi
 */

export const DEVREM_SYMBOLS = [
  {
    id: 'resistor',
    name: 'Direnç (R)',
    category: 'Pasif Elemanlar',
    width: 140,
    height: 60,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 60" width="140" height="60">
      <path d="M 10,30 L 30,30 L 40,15 L 55,45 L 70,15 L 85,45 L 100,15 L 110,30 L 130,30" 
            fill="none" stroke="#0F172A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="10" cy="30" r="3" fill="#0F172A"/>
      <circle cx="130" cy="30" r="3" fill="#0F172A"/>
      <text x="70" y="58" font-family="sans-serif" font-size="11" font-weight="700" fill="#2563EB" text-anchor="middle">R</text>
    </svg>`
  },
  {
    id: 'capacitor',
    name: 'Kondansatör (C)',
    category: 'Pasif Elemanlar',
    width: 120,
    height: 60,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60" width="120" height="60">
      <line x1="10" y1="30" x2="52" y2="30" stroke="#0F172A" stroke-width="3" stroke-linecap="round"/>
      <line x1="52" y1="12" x2="52" y2="48" stroke="#0F172A" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="68" y1="12" x2="68" y2="48" stroke="#0F172A" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="68" y1="30" x2="110" y2="30" stroke="#0F172A" stroke-width="3" stroke-linecap="round"/>
      <circle cx="10" cy="30" r="3" fill="#0F172A"/>
      <circle cx="110" cy="30" r="3" fill="#0F172A"/>
      <text x="60" y="58" font-family="sans-serif" font-size="11" font-weight="700" fill="#2563EB" text-anchor="middle">C</text>
    </svg>`
  },
  {
    id: 'inductor',
    name: 'Bobin / İndüktör (L)',
    category: 'Pasif Elemanlar',
    width: 140,
    height: 60,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 60" width="140" height="60">
      <path d="M 10,35 L 30,35 
               A 12,12 0 0,1 54,35 
               A 12,12 0 0,1 78,35 
               A 12,12 0 0,1 102,35 
               A 12,12 0 0,1 126,35 L 130,35" 
            fill="none" stroke="#0F172A" stroke-width="3" stroke-linecap="round"/>
      <circle cx="10" cy="35" r="3" fill="#0F172A"/>
      <circle cx="130" cy="35" r="3" fill="#0F172A"/>
      <text x="70" y="58" font-family="sans-serif" font-size="11" font-weight="700" fill="#2563EB" text-anchor="middle">L</text>
    </svg>`
  },
  {
    id: 'diode',
    name: 'Diyot (D)',
    category: 'Yarıiletkenler',
    width: 120,
    height: 60,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60" width="120" height="60">
      <line x1="10" y1="30" x2="45" y2="30" stroke="#0F172A" stroke-width="3"/>
      <polygon points="45,15 75,30 45,45" fill="#0F172A" stroke="#0F172A" stroke-width="2"/>
      <line x1="75" y1="14" x2="75" y2="46" stroke="#0F172A" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="75" y1="30" x2="110" y2="30" stroke="#0F172A" stroke-width="3"/>
      <circle cx="10" cy="30" r="3" fill="#0F172A"/>
      <circle cx="110" cy="30" r="3" fill="#0F172A"/>
      <text x="60" y="58" font-family="sans-serif" font-size="11" font-weight="700" fill="#2563EB" text-anchor="middle">D</text>
    </svg>`
  },
  {
    id: 'led',
    name: 'LED (Işık Yayan Diyot)',
    category: 'Yarıiletkenler',
    width: 120,
    height: 70,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 70" width="120" height="70">
      <line x1="10" y1="40" x2="45" y2="40" stroke="#0F172A" stroke-width="3"/>
      <polygon points="45,25 75,40 45,55" fill="#EF4444" stroke="#EF4444" stroke-width="2"/>
      <line x1="75" y1="24" x2="75" y2="56" stroke="#0F172A" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="75" y1="40" x2="110" y2="40" stroke="#0F172A" stroke-width="3"/>
      <!-- Işık okları -->
      <line x1="56" y1="20" x2="70" y2="8" stroke="#EF4444" stroke-width="2" marker-end="url(#arrow)"/>
      <polygon points="70,8 65,13 72,12" fill="#EF4444"/>
      <line x1="68" y1="24" x2="82" y2="12" stroke="#EF4444" stroke-width="2"/>
      <polygon points="82,12 77,17 84,16" fill="#EF4444"/>
      <circle cx="10" cy="40" r="3" fill="#0F172A"/>
      <circle cx="110" cy="40" r="3" fill="#0F172A"/>
      <text x="60" y="68" font-family="sans-serif" font-size="11" font-weight="700" fill="#EF4444" text-anchor="middle">LED</text>
    </svg>`
  },
  {
    id: 'ground',
    name: 'Toprak (GND)',
    category: 'Kaynaklar & Toprak',
    width: 80,
    height: 70,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 70" width="80" height="70">
      <line x1="40" y1="10" x2="40" y2="35" stroke="#0F172A" stroke-width="3"/>
      <line x1="18" y1="35" x2="62" y2="35" stroke="#0F172A" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="26" y1="45" x2="54" y2="45" stroke="#0F172A" stroke-width="3" stroke-linecap="round"/>
      <line x1="34" y1="55" x2="46" y2="55" stroke="#0F172A" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="40" cy="10" r="3" fill="#0F172A"/>
      <text x="40" y="68" font-family="sans-serif" font-size="10" font-weight="700" fill="#2563EB" text-anchor="middle">GND</text>
    </svg>`
  },
  {
    id: 'dc_source',
    name: 'DC Gerilim Kaynağı',
    category: 'Kaynaklar & Toprak',
    width: 100,
    height: 90,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 90" width="100" height="90">
      <line x1="50" y1="8" x2="50" y2="25" stroke="#0F172A" stroke-width="3"/>
      <circle cx="50" cy="45" r="20" fill="none" stroke="#0F172A" stroke-width="3"/>
      <line x1="50" y1="65" x2="50" y2="82" stroke="#0F172A" stroke-width="3"/>
      <text x="50" y="40" font-family="sans-serif" font-size="14" font-weight="700" fill="#EF4444" text-anchor="middle">+</text>
      <text x="50" y="56" font-family="sans-serif" font-size="16" font-weight="700" fill="#0F172A" text-anchor="middle">−</text>
      <circle cx="50" cy="8" r="3" fill="#0F172A"/>
      <circle cx="50" cy="82" r="3" fill="#0F172A"/>
      <text x="82" y="48" font-family="sans-serif" font-size="11" font-weight="700" fill="#2563EB">V_DC</text>
    </svg>`
  },
  {
    id: 'ac_source',
    name: 'AC Sinüs Kaynağı',
    category: 'Kaynaklar & Toprak',
    width: 100,
    height: 90,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 90" width="100" height="90">
      <line x1="50" y1="8" x2="50" y2="25" stroke="#0F172A" stroke-width="3"/>
      <circle cx="50" cy="45" r="20" fill="none" stroke="#0F172A" stroke-width="3"/>
      <path d="M 40,45 Q 45,37 50,45 T 60,45" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="50" y1="65" x2="50" y2="82" stroke="#0F172A" stroke-width="3"/>
      <circle cx="50" cy="8" r="3" fill="#0F172A"/>
      <circle cx="50" cy="82" r="3" fill="#0F172A"/>
      <text x="82" y="48" font-family="sans-serif" font-size="11" font-weight="700" fill="#2563EB">V_AC</text>
    </svg>`
  },
  {
    id: 'opamp',
    name: 'Op-Amp (İşlemsel Yükselteç)',
    category: 'Entegreler & Lojik',
    width: 150,
    height: 100,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 100" width="150" height="100">
      <polygon points="40,15 110,50 40,85" fill="#FFFFFF" stroke="#0F172A" stroke-width="3" stroke-linejoin="round"/>
      <!-- Giriş 1 (-) -->
      <line x1="10" y1="32" x2="40" y2="32" stroke="#0F172A" stroke-width="3"/>
      <text x="50" y="37" font-family="sans-serif" font-size="16" font-weight="700" fill="#0F172A">−</text>
      <!-- Giriş 2 (+) -->
      <line x1="10" y1="68" x2="40" y2="68" stroke="#0F172A" stroke-width="3"/>
      <text x="50" y="73" font-family="sans-serif" font-size="16" font-weight="700" fill="#EF4444">+</text>
      <!-- Çıkış -->
      <line x1="110" y1="50" x2="140" y2="50" stroke="#0F172A" stroke-width="3"/>
      <circle cx="10" cy="32" r="3" fill="#0F172A"/>
      <circle cx="10" cy="68" r="3" fill="#0F172A"/>
      <circle cx="140" cy="50" r="3" fill="#0F172A"/>
      <text x="75" y="55" font-family="sans-serif" font-size="11" font-weight="700" fill="#2563EB">OP-AMP</text>
    </svg>`
  },
  {
    id: 'transistor_npn',
    name: 'NPN Transistör (BJT)',
    category: 'Yarıiletkenler',
    width: 120,
    height: 100,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" width="120" height="100">
      <circle cx="65" cy="50" r="32" fill="none" stroke="#0F172A" stroke-width="2" stroke-dasharray="3 3"/>
      <!-- Base (B) -->
      <line x1="10" y1="50" x2="50" y2="50" stroke="#0F172A" stroke-width="3"/>
      <line x1="50" y1="28" x2="50" y2="72" stroke="#0F172A" stroke-width="4.5" stroke-linecap="round"/>
      <!-- Collector (C) -->
      <line x1="50" y1="38" x2="80" y2="20" stroke="#0F172A" stroke-width="3"/>
      <line x1="80" y1="20" x2="80" y2="8" stroke="#0F172A" stroke-width="3"/>
      <!-- Emitter (E) with arrow -->
      <line x1="50" y1="62" x2="80" y2="80" stroke="#0F172A" stroke-width="3"/>
      <line x1="80" y1="80" x2="80" y2="92" stroke="#0F172A" stroke-width="3"/>
      <polygon points="76,73 80,80 71,78" fill="#0F172A"/>
      <circle cx="10" cy="50" r="3" fill="#0F172A"/>
      <circle cx="80" cy="8" r="3" fill="#0F172A"/>
      <circle cx="80" cy="92" r="3" fill="#0F172A"/>
      <text x="24" y="44" font-family="sans-serif" font-size="10" font-weight="700" fill="#2563EB">B</text>
      <text x="88" y="24" font-family="sans-serif" font-size="10" font-weight="700" fill="#2563EB">C</text>
      <text x="88" y="86" font-family="sans-serif" font-size="10" font-weight="700" fill="#2563EB">E</text>
    </svg>`
  },
  {
    id: 'logic_and',
    name: 'VE (AND) Kapısı',
    category: 'Entegreler & Lojik',
    width: 140,
    height: 70,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 70" width="140" height="70">
      <line x1="10" y1="22" x2="40" y2="22" stroke="#0F172A" stroke-width="3"/>
      <line x1="10" y1="48" x2="40" y2="48" stroke="#0F172A" stroke-width="3"/>
      <path d="M 40,12 L 65,12 A 23,23 0 0,1 65,58 L 40,58 Z" fill="#FFFFFF" stroke="#0F172A" stroke-width="3"/>
      <line x1="88" y1="35" x2="130" y2="35" stroke="#0F172A" stroke-width="3"/>
      <circle cx="10" cy="22" r="3" fill="#0F172A"/>
      <circle cx="10" cy="48" r="3" fill="#0F172A"/>
      <circle cx="130" cy="35" r="3" fill="#0F172A"/>
      <text x="60" y="40" font-family="sans-serif" font-size="12" font-weight="800" fill="#2563EB">AND</text>
    </svg>`
  },
  {
    id: 'logic_or',
    name: 'VEYA (OR) Kapısı',
    category: 'Entegreler & Lojik',
    width: 140,
    height: 70,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 70" width="140" height="70">
      <line x1="10" y1="22" x2="44" y2="22" stroke="#0F172A" stroke-width="3"/>
      <line x1="10" y1="48" x2="44" y2="48" stroke="#0F172A" stroke-width="3"/>
      <path d="M 38,12 Q 52,35 38,58 Q 72,58 92,35 Q 72,12 38,12 Z" fill="#FFFFFF" stroke="#0F172A" stroke-width="3"/>
      <line x1="92" y1="35" x2="130" y2="35" stroke="#0F172A" stroke-width="3"/>
      <circle cx="10" cy="22" r="3" fill="#0F172A"/>
      <circle cx="10" cy="48" r="3" fill="#0F172A"/>
      <circle cx="130" cy="35" r="3" fill="#0F172A"/>
      <text x="62" y="40" font-family="sans-serif" font-size="12" font-weight="800" fill="#2563EB">OR</text>
    </svg>`
  },
  {
    id: 'logic_not',
    name: 'DEĞİL (NOT) Kapısı',
    category: 'Entegreler & Lojik',
    width: 120,
    height: 60,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60" width="120" height="60">
      <line x1="10" y1="30" x2="40" y2="30" stroke="#0F172A" stroke-width="3"/>
      <polygon points="40,15 75,30 40,45" fill="#FFFFFF" stroke="#0F172A" stroke-width="3"/>
      <circle cx="81" cy="30" r="5" fill="#FFFFFF" stroke="#0F172A" stroke-width="2.5"/>
      <line x1="86" y1="30" x2="110" y2="30" stroke="#0F172A" stroke-width="3"/>
      <circle cx="10" cy="30" r="3" fill="#0F172A"/>
      <circle cx="110" cy="30" r="3" fill="#0F172A"/>
      <text x="52" y="34" font-family="sans-serif" font-size="9" font-weight="800" fill="#2563EB">NOT</text>
    </svg>`
  },
  {
    id: 'switch_spst',
    name: 'Anahtar (Switch)',
    category: 'Pasif Elemanlar',
    width: 110,
    height: 50,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 50" width="110" height="50">
      <line x1="10" y1="30" x2="35" y2="30" stroke="#0F172A" stroke-width="3"/>
      <circle cx="38" cy="30" r="4" fill="none" stroke="#0F172A" stroke-width="2.5"/>
      <line x1="40" y1="28" x2="70" y2="12" stroke="#0F172A" stroke-width="3.2" stroke-linecap="round"/>
      <circle cx="74" cy="30" r="4" fill="none" stroke="#0F172A" stroke-width="2.5"/>
      <line x1="78" y1="30" x2="100" y2="30" stroke="#0F172A" stroke-width="3"/>
      <circle cx="10" cy="30" r="3" fill="#0F172A"/>
      <circle cx="100" cy="30" r="3" fill="#0F172A"/>
      <text x="55" y="45" font-family="sans-serif" font-size="10" font-weight="700" fill="#2563EB" text-anchor="middle">SW</text>
    </svg>`
  }
];

export function svgToDataUrl(svgString) {
  const clean = svgString.replace(/[\n\r\t]+/g, ' ').trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(clean)}`;
}
