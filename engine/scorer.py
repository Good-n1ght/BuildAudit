"""
硬件打分引擎

评分维度：
1. 单品 tier_score (1-10)
2. 兼容性加分
3. 场景适配加分
4. 瓶颈/电子垃圾扣分

最终色阶映射见 docs/颜色分级体系.md
"""
from dataclasses import dataclass, field
from enum import Enum


class ColorTier(str, Enum):
    WHITE = "white"       # 0-59
    GREEN = "green"       # 60-69
    BLUE = "blue"         # 70-79
    PURPLE = "purple"     # 80-89
    GOLD = "gold"         # 90-95
    RED = "red"           # 96-99
    BLACK = "black"       # 100

    @property
    def css(self) -> str:
        return {
            ColorTier.WHITE: "#B0B0B0",
            ColorTier.GREEN: "#4CAF50",
            ColorTier.BLUE: "#2196F3",
            ColorTier.PURPLE: "#9C27B0",
            ColorTier.GOLD: "#FFD700",
            ColorTier.RED: "#F44336",
            ColorTier.BLACK: "#1A1A1A",
        }[self]

    @property
    def label(self) -> str:
        return {
            ColorTier.WHITE: "不推荐",
            ColorTier.GREEN: "能用",
            ColorTier.BLUE: "合理",
            ColorTier.PURPLE: "优秀",
            ColorTier.GOLD: "顶级",
            ColorTier.RED: "极致",
            ColorTier.BLACK: "至高无上",
        }[self]


def score_to_color_tier(score: float) -> ColorTier:
    """将 0-100 分值映射到颜色阶梯"""
    if score >= 100:
        return ColorTier.BLACK
    elif score >= 96:
        return ColorTier.RED
    elif score >= 90:
        return ColorTier.GOLD
    elif score >= 80:
        return ColorTier.PURPLE
    elif score >= 70:
        return ColorTier.BLUE
    elif score >= 60:
        return ColorTier.GREEN
    else:
        return ColorTier.WHITE


@dataclass
class SingleScore:
    """单品评分结果"""
    name: str
    module: str           # cpu/gpu/motherboard/memory/ssd/psu/cooler/case
    tier_score: int       # 1-10 基础分
    is_e_waste: bool
    raw_score: float      # 中间分
    final_score: float    # 0-100 最终分
    color_tier: ColorTier


@dataclass
class BuildScore:
    """整机评分结果"""
    cpu: SingleScore = None
    gpu: SingleScore = None
    motherboard: SingleScore = None
    memory: SingleScore = None
    ssd: SingleScore = None
    psu: SingleScore = None
    cooler: SingleScore = None
    case: SingleScore = None

    compatibility_bonus: float = 0.0     # 兼容性加分
    scenario_bonus: float = 0.0          # 场景适配加分
    bottleneck_penalty: float = 0.0      # 瓶颈扣分
    e_waste_penalty: float = 0.0         # 电子垃圾扣分

    total_score: float = 0.0
    color_tier: ColorTier = ColorTier.WHITE

    def summary(self) -> dict:
        return {
            "total_score": round(self.total_score, 1),
            "color_tier": self.color_tier.value,
            "color_label": self.color_tier.label,
            "color_css": self.color_tier.css,
            "components": {
                k: {
                    "name": v.name,
                    "tier_score": v.tier_score,
                    "color": v.color_tier.value,
                }
                for k, v in self.__dict__.items()
                if isinstance(v, SingleScore)
            },
            "details": {
                "compatibility_bonus": self.compatibility_bonus,
                "scenario_bonus": self.scenario_bonus,
                "bottleneck_penalty": self.bottleneck_penalty,
                "e_waste_penalty": self.e_waste_penalty,
            },
        }


# ---------- 权重配置 ----------
WEIGHTS = {
    "cpu": 0.22,
    "gpu": 0.28,
    "motherboard": 0.12,
    "memory": 0.08,
    "ssd": 0.07,
    "psu": 0.10,
    "cooler": 0.07,
    "case": 0.06,
}


def score_single(item: dict, module: str) -> SingleScore:
    """单品打分：tier_score * 10 为基础分，电子垃圾再打折"""
    ts = item.get("tier_score", 5)
    is_ew = item.get("is_e_waste", False)

    base = ts * 10  # 1-10 → 10-100
    if is_ew:
        base *= 0.5  # 电子垃圾打五折

    return SingleScore(
        name=item.get("name", "未知"),
        module=module,
        tier_score=ts,
        is_e_waste=is_ew,
        raw_score=base,
        final_score=base,
        color_tier=score_to_color_tier(base),
    )


def score_build(components: dict) -> BuildScore:
    """
    整机综合评分

    components: {
        "cpu": dict, "gpu": dict, "motherboard": dict, "memory": dict,
        "ssd": dict, "psu": dict, "cooler": dict, "case": dict,
    }
    """
    build = BuildScore()

    # 1. 各配件单独打分
    singles = {}
    for mod, item in components.items():
        if item:
            ss = score_single(item, mod)
            setattr(build, mod, ss)
            singles[mod] = ss

    # 2. 加权总基础分
    weighted_sum = 0.0
    total_weight = 0.0
    for mod, ss in singles.items():
        w = WEIGHTS.get(mod, 0.0)
        weighted_sum += ss.raw_score * w
        total_weight += w
    if total_weight > 0:
        weighted_sum /= total_weight  # 归一化

    # 3. 兼容性加分（占位，Phase 3 实现）
    build.compatibility_bonus = 0.0

    # 4. 场景适配加分（占位）
    build.scenario_bonus = 0.0

    # 5. 瓶颈扣分（占位）
    build.bottleneck_penalty = 0.0

    # 6. 电子垃圾扣分
    e_waste_count = sum(1 for ss in singles.values() if ss.is_e_waste)
    build.e_waste_penalty = e_waste_count * 10.0

    # 7. 最终得分
    build.total_score = max(0,
        weighted_sum
        + build.compatibility_bonus
        + build.scenario_bonus
        - build.bottleneck_penalty
        - build.e_waste_penalty
    )
    build.color_tier = score_to_color_tier(build.total_score)

    return build


if __name__ == "__main__":
    # 测试颜色映射
    for s in [30, 65, 75, 85, 92, 97, 100]:
        c = score_to_color_tier(s)
        print(f"  {s:3d} → {c.value:6s} ({c.label:4s})  {c.css}")
