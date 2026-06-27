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
    // 重置全选复选框状态，避免跨品类污染
    var selectAllCb = document.getElementById('selectAllCb');
    if (selectAllCb) { selectAllCb.checked = false; selectAllCb.indeterminate = false; }
    // 清除搜索防抖定时器，防止延迟的旧 render 覆盖新品类
    if (searchDebounceTimer) { clearTimeout(searchDebounceTimer); searchDebounceTimer = null; }
    render();
}

// ══════════════════ 搜索 & 筛选 ══════════════════
var searchDebounceTimer = null;
function onSearch() {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(function() { render(); }, 200);
}
function onBrandChange() { render(); }
function onSocketChange() { render(); }

function searchTextValue(value) {
    if (value == null) return '';
    if (Array.isArray(value)) return value.map(searchTextValue).join(' ');
    return String(value);
}

function itemSearchText(item) {
    return [
        item.name, item.brand, item.chip, item.chipset, item.notes, item.known_issues,
        item.aliases, item.memory, item.vram, item.memory_type, item.architecture
    ].map(searchTextValue).join(' ').toLowerCase();
}

function filterItems(key) {
    let items = DB[key] || [];
    const q = document.getElementById('searchInput').value.trim().toLowerCase();
    const brand = document.getElementById('brandFilter').value;
    const socket = document.getElementById('socketFilter').value;
    if (q) {
        const terms = q.split(/\s+/).filter(Boolean);
        items = items.filter(i => terms.every(term => itemSearchText(i).includes(term)));
    }
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
    const filteredItems = filterItems(key);
    const allItems = DB[key] || [];
    if (checked) {
        if (!selectedMap[key]) selectedMap[key] = new Set();
        filteredItems.forEach(function(item) {
            var idx = allItems.indexOf(item);
            if (idx !== -1) selectedMap[key].add(idx);
        });
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
        const items = DB[key] || [];
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

    // 装机跑分: 7品类各至少1款
    const rigCategories = ['cpu','gpu','motherboard','memory','ssd','psu','cooler'];
    const allPresent = rigCategories.every(k => selectedMap[k] && selectedMap[k].size > 0) && total >= 7;
    btnRig.style.display = allPresent ? '' : 'none';
    btnRig.disabled = !allPresent;
}

// ══════════════════ 跑分功能 ══════════════════
function startBenchmark() {
    const selected = getSelectedItems();
    if (selected.length < 1) return alert('请先勾选至少1款硬件');
    
    const section = document.getElementById('compareSection');
    const list = document.getElementById('compareList');
    if (!section || !list) { console.error('compareSection/compareList not found in DOM'); return; }
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

// ============ 8维评分引擎 ============

// 三种装机策略权重
const STRATEGY_WEIGHTS = {
    "性价比":  {
        cpu_solo:1.2, gpu_solo:2.5, mb_solo:1.0, mem_solo:0.7, ssd_solo:0.6,
        psu_solo:0.6, cooler_solo:0.5,
        cpu_gpu:0.85, power:0.8, thermal:0.7, upgrade:0.4,
        psu:0.6, mem:0.5, ssd:0.5, util:0.3
    },
    "一步到位":{
        cpu_solo:2.0, gpu_solo:2.5, mb_solo:1.2, mem_solo:0.8, ssd_solo:0.8,
        psu_solo:0.8, cooler_solo:0.8,
        cpu_gpu:0.75, power:1.0, thermal:1.0, upgrade:0.5,
        psu:0.8, mem:0.6, ssd:0.5, util:0
    },
    "面向未来":{
        cpu_solo:1.5, gpu_solo:1.5, mb_solo:1.0, mem_solo:0.7, ssd_solo:0.8,
        psu_solo:0.7, cooler_solo:0.5,
        cpu_gpu:0.7, power:0.7, thermal:0.6, upgrade:1.5,
        psu:0.8, mem:0.5, ssd:0.6, util:0
    }
};

// 跑分颜色：白 < 绿 < 蓝 < 紫 < 金 < 红 < 曜黑暗金。只用整机跑分决定颜色，不额外展示第二套稀有度分。
function scoreColorTier(score) {
    var s = Number(score) || 0;
    if (s >= 1425) return {color:'#f2d27a', label:'曜黑暗金', glow:'rgba(242, 210, 122, .52)', bg:'radial-gradient(circle at 50% -18%, rgba(242,210,122,.34), transparent 35%), linear-gradient(135deg, #050507, #121216 54%, #2a2109)'};
    if (s >= 1275) return {color:'#f44336', label:'红色极致', glow:'rgba(244, 67, 54, .46)', bg:'radial-gradient(circle at 50% -20%, rgba(244,67,54,.32), transparent 42%), linear-gradient(135deg, #3b0d13, #171729 62%, #241323)'};
    if (s >= 1125) return {color:'#ffd700', label:'金色顶级', glow:'rgba(255, 215, 0, .42)', bg:'radial-gradient(circle at 50% -20%, rgba(255,215,0,.28), transparent 42%), linear-gradient(135deg, #38280a, #171729 62%, #211a18)'};
    if (s >= 975) return {color:'#9c27b0', label:'紫色优秀', glow:'rgba(156, 39, 176, .40)', bg:'radial-gradient(circle at 50% -20%, rgba(156,39,176,.28), transparent 42%), linear-gradient(135deg, #26123f, #171729 62%, #18213b)'};
    if (s >= 825) return {color:'#2196f3', label:'蓝色合理', glow:'rgba(33, 150, 243, .36)', bg:'radial-gradient(circle at 50% -20%, rgba(33,150,243,.24), transparent 42%), linear-gradient(135deg, #0d2638, #171729 62%, #151e32)'};
    if (s >= 600) return {color:'#4caf50', label:'绿色能用', glow:'rgba(76, 175, 80, .34)', bg:'radial-gradient(circle at 50% -20%, rgba(76,175,80,.22), transparent 42%), linear-gradient(135deg, #102c18, #171729 62%, #1d2a22)'};
    return {color:'#d7dce5', label:'白色普通', glow:'rgba(215, 220, 229, .22)', bg:'linear-gradient(135deg, #2d3138, #171729 62%, #1f2430)'};
}

function dimensionColorTier(score) {
    var s = Number(score) || 0;
    if (s >= 96) return {color:'#f44336', label:'红色极致', glow:'rgba(244, 67, 54, .46)'};
    if (s >= 90) return {color:'#ffd700', label:'金色顶级', glow:'rgba(255, 215, 0, .42)'};
    if (s >= 80) return {color:'#9c27b0', label:'紫色优秀', glow:'rgba(156, 39, 176, .40)'};
    if (s >= 70) return {color:'#2196f3', label:'蓝色合理', glow:'rgba(33, 150, 243, .36)'};
    if (s >= 60) return {color:'#4caf50', label:'绿色能用', glow:'rgba(76, 175, 80, .34)'};
    return {color:'#d7dce5', label:'白色普通', glow:'rgba(215, 220, 229, .22)'};
}

function partColorTier(tierScore) {
    var tier = Math.min(10, Math.max(0, Number(tierScore) || 0));
    var scoreMap = {1:35, 2:50, 3:59, 4:64, 5:69, 6:74, 7:79, 8:86, 9:93, 10:99};
    return dimensionColorTier(scoreMap[tier] || 0);
}

function cpuTier(cpu) {
    var n = cpu.name || '';
    if (/9800X3D|9950X/.test(n)) return 7;
    if (/7800X3D|7900X|14700K|14900K/.test(n)) return 6;
    if (/7700|9700X|13600K|13700K/.test(n)) return 5;
    if (/7600X|9600X|12600K|245K/.test(n)) return 4;
    if (/7600|7500F|12400|5700X3D/.test(n)) return 3;
    if (/5600|12100/.test(n)) return 2;
    if (/E5-/.test(n)) return (cpu.cores || 0) < 10 ? 1 : 2;
    return 2;
}

function gpuTier(gpu) {
    var m = {"旗舰":7,"高端":6,"中高端":5,"中端":4,"中低端":3,"入门":2,"老旧旗舰":4,"老旧高端":4,"老旧中端":3,"老旧中低端":2,"老旧入门":1};
    return m[gpu.performance_tier] || 3;
}

// 安全获取CPU内存类型（兼容 memory_type 和 memory_support 字段）
function getCpuMemType(cpu) { return cpu.memory_type || cpu.memory_support || 'DDR4'; }

// 检查冷却器是否为风冷
function isAirCooler(cooler) {
    var t = (cooler.type || '').toLowerCase();
    var ct = (cooler.cooler_type || '').toLowerCase();
    return t.indexOf('风冷') !== -1 || t === 'air' || ct.indexOf('风冷') !== -1 || ct.indexOf('塔') !== -1 || ct === '下压';
}

// 检查冷却器是否为水冷
function isWaterCooler(cooler) {
    var t = (cooler.type || '').toLowerCase();
    var ct = (cooler.cooler_type || '').toLowerCase();
    return t.indexOf('水冷') !== -1 || ct.indexOf('水冷') !== -1 || ct === 'aio';
}

// 从冷却器名称/规格提取冷排大小
function getRadiatorSize(cooler) {
    var n = cooler.name || '';
    if (/420/.test(n)) return 420;
    if (/360/.test(n)) return 360;
    if (/280/.test(n)) return 280;
    if (/240/.test(n)) return 240;
    if (/120/.test(n)) return 120;
    return 0;
}

// ============ 机箱需求自动推导 ============
function updateCaseReqs() {
    var section = document.getElementById('caseReqsSection');
    var list = document.getElementById('caseReqs');
    if (!section) return;

    var cpu = rigSelectedCPU, mb = rigSelectedMB, gpu = rigSelectedGPU, cooler = rigSelectedCooler;
    if (!cpu && !mb && !gpu && !cooler) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    var html = '';
    if (mb) {
        var ff = mb.form_factor;
        // form_factor 可能是数组
        if (Array.isArray(ff)) ff = ff[0] || 'ATX';
        var ffMap = {
            'E-ATX':'需支持E-ATX版型',
            'ATX':'需支持<span class="hl">ATX</span>及以上版型',
            'M-ATX':'需支持<span class="hl">M-ATX</span>及以上版型',
            'ITX':'需支持<span class="hl">ITX</span>及以上版型'
        };
        html += '<li>主板板型：' + (ffMap[ff] || ('需支持<span class="hl">'+ff+'</span>版型')) + '</li>';
    }
    if (gpu && gpu.length) {
        html += '<li>显卡限长：需 &ge; <span class="hl">' + gpu.length + 'mm</span>（' + gpu.name + ' 长' + gpu.length + 'mm）</li>';
    }
    if (cooler) {
        if (isAirCooler(cooler) && cooler.height > 0) {
            var h = cooler.height + 5;
            html += '<li>散热器限高：需 &ge; <span class="hl2">' + h + 'mm</span>（' + cooler.name + ' 高' + cooler.height + 'mm，建议+5mm余量）</li>';
        } else if (isWaterCooler(cooler)) {
            var rad = getRadiatorSize(cooler);
            if (rad) {
                html += '<li>冷排支持：需支持<span class="hl2">' + rad + '规格</span>水冷排（' + cooler.name + '）</li>';
            } else {
                html += '<li>水冷规格：' + cooler.name + ' &mdash; 请按冷排尺寸选择机箱</li>';
            }
        }
    }
    if (!html) {
        html = '<li class="empty-msg">选择CPU/主板/显卡/散热器后，自动生成机箱需求</li>';
    }
    list.innerHTML = html;
}

// ============ 评分全局变量 ============
var rigSelectedCPU = null, rigSelectedMB = null, rigSelectedGPU = null;
var rigSelectedMem = null, rigSelectedSSD = null, rigSelectedCooler = null, rigSelectedPSU = null;
var rigSelectedCase = null;
var lastRigScoreResult = null;

// 从选中列表取第一个作为评分对象
function pickRigItems() {
    var items = getSelectedItems();
    var byCat = {};
    items.forEach(function(s) { if (!byCat[s.key]) byCat[s.key] = s.item; });
    rigSelectedCPU = byCat['cpu'] || null;
    rigSelectedMB = byCat['motherboard'] || null;
    rigSelectedGPU = byCat['gpu'] || null;
    rigSelectedMem = byCat['memory'] || null;
    rigSelectedSSD = byCat['ssd'] || null;
    rigSelectedCooler = byCat['cooler'] || null;
    rigSelectedPSU = byCat['psu'] || null;
    rigSelectedCase = byCat['case'] || null;
}

// 主评分函数
function calculateRigScore() {
    var rigCategories = ['cpu','gpu','motherboard','memory','ssd','psu','cooler'];
    var allPresent = rigCategories.every(function(k) { return selectedMap[k] && selectedMap[k].size > 0; });
    if (!allPresent) return alert('装机跑分需要7大件(CPU/显卡/主板/内存/SSD/电源/散热)至少各选1款');

    pickRigItems();
    var cpu = rigSelectedCPU, mb = rigSelectedMB, gpu = rigSelectedGPU;
    if (!cpu || !mb || !gpu) return alert('请至少选择CPU、主板和显卡（核心三件）');

    var strategyBtns = document.querySelectorAll('.strategy-btn');
    var strategy = '一步到位';
    strategyBtns.forEach(function(b) { if (b.classList.contains('active')) strategy = b.dataset.s; });
    if (!strategy) strategy = '一步到位';

    runScoring(strategy);
}

function runScoring(strategy) {
    var w = STRATEGY_WEIGHTS[strategy];
    var cpu = rigSelectedCPU, mb = rigSelectedMB, gpu = rigSelectedGPU;
    var mem = rigSelectedMem, ssd = rigSelectedSSD, cooler = rigSelectedCooler, psu = rigSelectedPSU;

    var redFlags = [], deductions = [], bonuses = [];
    var passed = true;

    // === 硬兼容性检查 ===
    var cpuSocket = cpu.socket || '';
    var mbSocket = mb.socket || '';
    if (cpuSocket && mbSocket && cpuSocket !== mbSocket) {
        redFlags.push({cat:'接口不匹配', msg:'CPU接口 '+cpuSocket+' 与主板接口 '+mbSocket+' 不兼容', critical:true});
        passed = false;
    }

    var cpuMemStr = getCpuMemType(cpu);
    var mbMemStr = mb.memory_type || '';
    var cpuMemSet = new Set(cpuMemStr.split('|'));
    var mbMemSet = new Set(mbMemStr.split('|'));
    var compatMem = [];
    cpuMemSet.forEach(function(m) { if (mbMemSet.has(m)) compatMem.push(m); });
    if (!compatMem.length && cpuMemStr && mbMemStr) {
        redFlags.push({cat:'内存代数不匹配', msg:'CPU支持'+cpuMemStr+'，主板支持'+mbMemStr+'，无交集', critical:true});
        passed = false;
    }

    var cpuTdp = cpu.tdp || 0;
    var vrmScore = mb.vrm_quality_score || 0;
    if (cpuTdp >= 170 && vrmScore <= 4) {
        redFlags.push({cat:'供电不足', msg:cpu.name+' TDP '+cpuTdp+'W，'+mb.name+' 供电太弱，满载可能降频或烧VRM', critical:false});
    } else if (cpuTdp >= 125 && vrmScore <= 3) {
        redFlags.push({cat:'供电不足', msg:cpu.name+' TDP '+cpuTdp+'W，'+mb.name+' 供电太弱，不建议此搭配', critical:true});
        passed = false;
    }

    // 内存兼容性检查
    if (mem) {
        var memType = mem.type || '';
        if (memType && compatMem.length && compatMem.indexOf(memType) === -1) {
            redFlags.push({cat:'内存不兼容', msg:'内存类型 '+memType+' 与 CPU/主板不兼容。CPU支持'+cpuMemStr+'，主板支持'+mbMemStr, critical:true});
            passed = false;
        }
    }

    // 电源瓦数检查
    if (psu) {
        var gpuTdp = gpu.tdp || 0;
        var wattage = psu.wattage || 1;
        var totalTDP = cpuTdp + gpuTdp + 80;
        if (totalTDP / wattage > 0.85) {
            redFlags.push({cat:'电源功率不足', msg:'总功耗约'+Math.round(totalTDP)+'W，电源'+wattage+'W，负载率超85%', critical:false});
        }
    }

    // 散热器检查
    if (cooler) {
        var coolTdp = cooler.tdp_cooling || 0;
        if (coolTdp < cpuTdp) {
            redFlags.push({cat:'散热不足', msg:cooler.name+'解热能力'+coolTdp+'W < CPU TDP '+cpuTdp+'W', critical:false});
        }
    }

    // === 物理空间干涉检查 ===

    // 显卡太厚挡槽位
    if (gpu.slot_count >= 3) {
        redFlags.push({cat:'物理干涉', msg:'显卡 ' + gpu.name + ' 占 ' + gpu.slot_count + ' 槽，可能挡住下方PCIe槽/跳线', critical:false});
    }

    // 内存马甲太高顶风冷
    if (cooler && isAirCooler(cooler) && mem) {
        var memH = mem.height_mm || 0;
        var clearance = cooler.memory_clearance_mm;
        if (clearance == null) clearance = 999;
        if (memH > clearance) {
            redFlags.push({cat:'物理干涉', msg:'内存高度 ' + memH + 'mm 超过散热器内存避让 ' + clearance + 'mm，可能顶风扇（可抬风扇解决）', critical:false});
        }
    }

    // 下压式散热 + 高马甲内存
    if (cooler && mem) {
        var ct = (cooler.cooler_type || cooler.type || '').toLowerCase();
        var isDown = (ct.indexOf('下压') !== -1);
        if (isDown && (mem.height_mm || 0) > 45) {
            redFlags.push({cat:'物理干涉', msg:'下压式散热器与高马甲内存（' + mem.height_mm + 'mm）可能存在空间冲突', critical:true});
            passed = false;
        }
    }

    // 机箱显卡限长检查（如已选机箱）
    var pcCase = rigSelectedCase || null;
    if (pcCase && (pcCase.max_gpu_length || 0) > 0 && (gpu.length || 0) > pcCase.max_gpu_length) {
        redFlags.push({cat:'物理干涉', msg:'显卡长 ' + gpu.length + 'mm 超过机箱显卡限长 ' + pcCase.max_gpu_length + 'mm', critical:true});
        passed = false;
    }

    // 机箱散热限高检查
    if (pcCase && (pcCase.max_cooler_height || 0) > 0 && cooler && isAirCooler(cooler)) {
        var coolerH = cooler.height || 0;
        if (coolerH > pcCase.max_cooler_height) {
            redFlags.push({cat:'物理干涉', msg:'散热器高 ' + coolerH + 'mm 超过机箱散热限高 ' + pcCase.max_cooler_height + 'mm', critical:true});
            passed = false;
        }
    }

    if (!passed) {
        renderScoringResult({total:0, dims:{}, redFlags:redFlags, deductions:[], bonuses:[], strategy:strategy, passed:false, ewaste:[]});
        return;
    }

    // === 评分计算 ===
    var dims = {};

    // 1. CPU-GPU匹配
    var ct = cpuTier(cpu), gt = gpuTier(gpu);
    var gap = Math.abs(ct - gt);
    var cgScore, cgDetail;
    if (gap === 0) { cgScore = 95; cgDetail = '完美匹配，无明显瓶颈'; }
    else if (gap === 1) { cgScore = 78; cgDetail = '轻度错配，尚可接受'; }
    else if (gap === 2) { cgScore = 55; cgDetail = '存在明显瓶颈'; }
    else { cgScore = 30; cgDetail = '严重错配(' + (ct > gt ? 'CPU过剩拖后腿' : 'CPU拖后腿') + ')'; }
    dims.cpu_gpu = {score: cgScore, detail: cgDetail};

    // 2. 供电合理性
    var pdScore = vrmScore * 10;
    var pdBonus = 0;
    if (vrmScore >= 8 && cpuTdp <= 120) pdBonus = 15;
    else if (vrmScore >= 7 && cpuTdp <= 105) pdBonus = 10;
    else if (vrmScore >= 6 && cpuTdp <= 65) pdBonus = 5;
    if (vrmScore <= 4 && cpuTdp >= 105) pdScore -= 20;
    pdScore = Math.min(100, Math.max(0, pdScore + pdBonus));
    dims.power = {score: pdScore, detail: mb.name + ' VRM ' + (mb.vrm_phases || '?') + '相 ' + (mb.vrm_mos || '?') + 'MOS' + (pdBonus ? ' 余量充足(+' + pdBonus + ')' : ' 供电合理')};

    // 3. 散热余量
    var thScore = 50, thDetail = '未选散热器，默认及格线';
    if (cooler) {
        var coolTdp = cooler.tdp_cooling || 1;
        var ratio = coolTdp / cpuTdp;
        if (ratio >= 2) { thScore = 95; thDetail = '余量充足(' + ratio.toFixed(1) + '倍)，安静运行'; }
        else if (ratio >= 1.5) { thScore = 82; thDetail = '余量良好(' + ratio.toFixed(1) + '倍)'; }
        else if (ratio >= 1.2) { thScore = 65; thDetail = '基本够用(' + ratio.toFixed(1) + '倍)'; }
        else if (ratio >= 1) { thScore = 45; thDetail = '勉强压住(' + ratio.toFixed(1) + '倍)'; }
        else { thScore = 15; thDetail = '散热器压不住CPU(' + ratio.toFixed(1) + '倍)'; }
    }
    dims.thermal = {score: thScore, detail: thDetail};

    // 4. 升级空间
    var upScore = 50;
    if (cpuSocket === 'AM5') { upScore += 30; bonuses.push({text:'AM5平台支持至2029+，升级路径极佳', cat:'upgrade'}); }
    else if (cpuSocket === 'LGA1851') { upScore += 20; bonuses.push({text:'LGA1851新平台，有升级空间', cat:'upgrade'}); }
    else if (cpuSocket === 'AM4') { upScore += 5; bonuses.push({text:'AM4已末期', cat:'upgrade'}); }
    else if ((cpuSocket || '').indexOf('LGA2011') === 0) { upScore -= 25; }
    var pcieGen = mb.pcie_gen || '';
    if (pcieGen.indexOf('PCIe5.0') !== -1 || pcieGen.indexOf('PCIe 5.0') !== -1) { upScore += 10; bonuses.push({text:'主板支持PCIe 5.0', cat:'upgrade'}); }
    else if (pcieGen.indexOf('PCIe4.0') !== -1 || pcieGen.indexOf('PCIe 4.0') !== -1) { upScore += 3; bonuses.push({text:'PCIe 4.0够用但非最新', cat:'upgrade'}); }
    if ((mb.memory_slots || 0) >= 4) { upScore += 5; bonuses.push({text:'4个内存插槽', cat:'upgrade'}); }
    upScore = Math.min(100, Math.max(0, upScore));
    var upBonuses = bonuses.filter(function(b) { return b.cat === 'upgrade'; });
    dims.upgrade = {score: upScore, detail: upBonuses.map(function(b) { return b.text; }).join(' | ') || '升级空间有限'};

    // 5. 电源余量
    var psScore = 50, psDetail = '未选电源';
    if (psu) {
        var gpuTdp = gpu.tdp || 0;
        var wattage = psu.wattage || 1;
        var lr = (cpuTdp + gpuTdp + 80) / wattage;
        if (lr <= 0.5) { psScore = 92; psDetail = '余量充足(负载' + (lr * 100).toFixed(0) + '%)，' + (psu.rating || '') + ' ' + (psu.modular || ''); }
        else if (lr <= 0.7) { psScore = 78; psDetail = '余量良好(负载' + (lr * 100).toFixed(0) + '%)，' + (psu.rating || ''); }
        else if (lr <= 0.8) { psScore = 55; psDetail = '负载偏高(负载' + (lr * 100).toFixed(0) + '%)'; }
        else { psScore = 25; psDetail = '接近满载(负载' + (lr * 100).toFixed(0) + '%)'; }
    }
    dims.psu = {score: psScore, detail: psDetail};

    // 6. 内存匹配度
    var memScore = 50, memDetail = '未选内存';
    if (mem) {
        var mType = mem.type || '';
        var mFreq = mem.frequency || 0;
        if (mType === 'DDR5' && mFreq >= 6000) { memScore = 90; memDetail = 'DDR5高频，性能充分'; }
        else if (mType === 'DDR5' && mFreq >= 5200) { memScore = 78; memDetail = 'DDR5标准频率，够用'; }
        else if (mType === 'DDR4' && mFreq >= 3600) { memScore = 80; memDetail = 'DDR4高频，DDR4天花板'; }
        else if (mType === 'DDR4' && mFreq >= 3200) { memScore = 65; memDetail = 'DDR4标准频率'; }
        else if (mType === 'DDR4' && mFreq < 3200) { memScore = 35; memDetail = 'DDR4低频，影响性能'; }
        else if (mType === 'DDR3') { memScore = 15; memDetail = 'DDR3已严重过时'; }
        if ((mem.capacity || 0) < 16) { memScore -= 15; memDetail += '，容量不足'; }
        else if ((mem.capacity || 0) >= 32) { memScore += 5; memDetail += '，大容量'; }
        dims.mem = {score: Math.min(100, Math.max(0, memScore)), detail: memDetail};
    } else {
        dims.mem = {score: 50, detail: '未选内存，默认及格线'};
    }

    // 7. SSD存储
    var ssdScore = 50, ssdDetail = '未选SSD';
    if (ssd) {
        var ssdInterface = ssd.interface || '';
        var ssdType = ssd.type || '';
        var ssdRead = ssd.read || 0;
        if ((ssdInterface.indexOf('PCIe4.0') !== -1 || ssdInterface.indexOf('PCIe 4.0') !== -1) && ssdRead >= 7000) {
            ssdScore = 95; ssdDetail = 'PCIe4.0旗舰，读写速度顶级';
        } else if ((ssdInterface.indexOf('PCIe4.0') !== -1 || ssdInterface.indexOf('PCIe 4.0') !== -1) && ssdRead >= 4000) {
            ssdScore = 80; ssdDetail = 'PCIe4.0中端，速度良好';
        } else if (ssdInterface.indexOf('PCIe3.0') !== -1 || ssdInterface.indexOf('PCIe 3.0') !== -1) {
            ssdScore = 65; ssdDetail = 'PCIe3.0，够用但非最新';
        } else if (ssdType === 'SATA') {
            ssdScore = 50; ssdDetail = 'SATA固态，适合仓库';
        } else if (ssdType === 'HDD') {
            ssdScore = 30; ssdDetail = '机械硬盘，适合冷存储';
        }
        dims.ssd = {score: ssdScore, detail: ssdDetail};
    } else {
        dims.ssd = {score: 50, detail: '未选SSD，默认及格线'};
    }

    // 8. 参数利用率
    var utScore = 60;
    if (w.util > 0) {
        if (vrmScore >= 7 && cpuTdp >= 105) { utScore += 20; bonuses.push({text: mb.name + ' 强供电被充分利用', cat: 'util'}); }
        else if (vrmScore >= 7 && cpuTdp <= 65) { utScore -= 15; deductions.push({text: mb.name + ' 供电过剩，主板参数未充分利用', cat: 'util'}); }
        if ((pcieGen.indexOf('PCIe5.0') !== -1 || pcieGen.indexOf('PCIe 5.0') !== -1) && (cpu.gen || '').indexOf('Ryzen') !== -1) {
            utScore += 10; bonuses.push({text: 'PCIe 5.0主板配新一代CPU', cat: 'util'});
        }
        if (ssd && (ssd.interface || '').indexOf('PCIe4.0') !== -1 && (pcieGen.indexOf('PCIe4.0') !== -1 || pcieGen.indexOf('PCIe 4.0') !== -1)) {
            utScore += 5; bonuses.push({text: 'PCIe 4.0 SSD匹配主板', cat: 'util'});
        }
        utScore = Math.min(100, Math.max(0, utScore));
    }
    dims.util = {score: utScore, detail: '参数利用率 ' + utScore + '分'};

    // 9-15. 7大件独立单品分 (tier_score ×10 → 0-100)
    dims.cpu_solo = {score: (cpu.tier_score || 0) * 10, detail: cpu.name + ' Tier ' + (cpu.tier_score || 0)};
    dims.gpu_solo = {score: (gpu.tier_score || 0) * 10, detail: gpu.name + ' Tier ' + (gpu.tier_score || 0)};
    dims.mb_solo = {score: (mb.tier_score || 0) * 10, detail: mb.name + ' Tier ' + (mb.tier_score || 0)};
    dims.mem_solo = {score: mem ? ((mem.tier_score || 0) * 10) : 50, detail: mem ? (mem.name + ' Tier ' + (mem.tier_score || 0)) : '未选内存，默认50'};
    dims.ssd_solo = {score: ssd ? ((ssd.tier_score || 0) * 10) : 50, detail: ssd ? (ssd.name + ' Tier ' + (ssd.tier_score || 0)) : '未选SSD，默认50'};
    dims.psu_solo = {score: psu ? ((psu.tier_score || 0) * 10) : 50, detail: psu ? (psu.name + ' Tier ' + (psu.tier_score || 0)) : '未选电源，默认50'};
    dims.cooler_solo = {score: cooler ? ((cooler.tier_score || 0) * 10) : 50, detail: cooler ? (cooler.name + ' Tier ' + (cooler.tier_score || 0)) : '未选散热器，默认50'};

    // === 策略感知分数修正 ===
    if (strategy === '性价比') {
        // CPU: 甜点区奖励，溢价区惩罚
        if (ct >= 7) {
            var oldV = dims.cpu_solo.score;
            dims.cpu_solo.score = Math.max(10, dims.cpu_solo.score - 70);
            deductions.push({text: cpu.name + ' 旗舰CPU严重溢价，性价比策略-' + (oldV - dims.cpu_solo.score), cat: 'cpu_solo'});
        } else if (ct >= 6) {
            var oldV = dims.cpu_solo.score;
            dims.cpu_solo.score = Math.max(20, dims.cpu_solo.score - 50);
            deductions.push({text: cpu.name + ' 高端CPU性价比偏低，性价比策略-' + (oldV - dims.cpu_solo.score), cat: 'cpu_solo'});
        } else if (ct <= 2) {
            dims.cpu_solo.score = Math.min(100, dims.cpu_solo.score + 10);
            bonuses.push({text: cpu.name + ' 极致省钱方案，性价比策略+10', cat: 'cpu_solo'});
        } else if (ct <= 4) {
            dims.cpu_solo.score = Math.min(100, dims.cpu_solo.score + 30);
            bonuses.push({text: cpu.name + ' 甜点级CPU，性价比策略+30', cat: 'cpu_solo'});
        } else {
            // ct===5
            dims.cpu_solo.score = Math.min(100, dims.cpu_solo.score + 15);
            bonuses.push({text: cpu.name + ' 次甜点CPU，性价比策略+15', cat: 'cpu_solo'});
        }
        // GPU: 60系/70系是装机甜点
        if (gt >= 7) {
            var oldG = dims.gpu_solo.score;
            dims.gpu_solo.score = Math.max(10, dims.gpu_solo.score - 65);
            deductions.push({text: gpu.name + ' 旗舰卡溢价过高，性价比策略-' + (oldG - dims.gpu_solo.score), cat: 'gpu_solo'});
        } else if (gt >= 6) {
            var oldG = dims.gpu_solo.score;
            dims.gpu_solo.score = Math.max(20, dims.gpu_solo.score - 45);
            deductions.push({text: gpu.name + ' 高端卡性价比偏低，性价比策略-' + (oldG - dims.gpu_solo.score), cat: 'gpu_solo'});
        } else if (gt <= 3) {
            dims.gpu_solo.score = Math.min(100, dims.gpu_solo.score + 15);
            bonuses.push({text: gpu.name + ' 入门甜点GPU，性价比策略+15', cat: 'gpu_solo'});
        } else {
            // gt 4-5 甜点核心区
            dims.gpu_solo.score = Math.min(100, dims.gpu_solo.score + 35);
            bonuses.push({text: gpu.name + ' 甜点级GPU（60/70系主力），性价比策略+35', cat: 'gpu_solo'});
        }
        // 平台红利: upgrade分高说明这笔钱买的平台保值
        if (dims.upgrade.score >= 60) {
            dims.cpu_solo.score = Math.min(100, dims.cpu_solo.score + 10);
            bonuses.push({text: '平台红利：CPU花的钱进入了保值平台（AM5/LGA1851）+10', cat: 'cpu_solo'});
            dims.gpu_solo.score = Math.min(100, dims.gpu_solo.score + 10);
            bonuses.push({text: '平台红利：GPU花的钱进入了保值平台（DDR5/PCIe5）+10', cat: 'gpu_solo'});
            dims.mb_solo.score = Math.min(100, dims.mb_solo.score + 10);
            bonuses.push({text: '平台红利：主板花的钱进入了保值平台+10', cat: 'mb_solo'});
        }
    } else if (strategy === '一步到位') {
        // CPU
        if (ct >= 7) {
            dims.cpu_solo.score = Math.min(100, dims.cpu_solo.score + 40);
            bonuses.push({text: cpu.name + ' 旗舰CPU，一步到位策略+40', cat: 'cpu_solo'});
        } else if (ct >= 6) {
            dims.cpu_solo.score = Math.min(100, dims.cpu_solo.score + 30);
            bonuses.push({text: cpu.name + ' 高端CPU，一步到位策略+30', cat: 'cpu_solo'});
        } else if (ct >= 5) {
            dims.cpu_solo.score = Math.min(100, dims.cpu_solo.score + 15);
            bonuses.push({text: cpu.name + ' 次旗舰CPU，一步到位策略+15', cat: 'cpu_solo'});
        } else if (ct <= 2) {
            var oldV = dims.cpu_solo.score;
            dims.cpu_solo.score = Math.max(5, dims.cpu_solo.score - 45);
            deductions.push({text: cpu.name + ' 入门CPU不满足一步到位，单品分-' + (oldV - dims.cpu_solo.score), cat: 'cpu_solo'});
        } else {
            var oldV = dims.cpu_solo.score;
            dims.cpu_solo.score = Math.max(10, dims.cpu_solo.score - 35);
            deductions.push({text: cpu.name + ' 中端CPU不满足一步到位，单品分-' + (oldV - dims.cpu_solo.score), cat: 'cpu_solo'});
        }
        // GPU
        if (gt >= 7) {
            dims.gpu_solo.score = Math.min(100, dims.gpu_solo.score + 50);
            bonuses.push({text: gpu.name + ' 旗舰卡，一步到位策略+50', cat: 'gpu_solo'});
        } else if (gt >= 6) {
            dims.gpu_solo.score = Math.min(100, dims.gpu_solo.score + 30);
            bonuses.push({text: gpu.name + ' 高端卡，一步到位策略+30', cat: 'gpu_solo'});
        } else if (gt <= 2) {
            var oldG = dims.gpu_solo.score;
            dims.gpu_solo.score = Math.max(5, dims.gpu_solo.score - 45);
            deductions.push({text: gpu.name + ' 入门显卡不满足一步到位，单品分-' + (oldG - dims.gpu_solo.score), cat: 'gpu_solo'});
        } else {
            var oldG = dims.gpu_solo.score;
            dims.gpu_solo.score = Math.max(10, dims.gpu_solo.score - 35);
            deductions.push({text: gpu.name + ' 中端显卡不满足一步到位，单品分-' + (oldG - dims.gpu_solo.score), cat: 'gpu_solo'});
        }
    } else if (strategy === '面向未来') {
        var platform = cpuSocket;
        if (platform === 'AM5') {
            dims.upgrade.score = Math.min(100, dims.upgrade.score + 30);
            bonuses.push({text: 'AM5平台面向未来（升级分+30）', cat: 'upgrade'});
        } else if (platform === 'AM4' || platform === 'LGA1700') {
            dims.upgrade.score = Math.max(0, dims.upgrade.score - 25);
            deductions.push({text: platform + ' 平台已末期，不符合面向未来策略（升级分-25）', cat: 'upgrade'});
        } else if (platform === 'LGA1851') {
            dims.upgrade.score = Math.min(100, dims.upgrade.score + 15);
            bonuses.push({text: 'LGA1851新平台，面向未来+15', cat: 'upgrade'});
        }
        if (mem && (mem.type || '') === 'DDR5') {
            dims.mem_solo.score = Math.min(100, dims.mem_solo.score + 10);
            bonuses.push({text: 'DDR5内存，面向未来（内存单品+10）', cat: 'mem_solo'});
        }
        if (ssd) {
            var ssdIf = ssd.interface || '';
            if (ssdIf.indexOf('PCIe5.0') !== -1 || ssdIf.indexOf('PCIe 5.0') !== -1) {
                dims.ssd_solo.score = Math.min(100, dims.ssd_solo.score + 10);
                bonuses.push({text: 'PCIe 5.0 SSD，面向未来（SSD单品+10）', cat: 'ssd_solo'});
            }
        }
    }

    // === 风格统一加分 ===
    var styleBonus = 0;
    var allStyleItems = [cpu, gpu, mb, mem, ssd, cooler, psu].filter(Boolean);
    if (allStyleItems.length >= 5) {
        var tagCounts = {};
        allStyleItems.forEach(function(item) {
            var tags = item.style_tags || [];
            var seen = {};
            tags.forEach(function(t) {
                if (!seen[t]) { seen[t] = true; tagCounts[t] = (tagCounts[t] || 0) + 1; }
            });
        });
        for (var tag in tagCounts) {
            if (tagCounts[tag] === allStyleItems.length) {
                styleBonus += 8;
                bonuses.push({text: '全' + tag + '套件 +8分', cat: 'style'});
            } else if (tagCounts[tag] >= 5) {
                styleBonus += 4;
                bonuses.push({text: '至少5件' + tag + ' +4分', cat: 'style'});
            }
        }
    }

    // === 综合跑分 ===
    var weightedTotal = 0;
    var maxWeightedTotal = 0;
    for (var k in w) {
        if (dims[k]) {
            weightedTotal += dims[k].score * w[k];
            maxWeightedTotal += 100 * w[k];
        }
    }
    var total = maxWeightedTotal > 0 ? Math.round(weightedTotal / maxWeightedTotal * 1500) : 0;
    total += styleBonus;

    // === 洋垃圾检测 ===
    var ewaste = [];
    if (cpu.is_e_waste) ewaste.push('CPU: ' + cpu.name);
    if (mb.is_e_waste) ewaste.push('主板: ' + mb.name);
    if (mem && mem.is_e_waste) ewaste.push('内存: ' + mem.name);
    if (ssd && ssd.is_e_waste) ewaste.push('SSD: ' + ssd.name);
    if (cooler && cooler.is_e_waste) ewaste.push('散热器: ' + cooler.name);
    if (psu && psu.is_e_waste) ewaste.push('电源: ' + psu.name);

    var knownIssues = [];
    if (cpu && cpu.known_issues) knownIssues.push({part: 'CPU: ' + cpu.name, issue: cpu.known_issues});
    if (mb && mb.known_issues) knownIssues.push({part: '主板: ' + mb.name, issue: mb.known_issues});

    renderScoringResult({total: total, dims: dims, w: w, redFlags: redFlags, deductions: deductions, bonuses: bonuses, strategy: strategy, passed: true, ewaste: ewaste, knownIssues: knownIssues});
}

function renderScoringResult(r) {
    var section = document.getElementById('compareSection');
    var list = document.getElementById('compareList');
    if (!section || !list) { console.error('compareSection/compareList not found in DOM'); return; }
    section.style.display = 'block';
    lastRigScoreResult = r;

    var colorTier = scoreColorTier(r.total);
    var html = '<div class="bench-header"><h3>装机综合评分</h3><button class="btn-close" onclick="closeCompare()">×</button></div>';
    html += '<div class="strategy-selector"><span>评分策略：</span>';
    ['一步到位', '性价比', '面向未来'].forEach(function(s) {
        html += '<button class="strategy-btn' + (s === r.strategy ? ' active' : '') + '" data-s="' + s + '">' + s + '</button>';
    });
    html += '</div>';

    if (!r.passed) {
        html += '<div class="score-hero" style="background:linear-gradient(135deg,#3a1010,#1a1a2e)">';
        html += '<div class="score-num-giant" style="color:#ff4444">✕</div>';
        html += '<div class="score-oneliner">存在致命兼容性问题，无法继续评分</div></div>';
    } else {
        var totalPct = Math.min(100, r.total / 1500 * 100);
        var heroBg = colorTier.bg || ('linear-gradient(135deg,#2a1040,#1a1a2e)');
        var heroGlow = colorTier.glow || (colorTier.color + '40');
        html += '<div class="score-hero" style="--score-glow:' + heroGlow + ';background:' + heroBg + '">';
        html += '<div class="score-total-label">装机赛博跑分</div>';
        html += '<div class="score-num-wrap"><span class="score-num-giant" style="color:' + colorTier.color + '">' + Math.round(r.total) + '</span><span class="score-num-max">pts</span></div>';
        html += '<div class="score-rank-pill" style="color:' + colorTier.color + ';border-color:' + colorTier.color + '88;background:' + colorTier.color + '18">' + colorTier.label + '</div>';
        html += '<div class="score-bar-wrap"><div class="score-bar-fill" style="width:' + totalPct + '%;background:' + colorTier.color + ';box-shadow:0 0 12px ' + colorTier.color + '60"></div></div>';
        var oneliner = r.total >= 1425 ? '压轴神装' : r.total >= 1275 ? '极致拉满' : r.total >= 1125 ? '顶级装备' : r.total >= 975 ? '优秀配置' : r.total >= 825 ? '合理水平' : r.total >= 600 ? '能用级别' : '需要重配';
        html += '<div class="score-oneliner">' + oneliner + ' &middot; <span style="color:' + colorTier.color + ';font-weight:700">' + colorTier.label + '</span> &middot; <span style="color:#ccc">' + r.strategy + '策略</span></div>';
        html += '<div class="score-actions"><button class="share-card-btn" style="--score-color:' + colorTier.color + ';--score-color-soft:' + colorTier.color + '18;--score-color-strong:' + colorTier.color + '2c;--score-glow:' + heroGlow + '" onclick="downloadRigShareCard()">生成炫耀图</button></div>';
        html += '<div class="score-tiers">';
        html += '<div class="tiers-title">已选配件</div>';
        html += '<div class="tiers-grid">';
        var tierItemsDef = [
            {label:'CPU', item:rigSelectedCPU, cat:'cpu'},
            {label:'GPU', item:rigSelectedGPU, cat:'gpu'},
            {label:'主板', item:rigSelectedMB, cat:'motherboard'},
            {label:'内存', item:rigSelectedMem, cat:'memory'},
            {label:'SSD', item:rigSelectedSSD, cat:'ssd'},
            {label:'电源', item:rigSelectedPSU, cat:'psu'},
            {label:'散热', item:rigSelectedCooler, cat:'cooler'}
        ];
        tierItemsDef.forEach(function(t) {
            if (t.item) {
                var ts = t.item.tier_score || 0;
                var tc = partColorTier(ts);
                var catColor = (CATEGORIES[t.cat] && CATEGORIES[t.cat].color) || tc.color;
                var tierPct = Math.min(100, Math.max(0, ts * 10));
                var tierGlow = tc.glow || (tc.color + '33');
                html += '<div class="tier-chip" style="--cat-color:' + catColor + ';--tier-glow:' + tierGlow + '">';
                html += '<span class="tier-chip-label">' + t.label + '</span>';
                html += '<span class="tier-chip-name">' + _e(t.item.name) + '</span>';
                html += '<span class="tier-chip-badge" style="background:' + tc.color + '22;color:' + tc.color + '">T' + ts + '</span>';
                html += '<span class="tier-chip-score" style="color:' + tc.color + '">' + tc.label + '</span>';
                html += '<span class="tier-chip-meter"><span style="width:' + tierPct + '%;background:' + tc.color + ';box-shadow:0 0 10px ' + tc.color + '66"></span></span>';
                html += '</div>';
            }
        });
        html += '</div></div>';
        html += '</div>';

        var labels = {cpu_gpu:'CPU-GPU匹配', power:'供电合理性', thermal:'散热余量', upgrade:'升级空间', psu:'电源余量', mem:'内存匹配', ssd:'SSD存储', util:'参数利用率', cpu_solo:'CPU单品', gpu_solo:'GPU单品', mb_solo:'主板单品', mem_solo:'内存单品', ssd_solo:'SSD单品', psu_solo:'电源单品', cooler_solo:'散热单品'};
        html += '<div class="scoring-section"><div class="section-title">维度得分明细</div>';
        html += '<table class="dim-table"><thead><tr><th>维度</th><th>得分</th><th>色条</th><th style="width:60px">权重</th><th>说明</th></tr></thead><tbody>';
        for (var k in r.dims) {
            var d = r.dims[k];
            var dimColor = dimensionColorTier(d.score);
            var isSolo = k.indexOf('_solo') !== -1;
            var tag = isSolo ? ' <span style="font-size:10px;color:#b44dff;background:#b44dff11;padding:1px 4px;border-radius:3px">单品</span>' : ' <span style="font-size:10px;color:#448aff;background:#448aff11;padding:1px 4px;border-radius:3px">匹配</span>';
            html += '<tr>';
            html += '<td class="dim-label">' + (labels[k] || k) + tag + '</td>';
            html += '<td class="dim-score" style="color:' + dimColor.color + '">' + d.score + '</td>';
            html += '<td class="dim-bar"><div class="dim-bar-inner"><div class="dim-bar-fill" style="width:' + d.score + '%;background:' + dimColor.color + ';box-shadow:0 0 8px ' + dimColor.color + '50"></div></div></td>';
            html += '<td class="dim-weight">×' + (r.w[k] || 0).toFixed(1) + '</td>';
            html += '<td class="dim-detail">' + d.detail + '</td>';
            html += '</tr>';
        }
        html += '</tbody></table></div>';
    }

    if (r.redFlags.length) {
        html += '<div class="scoring-section"><div class="section-title">兼容性检查</div><div class="flags-section">';
        for (var i = 0; i < r.redFlags.length; i++) {
            var f = r.redFlags[i];
            html += '<div class="flag ' + (f.critical ? 'flag-critical' : 'flag-warn') + '"><span class="flag-cat">[' + (f.critical ? '致命' : '警告') + ']</span> ' + f.cat + ': ' + f.msg + '</div>';
        }
        html += '</div></div>';
    }

    if (r.deductions.length) {
        html += '<div class="scoring-section"><div class="section-title">降分项</div><div class="list-section">';
        for (var j = 0; j < r.deductions.length; j++) {
            html += '<div class="list-item list-neg"><span class="list-amount">-</span> ' + r.deductions[j].text + '</div>';
        }
        html += '</div></div>';
    }
    if (r.bonuses.length) {
        html += '<div class="scoring-section"><div class="section-title">加分项</div><div class="list-section">';
        for (var k = 0; k < r.bonuses.length; k++) {
            html += '<div class="list-item list-pos"><span class="list-amount">+</span> ' + r.bonuses[k].text + '</div>';
        }
        html += '</div></div>';
    }

    if (r.ewaste.length) {
        html += '<div class="ewaste-warn"><div class="ewaste-title">⚠ 洋垃圾警告</div>';
        for (var ei = 0; ei < r.ewaste.length; ei++) {
            html += '<div class="ewaste-item">' + r.ewaste[ei] + '</div>';
        }
        html += '</div>';
    }

    if (r.knownIssues && r.knownIssues.length) {
        html += '<div class="scoring-section"><div class="section-title">已知缺陷/通病</div><div class="known-issues-section">';
        for (var ii = 0; ii < r.knownIssues.length; ii++) {
            html += '<div class="known-item"><span class="known-part">' + r.knownIssues[ii].part + '</span>: <span class="known-issue">' + r.knownIssues[ii].issue + '</span></div>';
        }
        html += '</div></div>';
    }

    // 机箱需求
    html += '<div class="scoring-section" id="caseReqsSection"><div class="section-title">机箱选购建议</div><div class="case-reqs-section"><ul id="caseReqs" class="case-reqs-list"></ul></div></div>';

    // 颜色图例
    html += '<div class="color-legend">';
    html += '<div class="legend-title">评分等级</div>';
    html += '<div class="legend-row">';
    var legendItems = [
        {score:1425, label:'曜黑 1425+'},
        {score:1275, label:'红色 1275+'},
        {score:1125, label:'金色 1125+'},
        {score:975, label:'紫色 975+'},
        {score:825, label:'蓝色 825+'},
        {score:600, label:'绿色 600+'},
        {score:0, label:'白色 <600'}
    ];
    legendItems.forEach(function(li) {
        var tier = scoreColorTier(li.score);
        html += '<span class="legend-chip"><span class="legend-dot" style="background:' + tier.color + ';box-shadow:0 0 8px ' + tier.color + '66"></span>' + li.label + '</span>';
    });
    html += '</div></div>';

    list.innerHTML = html;
    section.scrollIntoView({behavior: 'smooth', block: 'start'});
    compareOpen = true;

    // 绑定策略按钮事件
    var btns = list.querySelectorAll('.strategy-btn');
    btns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            btns.forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
            pickRigItems();
            runScoring(this.dataset.s);
        });
    });

    // 填充机箱需求
    updateCaseReqs();
}

function colorWithAlpha(hex, alpha) {
    var clean = String(hex || '').replace('#', '');
    if (clean.length === 3) clean = clean.split('').map(function(c) { return c + c; }).join('');
    var r = parseInt(clean.slice(0, 2), 16) || 255;
    var g = parseInt(clean.slice(2, 4), 16) || 255;
    var b = parseInt(clean.slice(4, 6), 16) || 255;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function roundRectPath(ctx, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
}

function fillRoundRect(ctx, x, y, w, h, r, fill, stroke) {
    roundRectPath(ctx, x, y, w, h, r);
    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    var chars = String(text || '').split('');
    var line = '';
    var lines = [];
    for (var i = 0; i < chars.length; i++) {
        var test = line + chars[i];
        if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = chars[i];
            if (lines.length === maxLines) break;
        } else {
            line = test;
        }
    }
    if (lines.length < maxLines && line) lines.push(line);
    if (lines.length === maxLines && chars.length > lines.join('').length) {
        var last = lines[lines.length - 1];
        while (ctx.measureText(last + '...').width > maxWidth && last.length > 0) last = last.slice(0, -1);
        lines[lines.length - 1] = last + '...';
    }
    lines.forEach(function(l, idx) { ctx.fillText(l, x, y + idx * lineHeight); });
    return lines.length * lineHeight;
}

function inferRigShareScene() {
    var gpuName = ((rigSelectedGPU && rigSelectedGPU.name) || '').toUpperCase();
    var cpuName = ((rigSelectedCPU && rigSelectedCPU.name) || '').toUpperCase();
    if (cpuName.indexOf('X3D') !== -1) return '游戏特化配置';
    if (/RTX|GTX|GEFORCE|NVIDIA|英伟达/.test(gpuName)) return 'N卡光追与AI配置';
    if (/RX|RADEON|AMD/.test(gpuName)) return 'A卡高帧与大显存配置';
    if (/ARC|INTEL/.test(gpuName)) return '蓝厂探索配置';
    return '综合装机配置';
}

function getRigShareItems() {
    return [
        {label:'CPU', item:rigSelectedCPU},
        {label:'GPU', item:rigSelectedGPU},
        {label:'主板', item:rigSelectedMB},
        {label:'内存', item:rigSelectedMem},
        {label:'SSD', item:rigSelectedSSD},
        {label:'电源', item:rigSelectedPSU},
        {label:'散热', item:rigSelectedCooler}
    ].filter(function(p) { return !!p.item; });
}

function shareSafetySummary(r) {
    var critical = (r.redFlags || []).filter(function(f) { return f.critical; }).length;
    var warnings = (r.redFlags || []).length - critical;
    var ewaste = (r.ewaste || []).length;
    var known = (r.knownIssues || []).length;
    if (!critical && !warnings && !ewaste && !known) {
        return '核心兼容检查通过，未发现致命搭配问题。';
    }
    var parts = [];
    if (critical) parts.push(critical + ' 个致命问题');
    if (warnings) parts.push(warnings + ' 个警告');
    if (ewaste) parts.push(ewaste + ' 个电子垃圾标记');
    if (known) parts.push(known + ' 个已知缺陷提示');
    return '已识别 ' + parts.join('、') + '，建议按提示继续优化。';
}

function downloadRigShareCard() {
    var r = lastRigScoreResult;
    if (!r || !r.passed) {
        alert('当前没有可生成的装机评分结果');
        return;
    }

    var tier = scoreColorTier(r.total);
    var items = getRigShareItems();
    var canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1440;
    var ctx = canvas.getContext('2d');
    var accent = tier.color;
    var font = '"Microsoft YaHei", "PingFang SC", Arial, sans-serif';

    ctx.fillStyle = '#080913';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var bg = ctx.createRadialGradient(540, 0, 40, 540, 0, 850);
    bg.addColorStop(0, colorWithAlpha(accent, .42));
    bg.addColorStop(.42, colorWithAlpha(accent, .12));
    bg.addColorStop(1, 'rgba(8,9,19,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    fillRoundRect(ctx, 54, 54, 972, 1332, 38, 'rgba(18,20,35,.88)', colorWithAlpha(accent, .45));

    ctx.fillStyle = 'rgba(255,255,255,.60)';
    ctx.font = '800 25px ' + font;
    ctx.fillText('PC BUILD SCORECARD', 92, 118);
    ctx.fillStyle = '#f7f7fb';
    ctx.font = '900 54px ' + font;
    ctx.fillText('装机战绩卡', 92, 178);

    ctx.textAlign = 'right';
    ctx.fillStyle = colorWithAlpha(accent, .95);
    ctx.font = '900 30px ' + font;
    ctx.fillText(r.strategy + '策略', 988, 122);
    ctx.fillStyle = 'rgba(255,255,255,.58)';
    ctx.font = '700 24px ' + font;
    ctx.fillText(inferRigShareScene(), 988, 166);
    ctx.textAlign = 'left';

    ctx.shadowColor = colorWithAlpha(accent, .65);
    ctx.shadowBlur = 36;
    ctx.fillStyle = accent;
    ctx.font = '900 190px ' + font;
    ctx.fillText(String(Math.round(r.total)), 92, 380);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,.68)';
    ctx.font = '900 38px ' + font;
    ctx.fillText('pts', 430, 360);

    fillRoundRect(ctx, 92, 420, 300, 54, 27, colorWithAlpha(accent, .16), colorWithAlpha(accent, .78));
    ctx.fillStyle = accent;
    ctx.font = '900 28px ' + font;
    ctx.fillText(tier.label, 122, 456);

    fillRoundRect(ctx, 92, 508, 896, 24, 12, 'rgba(255,255,255,.10)', null);
    fillRoundRect(ctx, 92, 508, Math.max(18, Math.min(896, 896 * r.total / 1500)), 24, 12, accent, null);

    ctx.fillStyle = 'rgba(255,255,255,.72)';
    ctx.font = '700 25px ' + font;
    ctx.fillText(shareSafetySummary(r), 92, 588);

    ctx.fillStyle = '#f2f3f8';
    ctx.font = '900 34px ' + font;
    ctx.fillText('核心配置', 92, 666);

    var startY = 706;
    items.forEach(function(p, idx) {
        var y = startY + idx * 78;
        var partTier = partColorTier(p.item.tier_score || 0);
        fillRoundRect(ctx, 92, y, 896, 60, 18, 'rgba(255,255,255,.06)', colorWithAlpha(partTier.color, .22));
        ctx.fillStyle = colorWithAlpha(partTier.color, .20);
        fillRoundRect(ctx, 112, y + 12, 76, 36, 18, colorWithAlpha(partTier.color, .18), colorWithAlpha(partTier.color, .55));
        ctx.fillStyle = partTier.color;
        ctx.font = '900 22px ' + font;
        ctx.fillText(p.label, 132, y + 37);
        ctx.fillStyle = '#f5f5f8';
        ctx.font = '700 24px ' + font;
        drawWrappedText(ctx, p.item.name || '', 212, y + 38, 580, 28, 1);
        ctx.textAlign = 'right';
        ctx.fillStyle = partTier.color;
        ctx.font = '900 24px ' + font;
        ctx.fillText('T' + (p.item.tier_score || 0), 958, y + 38);
        ctx.textAlign = 'left';
    });

    ctx.fillStyle = '#f2f3f8';
    ctx.font = '900 34px ' + font;
    ctx.fillText('装机结论', 92, 1304);
    ctx.fillStyle = 'rgba(255,255,255,.72)';
    ctx.font = '700 24px ' + font;
    drawWrappedText(ctx, tier.label + '，' + inferRigShareScene() + '。这套配置的看点是跑分、兼容性和硬件等级同时在线。', 92, 1346, 860, 32, 2);

    var now = new Date();
    var date = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,.42)';
    ctx.font = '700 20px ' + font;
    ctx.fillText('硬件对比系统 · ' + date, 988, 1362);

    var fileName = '装机战绩卡_' + Math.round(r.total) + 'pts.png';
    function triggerDownload(url, shouldRevoke) {
        var link = document.createElement('a');
        link.download = fileName;
        link.href = url;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(function() {
            if (link.parentNode) link.parentNode.removeChild(link);
            if (shouldRevoke) URL.revokeObjectURL(url);
        }, 1000);
    }

    if (canvas.toBlob) {
        canvas.toBlob(function(blob) {
            if (!blob) {
                triggerDownload(canvas.toDataURL('image/png'), false);
                return;
            }
            triggerDownload(URL.createObjectURL(blob), true);
        }, 'image/png');
    } else {
        triggerDownload(canvas.toDataURL('image/png'), false);
    }
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
    if (!section || !list) { console.error('compareSection/compareList not found in DOM'); return; }

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
    var sec = document.getElementById('compareSection');
    if (sec) sec.style.display = 'none';
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
        const allItems = DB[key] || [];
        items.forEach((item, idx) => {
            const tr = document.createElement('tr');
            const origIdx = allItems.indexOf(item);
            const selSet = selectedMap[key];
            const checked = selSet && selSet.has(origIdx);
            // 电子垃圾标记
            if (item.is_e_waste) tr.classList.add('e-waste');

            let rowHtml = `<td class="cb-col"><input type="checkbox" onchange="toggleSelect('${key}',${origIdx})" ${checked ? 'checked' : ''}></td>`;
            cols.forEach(c => {
                let raw = item[c.key];
                let cls = 'td-' + c.key;
                if (c.key === 'name') {
                    rowHtml += `<td class="${cls}"><strong>${_e(raw || '')}</strong>${item.is_e_waste ? ' <span class="e-tag">电子垃圾</span>' : ''}${item.known_issues ? ' <span class="ki-tag" title="' + _e(item.known_issues) + '">⚠缺陷</span>' : ''}${item.notes ? ' <span class="note-tag">' + _e(item.notes) + '</span>' : ''}</td>`;
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
    msg.textContent = '正在渲染...';
    try {
        DB = RAW_DATA;
        buildBrandFilter('cpu');
        buildSocketFilter('cpu');
        render();
        msg.style.display = 'none';
        document.getElementById('mainContainer').style.display = 'block';
        document.getElementById('compareBar').style.display = 'flex';
    } catch(e) {
        msg.textContent = '渲染失败: ' + e.message;
        msg.style.color = 'red';
    }
})();

function init() {}
window.addEventListener('DOMContentLoaded', init);

// render tabs
(function(){
    var tabsEl = document.getElementById('tabs');
    if (!tabsEl) return;
    for (var k in CATEGORIES) {
        if (k === 'case') continue;
        var v = CATEGORIES[k];
        var btn = document.createElement('button');
        btn.className = 'tab-btn';
        btn.dataset.key = k;
        btn.textContent = v.icon + ' ' + v.label;
        btn.onclick = function(){ switchTab(this.dataset.key); };
        tabsEl.appendChild(btn);
    }
})();
