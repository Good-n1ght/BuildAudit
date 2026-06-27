// 全局状态
var DB = null;
var selectedMap = null, activeKey = null, compareOpen = null;

// 品类定义
const CATEGORIES = {
    cpu: { label: 'CPU', icon: '⚡', color: '#667eea', weight: 2.5 },
    gpu: { label: '显卡', icon: '🎮', color: '#f093fb', weight: 2.5 },
    motherboard: { label: '主板', icon: '🔧', color: '#4facfe', weight: 1.0 },
    memory: { label: '内存', icon: '💾', color: '#43e97b', weight: 1.0 },
    ssd: { label: 'SSD', icon: '💿', color: '#fa709a', weight: 1.0 },
    psu: { label: '电源', icon: '🔌', color: '#fee140', weight: 0.8 },
    cooler: { label: '散热器', icon: '❄️', color: '#30cfd0', weight: 0.7 },
    case: { label: '机箱', icon: '🖥️', color: '#a8edea', weight: 0.5 },
};

// 各品类列定义
const COLUMNS = {
    cpu: [
        { key: 'name', label: '型号', flex: 3 },
        { key: 'brand', label: '品牌' },
        { key: 'socket', label: '接口' },
        { key: 'cores', label: '核心' },
        { key: 'threads', label: '线程' },
        { key: 'base_clock', label: '基频(GHz)' },
        { key: 'boost_clock', label: '睿频(GHz)' },
        { key: 'tdp', label: 'TDP' },
        { key: 'architecture', label: '架构' },
        { key: 'memory_support', label: '内存' },
        { key: 'igpu', label: '核显', fmt: v => v ? '有' : '无' },
        { key: 'score', label: '评分', fmt: (v, row) => scoreLabel(row.tier_score) },
    ],
    gpu: [
        { key: 'name', label: '型号', flex: 3 },
        { key: 'brand', label: '品牌' },
        { key: 'chip', label: '核心代号' },
        { key: 'vram', label: '显存' },
        { key: 'memory_type', label: '显存类型' },
        { key: 'bus_width', label: '位宽' },
        { key: 'tdp', label: 'TDP' },
        { key: 'architecture', label: '架构' },
        { key: 'score', label: '评分', fmt: (v, row) => scoreLabel(row.tier_score) },
    ],
    motherboard: [
        { key: 'name', label: '型号', flex: 3 },
        { key: 'brand', label: '品牌' },
        { key: 'chipset', label: '芯片组' },
        { key: 'socket', label: '接口' },
        { key: 'form_factor', label: '板型' },
        { key: 'memory_type', label: '内存类型' },
        { key: 'max_memory', label: '最大内存(GB)' },
        { key: 'pcie_gen', label: 'PCIe' },
        { key: 'vrm_phases', label: '供电相数' },
        { key: 'm2_slots', label: 'M.2槽' },
        { key: 'score', label: '评分', fmt: (v, row) => scoreLabel(row.tier_score) },
    ],
    memory: [
        { key: 'name', label: '型号', flex: 3 },
        { key: 'brand', label: '品牌' },
        { key: 'type', label: '类型' },
        { key: 'speed', label: '频率(MHz)' },
        { key: 'capacity', label: '容量' },
        { key: 'timing', label: '时序' },
        { key: 'rgb', label: 'RGB', fmt: v => v ? '是' : '否' },
        { key: 'score', label: '评分', fmt: (v, row) => scoreLabel(row.tier_score) },
    ],
    ssd: [
        { key: 'name', label: '型号', flex: 3 },
        { key: 'brand', label: '品牌' },
        { key: 'capacity', label: '容量' },
        { key: 'interface', label: '接口' },
        { key: 'seq_read', label: '顺序读(MB/s)' },
        { key: 'seq_write', label: '顺序写(MB/s)' },
        { key: 'nand_type', label: '颗粒' },
        { key: 'score', label: '评分', fmt: (v, row) => scoreLabel(row.tier_score) },
    ],
    psu: [
        { key: 'name', label: '型号', flex: 3 },
        { key: 'brand', label: '品牌' },
        { key: 'wattage', label: '功率(W)' },
        { key: 'efficiency', label: '认证' },
        { key: 'modular', label: '模组' },
        { key: 'fan_size', label: '风扇' },
        { key: 'score', label: '评分', fmt: (v, row) => scoreLabel(row.tier_score) },
    ],
    cooler: [
        { key: 'name', label: '型号', flex: 3 },
        { key: 'brand', label: '品牌' },
        { key: 'cooler_type', label: '类型' },
        { key: 'radiator_size', label: '规格' },
        { key: 'tdp', label: '解热(TDP)' },
        { key: 'score', label: '评分', fmt: (v, row) => scoreLabel(row.tier_score) },
    ],
    case: [
        { key: 'name', label: '型号', flex: 3 },
        { key: 'brand', label: '品牌' },
        { key: 'form_factor', label: '兼容板型' },
        { key: 'max_gpu_length', label: '显卡限长(mm)' },
        { key: 'max_cooler_height', label: '散热限高(mm)' },
        { key: 'fan_slots', label: '风扇位' },
        { key: 'score', label: '评分', fmt: (v, row) => scoreLabel(row.tier_score) },
    ],
};

// 评分等级
function scoreLabel(score) {
    if (score == null || score === undefined) return '—';
    const labels = { 1: '入门', 2: '入门+', 3: '中低端', 4: '中端', 5: '中高端', 6: '中高端+', 7: '高端', 8: '高端+', 9: '旗舰', 10: '至尊' };
    return labels[score] || '—';
}
function scoreClass(score) {
    if (!score) return '';
    if (score <= 2) return 's-low';
    if (score <= 4) return 's-mid';
    if (score <= 6) return 's-midhigh';
    if (score <= 8) return 's-high';
    return 's-top';
}

// ══════════════════ 品牌筛选 — 按品类 ══════════════════
function buildBrandFilter(key) {
    const sel = document.getElementById('brandFilter');
    sel.innerHTML = '<option value="">全部品牌</option>';
    const items = DB[key] || [];
    const brands = [...new Set(items.map(i => i.brand).filter(Boolean))].sort();
    brands.forEach(b => { const o = document.createElement('option'); o.value = b; o.textContent = b; sel.appendChild(o); });
    sel.value = '';
}

function buildSocketFilter(key) {
    const sel = document.getElementById('socketFilter');
    const hasSocket = key === 'cpu' || key === 'motherboard';
    sel.style.display = hasSocket ? '' : 'none';
    if (!hasSocket) return;
    sel.innerHTML = '<option value="">全部接口</option>';
    const items = DB[key] || [];
    const sockets = [...new Set(items.map(i => i.socket).filter(Boolean))].sort();
    sockets.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; sel.appendChild(o); });
    sel.value = '';
}

// ══════════════════ Tabs ══════════════════
function switchTab(key) {
    activeKey = key;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.key === key));
    buildBrandFilter(key);
    buildSocketFilter(key);
    document.getElementById('searchInput').value = '';
    render();
}

// ══════════════════ 搜索 & 筛选 ══════════════════
function onSearch() { render(); }
function onBrandChange() { render(); }
function onSocketChange() { render(); }

function filterItems(key) {
    let items = DB[key] || [];
    const q = document.getElementById('searchInput').value.toLowerCase();
    const brand = document.getElementById('brandFilter').value;
    const socket = document.getElementById('socketFilter').value;
    if (q) items = items.filter(i => i.name && i.name.toLowerCase().includes(q));
    if (brand) items = items.filter(i => i.brand === brand);
    if (socket) items = items.filter(i => i.socket === socket);
    return items;
}

// ══════════════════ 多选对比 ══════════════════
selectedMap = {}; // {categoryKey: Set<originalIndex>}
activeKey = 'cpu';

function toggleSelect(key, idx) {
    if (!selectedMap[key]) selectedMap[key] = new Set();
    const sel = selectedMap[key];
    sel.has(idx) ? sel.delete(idx) : sel.add(idx);
    if (sel.size === 0) delete selectedMap[key];
    updateCompareBar();
}

function selectAllChanged(key, checked) {
    if (arguments.length < 2) {
        key = activeKey;
        checked = document.getElementById('selectAllCb').checked;
    }
    const items = filterItems(key);
    if (checked) {
        if (!selectedMap[key]) selectedMap[key] = new Set();
        items.forEach((_, i) => selectedMap[key].add(i));
    } else {
        delete selectedMap[key];
    }
    updateCompareBar();
}

function clearSelection() {
    selectedMap = {};
    updateCompareBar();
    const sec = document.getElementById('compareSection');
    if (sec) sec.style.display = 'none';
    render();
}

function getSelectedItems() {
    const result = [];
    for (const [key, idxSet] of Object.entries(selectedMap)) {
        const items = filterItems(key);
        for (const idx of idxSet) {
            if (idx < items.length) result.push({ key, item: items[idx] });
        }
    }
    return result;
}

compareOpen = false;

function updateCompareBar() {
    const bar = document.getElementById('compareBar');
    const cntEl = document.getElementById('selectedCount');
    const btnCmp = document.getElementById('btnStartCompare');
    const btnBench = document.getElementById('btnBenchmark');
    const btnRig = document.getElementById('btnRigScore');
    const total = Object.values(selectedMap).reduce((s, set) => s + set.size, 0);
    cntEl.textContent = total;
    bar.style.display = total > 0 ? 'flex' : 'none';
    btnCmp.disabled = total < 2;
    btnBench.disabled = total < 1;

    // 装机跑分: 8品类各至少1款
    const rigCategories = ['cpu','gpu','motherboard','memory','ssd','psu','cooler','case'];
    const allPresent = rigCategories.every(k => selectedMap[k] && selectedMap[k].size > 0) && total >= 8;
    btnRig.style.display = allPresent ? '' : 'none';
    btnRig.disabled = !allPresent;
}

// ══════════════════ 跑分功能 ══════════════════
function startBenchmark() {
    const selected = getSelectedItems();
    if (selected.length < 1) return alert('请先勾选至少1款硬件');
    
    const section = document.getElementById('compareSection');
    const list = document.getElementById('compareList');
    let html = '<div class="bench-header"><h3>跑分分析</h3><button class="btn-close" onclick="closeCompare()">×</button></div>';
    html += '<div class="bench-summary">';

    // 按品类分组
    const byCategory = {};
    selected.forEach(({key, item}) => {
        if (!byCategory[key]) byCategory[key] = [];
        byCategory[key].push({key, item});
    });

    for (const [cat, items] of Object.entries(byCategory)) {
        const catLabel = CATEGORIES[cat]?.label || cat;
        html += `<div class="bench-cat"><strong>${catLabel}</strong><div class="bench-items">`;
        items.forEach(({item}) => {
            const score = item.tier_score || 0;
            const stext = scoreLabel(score);
            const scls = scoreClass(score);
            html += `<div class="bench-item">
                <span class="bench-name">${_e(item.name)}</span>
                <span class="bench-score ${scls}">tier ${score} — ${stext}</span>
                <span class="bench-bar"><span class="bench-fill ${scls}" style="width:${score*10}%"></span></span>
            </div>`;
        });
        html += `</div></div>`;
    }

    // 多款同品类对比: 展示参数差异
    for (const [cat, items] of Object.entries(byCategory)) {
        if (items.length < 2) continue;
        const catLabel = CATEGORIES[cat]?.label || cat;
        const cols = COLUMNS[cat] || [];
        html += `<div class="bench-diff"><h4>${catLabel} 参数对比</h4><table class="diff-table"><thead><tr><th>参数</th>`;
        items.forEach(({item}) => html += `<th>${_e(item.name)}</th>`);
        html += `</tr></thead><tbody>`;

        for (const col of cols) {
            if (col.key === 'name' || col.key === 'score') continue;
            const vals = items.map(({item}) => {
                const raw = item[col.key];
                if (col.fmt) {
                    try { return col.fmt(raw, item); } catch(e) { return raw != null ? String(raw) : '—'; }
                }
                if (typeof raw === 'boolean') return raw ? '是' : '否';
                if (raw == null || raw === '') return '—';
                return String(raw);
            });
            const allSame = vals.every(v => v === vals[0]);
            html += `<tr><td>${col.label}</td>`;
            vals.forEach(v => html += allSame ? `<td class="same-cell">${v}</td>` : `<td class="diff-cell">${v}</td>`);
            html += '</tr>';
        }
        html += `</tbody></table></div>`;
    }

    html += '</div>';
    list.innerHTML = html;
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    compareOpen = true;
    updateCompareBar();
}

function calculateRigScore() {
    const selected = getSelectedItems();
    const rigCategories = ['cpu','gpu','motherboard','memory','ssd','psu','cooler','case'];
    const allPresent = rigCategories.every(k => selectedMap[k] && selectedMap[k].size > 0);
    if (!allPresent) return alert('装机跑分需要8大件(CPU/显卡/主板/内存/SSD/电源/散热/机箱)至少各选1款');

    const section = document.getElementById('compareSection');
    const list = document.getElementById('compareList');

    // 收集评分
    const scores = { cpu: [], gpu: [], motherboard: [], memory: [], ssd: [], psu: [], cooler: [], case: [] };
    for (const {key, item} of selected) {
        if (scores[key]) scores[key].push(item.tier_score || 0);
    }

    // 加权平均
    let totalWeighted = 0, totalWeight = 0;
    const details = [];
    for (const cat of rigCategories) {
        if (scores[cat].length === 0) continue;
        const avg = scores[cat].reduce((a,b) => a+b, 0) / scores[cat].length;
        const w = CATEGORIES[cat].weight;
        totalWeighted += avg * w;
        totalWeight += w;
        details.push({ cat, avg: avg.toFixed(1), weight: w, label: CATEGORIES[cat].label, color: CATEGORIES[cat].color });
    }
    const rigScore = totalWeight > 0 ? totalWeighted / totalWeight : 0;
    const rigLabel = scoreLabel(Math.round(rigScore));
    const rigClass = scoreClass(Math.round(rigScore));

    // 各品类分数明细 + 总评
    let html = '<div class="bench-header"><h3>装机综合跑分</h3><button class="btn-close" onclick="closeCompare()">×</button></div>';
    html += '<div class="bench-summary">';
    html += `<div class="rig-header">`;
    html += `<div class="rig-total ${rigClass}">综合评分 <span class="rig-big">${rigScore.toFixed(1)}</span> / 10</div>`;
    html += `<div class="rig-grade ${rigClass}">${rigLabel}</div>`;
    html += `</div>`;
    html += '<div class="rig-details"><h4>各品类评分明细</h4>';
    for (const d of details) {
        const pct = (d.avg / 10 * 100).toFixed(0);
        html += `<div class="rig-row">
            <span class="rig-cat" style="color:${d.color}">${d.label} (权重 ${d.weight})</span>
            <span class="rig-bar-bg"><span class="rig-bar-fill" style="width:${pct}%;background:${d.color}"></span></span>
            <span class="rig-val">${d.avg}</span>
        </div>`;
    }
    html += '</div></div>';

    list.innerHTML = html;
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    compareOpen = true;
}

// ══════════════════ 优劣判断引擎 ══════════════════
const BETTER_RULES = {
    numeric_higher: ['cores','threads','base_clock','boost_clock','max_clock','l3_cache','total_cache',
        'vram','bus_width','max_memory','m2_slots','sata_ports','vrm_phases','vrm_quality_score',
        'speed','frequency','capacity','seq_read','seq_write','read','write','read_mbps','write_mbps','tbw',
        'wattage','tdp_cooling','radiator_size','fan_slots','max_gpu_length','max_cooler_height',
        'fan_count','tower','pcie_gen','tier_score'],
    numeric_lower: ['tdp','timing','cl','noise_level','height'],
    rank_map: {
        memory_type: { DDR5:5, LPDDR5X:4, DDR4:3, DDR3:2, LPDDR5:4 },
        efficiency: { Titanium:7, Platinum:6, Gold:5, Silver:4, Bronze:3, White:2 },
        modular: { '全模组':3, '半模组':2, '非模组':1 },
        nand_type: { SLC:5, MLC:4, TLC:3, QLC:2, PLC:1 },
        interface: { 'PCIe 5.0':5, 'PCIe 4.0':4, 'PCIe 3.0':3, SATA:1 },
        vram_type: { GDDR7:7, GDDR6X:6, GDDR6:5, GDDR5X:4, GDDR5:3, HBM2e:7 },
        architecture: { ArrowLake:10, RaptorLake14:9, RaptorLake13:8, AlderLake:8, Zen5:10, Zen4:8, Zen3:7,
            Ada:10, Ampere:8, RDNA4:9, RDNA3:8, RDNA2:7, RDNA:6, Blackwell:10 },
    },
    boolean_good: ['igpu','has_dram','dram','rgb','unlocked','has_screen'],
};

function parseNumber(v) {
    if (typeof v === 'number') return v;
    if (typeof v !== 'string') return null;
    const m = v.match(/[\d.]+/);
    return m ? parseFloat(m[0]) : null;
}

function rankVal(val, rankMap) {
    if (val == null || val === '' || val === '—') return -1;
    const s = String(val).trim();
    for (const [k, r] of Object.entries(rankMap)) {
        if (s.toLowerCase() === k.toLowerCase() || s.toLowerCase().includes(k.toLowerCase())) return r;
    }
    return -1;
}

function judgeDirection(cat, paramKey, vals, rawArr) {
    const n = vals.length;
    if (n < 2) return Array(n).fill('tie');

    // is_e_waste: lower (false) is better
    if (paramKey === 'is_e_waste') {
        const bs = rawArr.map(v => !!v);
        const bestIsFalse = bs.some(b => !b);
        if (bs.every(b => b === bs[0])) return Array(n).fill('tie');
        return bs.map(b => b ? 'worse' : 'better');
    }

    // Boolean good
    if (BETTER_RULES.boolean_good.includes(paramKey)) {
        const bs = rawArr.map(v => !!v);
        if (bs.every(b => b === bs[0])) return Array(n).fill('tie');
        return bs.map(b => b ? 'better' : 'worse');
    }

    // Numeric higher
    if (BETTER_RULES.numeric_higher.includes(paramKey)) {
        const nums = rawArr.map(v => parseNumber(v));
        const validNums = nums.filter(v => v != null);
        if (validNums.length < 2) return Array(n).fill('tie');
        const maxNum = Math.max(...validNums);
        const minNum = Math.min(...validNums);
        if (maxNum === minNum) return Array(n).fill('tie');
        return nums.map(v => v === maxNum ? 'better' : (v === minNum ? 'worse' : (v != null ? 'tie' : 'tie')));
    }

    // Numeric lower
    if (BETTER_RULES.numeric_lower.includes(paramKey)) {
        const nums = rawArr.map(v => parseNumber(v));
        const validNums = nums.filter(v => v != null);
        if (validNums.length < 2) return Array(n).fill('tie');
        const minNum = Math.min(...validNums);
        const maxNum = Math.max(...validNums);
        if (maxNum === minNum) return Array(n).fill('tie');
        return nums.map(v => v === minNum ? 'better' : (v === maxNum ? 'worse' : (v != null ? 'tie' : 'tie')));
    }

    // Rank maps
    for (const [rankKey, rankMap] of Object.entries(BETTER_RULES.rank_map)) {
        if (paramKey === rankKey) {
            const ranks = rawArr.map(v => rankVal(v, rankMap));
            const validRanks = ranks.filter(r => r >= 0);
            if (validRanks.length < 2) return Array(n).fill('tie');
            const maxR = Math.max(...validRanks);
            const minR = Math.min(...validRanks);
            if (maxR === minR) return Array(n).fill('tie');
            return ranks.map(r => r === maxR ? 'better' : (r === minR ? 'worse' : (r >= 0 ? 'tie' : 'tie')));
        }
    }

    return Array(n).fill('tie');
}

function comparisonSymbol(direction) {
    if (direction === 'better') return '<span class="cmp-better">&#10003;</span>';
    if (direction === 'worse') return '<span class="cmp-worse">&#10007;</span>';
    return '<span class="cmp-tie">=</span>';
}

// ══════════════════ 对比功能 v2 — 优劣判断 ══════════════════
function startCompare() {
    const selected = getSelectedItems();
    if (selected.length < 2) return alert('请至少勾选2款硬件');
    const section = document.getElementById('compareSection');
    const list = document.getElementById('compareList');

    // 收集参数 + 原始值用于优劣判断
    const allKeys = new Map();
    for (const {key, item} of selected) {
        const cols = COLUMNS[key] || [];
        for (const col of cols) {
            if (col.key === 'name') continue;
            const ck = col.key;
            const raw = col.key === 'score' ? item.tier_score : item[col.key];
            if (!allKeys.has(ck)) allKeys.set(ck, { label: col.key === 'score' ? '综合评分' : col.label, items: [], rawItems: [] });
            let displayVal;
            if (col.key === 'score') {
                displayVal = scoreLabel(raw);
            } else if (col.fmt) {
                try { displayVal = col.fmt(raw, item); } catch(e) { displayVal = raw != null ? String(raw) : '—'; }
            } else if (typeof raw === 'boolean') {
                displayVal = raw ? '是' : '否';
            } else {
                displayVal = (raw != null && raw !== '') ? String(raw) : '—';
            }
            allKeys.get(ck).items.push({ cat: key, item, val: displayVal });
            allKeys.get(ck).rawItems.push(raw);
        }
    }

    // 计算每款优胜数
    const n = selected.length;
    const winCounts = Array(n).fill(0);
    const rowResults = [];

    for (const [ck, info] of allKeys) {
        const raws = info.rawItems;
        const vals = info.items.map(i => i.val);
        const cat = info.items[0]?.cat || '';
        const directions = judgeDirection(cat, ck, vals, raws);
        const cells = info.items.map((it, idx) => ({ val: it.val, dir: directions[idx] }));
        rowResults.push({ param: info.label, cells });
        directions.forEach((d, i) => { if (d === 'better') winCounts[i]++; });
    }

    // 构建 HTML
    let html = '<div class="bench-header"><h3>&#9878; 硬件对比 — 优劣分析</h3><button class="btn-close" onclick="closeCompare()">×</button></div>';
    html += '<div class="comp-table-wrap"><table class="comp-table"><thead><tr><th>参数</th>';
    selected.forEach(({key, item}, idx) => {
        const catColor = CATEGORIES[key]?.color || '#666';
        html += `<th style="background:${catColor}22;border-bottom:2px solid ${catColor}">${_e(item.name)}<br><small>${CATEGORIES[key].label}</small></th>`;
    });
    html += '</tr></thead><tbody>';

    for (const row of rowResults) {
        html += `<tr><td class="comp-param">${row.param}</td>`;
        for (const cell of row.cells) {
            const dirClass = cell.dir === 'better' ? 'cell-better' : (cell.dir === 'worse' ? 'cell-worse' : 'cell-tie');
            html += `<td class="${dirClass}">${cell.val} ${comparisonSymbol(cell.dir)}</td>`;
        }
        html += '</tr>';
    }
    html += '</tbody></table></div>';

    // 底部统计 & 推荐
    html += '<div class="comp-summary"><h4>&#9878; 优势统计</h4><div class="comp-stats">';
    selected.forEach(({key, item}, idx) => {
        const catColor = CATEGORIES[key]?.color || '#666';
        html += `<div class="comp-stat-row">
            <span class="comp-stat-name" style="border-left:3px solid ${catColor};padding-left:8px">${_e(item.name)}</span>
            <span class="comp-stat-bar"><span class="comp-stat-fill" style="width:${Math.min(winCounts[idx]*8, 100)}%;background:${catColor}"></span></span>
            <span class="comp-stat-count">领先 <strong>${winCounts[idx]}</strong> 项</span>
        </div>`;
    });
    html += '</div>';

    const maxWins = Math.max(...winCounts);
    const winners = selected.filter((_, i) => winCounts[i] === maxWins);
    if (winners.length === 1) {
        html += `<div class="comp-recommend">&#9758; 综合推荐: <strong>${_e(winners[0].item.name)}</strong> — 领先 ${maxWins} 项参数，综合表现最优</div>`;
    } else if (winners.length > 1 && maxWins > 0) {
        html += `<div class="comp-recommend">&#9758; 各有千秋: ${winners.map(w => _e(w.item.name)).join(' / ')} 均领先 ${maxWins} 项，建议按具体需求选择</div>`;
    } else {
        html += `<div class="comp-recommend">&#9758; 各项参数无显著差异，可根据品牌偏好和价格决定</div>`;
    }
    html += '</div>';

    list.innerHTML = html;
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    compareOpen = true;
}

function closeCompare() {
    document.getElementById('compareSection').style.display = 'none';
    compareOpen = false;
}

// ══════════════════ 渲染 ══════════════════
function render() {
    const key = activeKey;
    const items = filterItems(key);
    const cols = COLUMNS[key] || [];
    const tbody = document.getElementById('tableBody');
    const thead = document.getElementById('tableHead');
    const catInfo = CATEGORIES[key];

    // 表头
    let h = '<tr><th class="cb-col"><input type="checkbox" onchange="selectAllChanged(\'' + key + '\', this.checked)"></th>';
    cols.forEach(c => {
        let style = c.flex ? `style="flex:${c.flex}"` : '';
        h += `<th ${style}>${c.label}</th>`;
    });
    h += '</tr>';
    thead.innerHTML = h;

    // 表体
    tbody.innerHTML = '';
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="' + (cols.length + 1) + '" class="empty-msg">没有匹配的硬件</td></tr>';
    } else {
        items.forEach((item, idx) => {
            const tr = document.createElement('tr');
            const selSet = selectedMap[key];
            const checked = selSet && selSet.has(idx);
            // 电子垃圾标记
            if (item.is_e_waste) tr.classList.add('e-waste');

            let rowHtml = `<td class="cb-col"><input type="checkbox" onchange="toggleSelect('${key}',${idx})" ${checked ? 'checked' : ''}></td>`;
            cols.forEach(c => {
                let raw = item[c.key];
                let cls = 'td-' + c.key;
                if (c.key === 'name') {
                    rowHtml += `<td class="${cls}"><strong>${_e(raw || '')}</strong>${item.is_e_waste ? ' <span class="e-tag">电子垃圾</span>' : ''}${item.notes ? ' <span class="note-tag">' + _e(item.notes) + '</span>' : ''}</td>`;
                } else if (c.key === 'score') {
                    let s = item.tier_score;
                    rowHtml += `<td class="${cls} ${scoreClass(s)}">${s != null ? s : '—'} - ${scoreLabel(s)}</td>`;
                } else if (c.fmt) {
                    try { raw = c.fmt(raw, item); } catch(e) {}
                    rowHtml += `<td class="${cls}">${raw != null ? raw : '—'}</td>`;
                } else if (typeof raw === 'boolean') {
                    rowHtml += `<td class="${cls}">${raw ? '是' : '否'}</td>`;
                } else {
                    rowHtml += `<td class="${cls}">${raw != null ? raw : '—'}</td>`;
                }
            });
            tr.innerHTML = rowHtml;
            tbody.appendChild(tr);
        });
    }

    // 恢复selectAll勾选状态
    const selSet = selectedMap[key];
    const allCb = document.getElementById('selectAllCb');
    if (allCb) {
        if (!selSet || selSet.size === 0) allCb.checked = false;
        else if (selSet.size === items.length && items.length > 0) allCb.checked = true;
        else allCb.indeterminate = true;
    }

    updateCompareBar();
}

function _e(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ══════════════════ 初始化 ══════════════════

(function(){
    var msg = document.getElementById('loadingMsg');
    msg.textContent = '正在加载数据...';
    var t0 = performance.now();
    
    fetch('data.json')
        .then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            msg.textContent = '正在解析数据... (' + (performance.now()-t0).toFixed(0) + 'ms)';
            return r.json();
        })
        .then(function(data) {
            msg.textContent = '正在渲染...';
            try {
                DB = data;
                buildBrandFilter('cpu');
                buildSocketFilter('cpu');
                render();
                msg.style.display = 'none';
                document.getElementById('mainContainer').style.display = 'block';
                document.getElementById('compareBar').style.display = 'flex';
            } catch(e) {
                msg.textContent = '渲染失败: ' + e.message + ' (line ' + e.lineNumber + ')';
                msg.style.color = 'red';
            }
        })
        .catch(function(e) {
            msg.textContent = '加载失败: ' + e.message;
            msg.style.color = 'red';
        });
})();

function init() {}
window.addEventListener('DOMContentLoaded', init);

// render tabs
(function(){
    var tabsEl = document.getElementById('tabs');
    if (!tabsEl) return;
    for (var k in CATEGORIES) {
        var v = CATEGORIES[k];
        var btn = document.createElement('button');
        btn.className = 'tab-btn';
        btn.dataset.key = k;
        btn.textContent = v.icon + ' ' + v.label;
        btn.onclick = function(){ switchTab(this.dataset.key); };
        tabsEl.appendChild(btn);
    }
})();