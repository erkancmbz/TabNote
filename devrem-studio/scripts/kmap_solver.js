/**
 * EEM REHBER / DEVREM STUDIO - KARNAUGH HARİTASI & SAYISAL MANTIK ÇÖZÜCÜ
 * 2, 3 ve 4 değişkenli K-Map, Quine-McCluskey / Gray-code tabanlı gruplama ve minimal SOP sentezi
 */
(function(window) {
    'use strict';

    const KMapModule = {
        varCount: 4, // 2, 3 veya 4
        cellValues: {},
        simInputs: { A: 0, B: 0, C: 0, D: 0 },
        realizationMode: 'and-or', // 'and-or', 'nand-nand', 'bom', 'hdl'
        hdlMode: 'verilog', // 'verilog', 'vhdl'
        currentCircuitData: null,

        init: function() {
            this.resetCells();
            this.simInputs = { A: 0, B: 0, C: 0, D: 0 };
        },

        resetCells: function() {
            const total = 1 << this.varCount;
            this.cellValues = {};
            for (let i = 0; i < total; i++) {
                this.cellValues[i] = 0;
            }
        },

        setVarCount: function(num) {
            this.varCount = Math.min(4, Math.max(2, parseInt(num, 10) || 4));
            if (typeof document !== 'undefined') {
                const buttons = document.querySelectorAll('.kmap-var-btn-group .kmap-btn');
                buttons.forEach(btn => {
                    const text = btn.textContent || '';
                    if (text.includes(this.varCount + ' Var')) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
            }
            this.simInputs = { A: 0, B: 0, C: 0, D: 0 };
            this.resetCells();
            this.render();
            this.solve();
        },

        toggleCell: function(minterm) {
            const current = (this.cellValues[minterm] !== undefined && this.cellValues[minterm] !== null) ? this.cellValues[minterm] : 0;
            if (current === 0) {
                this.cellValues[minterm] = 1;
            } else if (current === 1) {
                this.cellValues[minterm] = 'X';
            } else {
                this.cellValues[minterm] = 0;
            }
            this.render();
            this.solve();
        },

        setAll: function(val) {
            const total = 1 << this.varCount;
            for (let i = 0; i < total; i++) {
                this.cellValues[i] = val;
            }
            this.render();
            this.solve();
        },

        loadExample: function(type) {
            this.resetCells();
            if (this.varCount === 4) {
                if (type === 'prime') {
                    [0, 2, 3, 5, 6, 7, 8, 9, 10, 12, 14, 15].forEach(m => this.cellValues[m] = 1);
                } else if (type === 'corner') {
                    [0, 2, 8, 10, 5, 7].forEach(m => this.cellValues[m] = 1);
                } else {
                    [1, 3, 5, 7, 8, 9].forEach(m => this.cellValues[m] = 1);
                }
            } else if (this.varCount === 3) {
                [0, 1, 3, 5, 7].forEach(m => this.cellValues[m] = 1);
            } else {
                [0, 1, 3].forEach(m => this.cellValues[m] = 1);
            }
            this.render();
            this.solve();
        },

        getGridStructure: function() {
            if (this.varCount === 2) {
                return {
                    rowVar: 'A',
                    colVar: 'B',
                    rows: ['0', '1'],
                    cols: ['0', '1'],
                    cells: [
                        [0, 1],
                        [2, 3]
                    ]
                };
            } else if (this.varCount === 3) {
                return {
                    rowVar: 'A',
                    colVar: 'BC',
                    rows: ['0', '1'],
                    cols: ['00', '01', '11', '10'],
                    cells: [
                        [0, 1, 3, 2],
                        [4, 5, 7, 6]
                    ]
                };
            } else {
                return {
                    rowVar: 'AB',
                    colVar: 'CD',
                    rows: ['00', '01', '11', '10'],
                    cols: ['00', '01', '11', '10'],
                    cells: [
                        [0, 1, 3, 2],
                        [4, 5, 7, 6],
                        [12, 13, 15, 14],
                        [8, 9, 11, 10]
                    ]
                };
            }
        },

        render: function() {
            const container = document.getElementById('kmapGridContainer');
            if (!container) return;

            // Hücre değerleri yoksa veya eksikse 0 ile başlat
            const total = 1 << this.varCount;
            if (!this.cellValues || typeof this.cellValues !== 'object') {
                this.cellValues = {};
            }
            for (let i = 0; i < total; i++) {
                if (this.cellValues[i] === undefined || this.cellValues[i] === null) {
                    this.cellValues[i] = 0;
                }
            }

            const grid = this.getGridStructure();
            let html = '<div class="kmap-table-wrap"><table class="kmap-table">';
            
            html += '<thead><tr>';
            html += '<th class="kmap-corner"><span class="kmap-row-var">' + grid.rowVar + '</span> \\ <span class="kmap-col-var">' + grid.colVar + '</span></th>';
            for (let c = 0; c < grid.cols.length; c++) {
                html += '<th class="kmap-col-head">' + grid.cols[c] + '</th>';
            }
            html += '</tr></thead><tbody>';

            for (let r = 0; r < grid.rows.length; r++) {
                html += '<tr>';
                html += '<th class="kmap-row-head">' + grid.rows[r] + '</th>';
                for (let c = 0; c < grid.cols.length; c++) {
                    const minterm = grid.cells[r][c];
                    let val = this.cellValues[minterm];
                    if (val === undefined || val === null) {
                        val = 0;
                        this.cellValues[minterm] = 0;
                    }
                    const valClass = val === 1 ? 'val-1' : val === 'X' ? 'val-x' : 'val-0';
                    html += '<td class="kmap-cell ' + valClass + '" onclick="KMapModule.toggleCell(' + minterm + ')" title="m(' + minterm + ') - Tıklayarak değiştir (0 ➔ 1 ➔ X)">';
                    html += '<span class="kmap-minterm-sub">m' + minterm + '</span>';
                    html += '<span class="kmap-cell-val">' + val + '</span>';
                    html += '</td>';
                }
                html += '</tr>';
            }
            html += '</tbody></table></div>';

            container.innerHTML = html;
        },

        toBinaryStr: function(num, bits) {
            let s = num.toString(2);
            while (s.length < bits) s = '0' + s;
            return s;
        },

        solve: function() {
            const total = 1 << this.varCount;
            const ones = [];
            const dontCares = [];

            for (let i = 0; i < total; i++) {
                const val = (this.cellValues[i] !== undefined && this.cellValues[i] !== null) ? this.cellValues[i] : 0;
                if (val === 1) ones.push(i);
                else if (val === 'X') dontCares.push(i);
            }

            const outEl = document.getElementById('kmapResultExpr');
            const latexEl = document.getElementById('kmapLatexExpr');
            const groupsEl = document.getElementById('kmapGroupsContainer');
            const summaryEl = document.getElementById('kmapSummaryText');

            if (ones.length === 0) {
                if (outEl) outEl.innerHTML = '<span class="kmap-expr-constant">F = 0</span> (Lojik Düşük / Low)';
                if (latexEl) latexEl.innerHTML = '$$F = 0$$';
                if (groupsEl) groupsEl.innerHTML = '<span class="kmap-chip-empty">Grup yok (Tüm mintermler 0)</span>';
                if (summaryEl) summaryEl.innerHTML = 'Çıkış her zaman <strong>0 (Lojik GND)</strong> seviyesindedir. Hiçbir mantık kapısına gerek yoktur.';
                this.currentCircuitData = {
                    varCount: this.varCount,
                    varNames: ['A', 'B', 'C', 'D'].slice(0, this.varCount),
                    ones: [],
                    dontCares: dontCares,
                    essentialImplicants: [],
                    terms: [],
                    isZero: true,
                    isOne: false
                };
                if (typeof document !== 'undefined') this.renderRealization();
                return;
            }

            if (ones.length + dontCares.length === total && dontCares.length < total) {
                if (outEl) outEl.innerHTML = '<span class="kmap-expr-constant">F = 1</span> (Lojik Yüksek / Vcc)';
                if (latexEl) latexEl.innerHTML = '$$F = 1$$';
                if (groupsEl) groupsEl.innerHTML = '<span class="kmap-chip-full">Tam Grup</span>';
                if (summaryEl) summaryEl.innerHTML = 'Tüm mintermler kapsandı. Çıkış doğrudan <strong>1 (Lojik Vcc)</strong> seviyesindedir.';
                this.currentCircuitData = {
                    varCount: this.varCount,
                    varNames: ['A', 'B', 'C', 'D'].slice(0, this.varCount),
                    ones: ones,
                    dontCares: dontCares,
                    essentialImplicants: [],
                    terms: [],
                    isZero: false,
                    isOne: true
                };
                if (typeof document !== 'undefined') this.renderRealization();
                return;
            }

            const primeImplicants = this.findPrimeImplicants(ones, dontCares);
            const essentialImplicants = this.getEssentialPrimeImplicants(primeImplicants, ones);

            const varNames = ['A', 'B', 'C', 'D'].slice(0, this.varCount);
            const terms = essentialImplicants.map(imp => this.implicantToTerm(imp.mask, varNames));
            const latexTerms = essentialImplicants.map(imp => this.implicantToLatex(imp.mask, varNames));

            const finalExpr = terms.join(' + ') || '1';
            const finalLatex = '$$F = ' + (latexTerms.join(' + ') || '1') + '$$';

            if (outEl) outEl.innerHTML = '<span class="kmap-expr-accent">' + finalExpr + '</span>';
            if (latexEl) {
                latexEl.innerHTML = finalLatex;
                if (window.renderMathInElement) {
                    try { window.renderMathInElement(latexEl); } catch(e) {}
                }
            }

            if (groupsEl) {
                let gHtml = '';
                essentialImplicants.forEach((imp, idx) => {
                    const termName = this.implicantToTerm(imp.mask, varNames);
                    const count = 1 << (imp.mask.split('-').length - 1);
                    gHtml += '<div class="kmap-group-badge badge-grp-' + (idx % 6) + '">' +
                        '<span class="grp-size">' + count + '\'li Grup:</span> ' +
                        '<strong>' + termName + '</strong> ' +
                        '<span class="grp-minterms">[' + imp.minterms.join(', ') + ']</span>' +
                    '</div>';
                });
                groupsEl.innerHTML = gHtml;
            }

            if (summaryEl) {
                summaryEl.innerHTML = 'Toplam <strong>' + ones.length + ' adet 1</strong> mintermi bulundu. ' +
                    'En sade devre için <strong>' + essentialImplicants.length + ' adet terim</strong> (VE kapısı) ' +
                    've bunları toplayan <strong>1 adet VEYA kapısı</strong> yeterlidir.';
            }

            this.currentCircuitData = {
                varCount: this.varCount,
                varNames: varNames,
                ones: ones,
                dontCares: dontCares,
                essentialImplicants: essentialImplicants,
                terms: terms,
                isZero: false,
                isOne: false
            };
            if (typeof document !== 'undefined') this.renderRealization();
        },

        implicantToTerm: function(mask, varNames) {
            let term = '';
            for (let i = 0; i < mask.length; i++) {
                const char = mask[i];
                if (char === '0') {
                    term += varNames[i] + "'";
                } else if (char === '1') {
                    term += varNames[i];
                }
            }
            return term || '1';
        },

        implicantToLatex: function(mask, varNames) {
            let term = '';
            for (let i = 0; i < mask.length; i++) {
                const char = mask[i];
                if (char === '0') {
                    term += '\\overline{' + varNames[i] + '}';
                } else if (char === '1') {
                    term += varNames[i];
                }
            }
            return term || '1';
        },

        findPrimeImplicants: function(ones, dontCares) {
            const allTerms = [...ones, ...dontCares];
            const bits = this.varCount;

            let currentLevel = allTerms.map(m => ({
                mask: this.toBinaryStr(m, bits),
                minterms: [m],
                used: false
            }));

            const primeImplicants = [];

            while (currentLevel.length > 0) {
                const nextLevel = [];
                const mergedMap = {};

                for (let i = 0; i < currentLevel.length; i++) {
                    for (let j = i + 1; j < currentLevel.length; j++) {
                        const a = currentLevel[i];
                        const b = currentLevel[j];
                        const diffIdx = this.getSingleBitDiff(a.mask, b.mask);

                        if (diffIdx !== -1) {
                            a.used = true;
                            b.used = true;

                            const newMask = a.mask.substring(0, diffIdx) + '-' + a.mask.substring(diffIdx + 1);
                            if (!mergedMap[newMask]) {
                                const combinedMinterms = Array.from(new Set([...a.minterms, ...b.minterms])).sort((x, y) => x - y);
                                mergedMap[newMask] = {
                                    mask: newMask,
                                    minterms: combinedMinterms,
                                    used: false
                                };
                                nextLevel.push(mergedMap[newMask]);
                            }
                        }
                    }
                }

                for (let i = 0; i < currentLevel.length; i++) {
                    if (!currentLevel[i].used) {
                        primeImplicants.push(currentLevel[i]);
                    }
                }

                currentLevel = nextLevel;
            }

            return primeImplicants;
        },

        getSingleBitDiff: function(maskA, maskB) {
            let diff = -1;
            for (let i = 0; i < maskA.length; i++) {
                if (maskA[i] !== maskB[i]) {
                    if (diff !== -1) return -1;
                    diff = i;
                }
            }
            return diff;
        },

        getEssentialPrimeImplicants: function(primeImplicants, ones) {
            const uncovered = new Set(ones);
            const chosen = [];

            ones.forEach(m => {
                const covering = primeImplicants.filter(p => p.minterms.includes(m));
                if (covering.length === 1) {
                    const p = covering[0];
                    if (!chosen.includes(p)) {
                        chosen.push(p);
                        p.minterms.forEach(min => uncovered.delete(min));
                    }
                }
            });

            while (uncovered.size > 0) {
                let bestP = null;
                let maxCover = -1;

                primeImplicants.forEach(p => {
                    if (!chosen.includes(p)) {
                        let count = 0;
                        p.minterms.forEach(min => {
                            if (uncovered.has(min)) count++;
                        });
                        if (count > maxCover) {
                            maxCover = count;
                            bestP = p;
                        }
                    }
                });

                if (bestP && maxCover > 0) {
                    chosen.push(bestP);
                    bestP.minterms.forEach(min => uncovered.delete(min));
                } else {
                    break;
                }
            }

            return chosen;
        },

        setRealizationMode: function(mode) {
            this.realizationMode = mode;
            if (typeof document !== 'undefined') {
                const tabs = {
                    'and-or': 'btnRTabAndOr',
                    'nand-nand': 'btnRTabNand',
                    'bom': 'btnRTabBom',
                    'hdl': 'btnRTabHdl'
                };
                Object.keys(tabs).forEach(k => {
                    const btn = document.getElementById(tabs[k]);
                    if (btn) {
                        if (k === mode) btn.classList.add('active');
                        else btn.classList.remove('active');
                    }
                });
                this.renderRealization();
            }
        },

        toggleSimInput: function(varName) {
            this.simInputs[varName] = this.simInputs[varName] ? 0 : 1;
            this.renderRealization();
        },

        setHdlMode: function(mode) {
            this.hdlMode = mode;
            this.renderHdlCode();
        },

        copyHdlCode: function() {
            const codeEl = document.getElementById('kmapHdlCodeText');
            if (!codeEl) return;
            const text = codeEl.innerText || codeEl.textContent;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => {
                    const btn = document.getElementById('kmapCopyBtn');
                    if (btn) {
                        const orig = btn.innerHTML;
                        btn.innerHTML = '<i class="fas fa-check"></i> Kopyalandı!';
                        setTimeout(() => { btn.innerHTML = orig; }, 1800);
                    }
                });
            }
        },

        evaluateSimOutput: function() {
            const data = this.currentCircuitData;
            if (!data) return 0;
            if (data.isZero) return 0;
            if (data.isOne) return 1;
            if (!data.essentialImplicants || data.essentialImplicants.length === 0) return 0;

            for (let i = 0; i < data.essentialImplicants.length; i++) {
                const mask = data.essentialImplicants[i].mask;
                let termTrue = true;
                for (let b = 0; b < mask.length; b++) {
                    const ch = mask[b];
                    const vName = data.varNames[b];
                    const vVal = this.simInputs[vName] ? 1 : 0;
                    if (ch === '0' && vVal !== 0) { termTrue = false; break; }
                    if (ch === '1' && vVal !== 1) { termTrue = false; break; }
                }
                if (termTrue) return 1;
            }
            return 0;
        },

        renderRealization: function() {
            if (typeof document === 'undefined') return;
            const card = document.getElementById('kmapRealizationSection');
            if (!card) return;

            const data = this.currentCircuitData;
            if (!data) {
                this.solve();
                return;
            }

            // 1. Simülatör Giriş Butonlarını Güncelle
            const inContainer = document.getElementById('kmapSimInputsContainer');
            if (inContainer) {
                let inHtml = '';
                data.varNames.forEach(v => {
                    const val = this.simInputs[v] ? 1 : 0;
                    inHtml += '<button type="button" class="kmap-sim-btn ' + (val ? 'is-high' : '') + '" onclick="KMapModule.toggleSimInput(\'' + v + '\')" title="Sinyali tersine çevirmek için tıklayın">' +
                        v + ' = ' + val +
                    '</button>';
                });
                inContainer.innerHTML = inHtml;
            }

            // 2. Çıkış Probu (LED Badge) Güncelle
            const outProbeVal = this.evaluateSimOutput();
            const probeBadge = document.getElementById('kmapProbeValBadge');
            if (probeBadge) {
                probeBadge.className = 'probe-val ' + (outProbeVal ? 'val-1' : 'val-0');
                probeBadge.textContent = outProbeVal ? '1 (HIGH / VCC)' : '0 (LOW / GND)';
            }

            // 3. Mod Panellerini Aç/Kapat
            const svgWrap = document.getElementById('kmapCircuitSvgContainer');
            const bomWrap = document.getElementById('kmapBomContainer');
            const hdlWrap = document.getElementById('kmapHdlContainer');
            const simPanel = document.getElementById('kmapSimPanel');

            if (this.realizationMode === 'and-or' || this.realizationMode === 'nand-nand') {
                if (simPanel) simPanel.style.display = 'flex';
                if (svgWrap) {
                    svgWrap.style.display = 'flex';
                    this.renderCircuitSvg(outProbeVal);
                }
                if (bomWrap) bomWrap.style.display = 'none';
                if (hdlWrap) hdlWrap.style.display = 'none';
            } else if (this.realizationMode === 'bom') {
                if (simPanel) simPanel.style.display = 'none';
                if (svgWrap) svgWrap.style.display = 'none';
                if (bomWrap) {
                    bomWrap.style.display = 'block';
                    this.renderBomTable();
                }
                if (hdlWrap) hdlWrap.style.display = 'none';
            } else if (this.realizationMode === 'hdl') {
                if (simPanel) simPanel.style.display = 'none';
                if (svgWrap) svgWrap.style.display = 'none';
                if (bomWrap) bomWrap.style.display = 'none';
                if (hdlWrap) {
                    hdlWrap.style.display = 'block';
                    this.renderHdlCode();
                }
            }
        },

        renderCircuitSvg: function(outProbeVal) {
            const svgWrap = document.getElementById('kmapCircuitSvgContainer');
            if (!svgWrap) return;

            const data = this.currentCircuitData;
            if (!data) return;

            const isNand = this.realizationMode === 'nand-nand';
            const N = data.varNames.length;
            const M = data.essentialImplicants.length;

            const defs = '<defs>' +
                '<filter id="kmapNeonGlow" x="-20%" y="-20%" width="140%" height="140%">' +
                    '<feGaussianBlur stdDeviation="2.5" result="blur"/>' +
                    '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>' +
                '</filter>' +
            '</defs>';

            if (data.isZero) {
                const svg = '<svg viewBox="0 0 740 180" style="width:100%;max-width:740px;height:auto;" xmlns="http://www.w3.org/2000/svg">' +
                    defs +
                    '<rect width="740" height="180" rx="8" fill="#090d16"/>' +
                    '<line x1="370" y1="50" x2="370" y2="85" stroke="#64748b" stroke-width="2"/>' +
                    '<line x1="345" y1="85" x2="395" y2="85" stroke="#64748b" stroke-width="3"/>' +
                    '<line x1="353" y1="92" x2="387" y2="92" stroke="#64748b" stroke-width="2.5"/>' +
                    '<line x1="361" y1="99" x2="379" y2="99" stroke="#64748b" stroke-width="2"/>' +
                    '<text x="370" y="120" fill="#94a3b8" font-size="11" text-anchor="middle" font-weight="bold">GND (0V)</text>' +
                    '<line x1="370" y1="85" x2="620" y2="85" stroke="#ef4444" stroke-width="2"/>' +
                    '<circle cx="620" cy="85" r="14" fill="rgba(239,68,68,0.15)" stroke="#ef4444" stroke-width="2"/>' +
                    '<text x="620" y="89" text-anchor="middle" font-size="11" font-weight="bold" fill="#fca5a5">0</text>' +
                    '<text x="645" y="89" fill="#f8fafc" font-size="13" font-weight="700">F = 0 (GND)</text>' +
                    '<text x="370" y="155" fill="#64748b" font-size="12" text-anchor="middle">Tüm mintermler 0 — Mantık kapısı gerekmez, çıkış doğrudan toprağa bağlıdır.</text>' +
                '</svg>';
                svgWrap.innerHTML = svg;
                return;
            }

            if (data.isOne) {
                const svg = '<svg viewBox="0 0 740 180" style="width:100%;max-width:740px;height:auto;" xmlns="http://www.w3.org/2000/svg">' +
                    defs +
                    '<rect width="740" height="180" rx="8" fill="#090d16"/>' +
                    '<line x1="370" y1="55" x2="370" y2="85" stroke="#10b981" stroke-width="2" filter="url(#kmapNeonGlow)"/>' +
                    '<polygon points="360,55 380,55 370,40" fill="#10b981"/>' +
                    '<text x="370" y="34" fill="#34d399" font-size="11" text-anchor="middle" font-weight="bold">+5V (VCC)</text>' +
                    '<line x1="370" y1="85" x2="620" y2="85" stroke="#10b981" stroke-width="2" filter="url(#kmapNeonGlow)"/>' +
                    '<circle cx="620" cy="85" r="14" fill="rgba(16,185,129,0.2)" stroke="#10b981" stroke-width="2"/>' +
                    '<text x="620" y="89" text-anchor="middle" font-size="11" font-weight="bold" fill="#34d399">1</text>' +
                    '<text x="645" y="89" fill="#f8fafc" font-size="13" font-weight="700">F = 1 (VCC)</text>' +
                    '<text x="370" y="155" fill="#64748b" font-size="12" text-anchor="middle">Tüm mintermler 1 — Mantık kapısı gerekmez, çıkış doğrudan besleme gerilimine bağlıdır.</text>' +
                '</svg>';
                svgWrap.innerHTML = svg;
                return;
            }

            if (M === 0) {
                svgWrap.innerHTML = '<div style="padding:1.5rem;color:#94a3b8;text-align:center;">Lojik devre şeması oluşturulamadı.</div>';
                return;
            }

            // Genel Durum: 1 veya daha fazla terim (M >= 1)
            const yBottom = 85 + (M - 1) * 65 + 35;
            const svgH = Math.max(260, yBottom + 40);

            let svg = '<svg viewBox="0 0 740 ' + svgH + '" style="width:100%;max-width:740px;height:auto;" xmlns="http://www.w3.org/2000/svg">' + defs;
            svg += '<rect width="740" height="' + svgH + '" rx="8" fill="#090d16"/>';

            // Mod Etiketi (Sağ üst köşe)
            svg += '<text x="720" y="24" text-anchor="end" font-size="10" font-weight="bold" fill="#38bdf8">' +
                (isNand ? '⚡ EVRENSEL NAND-NAND SENTEZİ' : '⚡ KLASİK SOP (AND-OR) DEVRESİ') +
            '</text>';

            // Dikey Giriş Rayları (Vertical Bus Rails)
            const busX = [];
            for (let i = 0; i < N; i++) {
                const v = data.varNames[i];
                const inVal = this.simInputs[v] ? 1 : 0;
                const notVal = inVal ? 0 : 1;
                const xTrue = 40 + i * 58;
                const xFalse = xTrue + 26;
                busX.push({ v: v, xTrue: xTrue, xFalse: xFalse, inVal: inVal, notVal: notVal });

                const colTrue = inVal ? '#10b981' : '#334155';
                const colFalse = notVal ? '#10b981' : '#334155';
                const glowTrue = inVal ? ' filter="url(#kmapNeonGlow)"' : '';
                const glowFalse = notVal ? ' filter="url(#kmapNeonGlow)"' : '';

                // Giriş Terminal Butonu
                svg += '<g style="cursor:pointer;" onclick="KMapModule.toggleSimInput(\'' + v + '\')">';
                svg += '<rect x="' + (xTrue - 12) + '" y="12" width="24" height="20" rx="4" fill="' + (inVal ? 'rgba(16,185,129,0.2)' : 'rgba(30,41,59,0.8)') + '" stroke="' + (inVal ? '#10b981' : '#475569') + '" stroke-width="1.5"/>';
                svg += '<text x="' + xTrue + '" y="26" text-anchor="middle" font-size="11" font-weight="bold" fill="' + (inVal ? '#34d399' : '#cbd5e1') + '">' + v + '</text>';
                svg += '</g>';

                // Üst tel ve NOT Kapısı (İnvertör)
                svg += '<line x1="' + xTrue + '" y1="32" x2="' + xTrue + '" y2="70" stroke="' + colTrue + '" stroke-width="2"' + glowTrue + '/>';
                svg += '<circle cx="' + xTrue + '" cy="50" r="2.5" fill="' + colTrue + '"/>';
                svg += '<line x1="' + xTrue + '" y1="50" x2="' + (xTrue + 6) + '" y2="50" stroke="' + colTrue + '" stroke-width="2"' + glowTrue + '/>';

                // NOT üçgeni ve balonu
                svg += '<polygon points="' + (xTrue + 6) + ',44 ' + (xTrue + 16) + ',50 ' + (xTrue + 6) + ',56" fill="#1e293b" stroke="' + colTrue + '" stroke-width="1.5"/>';
                svg += '<circle cx="' + (xTrue + 19) + '" cy="50" r="2.5" fill="#1e293b" stroke="' + colFalse + '" stroke-width="1.5"/>';
                svg += '<line x1="' + (xTrue + 21.5) + '" y1="50" x2="' + xFalse + '" y2="50" stroke="' + colFalse + '" stroke-width="2"' + glowFalse + '/>';

                // Dikey hatlar
                svg += '<line x1="' + xTrue + '" y1="50" x2="' + xTrue + '" y2="' + yBottom + '" stroke="' + colTrue + '" stroke-width="2"' + glowTrue + '/>';
                svg += '<line x1="' + xFalse + '" y1="50" x2="' + xFalse + '" y2="' + yBottom + '" stroke="' + colFalse + '" stroke-width="2"' + glowFalse + '/>';

                // Alt etiketler
                svg += '<text x="' + xTrue + '" y="' + (yBottom + 14) + '" text-anchor="middle" font-size="9" font-weight="bold" fill="' + (inVal ? '#34d399' : '#64748b') + '">' + v + '</text>';
                svg += '<text x="' + xFalse + '" y="' + (yBottom + 14) + '" text-anchor="middle" font-size="9" font-weight="bold" fill="' + (notVal ? '#34d399' : '#64748b') + '">' + v + '\'</text>';
            }

            // 1. Kademe Kapıları (AND veya NAND)
            const level1Outputs = [];
            const xGateIn = 370;
            const gateW = 42;
            const xGateOut = isNand ? (xGateIn + gateW + 6) : (xGateIn + gateW);

            for (let j = 0; j < M; j++) {
                const yGate = 95 + j * 65;
                const imp = data.essentialImplicants[j];
                const mask = imp.mask;
                const termName = data.terms[j];

                // Literalleri belirle
                const literals = [];
                for (let b = 0; b < mask.length; b++) {
                    const ch = mask[b];
                    if (ch === '0') {
                        literals.push({ v: data.varNames[b], isNot: true, xBus: busX[b].xFalse, val: busX[b].notVal });
                    } else if (ch === '1') {
                        literals.push({ v: data.varNames[b], isNot: false, xBus: busX[b].xTrue, val: busX[b].inVal });
                    }
                }

                const termActive = literals.every(l => l.val === 1) ? 1 : 0;
                const gateOutVal = isNand ? (termActive ? 0 : 1) : termActive;
                level1Outputs.push({ y: yGate, active: termActive, outVal: gateOutVal });

                // Giriş pinleri ve bağlantı telleri
                const K = literals.length;
                for (let k = 0; k < K; k++) {
                    const lit = literals[k];
                    let yPin = yGate;
                    if (K === 2) yPin = yGate + (k === 0 ? -8 : 8);
                    else if (K === 3) yPin = yGate + (k === 0 ? -12 : k === 1 ? 0 : 12);
                    else if (K === 4) yPin = yGate + (k === 0 ? -14 : k === 1 ? -5 : k === 2 ? 5 : 14);

                    const litCol = lit.val ? '#10b981' : '#334155';
                    const litGlow = lit.val ? ' filter="url(#kmapNeonGlow)"' : '';

                    // Ray üzerindeki lehim noktası
                    svg += '<circle cx="' + lit.xBus + '" cy="' + yPin + '" r="3" fill="' + (lit.val ? '#10b981' : '#64748b') + '"/>';
                    // Kapıya giden yatay tel
                    svg += '<line x1="' + lit.xBus + '" y1="' + yPin + '" x2="' + xGateIn + '" y2="' + yPin + '" stroke="' + litCol + '" stroke-width="2"' + litGlow + '/>';
                }

                // Terim ismi başlığı
                svg += '<text x="' + (xGateIn + 21) + '" y="' + (yGate - 22) + '" text-anchor="middle" font-size="10" font-family="JetBrains Mono, monospace" font-weight="bold" fill="#38bdf8">' + termName + '</text>';

                // Kapı Gövdesi (ANSI AND şekli)
                const gCol = termActive ? '#10b981' : '#475569';
                const gGlow = termActive ? ' filter="url(#kmapNeonGlow)"' : '';
                svg += '<path d="M ' + xGateIn + ' ' + (yGate - 16) + ' H ' + (xGateIn + 22) + ' A 16 16 0 0 1 ' + (xGateIn + 22) + ' ' + (yGate + 16) + ' H ' + xGateIn + ' Z" fill="#131b2e" stroke="' + gCol + '" stroke-width="1.8"' + gGlow + '/>';
                if (isNand) {
                    svg += '<circle cx="' + (xGateIn + gateW + 3) + '" cy="' + yGate + '" r="3" fill="#131b2e" stroke="' + (gateOutVal ? '#10b981' : '#475569') + '" stroke-width="1.5"/>';
                }
                svg += '<text x="' + (xGateIn + 16) + '" y="' + (yGate + 4) + '" text-anchor="middle" font-size="8.5" font-weight="bold" fill="#94a3b8">' + (isNand ? 'NAND' : 'AND') + '</text>';
            }

            // 2. Kademe (Toplama Kapısı: OR veya NAND)
            const yOr = 95 + ((M - 1) / 2) * 65;
            if (M === 1) {
                // Tek terim varsa OR kapısına gerek yok, doğrudan çıkışa bağlanır
                const outWireCol = outProbeVal ? '#10b981' : '#334155';
                const outGlow = outProbeVal ? ' filter="url(#kmapNeonGlow)"' : '';
                svg += '<line x1="' + xGateOut + '" y1="' + yOr + '" x2="650" y2="' + yOr + '" stroke="' + outWireCol + '" stroke-width="2"' + outGlow + '/>';
            } else {
                const xOr = 550;
                const hOr = Math.max(50, M * 22 + 8);
                const xOrApex = isNand ? (xOr + 50) : (xOr + 44);

                for (let j = 0; j < M; j++) {
                    const l1 = level1Outputs[j];
                    const yOrPin = yOr - ((M - 1) * 11) + j * 22;
                    const wCol = (isNand ? l1.outVal : l1.active) ? '#10b981' : '#334155';
                    const wGlow = (isNand ? l1.outVal : l1.active) ? ' filter="url(#kmapNeonGlow)"' : '';
                    const xMid = 450 + (j % 3) * 18;

                    svg += '<path d="M ' + xGateOut + ' ' + l1.y + ' H ' + xMid + ' V ' + yOrPin + ' H ' + xOr + '" fill="none" stroke="' + wCol + '" stroke-width="1.8"' + wGlow + '/>';
                }

                // OR / NAND Kapısı Gövdesi
                const orCol = outProbeVal ? '#10b981' : '#475569';
                const orGlow = outProbeVal ? ' filter="url(#kmapNeonGlow)"' : '';
                if (!isNand) {
                    // ANSI OR Kapısı (kavisli sırt ve sivri tepe)
                    svg += '<path d="M ' + xOr + ' ' + (yOr - hOr/2) + ' Q ' + (xOr + 12) + ' ' + yOr + ' ' + xOr + ' ' + (yOr + hOr/2) + ' Q ' + (xOr + 28) + ' ' + (yOr + hOr/2 - 4) + ' ' + (xOr + 44) + ' ' + yOr + ' Q ' + (xOr + 28) + ' ' + (yOr - hOr/2 + 4) + ' ' + xOr + ' ' + (yOr - hOr/2) + ' Z" fill="#131b2e" stroke="' + orCol + '" stroke-width="1.8"' + orGlow + '/>';
                    svg += '<text x="' + (xOr + 20) + '" y="' + (yOr + 4) + '" text-anchor="middle" font-size="9" font-weight="bold" fill="#94a3b8">OR</text>';
                } else {
                    // NAND Kapısı (Evrensel 2. Kademe)
                    svg += '<path d="M ' + xOr + ' ' + (yOr - hOr/2) + ' H ' + (xOr + 26) + ' A ' + (hOr/2) + ' ' + (hOr/2) + ' 0 0 1 ' + (xOr + 26) + ' ' + (yOr + hOr/2) + ' H ' + xOr + ' Z" fill="#131b2e" stroke="' + orCol + '" stroke-width="1.8"' + orGlow + '/>';
                    svg += '<circle cx="' + (xOr + 46) + '" cy="' + yOr + '" r="3" fill="#131b2e" stroke="' + orCol + '" stroke-width="1.5"/>';
                    svg += '<text x="' + (xOr + 20) + '" y="' + (yOr + 4) + '" text-anchor="middle" font-size="9" font-weight="bold" fill="#94a3b8">NAND</text>';
                }

                // Çıkış teli
                const outWireCol = outProbeVal ? '#10b981' : '#334155';
                const outGlow = outProbeVal ? ' filter="url(#kmapNeonGlow)"' : '';
                svg += '<line x1="' + xOrApex + '" y1="' + yOr + '" x2="650" y2="' + yOr + '" stroke="' + outWireCol + '" stroke-width="2"' + outGlow + '/>';
            }

            // Çıkış Probu (LED Badge)
            svg += '<circle cx="650" cy="' + yOr + '" r="15" fill="' + (outProbeVal ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.12)') + '" stroke="' + (outProbeVal ? '#10b981' : '#ef4444') + '" stroke-width="2"/>';
            svg += '<text x="650" y="' + (yOr + 4) + '" text-anchor="middle" font-size="11" font-weight="bold" fill="' + (outProbeVal ? '#34d399' : '#f87171') + '">' + outProbeVal + '</text>';
            svg += '<text x="674" y="' + (yOr + 4) + '" fill="#f8fafc" font-size="14" font-weight="700">F</text>';
            svg += '<text x="674" y="' + (yOr + 18) + '" fill="' + (outProbeVal ? '#34d399' : '#94a3b8') + '" font-size="9" font-weight="600">' + (outProbeVal ? 'HIGH (1)' : 'LOW (0)') + '</text>';

            svg += '</svg>';
            svgWrap.innerHTML = svg;
        },

        renderBomTable: function() {
            const bomWrap = document.getElementById('kmapBomContainer');
            if (!bomWrap) return;

            const data = this.currentCircuitData;
            if (!data) return;

            if (data.isZero || data.isOne) {
                bomWrap.innerHTML = '<div style="padding:1rem;color:#94a3b8;font-size:0.9rem;">' +
                    '<i class="fas fa-info-circle"></i> Çıkış sabit <strong>' + (data.isOne ? '1 (VCC)' : '0 (GND)') + '</strong> seviyesinde olduğu için hiçbir aktif lojik entegreye (IC) gerek yoktur.' +
                '</div>';
                return;
            }

            const M = data.essentialImplicants.length;
            let notCount = 0;
            const notVars = new Set();
            data.essentialImplicants.forEach(imp => {
                for (let b = 0; b < imp.mask.length; b++) {
                    if (imp.mask[b] === '0') notVars.add(data.varNames[b]);
                }
            });
            notCount = notVars.size;

            let and2 = 0, and3 = 0, and4 = 0;
            data.essentialImplicants.forEach(imp => {
                const k = imp.mask.replace(/-/g, '').length;
                if (k <= 2) and2++;
                else if (k === 3) and3++;
                else if (k >= 4) and4++;
            });

            const orCount = M > 1 ? (M - 1) : 0;
            const rows = [];
            let totalChips = 0;
            let totalGates = 0;

            if (notCount > 0) {
                const chips = Math.ceil(notCount / 6);
                totalChips += chips;
                totalGates += notCount;
                rows.push({
                    code: '74HC04',
                    desc: 'Hex Inverter (6x NOT Kapısı)',
                    req: notCount + ' adet NOT (' + Array.from(notVars).map(v => v + "'").join(', ') + ')',
                    chips: chips + ' adet (DIP-14)',
                    pins: 'Vcc: Pin 14, GND: Pin 7'
                });
            }

            if (and2 > 0) {
                const chips = Math.ceil(and2 / 4);
                totalChips += chips;
                totalGates += and2;
                rows.push({
                    code: '74HC08',
                    desc: 'Quad 2-Girişli VE (AND) Kapısı',
                    req: and2 + ' adet 2-Girişli AND',
                    chips: chips + ' adet (DIP-14)',
                    pins: 'Vcc: Pin 14, GND: Pin 7'
                });
            }

            if (and3 > 0) {
                const chips = Math.ceil(and3 / 3);
                totalChips += chips;
                totalGates += and3;
                rows.push({
                    code: '74HC11',
                    desc: 'Triple 3-Girişli VE (AND) Kapısı',
                    req: and3 + ' adet 3-Girişli AND',
                    chips: chips + ' adet (DIP-14)',
                    pins: 'Vcc: Pin 14, GND: Pin 7'
                });
            }

            if (and4 > 0) {
                const chips = Math.ceil(and4 / 2);
                totalChips += chips;
                totalGates += and4;
                rows.push({
                    code: '74HC21',
                    desc: 'Dual 4-Girişli VE (AND) Kapısı',
                    req: and4 + ' adet 4-Girişli AND',
                    chips: chips + ' adet (DIP-14)',
                    pins: 'Vcc: Pin 14, GND: Pin 7'
                });
            }

            if (orCount > 0) {
                const chips = Math.ceil(orCount / 4);
                totalChips += chips;
                totalGates += orCount;
                rows.push({
                    code: '74HC32',
                    desc: 'Quad 2-Girişli VEYA (OR) Kapısı',
                    req: orCount + ' adet 2-Girişli OR (Kademeli)',
                    chips: chips + ' adet (DIP-14)',
                    pins: 'Vcc: Pin 14, GND: Pin 7'
                });
            }

            let html = '<div style="margin-bottom:0.75rem;font-size:0.85rem;color:#94a3b8;">' +
                '<i class="fas fa-boxes"></i> Standart <strong>TTL 74HC Serisi</strong> lojik entegreler ile breadboard veya PCB üzerinde devre kurma gereksinimleri:' +
            '</div>';

            html += '<table class="kmap-bom-table"><thead><tr>' +
                '<th>Entegre Kodu</th><th>Tip / Açıklama</th><th>Gereken Kapı</th><th>Paket Sayısı</th><th>Standart Besleme</th>' +
            '</tr></thead><tbody>';

            rows.forEach(r => {
                html += '<tr>' +
                    '<td><strong style="color:#38bdf8;font-family:JetBrains Mono,monospace;">' + r.code + '</strong></td>' +
                    '<td>' + r.desc + '</td>' +
                    '<td>' + r.req + '</td>' +
                    '<td><span style="color:#34d399;font-weight:700;">' + r.chips + '</span></td>' +
                    '<td style="font-size:0.78rem;color:#94a3b8;">' + r.pins + '</td>' +
                '</tr>';
            });
            html += '</tbody></table>';

            html += '<div class="kmap-bom-summary">' +
                '<div class="kmap-bom-stat"><div class="kmap-bom-stat-label">Toplam DIP Entegre</div><div class="kmap-bom-stat-val">' + totalChips + ' Adet</div></div>' +
                '<div class="kmap-bom-stat"><div class="kmap-bom-stat-label">Toplam Mantık Kapısı</div><div class="kmap-bom-stat-val">' + totalGates + ' Kapı</div></div>' +
                '<div class="kmap-bom-stat"><div class="kmap-bom-stat-label">Tahmini Transistör</div><div class="kmap-bom-stat-val">~' + (totalGates * 4) + ' CMOS</div></div>' +
                '<div class="kmap-bom-stat"><div class="kmap-bom-stat-label">Tavsiye Besleme</div><div class="kmap-bom-stat-val">+5V DC</div></div>' +
            '</div>';

            bomWrap.innerHTML = html;
        },

        renderHdlCode: function() {
            const hdlWrap = document.getElementById('kmapHdlContainer');
            if (!hdlWrap) return;

            const data = this.currentCircuitData;
            if (!data) return;

            const mode = this.hdlMode || 'verilog';
            const ports = data.varNames;

            let code = '';
            if (mode === 'verilog') {
                code += '// ==============================================================\n';
                code += '// EEM Rehber / Devrem Studio - Minimal SOP Lojik Sentezi\n';
                code += '// Girisler : ' + ports.join(', ') + '\n';
                code += '// Cikis    : F\n';
                code += '// ==============================================================\n';
                code += 'module kmap_logic (\n';
                ports.forEach(p => {
                    code += '    input  wire ' + p + ',\n';
                });
                code += '    output wire F\n';
                code += ');\n\n';

                if (data.isZero) {
                    code += '    assign F = 1\'b0;\n';
                } else if (data.isOne) {
                    code += '    assign F = 1\'b1;\n';
                } else {
                    const verilogTerms = data.essentialImplicants.map(imp => {
                        const parts = [];
                        for (let b = 0; b < imp.mask.length; b++) {
                            const ch = imp.mask[b];
                            if (ch === '0') parts.push('~' + data.varNames[b]);
                            else if (ch === '1') parts.push(data.varNames[b]);
                        }
                        return '(' + parts.join(' & ') + ')';
                    });
                    code += '    // Minimal SOP Boolean Atamasi\n';
                    code += '    assign F = ' + verilogTerms.join('\n             | ') + ';\n';
                }
                code += '\nendmodule\n';
            } else {
                code += '-- ==============================================================\n';
                code += '-- EEM Rehber / Devrem Studio - Minimal SOP Lojik Sentezi\n';
                code += '-- Girisler : ' + ports.join(', ') + '\n';
                code += '-- Cikis    : F\n';
                code += '-- ==============================================================\n';
                code += 'library IEEE;\n';
                code += 'use IEEE.STD_LOGIC_1164.ALL;\n\n';
                code += 'entity kmap_logic is\n';
                code += '    Port (\n';
                ports.forEach(p => {
                    code += '        ' + p + ' : in  std_logic;\n';
                });
                code += '        F : out std_logic\n';
                code += '    );\n';
                code += 'end entity kmap_logic;\n\n';
                code += 'architecture Behavioral of kmap_logic is\n';
                code += 'begin\n';

                if (data.isZero) {
                    code += '    F <= \'0\';\n';
                } else if (data.isOne) {
                    code += '    F <= \'1\';\n';
                } else {
                    const vhdlTerms = data.essentialImplicants.map(imp => {
                        const parts = [];
                        for (let b = 0; b < imp.mask.length; b++) {
                            const ch = imp.mask[b];
                            if (ch === '0') parts.push('not ' + data.varNames[b]);
                            else if (ch === '1') parts.push(data.varNames[b]);
                        }
                        return '(' + parts.join(' and ') + ')';
                    });
                    code += '    -- Minimal SOP Boolean Atamasi\n';
                    code += '    F <= ' + vhdlTerms.join('\n         or ') + ';\n';
                }
                code += 'end architecture Behavioral;\n';
            }

            let html = '<div class="kmap-hdl-head">' +
                '<div class="kmap-hdl-tabs">' +
                    '<button type="button" class="kmap-hdl-tab-btn ' + (mode === 'verilog' ? 'active' : '') + '" onclick="KMapModule.setHdlMode(\'verilog\')">Verilog (IEEE 1364)</button>' +
                    '<button type="button" class="kmap-hdl-tab-btn ' + (mode === 'vhdl' ? 'active' : '') + '" onclick="KMapModule.setHdlMode(\'vhdl\')">VHDL (IEEE 1076)</button>' +
                '</div>' +
                '<button type="button" class="kmap-copy-btn" id="kmapCopyBtn" onclick="KMapModule.copyHdlCode()">' +
                    '<i class="fas fa-copy"></i> Kodu Kopyala' +
                '</button>' +
            '</div>';

            html += '<pre class="kmap-hdl-code" id="kmapHdlCodeText"><code>' + code + '</code></pre>';
            hdlWrap.innerHTML = html;
        }
    };

    KMapModule.init();
    window.KMapModule = KMapModule;

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                if (document.getElementById('kmapGridContainer')) {
                    KMapModule.render();
                    KMapModule.solve();
                }
            });
        } else {
            if (document.getElementById('kmapGridContainer')) {
                KMapModule.render();
                KMapModule.solve();
            }
        }
    }

})(window);
