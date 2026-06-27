#!/usr/bin/env python3
"""
PC硬件搭配评分引擎 v0.1
纯规则计算，零AI推理依赖
"""

import json
import math
import os
from dataclasses import dataclass, field
from typing import Optional

# ============ 数据加载 ============

DB_PATH = os.path.join(os.path.dirname(__file__), "hardware_db.json")

def load_db():
    with open(DB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

# ============ 数据结构 ============

@dataclass
class RedFlag:
    """标红项 - 严重不兼容/危险"""
    severity: str  # "critical" 或 "warning"
    category: str
    message: str

@dataclass
class ScoreItem:
    """单项评分详情"""
    category: str
    score: float  # 0-100
    weight: float
    detail: str

@dataclass
class ScoringResult:
    """完整评分结果"""
    total_score: float = 0.0
    dimension_scores: dict = field(default_factory=dict)  # {维度名: (分数, 权重)}
    red_flags: list = field(default_factory=list)
    deductions: list = field(default_factory=list)  # 降分项
    bonuses: list = field(default_factory=list)  # 加分项
    tips: list = field(default_factory=list)  # 你可能不知道
    strategy: str = "性价比"
    passed: bool = True  # 是否有致命问题

# ============ 权重矩阵 ============

WEIGHTS = {
    "性价比": {
        "cpu_gpu_match": 0.30,
        "power_delivery": 0.20,
        "thermal_headroom": 0.15,
        "upgrade_path": 0.15,
        "psu_headroom": 0.10,
        "param_utilization": 0.10,
    },
    "一步到位": {
        "cpu_gpu_match": 0.25,
        "power_delivery": 0.30,
        "thermal_headroom": 0.25,
        "upgrade_path": 0.10,
        "psu_headroom": 0.10,
        "param_utilization": 0.0,
    },
    "面向未来": {
        "cpu_gpu_match": 0.20,
        "power_delivery": 0.20,
        "thermal_headroom": 0.15,
        "upgrade_path": 0.35,
        "psu_headroom": 0.10,
        "param_utilization": 0.0,
    },
}

# ============ 兼容性检查 ============

def check_socket_compatibility(cpu, mb, result):
    """检查CPU与主板接口"""
    if cpu["socket"] != mb["socket"]:
        result.red_flags.append(RedFlag(
            severity="critical",
            category="接口不匹配",
            message=f'CPU接口 {cpu["socket"]} 与主板接口 {mb["socket"]} 不兼容，无法安装'
        ))
        result.passed = False

def check_memory_compatibility(cpu, mb, ram_type_hint=None):
    """检查内存代数兼容性"""
    cpu_mem = set(cpu["memory_type"].split("|"))
    mb_mem = set(mb["memory_type"].split("|"))
    compatible = cpu_mem & mb_mem
    issues = []

    if not compatible:
        return [RedFlag(
            severity="critical",
            category="内存代数不匹配",
            message=f'CPU支持 {cpu["memory_type"]}，主板支持 {mb["memory_type"]}，无交集无法使用'
        )]

    if ram_type_hint and ram_type_hint not in compatible:
        issues.append(RedFlag(
            severity="critical",
            category="内存代数不匹配",
            message=f'你选择的内存类型 {ram_type_hint} 不在CPU/主板共同支持的范围内 ({", ".join(sorted(compatible))})'
        ))

    return issues

def check_vrm_for_cpu(cpu, mb, result):
    """检查主板供电是否足够"""
    cpu_tdp = cpu["tdp"]
    vrm_score = mb.get("vrm_quality_score", 5)

    # 供电严重不足判断
    if cpu_tdp >= 170 and vrm_score <= 4:
        result.red_flags.append(RedFlag(
            severity="warning",
            category="供电不足风险",
            message=f'{cpu["name"]} TDP {cpu_tdp}W，{mb["name"]} 供电较弱(vrm_score={vrm_score})，满载可能降频或烧VRM'
        ))
    elif cpu_tdp >= 125 and vrm_score <= 3:
        result.red_flags.append(RedFlag(
            severity="warning",
            category="供电不足风险",
            message=f'{cpu["name"]} TDP {cpu_tdp}W，{mb["name"]} 供电太弱(vrm_score={vrm_score})，不建议此搭配'
        ))
        result.passed = False

def check_psu_capacity(cpu, gpu, psu_wattage, result):
    """检查电源功率"""
    if psu_wattage is None:
        return

    total_tdp = cpu["tdp"] + gpu["tdp"] + 50  # +50W 其他配件
    load_ratio = total_tdp / psu_wattage

    if load_ratio > 0.8:
        result.red_flags.append(RedFlag(
            severity="warning",
            category="电源功率不足",
            message=f'总功耗约 {int(total_tdp)}W，电源 {psu_wattage}W，负载率 {load_ratio:.0%}，超过80%安全线'
        ))

# ============ 评分计算 ============

def score_cpu_gpu_match(cpu, gpu):
    """CPU-GPU匹配度评分"""
    cpu_tier = _cpu_performance_tier(cpu)
    gpu_tier = _gpu_performance_tier(gpu)

    # 理想匹配：CPU和GPU同级别
    tier_gap = abs(cpu_tier - gpu_tier)

    if tier_gap == 0:
        return 95, "CPU与GPU级别完美匹配，无明显瓶颈"
    elif tier_gap == 1:
        return 78, "CPU与GPU有轻度错配，尚可接受"
    elif tier_gap == 2:
        return 55, "CPU与GPU存在明显瓶颈，一侧浪费或拖后腿"
    else:
        direction = "CPU性能过剩" if cpu_tier > gpu_tier else "CPU拖后腿"
        return 30, f"CPU与GPU严重错配({direction})，建议重新考虑"

def score_power_delivery(cpu, mb, strategy):
    """供电合理性评分"""
    cpu_tdp = cpu["tdp"]
    vrm_score = mb.get("vrm_quality_score", 5)

    # 基础分根据VRM质量
    base = vrm_score * 10

    # 供电冗余加分（一步到位和面向未来看重这个）
    if vrm_score >= 8 and cpu_tdp <= 120:
        redundancy_bonus = 15
    elif vrm_score >= 7 and cpu_tdp <= 105:
        redundancy_bonus = 10
    elif vrm_score >= 6 and cpu_tdp <= 65:
        redundancy_bonus = 5
    else:
        redundancy_bonus = 0

    # 供电刚好够不加分
    if vrm_score >= 6 and cpu_tdp <= 125:
        pass
    elif vrm_score <= 4 and cpu_tdp >= 105:
        base -= 20

    final = min(100, max(0, base + redundancy_bonus))

    detail = f'{mb["name"]} VRM {mb.get("vrm_phases","?")}相 {mb.get("vrm_mos","?")}MOS, '
    if redundancy_bonus > 0:
        detail += f"供电余量充足(+{redundancy_bonus})"
    elif final >= 70:
        detail += "供电合理"
    else:
        detail += "供电偏紧"

    return final, detail

def score_thermal_headroom(cpu, cooler_tdp, result):
    """散热余量评分 (暂用简化模型，cooler_tdp为散热器标称解热能力)"""
    if cooler_tdp is None:
        return 60, "未选择散热器，按默认原装散热评估"

    cpu_tdp = cpu["tdp"]
    ratio = cooler_tdp / cpu_tdp

    if ratio >= 2.0:
        return 95, f"散热余量充足(散热器{cooler_tdp}W / CPU{cpu_tdp}W = {ratio:.1f}倍), 安静运行+超频空间"
    elif ratio >= 1.5:
        return 82, f"散热余量良好({ratio:.1f}倍), 日常安静运行无压力"
    elif ratio >= 1.2:
        return 65, f"散热基本够用({ratio:.1f}倍), 满载风扇声可能较大"
    elif ratio >= 1.0:
        return 45, f"散热勉强压住({ratio:.1f}倍), 满载可能降频"
    else:
        result.red_flags.append(RedFlag(
            severity="warning",
            category="散热不足",
            message=f'散热器解热能力({cooler_tdp}W)小于CPU TDP({cpu_tdp}W), 满载必然降频'
        ))
        return 15, f"散热器压不住CPU, 必须更换更强散热器"

def score_upgrade_path(cpu, mb, result):
    """升级空间评分"""
    score = 50
    bonuses = []

    # AM5平台寿命长
    if cpu["socket"] == "AM5":
        score += 30
        bonuses.append("AM5平台承诺支持至2029+，升级路径极佳")
    elif cpu["socket"] == "LGA1851":
        score += 20
        bonuses.append("LGA1851新平台，预期有2-3代升级空间")
    elif cpu["socket"] == "AM4":
        score += 5
        bonuses.append("AM4已到末期，唯一升级路径是5700X3D/5800X3D")
    elif cpu["socket"] in ("LGA2011-3",):
        score -= 25
        bonuses.append("平台已完全淘汰，无任何升级空间")

    # PCIe 5.0支持
    if "PCIe5.0" in mb.get("pcie_gen", ""):
        score += 10
        bonuses.append("主板支持PCIe 5.0，未来显卡/SSD升级无忧")
    elif "PCIe4.0" in mb.get("pcie_gen", ""):
        score += 3
        bonuses.append("PCIe 4.0够用但非最新")

    # 内存插槽余量
    if mb.get("memory_slots", 0) >= 4:
        score += 5
        bonuses.append("4个内存插槽，有升级空间")

    final = min(100, max(0, score))

    for b in bonuses:
        result.bonuses.append(ScoreItem(
            category="升级空间",
            score=final,
            weight=0,
            detail=b
        ))

    return final, " | ".join(bonuses) if bonuses else "平台已定型，升级空间有限"

def score_psu_headroom(cpu, gpu, psu_wattage):
    """电源余量评分"""
    if psu_wattage is None:
        return 50, "未选择电源，按默认评估"

    total_tdp = cpu["tdp"] + gpu["tdp"] + 50
    load_ratio = total_tdp / psu_wattage

    if load_ratio <= 0.5:
        return 92, f"电源余量充足(负载{load_ratio:.0%}), 未来升级无忧"
    elif load_ratio <= 0.7:
        return 78, f"电源余量良好(负载{load_ratio:.0%}), 正常使用绰绰有余"
    elif load_ratio <= 0.8:
        return 55, f"电源负载偏高(负载{load_ratio:.0%}), 踩安全线"
    else:
        return 25, f"电源接近满载(负载{load_ratio:.0%}), 必须更换更大功率电源"

def score_param_utilization(cpu, mb, result):
    """参数利用率评分 - 不比价格比参数"""
    score = 60

    # 主板参数是否物尽其用
    vrm = mb.get("vrm_quality_score", 5)
    cpu_tdp = cpu["tdp"]

    if vrm >= 7 and cpu_tdp >= 105:
        score += 20
        result.bonuses.append(ScoreItem(category="参数利用率", score=0, weight=0,
            detail=f'{mb["name"]} 的强供电({mb.get("vrm_phases","")})被充分利用'))
    elif vrm >= 7 and cpu_tdp <= 65:
        score -= 15
        result.deductions.append(ScoreItem(category="参数利用率", score=0, weight=0,
            detail=f'{mb["name"]} 供电过剩但CPU功耗低，主板参数未充分利用'))

    # PCIe利用率
    if "PCIe5.0" in mb.get("pcie_gen", "") and cpu.get("gen", "") in ("Ryzen 9000", "Arrow Lake"):
        score += 10
        result.bonuses.append(ScoreItem(category="参数利用率", score=0, weight=0,
            detail="PCIe 5.0主板搭配支持PCIe 5.0的CPU，参数充分利用"))

    return min(100, max(0, score)), f"参数利用率评分 {score}"

def _cpu_performance_tier(cpu):
    """CPU性能分级 1-7，1最低"""
    name = cpu["name"]
    gen = cpu.get("gen", "")
    cores = cpu.get("cores", 0)

    if "9800X3D" in name or "7950X" in name or "9950X" in name:
        return 7
    if "7800X3D" in name or "7900X" in name or "14700K" in name or "14900K" in name:
        return 6
    if "7700" in name or "9700X" in name or "13600K" in name or "13700K" in name:
        return 5
    if "7600X" in name or "9600X" in name or "12600K" in name or "245K" in name:
        return 4
    if "7600" in name or "7500F" in name or "12400" in name or "5700X3D" in name:
        return 3
    if "5600" in name or "12100" in name:
        return 2
    if "E5-" in name:
        return 1 if cores < 10 else 2
    return 2

def _gpu_performance_tier(gpu):
    """GPU性能分级 1-7，1最低"""
    tier = gpu.get("performance_tier", "")

    tier_map = {
        "旗舰": 7,
        "高端": 6,
        "中高端": 5,
        "中端": 4,
        "中低端": 3,
        "入门": 2,
        "老旧旗舰": 4,
        "老旧入门": 1,
    }
    return tier_map.get(tier, 3)

# ============ 主评分函数 ============

def run_scoring(config: dict) -> ScoringResult:
    """
    执行完整评分

    config = {
        "cpu": "Ryzen 5 7500F",       # 必填
        "motherboard": "微星 B650M MORTAR WIFI",  # 必填
        "gpu": "RTX 5060 Ti 16G",      # 必填
        "psu_wattage": 750,            # 可选
        "cooler_tdp": 180,             # 可选，散热器标称解热能力(W)
        "ram_type": "DDR5",            # 可选
        "strategy": "性价比",           # 必选，性价比/一步到位/面向未来
        "user_mode": "小白",            # 可选
    }
    """
    db = load_db()
    strategy = config.get("strategy", "性价比")
    weights = WEIGHTS.get(strategy, WEIGHTS["性价比"])
    result = ScoringResult(strategy=strategy)

    # --- 查找硬件 ---
    cpu = next((c for c in db["cpu"] if c["name"] == config["cpu"]), None)
    mb = next((m for m in db["motherboard"] if m["name"] == config["motherboard"]), None)
    gpu = next((g for g in db["gpu"] if g["name"] == config["gpu"]), None)

    if not cpu:
        result.red_flags.append(RedFlag("critical", "未找到CPU", f'数据库中无 "{config["cpu"]}"'))
        result.passed = False
        return result
    if not mb:
        result.red_flags.append(RedFlag("critical", "未找到主板", f'数据库中无 "{config["motherboard"]}"'))
        result.passed = False
        return result
    if not gpu:
        result.red_flags.append(RedFlag("critical", "未找到显卡", f'数据库中无 "{config["gpu"]}"'))
        result.passed = False
        return result

    # --- 第一步：硬兼容性检查 ---
    check_socket_compatibility(cpu, mb, result)
    mem_issues = check_memory_compatibility(cpu, mb, config.get("ram_type"))
    for issue in mem_issues:
        result.red_flags.append(issue)
        if issue.severity == "critical":
            result.passed = False

    check_vrm_for_cpu(cpu, mb, result)
    if config.get("psu_wattage"):
        check_psu_capacity(cpu, gpu, config["psu_wattage"], result)

    # 如果有致命问题，直接返回
    if not result.passed:
        return result

    # --- 第二步：搭配评分 ---
    dims = {}

    # CPU-GPU匹配
    s, d = score_cpu_gpu_match(cpu, gpu)
    dims["cpu_gpu_match"] = (s, weights["cpu_gpu_match"], d)

    # 供电合理性
    s, d = score_power_delivery(cpu, mb, strategy)
    dims["power_delivery"] = (s, weights["power_delivery"], d)

    # 散热余量
    s, d = score_thermal_headroom(cpu, config.get("cooler_tdp"), result)
    dims["thermal_headroom"] = (s, weights["thermal_headroom"], d)

    # 升级空间
    s, d = score_upgrade_path(cpu, mb, result)
    dims["upgrade_path"] = (s, weights["upgrade_path"], d)

    # 电源余量
    s, d = score_psu_headroom(cpu, gpu, config.get("psu_wattage"))
    dims["psu_headroom"] = (s, weights["psu_headroom"], d)

    # 参数利用率
    if weights["param_utilization"] > 0:
        s, d = score_param_utilization(cpu, mb, result)
        dims["param_utilization"] = (s, weights["param_utilization"], d)

    # --- 第三步：计算总分 ---
    total = 0.0
    result.dimension_scores = {}
    for key, (score, weight, detail) in dims.items():
        total += score * weight
        result.dimension_scores[key] = {
            "score": round(score, 1),
            "weight": weight,
            "detail": detail,
            "label": _dim_label(key)
        }

    result.total_score = round(total, 1)
    return result

def _dim_label(key):
    labels = {
        "cpu_gpu_match": "CPU-GPU匹配",
        "power_delivery": "供电合理性",
        "thermal_headroom": "散热余量",
        "upgrade_path": "升级空间",
        "psu_headroom": "电源余量",
        "param_utilization": "参数利用率",
    }
    return labels.get(key, key)

# ============ 输出格式化 ============

def format_result(result: ScoringResult) -> str:
    """格式化评分为可读文本"""
    lines = []
    lines.append("=" * 56)
    lines.append(f"  赛 博 跑 分  —  {result.strategy}策略")
    lines.append("=" * 56)

    if result.red_flags:
        lines.append("")
        lines.append("🔴 标红项（严重问题）：")
        for rf in result.red_flags:
            sev = "致命" if rf.severity == "critical" else "警告"
            lines.append(f"  [{sev}] {rf.category}: {rf.message}")

    if not result.passed:
        lines.append("")
        lines.append("  ⛔ 存在致命兼容性问题，无法继续评分。请先解决以上问题。")
        return "\n".join(lines)

    # 总分
    lines.append("")
    score_bar = _score_bar(result.total_score)
    lines.append(f"  总分: {result.total_score:.1f} / 100  {score_bar}")

    # 维度明细
    lines.append("")
    lines.append(f"  {'维度':<16} {'得分':>6} {'权重':>6}  {'说明'}")
    lines.append(f"  {'-'*16} {'-'*6} {'-'*6}  {'-'*20}")
    for key, info in result.dimension_scores.items():
        lines.append(f"  {info['label']:<16} {info['score']:>5.1f}  {info['weight']:>4.0%}   {info['detail']}")

    # 降分项
    if result.deductions:
        lines.append("")
        lines.append("  ⬇ 降分项：")
        for d in result.deductions:
            lines.append(f"    - {d.detail}")

    # 加分项
    if result.bonuses:
        lines.append("")
        lines.append("  ⬆ 加分项：")
        for b in result.bonuses:
            lines.append(f"    + {b.detail}")

    # 洋垃圾提醒
    cpu_found = any("洋垃圾" in rf.message for rf in result.red_flags)
    # (这个从notes里取，实际走scoring时处理)

    # 一句话点评
    lines.append("")
    lines.append(f"  💬 {_one_liner(result)}")

    lines.append("")
    lines.append("=" * 56)
    return "\n".join(lines)

def _score_bar(score):
    """ASCII进度条"""
    filled = int(score / 5)
    bar = "█" * filled + "░" * (20 - filled)
    return f"[{bar}]"

def _one_liner(result):
    """生成一句话点评"""
    if result.total_score >= 90:
        return "近乎完美的搭配，挑不出毛病"
    elif result.total_score >= 80:
        return "非常合理的配置，小细节可以微调"
    elif result.total_score >= 70:
        return "中规中矩的搭配，有几个小遗憾"
    elif result.total_score >= 60:
        return "能用但有明显短板，建议调整一两处"
    elif result.total_score >= 45:
        return "搭配不太合理，建议重新考虑核心部件"
    else:
        return "这搭配得大改，问题不少"

# ============ 测试入口 ============

if __name__ == "__main__":
    # 测试配置1：AM5均衡配置
    test_config = {
        "cpu": "Ryzen 5 7500F",
        "motherboard": "微星 B650M MORTAR WIFI",
        "gpu": "RTX 5060 Ti 16G",
        "psu_wattage": 750,
        "cooler_tdp": 180,
        "ram_type": "DDR5",
        "strategy": "性价比",
    }

    print("=" * 56)
    print("  测试配置：")
    print(f"  CPU:  {test_config['cpu']}")
    print(f"  主板: {test_config['motherboard']}")
    print(f"  显卡: {test_config['gpu']}")
    print(f"  电源: {test_config['psu_wattage']}W")
    print("=" * 56)

    result = run_scoring(test_config)
    print(format_result(result))

    print()
    print("  JSON输出（供前端使用）：")
    print(json.dumps({
        "total_score": result.total_score,
        "dimension_scores": result.dimension_scores,
        "red_flags": [{"severity": rf.severity, "category": rf.category, "message": rf.message} for rf in result.red_flags],
        "strategy": result.strategy,
        "passed": result.passed,
    }, ensure_ascii=False, indent=2))
