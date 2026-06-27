"""tier_score 批量计算 —— 规则文档: docs/tier_score评分规则.md"""
import json, re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "hardware_db.json"

def clamp(v, lo=1, hi=10): return max(lo, min(hi, v))

def load(): 
    with open(DB_PATH, "r", encoding="utf-8") as f: return json.load(f)
def save(data):
    data["version"] = "0.2.1"
    with open(DB_PATH, "w", encoding="utf-8") as f: json.dump(data, f, ensure_ascii=False, indent=2)

# ==================== CPU ====================
# 结构化评分规则，覆盖所有消费级桌面 CPU，新发布型号自动适配无需返工
# 评分链：系列定位 → X3D标记 → 代际罚分 → APU/低功耗罚分

# 代际惩罚映射：key=代数首数字, value=落后当前代的罚分
_AMD_GEN_PENALTY = {9: 0, 8: 0, 7: -1, 5: -2, 3: -3, 2: -4, 1: -4}
_INTEL_GEN_PENALTY = {14: 0, 13: -1, 12: -2, 11: -3, 10: -4}

def _amd_gen(name):
    """从名称提取 Ryzen 代数首数字，返回罚分。例：9950X→9→0, 5700X→5→-2"""
    # 匹配模型号中的千位数字：9950X3D → 9, 7700 → 7, 5600G → 5
    m = re.search(r'[RD](?:yzen)?\s*\d\D+(\d)(\d{3})', name)
    if not m:
        # fallback: 直接搜连续四位以上数字的首位
        m2 = re.search(r'(\d)\d{3}', name)
        if m2:
            g = int(m2.group(1))
            return _AMD_GEN_PENALTY.get(g, -4)
        return -4
    g = int(m.group(1))
    return _AMD_GEN_PENALTY.get(g, -4)

def _intel_gen(name):
    """从名称提取 Intel 代际：Ultra→0, 14th→-1, 13th→-2, ..."""
    if "Ultra" in name:
        return 0
    # Core iX-14xxx → gen=14, iX-13900K → gen=13
    m = re.search(r'[iI]\d[- ](\d{2})(\d{3})', name)
    if m:
        gen = int(m.group(1))
        return _INTEL_GEN_PENALTY.get(gen, -4)
    # Pentium/Celeron/老酷睿无数字 → -4
    return -4

def score_cpu(item):
    """
    AMD 桌面级：
      Ryzen 9 + X3D → 10（双CCD旗舰）    无X3D → 9
      Ryzen 7 + X3D → 9（游戏皇）        无X3D → 7
      Ryzen 5 + X3D → 7                  无X3D → 5
      Ryzen 3 → 3
    
    Intel 桌面级：
      Ultra 9 / Core i9 → 9
      Ultra 7 / Core i7 → 7
      Ultra 5 / Core i5 → 5
      Ultra 3 / Core i3 → 3
    
    代际罚分（防老代产品评分虚高）：
      AMD: 9000代→0, 7000代→-1, 5000代→-2, 3000代→-3
      Intel: Ultra→0, 14代→-1, 13代→-2, 12代→-3, 11代→-4
    
    特定罚分：
      G后缀APU→-1, GT/GE低功耗→-2
    
    出处：hardware_db.json name/cores/l3_cache → tier_score
    """
    name = item.get("name", "")
    is_x3d = "X3D" in name
    s = 5  # 兜底
    
    is_amd = "Ryzen" in name or "Threadripper" in name
    is_intel = "Core" in name or "Ultra" in name or "Pentium" in name or "Celeron" in name
    
    if is_amd:
        if "Ryzen 9" in name:
            s = 10 if is_x3d else 9
        elif "Ryzen 7" in name:
            s = 9 if is_x3d else 7
        elif "Ryzen 5" in name:
            s = 7 if is_x3d else 5
        elif "Ryzen 3" in name:
            s = 3
        else:
            s = 2  # 老款AMD
        
        s += _amd_gen(name)  # 代际罚分（负数）
        
        # APU扣分（G后缀，缓存缩水）
        if re.search(r'\b[1-9]\d{3}G\b', name):
            s -= 1
        # 低功耗扣分
        if re.search(r'\b[GT]E\b', name):
            s -= 2
    
    elif is_intel:
        if "Ultra 9" in name:
            s = 9
        elif "Ultra 7" in name:
            s = 7
        elif "Ultra 5" in name:
            s = 5
        elif "Ultra 3" in name:
            s = 3
        elif any(k in name for k in ["i9-", "Core i9"]):
            s = 9
        elif any(k in name for k in ["i7-", "Core i7"]):
            s = 7
        elif any(k in name for k in ["i5-", "Core i5"]):
            s = 5
        elif any(k in name for k in ["i3-", "Core i3"]):
            s = 3
        else:
            s = 2  # 老款Intel
        
        s += _intel_gen(name)  # 代际罚分（负数）
    
    return clamp(s)

# ==================== 主板 ====================
MB_RULES = [
    (r"X870E|Z890", 9), (r"X670E|Z790|W790", 8), (r"X870\b|B850|B650E", 7),
    (r"B650\b|B760|Z690", 6), (r"B660|H670|A620|B840", 4), (r"H610|A520|H510", 2),
    (r"H310|B[34]60|B[34]65|Z[34][79]0|Z[45]90|B[45]60|B[45]60|X570|B550|X470|B450|A320", 1),
]
MB_T1 = ["ROG","MEG","AORUS","创世","神喜欢","MPG CARBON","ACE"]
MB_T3 = ["铭瑄","七彩虹","昂达","精粤","华南","映泰","艾维克","恩杰"]

def score_mb(item):
    name = item.get("name","")
    s = 5
    for pat, base in MB_RULES:
        if re.search(pat, name, re.IGNORECASE): s = base; break
    if any(b in name for b in MB_T1): s += 1
    if any(b in name for b in MB_T3): s -= 1
    if "ITX" in name: s -= 1
    return clamp(s)

# ==================== 内存 ====================
def _speed(s): 
    m = re.search(r'(\d{4})', str(s)); return int(m.group(1)) if m else 0
MEM_T1 = ["金士顿","芝奇","海盗船","宏碁","威刚"]
MEM_T3 = ["博帝","金邦","创见","技嘉","华硕","金百达","英睿达"]

def score_mem(item):
    name = item.get("name","")
    sp = _speed(item.get("speed","")) or _speed(name)
    d5 = "DDR5" in name or "DDR5" in str(item.get("speed",""))
    d4 = "DDR4" in name or "DDR4" in str(item.get("speed",""))
    if d5:
        if sp>=7800: s=9
        elif sp>=7200: s=8
        elif sp>=6400: s=7
        elif sp>=5600: s=6
        elif sp>=4800: s=4
        else: s=3
    elif d4:
        if sp>=4000: s=6
        elif sp>=3600: s=5
        elif sp>=3200: s=4
        elif sp>=2666: s=3
        else: s=1
    else: s=4
    cl = item.get("cl")
    if cl is not None:
        try: cv = int(str(cl).replace("C","").replace("c","").strip())
        except: cv = None
        if cv is not None:
            if d5 and cv<=28: s+=1
            elif d4 and cv<=16: s+=1
            if d5 and cv>=40: s-=1
            elif d4 and cv>=22: s-=1
    if not any(b in name for b in MEM_T1) and any(b in name for b in MEM_T3): s-=1
    return clamp(s)

# ==================== SSD ====================
SSD_T1 = ["三星","西部数据","WD","致态","英睿达","SK海力士","铠侠"]
SSD_T3 = ["达墨","梵想","爱国者","移速","幻隐","朗科","金泰克","铨兴","悉能","酷兽","金胜维","金邦","海康","大华","铭瑄","组摄","创见","雷克沙"]

def score_ssd(item):
    name = item.get("name","")
    iface = str(item.get("interface","")) + name
    is_pcie5 = "PCIe 5" in iface or "PCIE5" in iface or "PCIe5" in iface
    is_pcie4 = "PCIe 4" in iface or "PCIE4" in iface or "PCIe4" in iface
    is_pcie3 = "PCIe 3" in iface or "PCIE3" in iface or "PCIe3" in iface
    is_sata = "SATA" in iface
    if is_pcie5: s=9
    elif is_pcie4: s=7
    elif is_pcie3: s=4
    elif is_sata: s=2
    else: s=5
    if item.get("has_dram"): s+=1
    nt = item.get("nand_type","")
    if "QLC" in str(nt).upper(): s-=2
    if any(b in name for b in SSD_T1): s+=1
    elif any(b in name for b in SSD_T3): s-=1
    return clamp(s)

# ==================== 电源 ====================
PSU_RATING = {"钛金":10,"白金牌":9,"白金":9,"金牌":8,"金":8,"银牌":5,"银":5,"铜牌":3,"铜":3,"白牌":1,"白":1}
PSU_T1 = ["海韵","振华","台达","全汉"]
PSU_T3 = ["酷冷","鑫谷","先马","骨伽","撒哈拉","玄武","TT","Thermaltake","游戏悍将","大水牛"]

def score_psu(item):
    name = item.get("name","")
    rat = str(item.get("rating",""))
    s = 5
    for k,v in PSU_RATING.items():
        if k in rat: s=v; break
    atx = item.get("atx_version","")
    if "3.1" in atx: s+=1
    elif "3.0" in atx: s+=0
    cap = item.get("capacitor","")
    if "全日系" in cap: s+=1
    elif "国产" in cap: s-=1
    war = str(item.get("warranty",""))
    if "10" in war: s+=1
    elif "3" in war: s-=1
    if any(b in name for b in PSU_T1): s+=1
    elif any(b in name for b in PSU_T3): s-=1
    if item.get("is_e_waste"): s=min(s, 3)
    return clamp(s)

# ==================== 散热 ====================
COOLER_T1 = ["猫头鹰","海盗船","NZXT","华硕","恩杰","瓦尔基里","EK"]
COOLER_T3 = ["爱国者","先马","赛普雷","鑫谷","骨伽","撒哈拉","大水牛","安耐美"]

def score_cooler(item):
    name = item.get("name","")
    typ = item.get("type","")
    if typ == "水冷" or typ == "AIO":
        rs = item.get("radiator_size",0) or 0
        if rs>=420: s=9
        elif rs>=360: s=8
        elif rs>=280: s=7
        elif rs>=240: s=5
        elif rs>=120: s=3
        else: s=5
        if item.get("has_screen"): s+=1
    else:
        tw = item.get("tower","")
        if tw=="双塔": s=7
        elif tw=="单塔": s=5
        else: s=2
        tdp = item.get("tdp_cooling",0) or 0
        if tdp>=250: s+=1
    if any(b in name for b in COOLER_T1): s+=1
    elif any(b in name for b in COOLER_T3): s-=1
    return clamp(s)

# ==================== 机箱 ====================
CASE_T1 = ["联力","海盗船","NZXT","追风者","Fractal","abee"]
CASE_T3 = ["先马","鑫谷","骨伽","撒哈拉","大水牛","爱国者","玩嘉","阿帕奇"]

def score_case(item):
    name = item.get("name","")
    ff = item.get("form_factor","")
    if "Full" in ff: s=8
    elif "ATX" in ff or "Mid" in ff: s=6
    else: s=3
    # 兼容性加分
    fans = str(item.get("fan_positions",""))
    rad = str(item.get("radiator_top",""))
    gpu_l = item.get("max_gpu_length",0) or 0
    if "360" in rad and gpu_l>=400: s+=2
    elif "360" in rad and gpu_l>=350: s+=1
    if any(b in name for b in CASE_T1): s+=1
    elif any(b in name for b in CASE_T3): s-=1
    return clamp(s)

# ==================== 主流程 ====================
MODULES = [
    ("cpu", score_cpu),
    ("motherboard", score_mb),
    ("gpu", None),  # 已有 tier_score，跳过
    ("memory", score_mem),
    ("ssd", score_ssd),
    ("psu", score_psu),
    ("cooler", score_cooler),
    ("case", score_case),
]

def run():
    data = load()
    total_scored = 0
    for mod_key, scorer in MODULES:
        if scorer is None:
            print(f"  GPU: 跳过 (已有 tier_score)")
            continue
        items = data.get(mod_key, [])
        scored = 0
        for item in items:
            if isinstance(item, dict):
                old = item.get("tier_score")
                item["tier_score"] = scorer(item)
                if old != item["tier_score"]:
                    scored += 1
        total_scored += scored
        print(f"  {mod_key:15s}: {len(items):4d} 条 → 评分 {scored} 条")
    save(data)
    print(f"\n共评分 {total_scored} 条，已写入 {DB_PATH}")
    # 重建索引
    import sys
    sys.path.insert(0, str(BASE_DIR))
    from engine.search import build_index
    n = build_index()
    print(f"搜索索引已重建: {n} 条")

if __name__ == "__main__":
    run()
