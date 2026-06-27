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

// ============ 8维评分引擎 ============

// 三种装机策略权重
const STRATEGY_WEIGHTS = {
    "性价比":  {cpu_gpu:0.22,power:0.15,thermal:0.15,upgrade:0.10,psu:0.12,mem:0.10,ssd:0.08,util:0.08},
    "一步到位":{cpu_gpu:0.18,power:0.20,thermal:0.18,upgrade:0.12,psu:0.12,mem:0.10,ssd:0.10,util:0},
    "面向未来":{cpu_gpu:0.15,power:0.15,thermal:0.12,upgrade:0.28,psu:0.10,mem:0.08,ssd:0.12,util:0}
};

// 分级颜色：白/绿/蓝/紫/金/红
function scoreColorTier(score) {
    if (score >= 96) return {color:'#ff4444', label:'极致性能'};
    if (score >= 90) return {color:'#ffb347', label:'黄金配置'};
    if (score >= 80) return {color:'#b44dff', label:'高效合理'};
    if (score >= 70) return {color:'#448aff', label:'中规中矩'};
    if (score >= 60) return {color:'#44cc44', label:'基本可用'};
    if (score >= 45) return {color:'#aaaaaa', label:'存在短板'};
    return {color:'#ff4444', label:'需大改'};
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
    return t.indexOf('风冷') !== -1 || t === 'air';
}

// 检查冷却器是否为水冷
function isWaterCooler(cooler) {
    var t = (cooler.type || '').toLowerCase();
    return t.indexOf('水冷') !== -1;
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
}

// 主评分函数
function calculateRigScore() {
    var rigCategories = ['cpu','gpu','motherboard','memory','ssd','psu','cooler','case'];
    var allPresent = rigCategories.every(function(k) { return selectedMap[k] && selectedMap[k].size > 0; });
    if (!allPresent) return alert('装机跑分需要8大件(CPU/显卡/主板/内存/SSD/电源/散热/机箱)至少各选1款');

    pickRigItems();
    var cpu = rigSelectedCPU, mb = rigSelectedMB, gpu = rigSelectedGPU;
    if (!cpu || !mb || !gpu) return alert('请至少选择CPU、主板和显卡（核心三件）');

    var strategyBtns = document.querySelectorAll('.strategy-btn');
    var strategy = '性价比';
    strategyBtns.forEach(function(b) { if (b.classList.contains('active')) strategy = b.dataset.s; });
    if (!strategy) strategy = '性价比';

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

    // === 加权总分 ===
    var total = 0, totalW = 0;
    for (var k in w) {
        if (dims[k]) { total += dims[k].score * w[k]; totalW += w[k]; }
    }
    total = totalW > 0 ? Math.round(total / totalW * 100) / 100 : 0;

    // === 洋垃圾检测 ===
    var ewaste = [];
    if (cpu.is_e_waste) ewaste.push('CPU: ' + cpu.name);
    if (mb.is_e_waste) ewaste.push('主板: ' + mb.name);
    if (mem && mem.is_e_waste) ewaste.push('内存: ' + mem.name);
    if (ssd && ssd.is_e_waste) ewaste.push('SSD: ' + ssd.name);
    if (cooler && cooler.is_e_waste) ewaste.push('散热器: ' + cooler.name);
    if (psu && psu.is_e_waste) ewaste.push('电源: ' + psu.name);

    renderScoringResult({total: total, dims: dims, w: w, redFlags: redFlags, deductions: deductions, bonuses: bonuses, strategy: strategy, passed: true, ewaste: ewaste});
}

function renderScoringResult(r) {
    var section = document.getElementById('compareSection');
    var list = document.getElementById('compareList');
    section.style.display = 'block';

    var colorTier = scoreColorTier(r.total * 100);
    var html = '<div class="bench-header"><h3>装机综合评分</h3><button class="btn-close" onclick="closeCompare()">×</button></div>';
    html += '<div class="strategy-selector">';
    ['性价比', '一步到位', '面向未来'].forEach(function(s) {
        html += '<button class="strategy-btn' + (s === r.strategy ? ' active' : '') + '" data-s="' + s + '">' + s + '</button>';
    });
    html += '</div>';

    if (!r.passed) {
        html += '<div class="score-hero"><div class="score-num" style="color:#ff4444">✕</div>';
        html += '<div class="score-oneliner">存在致命兼容性问题，无法继续评分</div></div>';
    } else {
        var totalPct = (r.total * 100);
        html += '<div class="score-hero">';
        html += '<div class="score-num" style="color:' + colorTier.color + '">' + (r.total * 100).toFixed(1) + '</div>';
        html += '<div class="score-bar-wrap"><div class="score-bar-fill" style="width:' + totalPct + '%;background:' + colorTier.color + '"></div></div>';
        var oneliner = totalPct >= 90 ? '近乎完美' : totalPct >= 80 ? '非常合理' : totalPct >= 70 ? '中规中矩' : totalPct >= 60 ? '能用但有短板' : totalPct >= 45 ? '不太合理' : '得大改';
        html += '<div class="score-oneliner">' + oneliner + ' &middot; <span style="color:' + colorTier.color + '">' + colorTier.label + '</span> &middot; ' + r.strategy + '策略</div></div>';

        var labels = {cpu_gpu:'CPU-GPU匹配', power:'供电合理性', thermal:'散热余量', upgrade:'升级空间', psu:'电源余量', mem:'内存匹配', ssd:'SSD存储', util:'参数利用率'};
        html += '<table class="dim-table"><thead><tr><th>维度</th><th>得分</th><th>权重</th><th>说明</th></tr></thead><tbody>';
        for (var k in r.dims) {
            var d = r.dims[k];
            var dimColor = scoreColorTier(d.score);
            html += '<tr><td>' + (labels[k] || k) + '</td><td class="dim-score" style="color:' + dimColor.color + ';font-weight:700">' + d.score + '</td><td class="dim-weight">' + ((r.w[k] || 0) * 100).toFixed(0) + '%</td><td class="dim-detail">' + d.detail + '</td></tr>';
        }
        html += '</tbody></table>';
    }

    if (r.redFlags.length) {
        html += '<div class="flags-section">';
        for (var i = 0; i < r.redFlags.length; i++) {
            var f = r.redFlags[i];
            html += '<div class="flag ' + (f.critical ? 'flag-critical' : 'flag-warn') + '"><span class="flag-tag">[' + (f.critical ? '致命' : '警告') + ']</span> ' + f.cat + ': ' + f.msg + '</div>';
        }
        html += '</div>';
    }

    if (r.deductions.length) {
        html += '<div class="list-section"><h4 class="red-title">降分项</h4>';
        for (var j = 0; j < r.deductions.length; j++) {
            html += '<div class="list-item">- ' + r.deductions[j].text + '</div>';
        }
        html += '</div>';
    }
    if (r.bonuses.length) {
        html += '<div class="list-section"><h4 class="green-title">加分项</h4>';
        for (var k = 0; k < r.bonuses.length; k++) {
            html += '<div class="list-item">+ ' + r.bonuses[k].text + '</div>';
        }
        html += '</div>';
    }

    if (r.ewaste.length) {
        html += '<div class="ewaste-warn">该配置包含洋垃圾硬件：' + r.ewaste.join('、') + '</div>';
    }

    // 机箱需求
    html += '<div id="caseReqsSection" class="case-reqs-section"><h4>机箱需求建议</h4><ul id="caseReqs" class="case-reqs-list"></ul></div>';

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
        var v = CATEGORIES[k];
        var btn = document.createElement('button');
        btn.className = 'tab-btn';
        btn.dataset.key = k;
        btn.textContent = v.icon + ' ' + v.label;
        btn.onclick = function(){ switchTab(this.dataset.key); };
        tabsEl.appendChild(btn);
    }
})();