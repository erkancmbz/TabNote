/* ─────────────────────────────────────────────────────────── */
/*  YARDIMCILAR: KANVAS HOVER TOOLTIP & BUTON GERİ BİLDİRİMİ  */
/* ─────────────────────────────────────────────────────────── */
function renderCanvasHoverTooltip(ctx, w, h, x, y, lines, accentColor = '#38bdf8') {
    if (!lines || lines.length === 0) return;
    ctx.save();
    
    let maxTextW = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const text = typeof line === 'string' ? line : line.text;
        ctx.font = (typeof line === 'object' && line.bold ? '700 11px' : '500 11px') + ' "JetBrains Mono", Outfit, sans-serif';
        const tw = ctx.measureText(text).width;
        if (tw > maxTextW) maxTextW = tw;
    }
    
    const tipPadX = 12;
    const tipPadY = 9;
    const lineHeight = 18;
    const boxW = Math.max(160, maxTextW + tipPadX * 2 + 10);
    const boxH = lines.length * lineHeight + tipPadY * 2;
    
    let tipX = x + 16;
    if (tipX + boxW > w - 10) {
        tipX = x - boxW - 16;
    }
    if (tipX < 10) tipX = 10;
    
    let tipY = y - boxH / 2;
    if (tipY < 10) tipY = 10;
    if (tipY + boxH > h - 10) tipY = h - boxH - 10;
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    
    ctx.fillStyle = 'rgba(10, 15, 29, 0.95)';
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(tipX, tipY, boxW, boxH, 7);
    } else {
        ctx.rect(tipX, tipY, boxW, boxH);
    }
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();
    
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(tipX + 3.5, tipY + 4, 3, boxH - 8, 2);
    } else {
        ctx.fillRect(tipX + 3.5, tipY + 4, 3, boxH - 8);
    }
    ctx.fill();
    
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const text = typeof line === 'string' ? line : line.text;
        const color = typeof line === 'string' ? '#f1f5f9' : (line.color || '#f1f5f9');
        const isBold = typeof line === 'object' && line.bold;
        ctx.font = (isBold ? '700 11px' : '500 11px') + ' "JetBrains Mono", Outfit, sans-serif';
        ctx.fillStyle = color;
        ctx.fillText(text, tipX + tipPadX + 6, tipY + tipPadY + i * lineHeight + lineHeight / 2);
    }
    
    ctx.restore();
}

function triggerSimButtonFeedback(btnId, runningText, successText) {
    const btn = typeof btnId === 'string' ? document.getElementById(btnId) : btnId;
    if (!btn) return;
    if (!btn._origHtml) btn._origHtml = btn.innerHTML;
    const origHtml = btn._origHtml;
    
    btn.style.transition = 'all 0.25s ease';
    btn.style.transform = 'scale(0.97)';
    btn.style.boxShadow = '0 0 20px rgba(56, 189, 248, 0.6)';
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>' + (runningText || 'Simüle Ediliyor...') + '</span>';
    
    setTimeout(() => {
        btn.style.transform = 'scale(1)';
        btn.innerHTML = '<i class="fas fa-check-circle" style="color:#a7f3d0;"></i> <span>' + (successText || 'Simülasyon Güncellendi!') + '</span>';
        setTimeout(() => {
            btn.innerHTML = origHtml;
            btn.style.boxShadow = '';
        }, 1200);
    }, 280);
}

/* ─────────────────────────────────────────────────────────── */
/*  1. TRANSFORMATÖR & EŞDEĞER DEVRE SİMÜLATÖRÜ (P0)          */
/* ─────────────────────────────────────────────────────────── */
let lastTransData = null;
let transHoverPt = null;
let transAnimFrame = null;

function animateTransformerPhasors() {
    if (transAnimFrame) cancelAnimationFrame(transAnimFrame);
    const startTime = performance.now();
    const duration = 400;
    function frame(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = 1 - Math.pow(1 - progress, 3);
        drawTransformerCanvas(null, ease);
        if (progress < 1) {
            transAnimFrame = requestAnimationFrame(frame);
        } else {
            transAnimFrame = null;
            drawTransformerCanvas(transHoverPt, 1);
        }
    }
    transAnimFrame = requestAnimationFrame(frame);
}

function calculateTransformer(animate = false) {
    const Snom = parseFloat(document.getElementById('transSnom')?.value) || 25;
    const V1 = parseFloat(document.getElementById('transV1')?.value) || 2400;
    const V2 = parseFloat(document.getElementById('transV2')?.value) || 240;
    const V0 = parseFloat(document.getElementById('transV0')?.value) || 2400;
    const I0 = parseFloat(document.getElementById('transI0')?.value) || 0.5;
    const P0 = parseFloat(document.getElementById('transP0')?.value) || 250;
    const Vsc = parseFloat(document.getElementById('transVsc')?.value) || 120;
    const Isc = parseFloat(document.getElementById('transIsc')?.value) || 10.4;
    const Psc = parseFloat(document.getElementById('transPsc')?.value) || 650;
    const k = parseFloat(document.getElementById('transKLoad')?.value) || 1.0;
    const cosPhi = Math.min(1.0, Math.max(0.1, parseFloat(document.getElementById('transCosPhi')?.value) || 0.85));
    const pfType = document.getElementById('transPfType')?.value || 'ind';

    const a = V1 / V2;
    const cosPhi0 = Math.min(1.0, Math.max(0.01, P0 / (V0 * I0)));
    const sinPhi0 = Math.sqrt(Math.max(0, 1 - cosPhi0 * cosPhi0));
    const Ic = I0 * cosPhi0;
    const Im = I0 * sinPhi0;
    const Rc = Ic > 0 ? (V0 / Ic) : 999999;
    const Xm = Im > 0 ? (V0 / Im) : 999999;

    const Zeq1 = Vsc / (Isc || 1);
    const Req1 = Psc / ((Isc * Isc) || 1);
    const Xeq1 = Math.sqrt(Math.max(0, Zeq1 * Zeq1 - Req1 * Req1));

    const phi = Math.acos(cosPhi);
    const sinPhi = Math.sin(phi);
    const phiSign = pfType === 'cap' ? 1 : (pfType === 'ind' ? -1 : 0);

    const I2_nom = (Snom * 1000) / V2;
    const I2 = k * I2_nom;
    const I1_prime = I2 / a;

    const V2_prime = V1;
    const I1_x = I1_prime * cosPhi;
    const I1_y = I1_prime * sinPhi * phiSign;

    const dV_R = I1_prime * Req1;
    const dV_X = I1_prime * Xeq1;

    const V1_x = V2_prime + (I1_x * Req1 - I1_y * Xeq1);
    const V1_y = (I1_x * Xeq1 + I1_y * Req1);
    const V1_mag = Math.sqrt(V1_x * V1_x + V1_y * V1_y);
    const V1_ang = Math.atan2(V1_y, V1_x) * (180 / Math.PI);

    const VR = ((V1_mag - V2_prime) / V2_prime) * 100;

    const Pout = k * Snom * 1000 * cosPhi;
    const Pcu = k * k * Psc;
    const Pcore = P0;
    const Pin = Pout + Pcu + Pcore;
    const eff = (Pout / (Pin || 1)) * 100;

    const k_max = Math.sqrt(Math.max(0, P0 / (Psc || 1))) * 100;
    const eff_max = (k_max / 100 * Snom * 1000 * cosPhi) / 
                    (k_max / 100 * Snom * 1000 * cosPhi + 2 * P0) * 100;

    const elA = document.getElementById('transResA');
    if (elA) elA.innerText = a.toFixed(2);
    const elRcXm = document.getElementById('transResRcXm');
    if (elRcXm) elRcXm.innerText = 'Rc = ' + Math.round(Rc).toLocaleString() + ' Ω • Xm = ' + Math.round(Xm).toLocaleString() + ' Ω (cos φ₀ = ' + cosPhi0.toFixed(3) + ')';
    const elReqXeq = document.getElementById('transResReqXeq');
    if (elReqXeq) elReqXeq.innerText = 'Req₁ = ' + Req1.toFixed(2) + ' Ω • Xeq₁ = ' + Xeq1.toFixed(2) + ' Ω (Zeq = ' + Zeq1.toFixed(2) + ' Ω)';
    const elVR = document.getElementById('transResVR');
    if (elVR) {
        elVR.innerText = '% ' + VR.toFixed(2) + ' (V₁ = ' + Math.round(V1_mag) + ' V • V₂\' = ' + Math.round(V2_prime) + ' V)';
        elVR.style.color = VR > 5 ? '#f87171' : '#38bdf8';
    }
    const elEff = document.getElementById('transResEff');
    if (elEff) elEff.innerText = '% ' + eff.toFixed(2) + ' (P_çıkış = ' + (Pout/1000).toFixed(2) + ' kW • P_cu = ' + Math.round(Pcu) + ' W • P_fe = ' + Math.round(Pcore) + ' W)';
    const elMaxEff = document.getElementById('transResMaxEff');
    if (elMaxEff) elMaxEff.innerText = 'k_max = % ' + k_max.toFixed(1) + ' yüklenme • η_max = % ' + eff_max.toFixed(2);

    lastTransData = {
        Snom, V1, V2, a, V2_prime, V1_mag, V1_ang, V1_x, V1_y,
        I1_prime, cosPhi, phi, phiSign, dV_R, dV_X, VR, eff
    };

    if (animate) {
        triggerSimButtonFeedback('transSimBtn', 'Fazörler Hesaplanıyor...', 'Eşdeğer Devre & Fazörler Çizildi!');
        animateTransformerPhasors();
    } else {
        drawTransformerCanvas(transHoverPt, 1);
    }
}

function drawTransformerCanvas(hoverPt, animProgress = 1) {
    const canvas = document.getElementById('transformerCanvas');
    if (!canvas || !lastTransData) return;
    const hi = setupHiDpiCanvas(canvas);
    if (!hi) return;
    const { ctx, w, h } = hi;

    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    const ox = 70;
    const oy = h * 0.65;

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(ox - 30, oy); ctx.lineTo(w - 30, oy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox, h - 20); ctx.lineTo(ox, 20); ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '11px Outfit, sans-serif';
    ctx.fillText('Re (Reel)', w - 65, oy - 8);
    ctx.fillText('+j (İmajiner)', ox + 8, 30);

    const d = lastTransData;
    const maxV = Math.max(d.V2_prime, d.V1_mag) * 1.15;
    const baseScale = (w - ox - 80) / (maxV || 1);
    const scale = baseScale * Math.max(0.05, animProgress);

    const v2_px = ox + d.V2_prime * scale;
    const v2_py = oy;

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(v2_px, v2_py); ctx.stroke();
    drawArrowHead(ctx, ox, oy, v2_px, v2_py, '#38bdf8', 10);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText("V₂' = " + Math.round(d.V2_prime) + " V (Ref 0°)", v2_px - 90, v2_py + 20);

    const i_len = Math.min(130, Math.max(50, (d.I1_prime / 15) * 80)) * Math.max(0.1, animProgress);
    const i_angle = -d.phiSign * d.phi;
    const i_px = ox + i_len * Math.cos(i_angle);
    const i_py = oy - i_len * Math.sin(i_angle);

    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(i_px, i_py); ctx.stroke();
    drawArrowHead(ctx, ox, oy, i_px, i_py, '#34d399', 8);
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.fillText("I₂' = " + d.I1_prime.toFixed(1) + " A", i_px + 8, i_py + (d.phiSign >= 0 ? -6 : 14));

    if (d.phiSign !== 0) {
        ctx.strokeStyle = 'rgba(52,211,153,0.4)';
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.arc(ox, oy, 35, 0, -d.phiSign * d.phi, d.phiSign > 0);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#a7f3d0';
        ctx.font = '10px Outfit, sans-serif';
        ctx.fillText("φ=" + (d.phi * 180 / Math.PI).toFixed(1) + "°", ox + 42, oy + (d.phiSign < 0 ? 14 : -12));
    }

    const vr_len = d.dV_R * scale;
    const vr_px = v2_px + vr_len * Math.cos(i_angle);
    const vr_py = v2_py - vr_len * Math.sin(i_angle);

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(v2_px, v2_py); ctx.lineTo(vr_px, vr_py); ctx.stroke();
    drawArrowHead(ctx, v2_px, v2_py, vr_px, vr_py, '#fbbf24', 7);

    const vx_angle = i_angle + Math.PI / 2;
    const vx_len = d.dV_X * scale;
    const vx_px = vr_px + vx_len * Math.cos(vx_angle);
    const vx_py = vr_py - vx_len * Math.sin(vx_angle);

    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(vr_px, vr_py); ctx.lineTo(vx_px, vx_py); ctx.stroke();
    drawArrowHead(ctx, vr_px, vr_py, vx_px, vx_py, '#c084fc', 7);

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(vx_px, vx_py); ctx.stroke();
    drawArrowHead(ctx, ox, oy, vx_px, vx_py, '#ef4444', 11);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText("V₁ = " + Math.round(d.V1_mag) + " V ∠ " + d.V1_ang.toFixed(1) + "°", vx_px + 8, vx_py - 8);

    if (hoverPt) {
        const dx = hoverPt.x - ox;
        const dy = hoverPt.y - oy;
        const distPx = Math.hypot(dx, dy);
        let curV = distPx / (scale || 1);
        let curAng = -Math.atan2(dy, dx) * (180 / Math.PI);

        const targets = [
            { x: vx_px, y: vx_py, label: "Primer Gerilim V₁", val: Math.round(d.V1_mag) + " V", color: "#ef4444" },
            { x: v2_px, y: v2_py, label: "Sekonder Gerilim V₂'", val: Math.round(d.V2_prime) + " V", color: "#38bdf8" },
            { x: i_px, y: i_py, label: "Sekonder Akımı I₂'", val: d.I1_prime.toFixed(1) + " A", color: "#34d399" },
            { x: vr_px, y: vr_py, label: "Omik Düşüm I·Req", val: Math.round(d.dV_R) + " V", color: "#fbbf24" }
        ];

        let closest = null;
        let minDist = 28;
        targets.forEach(t => {
            const dt = Math.hypot(hoverPt.x - t.x, hoverPt.y - t.y);
            if (dt < minDist) {
                minDist = dt;
                closest = t;
            }
        });

        const snapX = closest ? closest.x : hoverPt.x;
        const snapY = closest ? closest.y : hoverPt.y;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(snapX, snapY); ctx.stroke();

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.beginPath(); ctx.moveTo(snapX, 0); ctx.lineTo(snapX, h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, snapY); ctx.lineTo(w, snapY); ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = closest ? closest.color : '#38bdf8';
        ctx.shadowColor = closest ? closest.color : 'rgba(56, 189, 248, 0.9)';
        ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(snapX, snapY, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();

        const tooltipLines = [
            { text: closest ? ('🎯 ' + closest.label) : ('Fazör Vektörü (' + curAng.toFixed(1) + '°)'), color: closest ? closest.color : '#38bdf8', bold: true },
            { text: 'Büyüklük: ' + (closest ? closest.val : Math.round(curV) + ' V'), color: '#f1f5f9', bold: true },
            { text: 'Açı: ' + curAng.toFixed(1) + '° (' + (curAng * Math.PI / 180).toFixed(2) + ' rad)', color: '#cbd5e1' },
            { text: 'Regülasyon %VR: %' + d.VR.toFixed(2) + ' | Verim: %' + d.eff.toFixed(1), color: '#34d399' }
        ];
        renderCanvasHoverTooltip(ctx, w, h, snapX, snapY, tooltipLines, closest ? closest.color : '#d97706');
    }

    const hud = document.getElementById('transformerHoverInfo');
    if (hud) {
        if (hoverPt) {
            hud.style.display = 'block';
            hud.innerHTML = '<span style="color:#ef4444;font-weight:700;">V₁: ' + Math.round(d.V1_mag) + ' V</span> | ' +
                            '<span style="color:#38bdf8;">V₂\': ' + Math.round(d.V2_prime) + ' V</span> | ' +
                            '<span style="color:#fbbf24;">I·Req: ' + Math.round(d.dV_R) + ' V</span> | ' +
                            '<span style="color:#c084fc;">jI·Xeq: ' + Math.round(d.dV_X) + ' V</span> | ' +
                            '<span style="color:#34d399;">%VR: %' + d.VR.toFixed(2) + '</span>';
        } else {
            hud.innerText = "İmleci fazör düzleminde gezdirerek V1, V2', I2'Req ve jI2'Xeq büyüklüklerini inceleyin";
        }
    }
}

function drawArrowHead(ctx, fromX, fromY, toX, toY, color, size) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - size * Math.cos(angle - Math.PI / 6), toY - size * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - size * Math.cos(angle + Math.PI / 6), toY - size * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

/* ─────────────────────────────────────────────────────────── */
/*  2. 3-FAZ SARGI BAĞLANTILARI & ZİKZAK (ZN) ANALİZÖRÜ (P0)  */
/* ─────────────────────────────────────────────────────────── */
let lastZigzagData = null;
let zigzagHoverPt = null;
let zigzagSim = {
    isRunning: false,
    animId: null,
    theta: 0
};

function toggleZigzagSimulation() {
    zigzagSim.isRunning = !zigzagSim.isRunning;
    const btn = document.getElementById('zigzagSimBtn');
    const statusTxt = document.getElementById('zigzagSimStatusTxt');
    const statusDot = document.querySelector('#zigzagSimStatus .status-dot');

    if (zigzagSim.isRunning) {
        if (btn) {
            btn.innerHTML = '<i class="fas fa-pause"></i> <span>Durdur</span>';
            btn.style.background = 'linear-gradient(135deg, #d97706, #f59e0b)';
        }
        if (statusTxt) statusTxt.innerHTML = '<span style="color:#34d399;font-weight:700;">Canlı Simülasyon Aktif (50 Hz)</span>';
        if (statusDot) {
            statusDot.style.background = '#10b981';
            statusDot.style.boxShadow = '0 0 8px #10b981';
        }
        startZigzagAnimation();
    } else {
        if (zigzagSim.animId) {
            cancelAnimationFrame(zigzagSim.animId);
            zigzagSim.animId = null;
        }
        if (btn) {
            btn.innerHTML = '<i class="fas fa-play"></i> <span>Simülasyonu Başlat</span>';
            btn.style.background = 'linear-gradient(135deg, #0284c7, #38bdf8)';
        }
        if (statusTxt) statusTxt.innerText = 'Simülasyon Beklemede (Play\'e Basın)';
        if (statusDot) {
            statusDot.style.background = '#64748b';
            statusDot.style.boxShadow = 'none';
        }
        drawZigzagCanvas(zigzagHoverPt);
    }
}

function startZigzagAnimation() {
    if (zigzagSim.animId) cancelAnimationFrame(zigzagSim.animId);

    const loop = () => {
        if (!zigzagSim.isRunning) return;
        zigzagSim.theta += 0.055;
        if (zigzagSim.theta >= Math.PI * 2) {
            zigzagSim.theta -= Math.PI * 2;
        }
        drawZigzagCanvas(zigzagHoverPt);
        zigzagSim.animId = requestAnimationFrame(loop);
    };
    zigzagSim.animId = requestAnimationFrame(loop);
}

function calculateZigzag() {
    const group = document.getElementById('zigzagVectorGroup')?.value || 'Yzn5';
    const VLL = parseFloat(document.getElementById('zigzagVLL')?.value) || 400;
    const In = parseFloat(document.getElementById('zigzagNeutralCurrent')?.value) || 25;
    const harmRatio = parseFloat(document.getElementById('zigzagHarmonicRatio')?.value) || 30;
    const mode = document.getElementById('zigzagWiringMode')?.value || 'zigzag';

    let clock = 12;
    let shiftDeg = 0;
    let isZigzag = true;
    let kw = 0.866;

    if (group === 'Dyn11') { clock = 11; shiftDeg = 30; isZigzag = false; kw = 1.0; }
    else if (group === 'Yzn5') { clock = 5; shiftDeg = -150; isZigzag = true; kw = Math.sqrt(3)/2; }
    else if (group === 'Dzn0') { clock = 0; shiftDeg = 0; isZigzag = true; kw = Math.sqrt(3)/2; }
    else if (group === 'Ynd1') { clock = 1; shiftDeg = -30; isZigzag = false; kw = 1.0; }
    else if (group === 'Yy0') { clock = 0; shiftDeg = 0; isZigzag = false; kw = 1.0; }

    const I3 = In * (harmRatio / 100);
    const netHarmFlux = (isZigzag && mode === 'zigzag') ? 0.0 : (I3 * 0.015);

    const elClock = document.getElementById('zigzagResClock');
    if (elClock) elClock.innerText = group + ' (Saat ' + clock + ':00 • ' + (shiftDeg >= 0 ? '+' : '') + shiftDeg + '° faz kayması)';
    const elKw = document.getElementById('zigzagResKw');
    if (elKw) elKw.innerText = 'kw = ' + kw.toFixed(4) + (isZigzag ? ' (%15.5 ilave bakır sargı payı)' : ' (Birim Sarım)');
    const elFlux = document.getElementById('zigzagResFlux');
    if (elFlux) {
        if (netHarmFlux === 0) {
            elFlux.innerText = 'Φ₀_net = Φa1 - Φb2 ≡ 0 Wb (Çekirdekte 3. harmonik akısı tamamen sönümlenir)';
            elFlux.style.color = '#34d399';
        } else {
            elFlux.innerText = 'Φ₀_net = ' + netHarmFlux.toFixed(3) + ' Wb (UYARI: Düz bağlantıda 3. harmonik akısı çekirdekte doyum yaratır!)';
            elFlux.style.color = '#f87171';
        }
    }
    const elZ0 = document.getElementById('zigzagResZ0');
    if (elZ0) elZ0.innerText = isZigzag ? 'Z0 ≈ 0.1 · Z1 (Çok düşük empedans, nötr kaymasını önler)' : 'Z0 ≈ Z1 (Standart trafo)';

    const kBody = document.getElementById('zigzagKlemensBody');
    if (kBody) {
        if (group === 'Yzn5' || group === 'Dzn0') {
            kBody.innerHTML = '<tr><td><strong>U - u</strong></td><td>1U1 - 1U2</td><td>2u1 - 2u2 (Faz A)</td><td>2v3 - 2v4 (Ters Faz B)</td><td rowspan="3" style="vertical-align:middle;color:#34d399;font-weight:700;">Yıldızlanan Nötr (ZN)</td></tr>' +
                '<tr><td><strong>V - v</strong></td><td>1V1 - 1V2</td><td>2v1 - 2v2 (Faz B)</td><td>2w3 - 2w4 (Ters Faz C)</td></tr>' +
                '<tr><td><strong>W - w</strong></td><td>1W1 - 1W2</td><td>2w1 - 2w2 (Faz C)</td><td>2u3 - 2u4 (Ters Faz A)</td></tr>';
        } else if (group === 'Dyn11') {
            kBody.innerHTML = '<tr><td><strong>U - u</strong></td><td>1U1 - 1V2 (Üçgen)</td><td>2u1 - 2u2 (Faz A)</td><td>-</td><td rowspan="3" style="vertical-align:middle;color:#38bdf8;font-weight:700;">Yıldız Sekonder Nötrü (N)</td></tr>' +
                '<tr><td><strong>V - v</strong></td><td>1V1 - 1W2 (Üçgen)</td><td>2v1 - 2v2 (Faz B)</td><td>-</td></tr>' +
                '<tr><td><strong>W - w</strong></td><td>1W1 - 1U2 (Üçgen)</td><td>2w1 - 2w2 (Faz C)</td><td>-</td></tr>';
        } else {
            kBody.innerHTML = '<tr><td><strong>U - u</strong></td><td>1U1 - 1N</td><td>2u1 - 2N</td><td>-</td><td rowspan="3" style="vertical-align:middle;color:#fbbf24;font-weight:700;">Ortak Nötr</td></tr>' +
                '<tr><td><strong>V - v</strong></td><td>1V1 - 1N</td><td>2v1 - 2N</td><td>-</td></tr>' +
                '<tr><td><strong>W - w</strong></td><td>1W1 - 1N</td><td>2w1 - 2N</td><td>-</td></tr>';
        }
    }

    lastZigzagData = {
        group, VLL, In, harmRatio, mode, clock, shiftDeg, isZigzag, kw, netHarmFlux
    };

    drawZigzagCanvas(zigzagHoverPt);
}

function drawZigzagCanvas(hoverPt) {
    const canvas = document.getElementById('zigzagCanvas');
    if (!canvas || !lastZigzagData) return;
    const hi = setupHiDpiCanvas(canvas);
    if (!hi) return;
    const { ctx, w, h } = hi;

    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 30; x < w; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 30; y < h; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    const d = lastZigzagData;
    const theta = zigzagSim.theta;

    const clockX = w * 0.28;
    const clockY = h * 0.52;
    const clockR = Math.min(105, h * 0.38);

    ctx.strokeStyle = 'rgba(56,189,248,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(clockX, clockY, clockR, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.fill();

    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';

    for (let hr = 1; hr <= 12; hr++) {
        const ang = (hr * 30 - 90) * (Math.PI / 180);
        const nx = clockX + (clockR - 14) * Math.cos(ang);
        const ny = clockY + (clockR - 14) * Math.sin(ang);
        ctx.fillText(hr.toString(), nx, ny);

        ctx.strokeStyle = (hr === 12 || hr === d.clock) ? 'rgba(56,189,248,0.7)' : 'rgba(255,255,255,0.15)';
        ctx.lineWidth = (hr === 12 || hr === d.clock) ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(clockX + (clockR - 4) * Math.cos(ang), clockY + (clockR - 4) * Math.sin(ang));
        ctx.lineTo(clockX + clockR * Math.cos(ang), clockY + clockR * Math.sin(ang));
        ctx.stroke();
    }

    const lvClockHr = d.clock === 0 ? 12 : d.clock;
    const lvAng = (lvClockHr * 30 - 90) * (Math.PI / 180);
    const hvAng = -Math.PI / 2;

    if (d.shiftDeg !== 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(clockX, clockY, clockR * 0.45, hvAng, lvAng, d.shiftDeg < 0);
        ctx.stroke();
        ctx.restore();
    }

    const hvLen = clockR - 22;
    ctx.save();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(clockX, clockY);
    const hvTipX = clockX + hvLen * Math.cos(hvAng);
    const hvTipY = clockY + hvLen * Math.sin(hvAng);
    ctx.lineTo(hvTipX, hvTipY);
    ctx.stroke();
    drawArrowHead(ctx, clockX, clockY, hvTipX, hvTipY, '#ef4444', 10);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText('1U (HV 12:00)', hvTipX, hvTipY - 14);
    ctx.restore();

    const lvLen = clockR - 28;
    const isClockZero = (d.clock === 0 || d.clock === 12);
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(clockX, clockY);
    let lvTipX, lvTipY;
    if (isClockZero) {
        lvTipX = clockX + 14;
        lvTipY = clockY - lvLen;
        ctx.moveTo(clockX + 14, clockY);
        ctx.lineTo(lvTipX, lvTipY);
        ctx.stroke();
        drawArrowHead(ctx, clockX + 14, clockY, lvTipX, lvTipY, '#38bdf8', 9);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px Outfit, sans-serif';
        ctx.fillText('2u (LV 12:00)', lvTipX + 18, lvTipY + 4);
    } else {
        lvTipX = clockX + lvLen * Math.cos(lvAng);
        lvTipY = clockY + lvLen * Math.sin(lvAng);
        ctx.lineTo(lvTipX, lvTipY);
        ctx.stroke();
        drawArrowHead(ctx, clockX, clockY, lvTipX, lvTipY, '#38bdf8', 9);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px Outfit, sans-serif';
        const txtOffset = 16;
        ctx.fillText('2u (LV)', lvTipX + txtOffset * Math.cos(lvAng), lvTipY + txtOffset * Math.sin(lvAng));
    }
    ctx.restore();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.arc(clockX, clockY, 4.5, 0, Math.PI * 2); ctx.fill();

    const rightX = w * 0.56;
    const coreW = w * 0.40;
    const legSpacing = coreW / 3;

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Manyetik Çekirdek Akıları & 3. Harmonik Dengesi', rightX + 8, 24);

    const legs = ['Faz A', 'Faz B', 'Faz C'];
    const phaseShifts = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];

    legs.forEach((leg, idx) => {
        const lx = rightX + 30 + idx * legSpacing;
        const legY = h * 0.48;

        ctx.fillStyle = 'rgba(51, 65, 85, 0.5)';
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(lx - 20, legY - 70, 40, 140, 6);
        else ctx.rect(lx - 20, legY - 70, 40, 140);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 11px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(leg, lx, legY - 78);

        const fundamentalAmp = Math.sin(theta - phaseShifts[idx]) * 35;
        const fy = legY - fundamentalAmp;

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(lx - 8, legY);
        ctx.lineTo(lx - 8, fy);
        ctx.stroke();
        drawArrowHead(ctx, lx - 8, legY, lx - 8, fy, '#38bdf8', 6);

        if (d.isZigzag && d.mode === 'zigzag') {
            const h3Amp = Math.sin(3 * theta) * 22;
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(lx + 6, legY);
            ctx.lineTo(lx + 6, legY - h3Amp);
            ctx.stroke();
            drawArrowHead(ctx, lx + 6, legY, lx + 6, legY - h3Amp, '#f59e0b', 5);

            ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(lx + 14, legY);
            ctx.lineTo(lx + 14, legY + h3Amp);
            ctx.stroke();
            drawArrowHead(ctx, lx + 14, legY, lx + 14, legY + h3Amp, '#34d399', 5);

            ctx.fillStyle = '#34d399';
            ctx.font = 'bold 9px JetBrains Mono, monospace';
            ctx.fillText('Φ₀_net ≡ 0', lx, legY + 54);
        } else {
            const harmAmp = Math.sin(3 * theta) * 38;
            const arrowAmp = (d.netHarmFlux / 0.4) * harmAmp;
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(lx, legY);
            ctx.lineTo(lx, legY - arrowAmp);
            ctx.stroke();
            drawArrowHead(ctx, lx, legY, lx, legY - arrowAmp, '#ef4444', 7);

            ctx.fillStyle = '#f87171';
            ctx.font = 'bold 8px JetBrains Mono, monospace';
            ctx.fillText('Φ₀=' + (d.netHarmFlux).toFixed(2) + 'Wb', lx, legY - 62);
        }
    });

    ctx.textAlign = 'left';
    ctx.font = '11px Outfit, sans-serif';
    if (d.isZigzag && d.mode === 'zigzag') {
        ctx.fillStyle = '#34d399';
        ctx.fillText("✓ Zikzak Simetrisi: Aynı bacakta ters yönlü sıfır-bileşen akıları birbirini yok eder (Φ₀ ≡ 0).", rightX + 8, h - 14);
    } else {
        ctx.fillStyle = '#f87171';
        ctx.fillText("⚠ Düz Bağlantı: 3. harmonik sıfır-bileşen akıları sönümlenmez, demir doyuma gider!", rightX + 8, h - 14);
    }

    if (hoverPt) {
        const isClockSide = hoverPt.x < w * 0.52;
        let snapX = hoverPt.x;
        let snapY = hoverPt.y;
        let tipLines = [];

        if (isClockSide) {
            const dx = hoverPt.x - clockX;
            const dy = hoverPt.y - clockY;
            let ang = Math.atan2(dy, dx);
            let hr = Math.round((ang * 180 / Math.PI + 90) / 30);
            if (hr <= 0) hr += 12;
            if (hr > 12) hr -= 12;
            const hrAng = (hr * 30 - 90) * (Math.PI / 180);
            snapX = clockX + (clockR - 10) * Math.cos(hrAng);
            snapY = clockY + (clockR - 10) * Math.sin(hrAng);

            ctx.save();
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.setLineDash([3, 3]);
            ctx.beginPath(); ctx.moveTo(clockX, clockY); ctx.lineTo(snapX, snapY); ctx.stroke();
            ctx.restore();

            tipLines = [
                { text: 'Vektör Kadranı: Saat ' + hr + ':00', color: '#38bdf8', bold: true },
                { text: 'Faz Açısı: ' + (hr * 30 - 90) + '° (Grup: ' + d.group + ')', color: '#f1f5f9' },
                { text: 'Sekonder Kayması: ' + (d.shiftDeg >= 0 ? '+' : '') + d.shiftDeg + '°', color: '#fbbf24' },
                { text: '3. Harmonik Φ₀: ' + d.netHarmFlux.toFixed(2) + ' Wb (' + (d.netHarmFlux === 0 ? 'Sıfır Akı - Denge' : 'Doyum Riski!') + ')', color: d.netHarmFlux === 0 ? '#34d399' : '#f87171' }
            ];
        } else {
            const legIdx = Math.min(2, Math.max(0, Math.floor((hoverPt.x - rightX - 10) / 80)));
            const legNames = ['Faz A (U - u)', 'Faz B (V - v)', 'Faz C (W - w)'];
            snapX = rightX + 50 + legIdx * 80;
            snapY = hoverPt.y;

            tipLines = [
                { text: 'Sargı: ' + legNames[legIdx], color: '#fbbf24', bold: true },
                { text: 'Yarım Bobinler: %50 + %50 Zikzak', color: '#f1f5f9' },
                { text: 'Manyetik Sıfır Bileşen: Φa1 - Φb2 = 0', color: '#34d399' },
                { text: 'Z0 Empedansı: ≈ 0.1 · Z1', color: '#38bdf8' }
            ];
        }

        ctx.save();
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
        ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(snapX, snapY, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();

        renderCanvasHoverTooltip(ctx, w, h, snapX, snapY, tipLines, '#0ea5e9');
    }

    const hud = document.getElementById('zigzagHoverInfo');
    if (hud) {
        if (hoverPt) {
            hud.style.display = 'block';
            let hoverLabel = hoverPt.x < w * 0.52 ? 'Saat Kadranı' : 'Transformatör Bacakları';
            hud.innerHTML = '<span style="color:#38bdf8;font-weight:700;">' + d.group + ' (' + hoverLabel + ')</span> | ' +
                            'Saat: ' + d.clock + ':00 | ' +
                            'Açı: ' + (d.shiftDeg >= 0 ? '+' : '') + d.shiftDeg + '° | ' +
                            'Etkin Sarım kw: ' + d.kw.toFixed(3) + ' | ' +
                            '<span style="color:' + (d.netHarmFlux === 0 ? '#34d399' : '#f87171') + ';">Φ₀_net: ' + d.netHarmFlux.toFixed(3) + ' Wb</span>';
        } else {
            hud.innerText = zigzagSim.isRunning ? 
                "Canlı 50 Hz AC akı ve fazör salınımı simüle ediliyor. İmleci gezdirerek fazör ve akı dengesini inceleyin." :
                "İmleci saat diyagramı veya sargı klemensleri üzerinde gezdirerek açı ve akı dengesini inceleyin";
        }
    }
}

/* ─────────────────────────────────────────────────────────── */
/*  3. GÜÇ ELEKTRONİĞİ DC-DC DÖNÜŞTÜRÜCÜ LABORATUVARI (P1)   */
/* ─────────────────────────────────────────────────────────── */
let lastDcDcData = null;
let dcdcHoverPt = null;
let dcdcAnimFrame = null;

function animateDcDcTrace() {
    if (dcdcAnimFrame) cancelAnimationFrame(dcdcAnimFrame);
    const startTime = performance.now();
    const duration = 500;
    function frame(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        drawDcDcCanvas(null, progress);
        if (progress < 1) {
            dcdcAnimFrame = requestAnimationFrame(frame);
        } else {
            dcdcAnimFrame = null;
            drawDcDcCanvas(dcdcHoverPt, 1);
        }
    }
    dcdcAnimFrame = requestAnimationFrame(frame);
}

function calculateDcDc(animate = false) {
    const top = document.getElementById('dcdcTopology')?.value || 'buck';
    const Vin = parseFloat(document.getElementById('dcdcVin')?.value) || 24;
    const fsw_k = parseFloat(document.getElementById('dcdcFsw')?.value) || 50;
    const D = parseFloat(document.getElementById('dcdcDuty')?.value) || 0.50;
    const L_u = parseFloat(document.getElementById('dcdcL')?.value) || 150;
    const C_u = parseFloat(document.getElementById('dcdcC')?.value) || 100;
    const R = parseFloat(document.getElementById('dcdcRload')?.value) || 10;

    const fsw = fsw_k * 1000;
    const L = L_u * 1e-6;
    const C = C_u * 1e-6;
    const Ts = 1 / fsw;

    let Vout_ccm = 0;
    let Lcrit = 0;
    let dIL = 0;
    let dVo = 0;
    let Iout = 0;
    let IL_avg = 0;

    if (top === 'buck') {
        Vout_ccm = D * Vin;
        Iout = Vout_ccm / R;
        IL_avg = Iout;
        Lcrit = ((1 - D) * R) / (2 * fsw);
        dIL = ((Vin - Vout_ccm) * D) / (fsw * L);
        dVo = dIL / (8 * C * fsw);
    } else if (top === 'boost') {
        Vout_ccm = Vin / (1 - D);
        Iout = Vout_ccm / R;
        IL_avg = Iout / (1 - D);
        Lcrit = (D * Math.pow(1 - D, 2) * R) / (2 * fsw);
        dIL = (Vin * D) / (fsw * L);
        dVo = (Iout * D) / (C * fsw);
    } else {
        Vout_ccm = Math.abs(Vin * D / (1 - D));
        Iout = Vout_ccm / R;
        IL_avg = Iout / (1 - D);
        Lcrit = (Math.pow(1 - D, 2) * R) / (2 * fsw);
        dIL = (Vin * D) / (fsw * L);
        dVo = (Iout * D) / (C * fsw);
    }

    const isCcm = L >= Lcrit;
    const modeStr = isCcm ? 'CCM (Sürekli İletim Modu)' : 'DCM (Kesintili İletim Modu)';

    let Vout_real = Vout_ccm;
    if (!isCcm && top === 'buck') {
        const K = (2 * L * fsw) / R;
        Vout_real = Vin * (2 / (1 + Math.sqrt(1 + (4 * K) / (D * D))));
    }

    const IL_peak = isCcm ? (IL_avg + dIL / 2) : Math.sqrt((2 * Vin * (Vin - Vout_real) * D * D) / (L * fsw * Vout_real));

    const elVout = document.getElementById('dcdcResVout');
    if (elVout) elVout.innerText = Vout_real.toFixed(2) + ' V (Kazanç M = ' + (Vout_real / Vin).toFixed(3) + ')';
    const elMode = document.getElementById('dcdcResMode');
    if (elMode) {
        elMode.innerText = modeStr;
        elMode.style.color = isCcm ? '#34d399' : '#fbbf24';
    }
    const elLcrit = document.getElementById('dcdcResLcrit');
    if (elLcrit) elLcrit.innerText = 'Lcrit = ' + (Lcrit * 1e6).toFixed(1) + ' µH (L = ' + L_u.toFixed(1) + ' µH ' + (isCcm ? '≥' : '<') + ' Lcrit)';
    const elDeltaIL = document.getElementById('dcdcResDeltaIL');
    if (elDeltaIL) elDeltaIL.innerText = 'ΔIL = ' + dIL.toFixed(2) + ' A • IL_ort = ' + IL_avg.toFixed(2) + ' A • IL_tepe = ' + IL_peak.toFixed(2) + ' A';
    const elRipple = document.getElementById('dcdcResRipple');
    if (elRipple) elRipple.innerText = 'ΔVo = ' + (dVo * 1000).toFixed(1) + ' mV (% ' + ((dVo / Vout_real) * 100).toFixed(2) + ' dalgalanma)';

    lastDcDcData = {
        top, Vin, fsw, D, L, C, R, Ts, Vout_real, Vout_ccm, isCcm, dIL, dVo, IL_avg, IL_peak
    };

    if (animate) {
        triggerSimButtonFeedback('dcdcSimBtn', 'Osiloskop Taranıyor...', 'Dalga Formları Simüle Edildi!');
        animateDcDcTrace();
    } else {
        drawDcDcCanvas(dcdcHoverPt, 1);
    }
}

function drawDcDcCanvas(hoverPt, animProgress = 1) {
    const canvas = document.getElementById('dcdcCanvas');
    if (!canvas || !lastDcDcData) return;
    const hi = setupHiDpiCanvas(canvas);
    if (!hi) return;
    const { ctx, w, h } = hi;

    ctx.fillStyle = '#060a0f';
    ctx.fillRect(0, 0, w, h);

    const divX = w / 10;
    const divY = h / 8;
    ctx.strokeStyle = 'rgba(34,197,94,0.12)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= w; x += divX) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += divY) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(34,197,94,0.3)';
    ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
    ctx.setLineDash([]);

    const d = lastDcDcData;
    const twoTs = d.Ts * 2;
    const maxPx = Math.max(10, w * Math.min(1, animProgress));

    const yCenter_iL = h * 0.32;
    const scale_iL = (h * 0.22) / (d.IL_peak || 1);

    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    const points = 300;
    const drawPoints = Math.round(points * Math.min(1, animProgress));
    for (let p = 0; p <= drawPoints; p++) {
        const t = (p / points) * twoTs;
        const tInCycle = t % d.Ts;
        const ton = d.D * d.Ts;

        let il_val = 0;
        if (tInCycle < ton) {
            il_val = (d.isCcm ? (d.IL_avg - d.dIL / 2) : 0) + (d.dIL * (tInCycle / ton));
        } else {
            const toff_prog = (tInCycle - ton) / (d.Ts - ton);
            il_val = Math.max(0, (d.isCcm ? (d.IL_avg + d.dIL / 2) : d.IL_peak) - d.dIL * toff_prog);
        }

        const px = (p / points) * w;
        const py = yCenter_iL - il_val * scale_iL;
        if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    const yCenter_vsw = h * 0.78;
    const vsw_high = Math.max(d.Vin, d.Vout_real);
    const scale_vsw = (h * 0.25) / (vsw_high || 1);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.2;
    ctx.beginPath();

    for (let p = 0; p <= drawPoints; p++) {
        const t = (p / points) * twoTs;
        const tInCycle = t % d.Ts;
        const ton = d.D * d.Ts;
        const vsw_val = (tInCycle < ton) ? 0 : vsw_high;

        const px = (p / points) * w;
        const py = yCenter_vsw - vsw_val * scale_vsw;
        if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(249,115,22,0.85)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();

    for (let p = 0; p <= drawPoints; p++) {
        const t = (p / points) * twoTs;
        const tInCycle = t % d.Ts;
        const ton = d.D * d.Ts;

        let id_val = 0;
        if (tInCycle >= ton) {
            const toff_prog = (tInCycle - ton) / (d.Ts - ton);
            id_val = Math.max(0, (d.isCcm ? (d.IL_avg + d.dIL / 2) : d.IL_peak) - d.dIL * toff_prog);
        }

        const px = (p / points) * w;
        const py = yCenter_iL - id_val * scale_iL;
        if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    if (animProgress < 1) {
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(maxPx, 0); ctx.lineTo(maxPx, h); ctx.stroke();
        ctx.restore();
    }

    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.fillStyle = '#22c55e'; ctx.fillText('CH1: iL(t) [' + (d.dIL).toFixed(1) + ' A/div]', 14, 20);
    ctx.fillStyle = '#38bdf8'; ctx.fillText('CH2: vSW(t) [' + (vsw_high).toFixed(0) + ' V pk]', 14, h * 0.52);
    ctx.fillStyle = '#f97316'; ctx.fillText('CH3: iD(t)', w - 90, 20);

    if (hoverPt) {
        const curX = Math.max(0, Math.min(w, hoverPt.x));
        const t = (curX / w) * twoTs;
        const tInCycle = t % d.Ts;
        const ton = d.D * d.Ts;

        let cur_il = 0;
        if (tInCycle < ton) {
            cur_il = (d.isCcm ? (d.IL_avg - d.dIL / 2) : 0) + (d.dIL * (tInCycle / ton));
        } else {
            const toff_prog = (tInCycle - ton) / (d.Ts - ton);
            cur_il = Math.max(0, (d.isCcm ? (d.IL_avg + d.dIL / 2) : d.IL_peak) - d.dIL * toff_prog);
        }

        const cur_vsw = (tInCycle < ton) ? 0 : vsw_high;

        let cur_id = 0;
        if (tInCycle >= ton) {
            const toff_prog = (tInCycle - ton) / (d.Ts - ton);
            cur_id = Math.max(0, (d.isCcm ? (d.IL_avg + d.dIL / 2) : d.IL_peak) - d.dIL * toff_prog);
        }

        const py_il = yCenter_iL - cur_il * scale_iL;
        const py_vsw = yCenter_vsw - cur_vsw * scale_vsw;
        const py_id = yCenter_iL - cur_id * scale_iL;

        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(curX, 0); ctx.lineTo(curX, h); ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = '#22c55e'; ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 9;
        ctx.beginPath(); ctx.arc(curX, py_il, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.stroke();

        ctx.fillStyle = '#38bdf8'; ctx.shadowColor = '#38bdf8';
        ctx.beginPath(); ctx.arc(curX, py_vsw, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.stroke();

        ctx.fillStyle = '#f97316'; ctx.shadowColor = '#f97316';
        ctx.beginPath(); ctx.arc(curX, py_id, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.stroke();
        ctx.restore();

        const tipLines = [
            { text: '⏱ t: ' + (t * 1e6).toFixed(2) + ' µs (%' + Math.round((tInCycle / d.Ts) * 100) + ' Ts)', color: '#f1f5f9', bold: true },
            { text: 'CH1 iL(t): ' + cur_il.toFixed(2) + ' A (İndüktör)', color: '#22c55e', bold: true },
            { text: 'CH2 vSW: ' + cur_vsw.toFixed(1) + ' V (' + (tInCycle < ton ? 'MOSFET ON' : 'MOSFET OFF') + ')', color: '#38bdf8' },
            { text: 'CH3 iD(t): ' + cur_id.toFixed(2) + ' A (Diyot)', color: '#f97316' },
            { text: 'Mod: ' + (d.isCcm ? 'CCM (Sürekli)' : 'DCM (Kesintili)') + ' | Vout: ' + d.Vout_real.toFixed(2) + ' V', color: d.isCcm ? '#34d399' : '#fbbf24' }
        ];
        renderCanvasHoverTooltip(ctx, w, h, curX, hoverPt.y, tipLines, '#10b981');
    }

    const hud = document.getElementById('dcdcHoverInfo');
    if (hud) {
        if (hoverPt) {
            hud.style.display = 'block';
            hud.innerHTML = '<span style="color:#22c55e;font-weight:700;">iL_ort: ' + d.IL_avg.toFixed(2) + ' A</span> | ' +
                            '<span style="color:#38bdf8;">Vout: ' + d.Vout_real.toFixed(2) + ' V</span> | ' +
                            'Duty D: ' + d.D.toFixed(2) + ' | ' +
                            '<span style="color:' + (d.isCcm ? '#34d399' : '#fbbf24') + ';">Mod: ' + (d.isCcm ? 'CCM' : 'DCM') + '</span>';
        } else {
            hud.innerText = "İmleci dalga formu üzerinde gezdirerek t, iL(t), vSW(t) ve iD(t) anlık değerlerini inceleyin";
        }
    }
}

/* ─────────────────────────────────────────────────────────── */
/*  4. ASENKRON MOTOR TORK-HIZ KARAKTERİSTİĞİ (P1)             */
/* ─────────────────────────────────────────────────────────── */
let lastMotorData = null;
let motorHoverPt = null;
let motorAnimFrame = null;

function animateMotorTrace() {
    if (motorAnimFrame) cancelAnimationFrame(motorAnimFrame);
    const startTime = performance.now();
    const duration = 550;
    function frame(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        drawInductionMotorCanvas(null, progress);
        if (progress < 1) {
            motorAnimFrame = requestAnimationFrame(frame);
        } else {
            motorAnimFrame = null;
            drawInductionMotorCanvas(motorHoverPt, 1);
        }
    }
    motorAnimFrame = requestAnimationFrame(frame);
}

function calculateInductionMotor(animate = false) {
    const VLL = parseFloat(document.getElementById('motorVLL')?.value) || 400;
    const fn = parseFloat(document.getElementById('motorFn')?.value) || 50;
    const poles = parseInt(document.getElementById('motorPoles')?.value) || 4;
    const R1 = parseFloat(document.getElementById('motorR1')?.value) || 0.6;
    const X1_nom = parseFloat(document.getElementById('motorX1')?.value) || 1.1;
    const R2 = parseFloat(document.getElementById('motorR2')?.value) || 0.4;
    const X2_nom = parseFloat(document.getElementById('motorX2')?.value) || 1.1;
    const Xm_nom = parseFloat(document.getElementById('motorXm')?.value) || 35.0;
    const f_drive = parseFloat(document.getElementById('motorFDrive')?.value) || 50;

    const fRatio = f_drive / fn;
    const V1_nom = VLL / Math.sqrt(3);
    const V1 = (f_drive <= fn) ? (V1_nom * fRatio) : V1_nom;

    const X1 = X1_nom * fRatio;
    const X2 = X2_nom * fRatio;
    const Xm = Xm_nom * fRatio;

    const ns = (120 * f_drive) / poles;
    const ws = (2 * Math.PI * ns) / 60;

    const Zm = Xm;
    const Vth = V1 * (Zm / Math.sqrt(R1 * R1 + Math.pow(X1 + Zm, 2)));
    const Rth = R1 * Math.pow(Zm / (X1 + Zm), 2);
    const Xth = X1;

    const s_max = R2 / Math.sqrt(Rth * Rth + Math.pow(Xth + X2, 2));
    const n_max = ns * (1 - s_max);
    const T_max = (3 * Vth * Vth) / (2 * ws * (Rth + Math.sqrt(Rth * Rth + Math.pow(Xth + X2, 2))));

    const T_st = (3 * Vth * Vth * R2) / (ws * (Math.pow(Rth + R2, 2) + Math.pow(Xth + X2, 2)));

    const s_nom = 0.04;
    const n_nom = ns * (1 - s_nom);
    const T_nom = (3 * Vth * Vth * (R2 / s_nom)) / (ws * (Math.pow(Rth + R2 / s_nom, 2) + Math.pow(Xth + X2, 2)));
    const P_mech = T_nom * ((2 * Math.PI * n_nom) / 60);

    const elNs = document.getElementById('motorResNs');
    if (elNs) elNs.innerText = Math.round(ns) + ' d/dk (ωs = ' + ws.toFixed(1) + ' rad/s)';
    const elTmax = document.getElementById('motorResTmax');
    if (elTmax) elTmax.innerText = 'T_max = ' + T_max.toFixed(1) + ' Nm • s_max = ' + s_max.toFixed(3) + ' (n_max = ' + Math.round(n_max) + ' d/dk)';
    const elTst = document.getElementById('motorResTst');
    if (elTst) elTst.innerText = 'T_st = ' + T_st.toFixed(1) + ' Nm (T_st / T_max = ' + (T_st / (T_max || 1)).toFixed(2) + ')';
    const elTn = document.getElementById('motorResTn');
    if (elTn) elTn.innerText = 'T_n = ' + T_nom.toFixed(1) + ' Nm • n_n = ' + Math.round(n_nom) + ' d/dk • P_mek = ' + (P_mech / 1000).toFixed(2) + ' kW (' + (P_mech / 745.7).toFixed(1) + ' BG)';

    lastMotorData = {
        ns, ws, Vth, Rth, Xth, R2, X2, s_max, n_max, T_max, T_st, s_nom, n_nom, T_nom, P_mech, f_drive
    };

    if (animate) {
        triggerSimButtonFeedback('motorSimBtn', 'Tork-Hız Çiziliyor...', 'T-n Karakteristiği Çizdirildi!');
        animateMotorTrace();
    } else {
        drawInductionMotorCanvas(motorHoverPt, 1);
    }
}

function drawInductionMotorCanvas(hoverPt, animProgress = 1) {
    const canvas = document.getElementById('inductionMotorCanvas');
    if (!canvas || !lastMotorData) return;
    const hi = setupHiDpiCanvas(canvas);
    if (!hi) return;
    const { ctx, w, h } = hi;

    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, w, h);

    const padL = 60, padR = 40, padT = 30, padB = 40;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const d = lastMotorData;
    const maxT = d.T_max * 1.25;
    const maxN = d.ns * 1.05;

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 10; x++) {
        const px = padL + (x / 10) * plotW;
        ctx.beginPath(); ctx.moveTo(px, padT); ctx.lineTo(px, h - padB); ctx.stroke();
    }
    for (let y = 0; y <= 5; y++) {
        const py = padT + (y / 5) * plotH;
        ctx.beginPath(); ctx.moveTo(padL, py); ctx.lineTo(w - padR, py); ctx.stroke();
    }

    const px_nmax = padL + (d.n_max / maxN) * plotW;
    const px_ns = padL + (d.ns / maxN) * plotW;
    ctx.fillStyle = 'rgba(34,197,94,0.08)';
    ctx.fillRect(px_nmax, padT, px_ns - px_nmax, plotH);

    ctx.fillStyle = 'rgba(34,197,94,0.4)';
    ctx.font = '10px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Kararlı Çalışma Bölgesi', (px_nmax + px_ns) / 2, padT + 16);

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(padL, h - padB); ctx.lineTo(w - padR, h - padB); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(padL, h - padB); ctx.lineTo(padL, padT); ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '11px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('0', padL - 8, h - padB + 4);
    ctx.fillText(Math.round(maxT) + ' Nm', padL - 8, padT + 10);
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(d.ns) + ' d/dk (ns)', px_ns, h - padB + 18);

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();

    const steps = 180;
    const drawSteps = Math.round(steps * Math.min(1, animProgress));
    let lastPx = padL;
    let lastPy = h - padB;

    for (let i = 0; i <= drawSteps; i++) {
        const n = (i / steps) * d.ns;
        const s = (d.ns - n) / (d.ns || 1);
        let T = 0;
        if (s > 0) {
            T = (3 * d.Vth * d.Vth * (d.R2 / s)) / 
                (d.ws * (Math.pow(d.Rth + d.R2 / s, 2) + Math.pow(d.Xth + d.X2, 2)));
        }
        const px = padL + (n / maxN) * plotW;
        const py = (h - padB) - (T / maxT) * plotH;
        lastPx = px;
        lastPy = py;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    if (animProgress < 1) {
        ctx.save();
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(lastPx, lastPy, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
    }

    if (animProgress >= 0.95) {
        const py_tst = (h - padB) - (d.T_st / maxT) * plotH;
        ctx.fillStyle = '#22c55e';
        ctx.beginPath(); ctx.arc(padL, py_tst, 5.5, 0, Math.PI * 2); ctx.fill();

        const py_tmax = (h - padB) - (d.T_max / maxT) * plotH;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(px_nmax, py_tmax, 6, 0, Math.PI * 2); ctx.fill();

        const px_nom = padL + (d.n_nom / maxN) * plotW;
        const py_nom = (h - padB) - (d.T_nom / maxT) * plotH;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath(); ctx.arc(px_nom, py_nom, 5, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = '#38bdf8';
        ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(px_ns, padT); ctx.lineTo(px_ns, h - padB); ctx.stroke();
        ctx.setLineDash([]);
    }

    if (hoverPt) {
        const frac = Math.max(0, Math.min(1, (hoverPt.x - padL) / plotW));
        const curN = frac * maxN;
        const curS = (d.ns - curN) / (d.ns || 1);
        let curT = 0;
        if (curS > 0) {
            curT = (3 * d.Vth * d.Vth * (d.R2 / curS)) / 
                (d.ws * (Math.pow(d.Rth + d.R2 / curS, 2) + Math.pow(d.Xth + d.X2, 2)));
        }
        const curPx = padL + frac * plotW;
        const curPy = (h - padB) - (curT / maxT) * plotH;
        const pMechKw = (curT * (2 * Math.PI * Math.max(0, curN)) / 60) / 1000;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(curPx, padT); ctx.lineTo(curPx, h - padB); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(padL, curPy); ctx.lineTo(curPx, curPy); ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = 'rgba(239, 68, 68, 0.9)';
        ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(curPx, curPy, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();

        let zoneStr = "Kararlı Motor Bölgesi";
        let zoneCol = "#34d399";
        if (curN < 10) {
            zoneStr = "Kalkış (Stall) Noktası (s = 1.0)";
            zoneCol = "#22c55e";
        } else if (curN < d.n_max) {
            zoneStr = "Kararsız / Aşırı Yük Bölgesi";
            zoneCol = "#f87171";
        } else if (curN > d.ns) {
            zoneStr = "Asenkron Jeneratör Rejimi (s < 0)";
            zoneCol = "#38bdf8";
        }

        const tipLines = [
            { text: 'Rotor Devri: ' + Math.round(curN) + ' d/dk (rpm)', color: '#f1f5f9', bold: true },
            { text: 'Kayma s: ' + curS.toFixed(3) + ' | ωm: ' + ((2*Math.PI*curN)/60).toFixed(1) + ' rad/s', color: '#38bdf8' },
            { text: 'İndüklenen Tork: ' + curT.toFixed(1) + ' Nm (%' + ((curT / d.T_max) * 100).toFixed(0) + ' T_max)', color: '#ef4444', bold: true },
            { text: 'Mekanik Güç: ' + pMechKw.toFixed(2) + ' kW (' + (pMechKw / 0.7457).toFixed(1) + ' BG)', color: '#fbbf24' },
            { text: 'Bölge: ' + zoneStr, color: zoneCol }
        ];
        renderCanvasHoverTooltip(ctx, w, h, curPx, curPy, tipLines, '#ef4444');
    }

    const hud = document.getElementById('inductionMotorHoverInfo');
    if (hud) {
        if (hoverPt) {
            hud.style.display = 'block';
            hud.innerHTML = '<span style="color:#ef4444;font-weight:700;">T_max: ' + d.T_max.toFixed(1) + ' Nm</span> | ' +
                            '<span style="color:#22c55e;">T_st: ' + d.T_st.toFixed(1) + ' Nm</span> | ' +
                            '<span style="color:#fbbf24;">T_nom: ' + d.T_nom.toFixed(1) + ' Nm</span> | ' +
                            'Senkron ns: ' + Math.round(d.ns) + ' d/dk | ' +
                            'Frekans: ' + d.f_drive + ' Hz';
        } else {
            hud.innerText = "İmleci T-n eğrisi üzerinde gezdirerek anlık rotor devri n, kayma s ve indüklenen torku inceleyin";
        }
    }
}

/* ─────────────────────────────────────────────────────────── */
/*  5. GÜÇ SİSTEMLERİ & İLETİM HATTI HESAPLAYICISI (P1)        */
/* ─────────────────────────────────────────────────────────── */
let lastTlData = null;
let tlHoverPt = null;
let tlAnimFrame = null;

function animateTransmissionLineTrace() {
    if (tlAnimFrame) cancelAnimationFrame(tlAnimFrame);
    const startTime = performance.now();
    const duration = 500;
    function frame(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        drawTransmissionLineCanvas(null, progress);
        if (progress < 1) {
            tlAnimFrame = requestAnimationFrame(frame);
        } else {
            tlAnimFrame = null;
            drawTransmissionLineCanvas(tlHoverPt, 1);
        }
    }
    tlAnimFrame = requestAnimationFrame(frame);
}

function calculateTransmissionLine(animate = false) {
    const model = document.getElementById('tlModel')?.value || 'pi';
    const l = parseFloat(document.getElementById('tlLength')?.value) || 150;
    const VR_LL = parseFloat(document.getElementById('tlVR')?.value) || 154;
    const r = parseFloat(document.getElementById('tlR')?.value) || 0.12;
    const x = parseFloat(document.getElementById('tlX')?.value) || 0.38;
    const b_u = parseFloat(document.getElementById('tlB')?.value) || 3.0;
    const PR = parseFloat(document.getElementById('tlPR')?.value) || 60;
    const cosPhi1 = parseFloat(document.getElementById('tlCosPhiR')?.value) || 0.82;
    const cosPhi2 = parseFloat(document.getElementById('tlTargetCosPhi')?.value) || 0.98;

    const f = 50;
    const Z_tot_R = r * l;
    const Z_tot_X = x * l;
    const Y_tot_B = (b_u * 1e-6) * l;

    let A_r = 1, A_i = 0;
    let B_r = Z_tot_R, B_i = Z_tot_X;
    let C_r = 0, C_i = 0;

    if (model === 'short') {
        A_r = 1; A_i = 0;
        B_r = Z_tot_R; B_i = Z_tot_X;
        C_r = 0; C_i = 0;
    } else if (model === 'pi') {
        const ZY_r = -Z_tot_X * Y_tot_B;
        const ZY_i = Z_tot_R * Y_tot_B;
        A_r = 1 + ZY_r / 2;
        A_i = ZY_i / 2;
        B_r = Z_tot_R;
        B_i = Z_tot_X;
        C_r = 0;
        C_i = Y_tot_B * (1 + ZY_r / 4);
    } else {
        const ZY_r = -Z_tot_X * Y_tot_B;
        const ZY_i = Z_tot_R * Y_tot_B;
        A_r = 1 + ZY_r / 2;
        A_i = ZY_i / 2;
        B_r = Z_tot_R * (1 + ZY_r / 4);
        B_i = Z_tot_X * (1 + ZY_r / 4);
        C_r = 0;
        C_i = Y_tot_B;
    }

    const A_mag = Math.sqrt(A_r * A_r + A_i * A_i);
    const B_mag = Math.sqrt(B_r * B_r + B_i * B_i);
    const C_mag = Math.sqrt(C_r * C_r + C_i * C_i);

    const VR_ph = (VR_LL * 1000) / Math.sqrt(3);

    const phi1 = Math.acos(cosPhi1);
    const SR = PR / cosPhi1;
    const IR_mag = (SR * 1e6) / (Math.sqrt(3) * VR_LL * 1000);
    const IR_r = IR_mag * cosPhi1;
    const IR_i = -IR_mag * Math.sin(phi1);

    const VS_r = (A_r * VR_ph) + (B_r * IR_r - B_i * IR_i);
    const VS_i = (A_i * VR_ph) + (B_r * IR_i + B_i * IR_r);
    const VS_ph_mag = Math.sqrt(VS_r * VS_r + VS_i * VS_i);
    const VS_LL = (VS_ph_mag * Math.sqrt(3)) / 1000;

    const VR0_ph = VS_ph_mag / A_mag;
    const VR0_LL = (VR0_ph * Math.sqrt(3)) / 1000;
    const ferrantiRise = VR0_LL - VS_LL;

    const reg = ((VR0_ph - VR_ph) / VR_ph) * 100;

    const phi2 = Math.acos(cosPhi2);
    const deltaQ = PR * (Math.tan(phi1) - Math.tan(phi2));
    const C_delta = (deltaQ * 1e6) / (3 * 2 * Math.PI * f * Math.pow(VR_LL * 1000, 2)) * 1e6;

    const elABCD = document.getElementById('tlResABCD');
    if (elABCD) elABCD.innerText = 'A = D = ' + A_mag.toFixed(4) + ' • B = ' + B_mag.toFixed(2) + ' Ω • C = ' + (C_mag * 1e6).toFixed(1) + ' µS';
    const elVsIs = document.getElementById('tlResVsIs');
    if (elVsIs) elVsIs.innerText = 'VS = ' + VS_LL.toFixed(2) + ' kV • IS = ' + IR_mag.toFixed(1) + ' A (VR = ' + VR_LL.toFixed(1) + ' kV)';
    const elReg = document.getElementById('tlResReg');
    if (elReg) elReg.innerText = '% ' + reg.toFixed(2) + ' Gerilim Düşümü';
    const elFerranti = document.getElementById('tlResFerranti');
    if (elFerranti) {
        elFerranti.innerText = 'VR0 = ' + VR0_LL.toFixed(2) + ' kV (Ferranti Artışı: ' + (ferrantiRise > 0 ? '+' : '') + ferrantiRise.toFixed(2) + ' kV)';
        elFerranti.style.color = ferrantiRise > 0 ? '#f87171' : '#34d399';
    }
    const elComp = document.getElementById('tlResComp');
    if (elComp) elComp.innerText = 'ΔQ = ' + deltaQ.toFixed(2) + ' MVAR • Faz Başı C_delta = ' + C_delta.toFixed(2) + ' µF';

    lastTlData = {
        model, l, VR_LL, VS_LL, VR0_LL, reg, ferrantiRise, deltaQ, C_delta
    };

    if (animate) {
        triggerSimButtonFeedback('tlSimBtn', 'Hat Hesaplanıyor...', 'ABCD & Ferranti Profili Çizildi!');
        animateTransmissionLineTrace();
    } else {
        drawTransmissionLineCanvas(tlHoverPt, 1);
    }
}

function drawTransmissionLineCanvas(hoverPt, animProgress = 1) {
    const canvas = document.getElementById('transmissionLineCanvas');
    if (!canvas || !lastTlData) return;
    const hi = setupHiDpiCanvas(canvas);
    if (!hi) return;
    const { ctx, w, h } = hi;

    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, w, h);

    const padL = 60, padR = 40, padT = 30, padB = 40;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const d = lastTlData;
    const maxV = Math.max(d.VS_LL, d.VR0_LL, d.VR_LL) * 1.12;
    const minV = Math.min(d.VS_LL, d.VR_LL) * 0.88;

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 6; x++) {
        const px = padL + (x / 6) * plotW;
        ctx.beginPath(); ctx.moveTo(px, padT); ctx.lineTo(px, h - padB); ctx.stroke();
    }
    for (let y = 0; y <= 4; y++) {
        const py = padT + (y / 4) * plotH;
        ctx.beginPath(); ctx.moveTo(padL, py); ctx.lineTo(w - padR, py); ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(padL, h - padB); ctx.lineTo(w - padR, h - padB); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(padL, h - padB); ctx.lineTo(padL, padT); ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '11px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(maxV) + ' kV', padL - 8, padT + 10);
    ctx.fillText(Math.round(minV) + ' kV', padL - 8, h - padB);
    ctx.textAlign = 'center';
    ctx.fillText('0 km (Gönderici Uç VS)', padL + 20, h - padB + 20);
    ctx.fillText(d.l + ' km (Alıcı Uç VR)', w - padR - 20, h - padB + 20);

    const endFrac = Math.min(1, animProgress);
    const endPx = padL + endFrac * plotW;

    const y_vs = (h - padB) - ((d.VS_LL - minV) / (maxV - minV)) * plotH;
    const y_vr_loaded = (h - padB) - (((d.VS_LL - endFrac * (d.VS_LL - d.VR_LL)) - minV) / (maxV - minV)) * plotH;

    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(padL, y_vs);
    ctx.lineTo(endPx, y_vr_loaded);
    ctx.stroke();

    const y_vr_ferranti = (h - padB) - (((d.VS_LL + endFrac * (d.VR0_LL - d.VS_LL)) - minV) / (maxV - minV)) * plotH;

    ctx.strokeStyle = '#ef4444';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(padL, y_vs);
    ctx.lineTo(endPx, y_vr_ferranti);
    ctx.stroke();
    ctx.setLineDash([]);

    if (animProgress >= 0.95) {
        ctx.font = 'bold 11px Outfit, sans-serif';
        ctx.fillStyle = '#818cf8';
        ctx.fillText('Yük Altında VR: ' + d.VR_LL.toFixed(1) + ' kV', w - padR - 70, (h - padB) - ((d.VR_LL - minV) / (maxV - minV)) * plotH + 18);
        ctx.fillStyle = '#ef4444';
        ctx.fillText('Ferranti Boşta VR0: ' + d.VR0_LL.toFixed(1) + ' kV', w - padR - 80, (h - padB) - ((d.VR0_LL - minV) / (maxV - minV)) * plotH - 10);
    }

    if (hoverPt) {
        const frac = Math.max(0, Math.min(1, (hoverPt.x - padL) / plotW));
        const curKm = frac * d.l;
        const vLoaded = d.VS_LL - frac * (d.VS_LL - d.VR_LL);
        const vFerranti = d.VS_LL + frac * (d.VR0_LL - d.VS_LL);

        const curPx = padL + frac * plotW;
        const curPyLoaded = (h - padB) - ((vLoaded - minV) / (maxV - minV)) * plotH;
        const curPyFerranti = (h - padB) - ((vFerranti - minV) / (maxV - minV)) * plotH;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(curPx, padT); ctx.lineTo(curPx, h - padB); ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = '#818cf8'; ctx.shadowColor = '#818cf8'; ctx.shadowBlur = 9;
        ctx.beginPath(); ctx.arc(curPx, curPyLoaded, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.8; ctx.stroke();

        ctx.fillStyle = '#ef4444'; ctx.shadowColor = '#ef4444';
        ctx.beginPath(); ctx.arc(curPx, curPyFerranti, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.stroke();
        ctx.restore();

        const diffV = vFerranti - vLoaded;
        const tipLines = [
            { text: 'Mesafe: ' + curKm.toFixed(1) + ' km (%' + Math.round(frac * 100) + ' Hat)', color: '#f1f5f9', bold: true },
            { text: 'Yük Altında VR: ' + vLoaded.toFixed(2) + ' kV', color: '#818cf8', bold: true },
            { text: 'Ferranti Boşta VR0: ' + vFerranti.toFixed(2) + ' kV', color: '#ef4444', bold: true },
            { text: 'Fark ΔV: ' + (diffV > 0 ? '+' : '') + diffV.toFixed(2) + ' kV', color: '#fbbf24' },
            { text: 'Regülasyon: %' + d.reg.toFixed(2) + ' | Komp: ' + d.deltaQ.toFixed(1) + ' MVAR', color: '#34d399' }
        ];
        renderCanvasHoverTooltip(ctx, w, h, curPx, hoverPt.y, tipLines, '#6366f1');
    }

    const hud = document.getElementById('transmissionLineHoverInfo');
    if (hud) {
        if (hoverPt) {
            hud.style.display = 'block';
            hud.innerHTML = '<span style="color:#818cf8;font-weight:700;">VS: ' + d.VS_LL.toFixed(1) + ' kV</span> | ' +
                            '<span style="color:#38bdf8;">VR: ' + d.VR_LL.toFixed(1) + ' kV</span> | ' +
                            '<span style="color:#ef4444;">Ferranti VR0: ' + d.VR0_LL.toFixed(1) + ' kV</span> | ' +
                            'Regülasyon: %' + d.reg.toFixed(2);
        } else {
            hud.innerText = "İmleci hat gerilim profili üzerinde gezdirerek km bazında gerilim değişimini inceleyin";
        }
    }
}

/* ─────────────────────────────────────────────────────────── */
/*  6. RLC GEÇİCİ REJİM (TRANSIENT) SİMÜLATÖRÜ (P2)           */
/* ─────────────────────────────────────────────────────────── */
let lastRlcData = null;
let rlcHoverPt = null;
let rlcAnimFrame = null;

function animateTransientRlcTrace() {
    if (rlcAnimFrame) cancelAnimationFrame(rlcAnimFrame);
    const startTime = performance.now();
    const duration = 600;
    function frame(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        drawTransientRlcCanvas(null, progress);
        if (progress < 1) {
            rlcAnimFrame = requestAnimationFrame(frame);
        } else {
            rlcAnimFrame = null;
            drawTransientRlcCanvas(rlcHoverPt, 1);
        }
    }
    rlcAnimFrame = requestAnimationFrame(frame);
}

function calculateTransientRlc(animate = false) {
    const config = document.getElementById('rlcConfig')?.value || 'series';
    const R = parseFloat(document.getElementById('rlcR')?.value) || 25;
    const L_m = parseFloat(document.getElementById('rlcL')?.value) || 20;
    const C_u = parseFloat(document.getElementById('rlcC')?.value) || 10;
    const Vin = parseFloat(document.getElementById('rlcVin')?.value) || 12;

    const L = L_m * 1e-3;
    const C = C_u * 1e-6;

    const omega0 = 1 / Math.sqrt(L * C);
    const alpha = (config === 'series') ? (R / (2 * L)) : (1 / (2 * R * C));
    const zeta = alpha / omega0;

    let regime = 'under';
    let wd = 0;
    let s1 = 0, s2 = 0;
    let OS = 0;
    let tp = 0;
    let ts = 4 / alpha;

    if (zeta < 0.999) {
        regime = 'under';
        wd = Math.sqrt(Math.max(0, omega0 * omega0 - alpha * alpha));
        OS = Math.exp((-alpha * Math.PI) / wd) * 100;
        tp = Math.PI / wd;
    } else if (zeta > 1.001) {
        regime = 'over';
        const sq = Math.sqrt(alpha * alpha - omega0 * omega0);
        s1 = -alpha + sq;
        s2 = -alpha - sq;
        OS = 0;
        tp = 0;
    } else {
        regime = 'critical';
        OS = 0;
        tp = 0;
    }

    const elZeta = document.getElementById('rlcResZeta');
    if (elZeta) {
        const regStr = regime === 'under' ? 'Eksik Sönümlü (Underdamped - Salınımlı)' :
                       (regime === 'over' ? 'Aşırı Sönümlü (Overdamped)' : 'Kritik Sönümlü (Critically Damped)');
        elZeta.innerText = 'ζ = ' + zeta.toFixed(3) + ' • ' + regStr;
        elZeta.style.color = regime === 'under' ? '#38bdf8' : (regime === 'critical' ? '#34d399' : '#fbbf24');
    }
    const elOmega = document.getElementById('rlcResOmega');
    if (elOmega) {
        elOmega.innerText = 'ω₀ = ' + omega0.toFixed(1) + ' rad/s (' + (omega0 / (2 * Math.PI)).toFixed(1) + ' Hz) • α = ' + alpha.toFixed(1) + ' Np/s' + 
            (regime === 'under' ? ' • ωd = ' + wd.toFixed(1) + ' rad/s' : '');
    }
    const elMetrics = document.getElementById('rlcResMetrics');
    if (elMetrics) {
        elMetrics.innerText = '%OS = % ' + OS.toFixed(1) + 
            (tp > 0 ? (' • Pik tp = ' + (tp * 1000).toFixed(2) + ' ms') : '') + 
            ' • Yerleşme ts = ' + (ts * 1000).toFixed(2) + ' ms (%2)';
    }

    lastRlcData = {
        config, R, L, C, Vin, omega0, alpha, zeta, regime, wd, s1, s2, OS, tp, ts
    };

    if (animate) {
        triggerSimButtonFeedback('rlcSimBtn', 'Geçici Rejim Çözülüyor...', 'vC(t) Basamak Yanıtı Çizildi!');
        animateTransientRlcTrace();
    } else {
        drawTransientRlcCanvas(rlcHoverPt, 1);
    }
}

function drawTransientRlcCanvas(hoverPt, animProgress = 1) {
    const canvas = document.getElementById('transientRlcCanvas');
    if (!canvas || !lastRlcData) return;
    const hi = setupHiDpiCanvas(canvas);
    if (!hi) return;
    const { ctx, w, h } = hi;

    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, w, h);

    const padL = 50, padR = 40, padT = 30, padB = 40;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const d = lastRlcData;
    const tEnd = Math.max(0.005, d.ts * 1.6);
    const maxV = d.Vin * (d.regime === 'under' ? (1 + (d.OS / 100) * 1.2) : 1.2);

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 8; x++) {
        const px = padL + (x / 8) * plotW;
        ctx.beginPath(); ctx.moveTo(px, padT); ctx.lineTo(px, h - padB); ctx.stroke();
    }
    for (let y = 0; y <= 4; y++) {
        const py = padT + (y / 4) * plotH;
        ctx.beginPath(); ctx.moveTo(padL, py); ctx.lineTo(w - padR, py); ctx.stroke();
    }

    const py_vin = (h - padB) - (d.Vin / maxV) * plotH;
    ctx.strokeStyle = 'rgba(148,163,184,0.5)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(padL, py_vin); ctx.lineTo(w - padR, py_vin); ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(padL, h - padB); ctx.lineTo(w - padR, h - padB); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(padL, h - padB); ctx.lineTo(padL, padT); ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '11px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('0 V', padL - 8, h - padB);
    ctx.fillText(d.Vin.toFixed(1) + ' V (Hedef)', padL - 8, py_vin + 4);
    ctx.textAlign = 'center';
    ctx.fillText((tEnd * 1000).toFixed(1) + ' ms', w - padR, h - padB + 20);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();

    const points = 250;
    const drawPoints = Math.round(points * Math.min(1, animProgress));
    let lastPx = padL;
    let lastPy = h - padB;

    for (let i = 0; i <= drawPoints; i++) {
        const t = (i / points) * tEnd;
        let vc = 0;

        if (d.regime === 'under') {
            vc = d.Vin * (1 - Math.exp(-d.alpha * t) * (Math.cos(d.wd * t) + (d.alpha / d.wd) * Math.sin(d.wd * t)));
        } else if (d.regime === 'critical') {
            vc = d.Vin * (1 - (1 + d.alpha * t) * Math.exp(-d.alpha * t));
        } else {
            const A1 = d.s2 / (d.s1 - d.s2);
            const A2 = -d.s1 / (d.s1 - d.s2);
            vc = d.Vin * (1 + A1 * Math.exp(d.s1 * t) + A2 * Math.exp(d.s2 * t));
        }

        const px = padL + (t / tEnd) * plotW;
        const py = (h - padB) - (vc / maxV) * plotH;
        lastPx = px;
        lastPy = py;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    if (animProgress < 1) {
        ctx.save();
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(lastPx, lastPy, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
    }

    if (animProgress >= 0.95 && d.regime === 'under' && d.tp > 0) {
        const px_tp = padL + (d.tp / tEnd) * plotW;
        const v_peak = d.Vin * (1 + d.OS / 100);
        const py_tp = (h - padB) - (v_peak / maxV) * plotH;

        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(px_tp, py_tp, 5, 0, Math.PI * 2); ctx.fill();
        ctx.font = 'bold 11px Outfit, sans-serif';
        ctx.fillText('Mp = ' + v_peak.toFixed(2) + ' V (tp)', px_tp + 8, py_tp - 8);
    }

    if (hoverPt) {
        const frac = Math.max(0, Math.min(1, (hoverPt.x - padL) / plotW));
        const curT = frac * tEnd;
        let curVc = 0;
        let curIl = 0;

        if (d.regime === 'under') {
            curVc = d.Vin * (1 - Math.exp(-d.alpha * curT) * (Math.cos(d.wd * curT) + (d.alpha / d.wd) * Math.sin(d.wd * curT)));
            curIl = d.C * d.Vin * (d.omega0 * d.omega0 / d.wd) * Math.exp(-d.alpha * curT) * Math.sin(d.wd * curT);
        } else if (d.regime === 'critical') {
            curVc = d.Vin * (1 - (1 + d.alpha * curT) * Math.exp(-d.alpha * curT));
            curIl = d.C * d.Vin * d.alpha * d.alpha * curT * Math.exp(-d.alpha * curT);
        } else {
            const A1 = d.s2 / (d.s1 - d.s2);
            const A2 = -d.s1 / (d.s1 - d.s2);
            curVc = d.Vin * (1 + A1 * Math.exp(d.s1 * curT) + A2 * Math.exp(d.s2 * curT));
            curIl = d.C * d.Vin * (A1 * d.s1 * Math.exp(d.s1 * curT) + A2 * d.s2 * Math.exp(d.s2 * curT));
        }

        const curPx = padL + frac * plotW;
        const curPy = (h - padB) - (curVc / maxV) * plotH;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(curPx, padT); ctx.lineTo(curPx, h - padB); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(padL, curPy); ctx.lineTo(curPx, curPy); ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = 'rgba(56, 189, 248, 0.9)';
        ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(curPx, curPy, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();

        const tipLines = [
            { text: 'Zaman t: ' + (curT * 1000).toFixed(2) + ' ms (%' + Math.round((curT / d.ts) * 100) + ' ts)', color: '#f1f5f9', bold: true },
            { text: 'Kapasitör vC(t): ' + curVc.toFixed(2) + ' V (%' + ((curVc / d.Vin) * 100).toFixed(1) + ' Vin)', color: '#38bdf8', bold: true },
            { text: 'Bobin Akımı iL(t): ' + (curIl * 1000).toFixed(2) + ' mA', color: '#fbbf24' },
            { text: 'Rejim: ' + (d.regime === 'under' ? 'Eksik Sönümlü (Salınımlı)' : (d.regime === 'critical' ? 'Kritik Sönümlü' : 'Aşırı Sönümlü')), color: d.regime === 'under' ? '#38bdf8' : '#34d399' },
            { text: 'Hedef Vin: ' + d.Vin.toFixed(1) + ' V | %OS: %' + d.OS.toFixed(1), color: '#cbd5e1' }
        ];
        renderCanvasHoverTooltip(ctx, w, h, curPx, curPy, tipLines, '#a855f7');
    }

    const hud = document.getElementById('transientRlcHoverInfo');
    if (hud) {
        if (hoverPt) {
            hud.style.display = 'block';
            hud.innerHTML = '<span style="color:#38bdf8;font-weight:700;">vC(t): ' + d.Vin.toFixed(1) + ' V basamak</span> | ' +
                            'ζ = ' + d.zeta.toFixed(3) + ' | ' +
                            '%OS = %' + d.OS.toFixed(1) + ' | ' +
                            'ts = ' + (d.ts * 1000).toFixed(2) + ' ms';
        } else {
            hud.innerText = "İmleci zaman ekseninde gezdirerek anlık vC(t) ve iL(t) değerlerini inceleyin";
        }
    }
}

/* ─────────────────────────────────────────────────────────── */
/*  7. GRAFİKSEL KONVOLÜSYON & FOURIER SPEKTRUMU (P2)         */
/* ─────────────────────────────────────────────────────────── */
let fourierConvMode = 'conv';
let convAnimTimer = null;
let convIsPlaying = false;
let lastFcData = null;
let fcHoverPt = null;

function setFourierConvMode(mode) {
    fourierConvMode = mode;
    const btnConv = document.getElementById('btnModeConv');
    const btnFour = document.getElementById('btnModeFourier');
    const boxConv = document.getElementById('convControlsBox');
    const boxFour = document.getElementById('fourierControlsBox');

    if (btnConv) btnConv.classList.toggle('active', mode === 'conv');
    if (btnFour) btnFour.classList.toggle('active', mode === 'fourier');
    if (boxConv) boxConv.style.display = (mode === 'conv') ? 'block' : 'none';
    if (boxFour) boxFour.style.display = (mode === 'fourier') ? 'block' : 'none';

    calculateFourierConv();
}

function toggleConvolutionAnim() {
    const btn = document.getElementById('btnConvPlay');
    if (convIsPlaying) {
        clearInterval(convAnimTimer);
        convIsPlaying = false;
        if (btn) btn.innerHTML = '<i class="fas fa-play"></i> <span>Oynat</span>';
    } else {
        convIsPlaying = true;
        if (btn) btn.innerHTML = '<i class="fas fa-pause"></i> <span>Duraklat</span>';
        convAnimTimer = setInterval(() => {
            const range = document.getElementById('convTShift');
            if (range) {
                let v = parseFloat(range.value) + 0.05;
                if (v > 6.0) v = -4.0;
                range.value = v.toFixed(2);
                const valEl = document.getElementById('convTVal');
                if (valEl) valEl.innerText = v.toFixed(2) + ' s';
                calculateConvolutionInternal();
            }
        }, 50);
    }
}

function resetConvolutionAnim() {
    if (convIsPlaying) toggleConvolutionAnim();
    const range = document.getElementById('convTShift');
    if (range) {
        range.value = '0.0';
        const valEl = document.getElementById('convTVal');
        if (valEl) valEl.innerText = '0.00 s';
        calculateConvolutionInternal();
    }
}

function calculateFourierConv() {
    if (fourierConvMode === 'conv') {
        calculateConvolutionInternal();
    } else {
        calculateFourierInternal();
    }
}

function calculateConvolutionInternal() {
    const sigX = document.getElementById('convSigX')?.value || 'rect';
    const sigH = document.getElementById('convSigH')?.value || 'rect';
    const tShift = parseFloat(document.getElementById('convTShift')?.value) || 0.0;

    const getX = (tau) => {
        if (sigX === 'rect') return (tau >= -1 && tau <= 1) ? 1.0 : 0.0;
        if (sigX === 'tri') return (tau >= -1 && tau <= 1) ? (1 - Math.abs(tau)) : 0.0;
        if (sigX === 'exp') return (tau >= 0) ? Math.exp(-tau) : 0.0;
        return 0;
    };

    const getH = (tau) => {
        const arg = tShift - tau;
        if (sigH === 'rect') return (arg >= -1 && arg <= 1) ? 1.0 : 0.0;
        if (sigH === 'exp') return (arg >= 0) ? Math.exp(-2 * arg) : 0.0;
        return 0;
    };

    let y_t = 0;
    const dTau = 0.02;
    for (let tau = -6; tau <= 8; tau += dTau) {
        y_t += getX(tau) * getH(tau) * dTau;
    }

    const lbl = document.getElementById('fcResLabel');
    if (lbl) lbl.innerText = 'Anlık Çakışma İntegrali y(t):';
    const val = document.getElementById('fcResVal');
    if (val) val.innerText = 'y(' + tShift.toFixed(2) + ') = ' + y_t.toFixed(3);
    const desc = document.getElementById('fcResDesc');
    if (desc) {
        desc.innerText = (sigX === 'rect' && sigH === 'rect') ? 
            'İki eşit genişlikli kare darbenin konvolüsyonu simetrik bir üçgen darbe üretir.' :
            'Kayan integral örtüşme alanı LTI sistemlerin dürtü yanıtını temsil eder.';
    }

    lastFcData = {
        mode: 'conv', sigX, sigH, tShift, y_t, getX, getH
    };

    drawFourierConvCanvas(fcHoverPt);
}

function calculateFourierInternal() {
    const waveType = document.getElementById('fourWaveType')?.value || 'square';
    const N = parseInt(document.getElementById('fourHarmonics')?.value) || 7;

    const lbl = document.getElementById('fcResLabel');
    if (lbl) lbl.innerText = 'Harmonik Sentezi & Gibbs Olayı:';
    const val = document.getElementById('fcResVal');
    if (val) val.innerText = N + ' Harmonik Toplamı (Gibbs Aşımı ≈ %8.95)';
    const desc = document.getElementById('fcResDesc');
    if (desc) {
        desc.innerText = 'Fourier serisinde harmonik sayısı arttıkça süreksizlik noktalarındaki aşım (Gibbs olayı) sıfırlanmaz, ancak daralarak tepeye yaklaşır.';
    }

    lastFcData = {
        mode: 'fourier', waveType, N
    };

    drawFourierConvCanvas(fcHoverPt);
}

function drawFourierConvCanvas(hoverPt) {
    const canvas = document.getElementById('fourierConvCanvas');
    if (!canvas || !lastFcData) return;
    const hi = setupHiDpiCanvas(canvas);
    if (!hi) return;
    const { ctx, w, h } = hi;

    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, w, h);

    if (lastFcData.mode === 'conv') {
        drawConvolutionCanvasView(ctx, w, h, lastFcData, hoverPt);
    } else {
        drawFourierCanvasView(ctx, w, h, lastFcData, hoverPt);
    }

    const hud = document.getElementById('fourierConvHoverInfo');
    if (hud) {
        if (hoverPt) {
            hud.style.display = 'block';
            hud.innerHTML = lastFcData.mode === 'conv' ? 
                '<span style="color:#06b6d4;font-weight:700;">Zaman t: ' + lastFcData.tShift.toFixed(2) + ' s</span> | ' +
                'y(t) = ' + lastFcData.y_t.toFixed(3) :
                '<span style="color:#06b6d4;font-weight:700;">Harmonik N = ' + lastFcData.N + '</span> | Gibbs Aşımı: %8.95';
        } else {
            hud.innerText = "İmleci kanvas üzerinde gezdirerek çakışma alanını veya harmonik katsayılarını inceleyin";
        }
    }
}

function drawConvolutionCanvasView(ctx, w, h, d, hoverPt) {
    const midY1 = h * 0.35;
    const midY2 = h * 0.78;
    const scaleX = w / 12;
    const tauZeroX = w * 0.35;

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(20, midY1); ctx.lineTo(w - 20, midY1); ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px Outfit, sans-serif';
    ctx.fillText('τ = 0', tauZeroX - 10, midY1 + 14);

    ctx.fillStyle = 'rgba(251,191,36,0.35)';
    ctx.beginPath();
    let fillStarted = false;
    for (let tau = -4; tau <= 8; tau += 0.05) {
        const prod = d.getX(tau) * d.getH(tau);
        const px = tauZeroX + tau * scaleX;
        const py = midY1 - prod * 55;
        if (!fillStarted) { ctx.moveTo(px, midY1); fillStarted = true; }
        ctx.lineTo(px, py);
    }
    ctx.lineTo(w - 20, midY1);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let tau = -4; tau <= 8; tau += 0.05) {
        const px = tauZeroX + tau * scaleX;
        const py = midY1 - d.getX(tau) * 55;
        if (tau === -4) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let tau = -4; tau <= 8; tau += 0.05) {
        const px = tauZeroX + tau * scaleX;
        const py = midY1 - d.getH(tau) * 55;
        if (tau === -4) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(20, midY2); ctx.lineTo(w - 20, midY2); ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('t = 0', tauZeroX - 10, midY2 + 14);

    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let t = -4; t <= d.tShift; t += 0.05) {
        let yt = 0;
        for (let tau = -4; tau <= 6; tau += 0.05) {
            const h_val = (d.sigH === 'rect') ? ((t - tau >= -1 && t - tau <= 1) ? 1 : 0) : 
                          ((t - tau >= 0) ? Math.exp(-2 * (t - tau)) : 0);
            yt += d.getX(tau) * h_val * 0.05;
        }
        const px = tauZeroX + t * scaleX;
        const py = midY2 - yt * 40;
        if (t === -4) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    const curPx = tauZeroX + d.tShift * scaleX;
    const curPy = midY2 - d.y_t * 40;
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath(); ctx.arc(curPx, curPy, 5.5, 0, Math.PI * 2); ctx.fill();

    if (hoverPt) {
        const curTau = (hoverPt.x - tauZeroX) / scaleX;
        const x_val = d.getX(curTau);
        const h_val = d.getH(curTau);
        const prod = x_val * h_val;

        const py_x = midY1 - x_val * 55;
        const py_h = midY1 - h_val * 55;
        const py_prod = midY1 - prod * 55;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(hoverPt.x, 0); ctx.lineTo(hoverPt.x, h); ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = '#38bdf8'; ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(hoverPt.x, py_x, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.stroke();

        ctx.fillStyle = '#ef4444'; ctx.shadowColor = '#ef4444';
        ctx.beginPath(); ctx.arc(hoverPt.x, py_h, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.stroke();

        if (prod > 0.001) {
            ctx.fillStyle = '#fbbf24'; ctx.shadowColor = '#fbbf24';
            ctx.beginPath(); ctx.arc(hoverPt.x, py_prod, 5, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.stroke();
        }
        ctx.restore();

        const tipLines = [
            { text: 'Kayan Değişken τ: ' + curTau.toFixed(2) + ' s', color: '#f1f5f9', bold: true },
            { text: 'x(τ) Giriş: ' + x_val.toFixed(2), color: '#38bdf8', bold: true },
            { text: 'h(t - τ) Çekirdek: ' + h_val.toFixed(2), color: '#ef4444', bold: true },
            { text: 'Örtüşme (x·h): ' + prod.toFixed(3), color: '#fbbf24' },
            { text: 'Anlık y(t=' + d.tShift.toFixed(2) + '): ' + d.y_t.toFixed(3), color: '#06b6d4' }
        ];
        renderCanvasHoverTooltip(ctx, w, h, hoverPt.x, hoverPt.y, tipLines, '#06b6d4');
    }

    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.fillStyle = '#38bdf8'; ctx.fillText('x(τ) Giriş', 30, 24);
    ctx.fillStyle = '#ef4444'; ctx.fillText('h(t - τ) Kayan Çekirdek', 110, 24);
    ctx.fillStyle = '#fbbf24'; ctx.fillText('Örtüşme Alanı', 260, 24);
    ctx.fillStyle = '#06b6d4'; ctx.fillText('y(t) = x*h Konvolüsyon Sonucu', 30, midY2 - 45);
}

function drawFourierCanvasView(ctx, w, h, d, hoverPt) {
    const midY = h * 0.52;
    const scaleX = w / (Math.PI * 4);

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(20, midY); ctx.lineTo(w - 20, midY); ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for (let x = 0; x < w - 40; x += 2) {
        const t = (x / (w - 40)) * Math.PI * 4;
        let ideal = 0;
        if (d.waveType === 'square') {
            ideal = Math.sin(t) >= 0 ? 1 : -1;
        } else if (d.waveType === 'triangle') {
            ideal = (2 / Math.PI) * Math.asin(Math.sin(t));
        } else {
            ideal = (t % (Math.PI * 2)) / Math.PI - 1;
        }
        const px = 20 + x;
        const py = midY - ideal * 70;
        if (x === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    for (let x = 0; x < w - 40; x += 2) {
        const t = (x / (w - 40)) * Math.PI * 4;
        let sum = 0;

        for (let k = 1; k <= d.N; k++) {
            if (d.waveType === 'square' && k % 2 === 1) {
                sum += (4 / (Math.PI * k)) * Math.sin(k * t);
            } else if (d.waveType === 'triangle' && k % 2 === 1) {
                const sgn = ((k - 1) / 2) % 2 === 0 ? 1 : -1;
                sum += (8 / (Math.PI * Math.PI * k * k)) * sgn * Math.sin(k * t);
            } else if (d.waveType === 'sawtooth') {
                sum += (2 / (Math.PI * k)) * Math.pow(-1, k + 1) * Math.sin(k * t);
            }
        }

        const px = 20 + x;
        const py = midY - sum * 70;
        if (x === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    if (hoverPt) {
        const t = Math.max(0, Math.min(Math.PI * 4, ((hoverPt.x - 20) / (w - 40)) * Math.PI * 4));
        let sum = 0;
        for (let k = 1; k <= d.N; k++) {
            if (d.waveType === 'square' && k % 2 === 1) {
                sum += (4 / (Math.PI * k)) * Math.sin(k * t);
            } else if (d.waveType === 'triangle' && k % 2 === 1) {
                const sgn = ((k - 1) / 2) % 2 === 0 ? 1 : -1;
                sum += (8 / (Math.PI * Math.PI * k * k)) * sgn * Math.sin(k * t);
            } else if (d.waveType === 'sawtooth') {
                sum += (2 / (Math.PI * k)) * Math.pow(-1, k + 1) * Math.sin(k * t);
            }
        }

        let ideal = 0;
        if (d.waveType === 'square') {
            ideal = Math.sin(t) >= 0 ? 1 : -1;
        } else if (d.waveType === 'triangle') {
            ideal = (2 / Math.PI) * Math.asin(Math.sin(t));
        } else {
            ideal = (t % (Math.PI * 2)) / Math.PI - 1;
        }

        const curPx = 20 + (t / (Math.PI * 4)) * (w - 40);
        const curPy = midY - sum * 70;
        const curPyIdeal = midY - ideal * 70;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(curPx, 20); ctx.lineTo(curPx, h - 20); ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = '#06b6d4'; ctx.shadowColor = '#06b6d4'; ctx.shadowBlur = 9;
        ctx.beginPath(); ctx.arc(curPx, curPy, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath(); ctx.arc(curPx, curPyIdeal, 4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        const err = Math.abs(sum - ideal);
        const tipLines = [
            { text: 'Zaman t: ' + t.toFixed(2) + ' rad (' + Math.round(t * 180 / Math.PI) + '°)', color: '#f1f5f9', bold: true },
            { text: 'f_N(t) Sentez: ' + sum.toFixed(3) + ' (N=' + d.N + ')', color: '#06b6d4', bold: true },
            { text: 'İdeal Hedef: ' + ideal.toFixed(3), color: '#cbd5e1' },
            { text: 'Hata / Gibbs Aşımı: ' + err.toFixed(3), color: err > 0.15 ? '#f87171' : '#34d399' }
        ];
        renderCanvasHoverTooltip(ctx, w, h, curPx, curPy, tipLines, '#06b6d4');
    }

    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.fillStyle = '#06b6d4';
    ctx.fillText('f_N(t): ' + d.N + ' Harmonik Yaklaşımı (Cyan)', 30, 24);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText('--- İdeal Periyodik Dalga', 260, 24);
}
