---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 1d901ace6510f3f7162dab4a93f6993e_b57805156d1a11f1a0095254002afed2
    ReservedCode1: DOMOt/6HgT9jqXkbizSMAKytBfS3GvyU1LOaql9sRQHJkcewD83Glffx3PMDAl2NsXdxolcFqz8aIpG4Kht1mvsquEVm4jxyX5n8s0UMqkkxeaPhOrhaZ1KC9adPS/OWYy0WXK8A6hU+zak9wlvyTJnEYBna+QNZXwMh9ybOYn9n+0yl7PMpO7kZyBw=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 1d901ace6510f3f7162dab4a93f6993e_b57805156d1a11f1a0095254002afed2
    ReservedCode2: DOMOt/6HgT9jqXkbizSMAKytBfS3GvyU1LOaql9sRQHJkcewD83Glffx3PMDAl2NsXdxolcFqz8aIpG4Kht1mvsquEVm4jxyX5n8s0UMqkkxeaPhOrhaZ1KC9adPS/OWYy0WXK8A6hU+zak9wlvyTJnEYBna+QNZXwMh9ybOYn9n+0yl7PMpO7kZyBw=
---

# tier_score 评分规则

> 本文档是 8 大件 **tier_score(1-10)** 的唯一评分依据。  
> 所有规则可追溯到品牌梯队文档和数据库字段，具备**可复现、可审计、可维护**三条铁律。

---

## 总则

### 评分维度
| 维度 | 说明 | 可追溯至 |
|---|---|---|
| 品牌梯队 | T1/T2/T3 | `docs/品牌梯队标准.md` |
| 规格硬指标 | 速度/代际/颗粒/认证等级 | `hardware_db.json` 对应字段 |
| 品质特征 | 缓存/电容/质保 | `hardware_db.json` 对应字段 |
| 瑕疵扣分 | QLC/电子垃圾/小牌品控 | 品牌梯队 + 字段 |

### 铁律
- 每条分数必须有"为什么这个分数"的字段依据
- 规则改了→重跑脚本→全库刷新，不手改
- 规则本身是代码，不在脑子里

---

## 1. CPU（109 条）

> 版本 0.2.1：从关键词名单改为**结构化自动评分**，新发布型号无需返工即可自动适配。

| 规则 | 条件 | 加减分 | 依据字段 |
|---|---|---|---|
| **系列定位** | Ryzen 9 + X3D | 10 | name |
| | Ryzen 9 无X3D | 9 | name |
| | Ryzen 7 + X3D | 9 | name |
| | Ryzen 7 无X3D | 7 | name |
| | Ryzen 5 + X3D | 7 | name |
| | Ryzen 5 无X3D | 5 | name |
| | Ryzen 3 | 3 | name |
| | Ultra 9 / Core i9 | 9 | name |
| | Ultra 7 / Core i7 | 7 | name |
| | Ultra 5 / Core i5 | 5 | name |
| | Ultra 3 / Core i3 | 3 | name |
| | 老型号兜底 | 2 | name |
| **代际罚分** | AMD 9000代 (9950X/9800X3D) | 0 | name 中千位数字 |
| | AMD 8000代 (8700G) | 0 | name |
| | AMD 7000代 (7950X/7800X3D) | -1 | name |
| | AMD 5000代 (5950X/5800X3D) | -2 | name |
| | AMD 3000代 (3900X/3600) | -3 | name |
| | Intel Ultra (285K/265K) | 0 | name |
| | Intel 14代 (14900K) | 0 | name |
| | Intel 13代 (13900K) | -1 | name |
| | Intel 12代 (12900K) | -2 | name |
| | Intel 11代及以下 | -3~-4 | name |
| **特殊罚分** | G 后缀 APU（核显强但缓存砍半） | -1 | name |
| | GT/GE/TE 低功耗版 | -2 | name |

> 评分链：系列定位 → 代际罚分 → APU/低功耗罚分 → clamp(1,10)。不含 Xeon 等服务器 CPU（兜底 5 分）。

## 2. GPU（1661 条，已完成，此表为存档）

| tier_score | 芯片对应 |
|---|---|
| 10 | RTX 5090/4090, RX 7900 XTX |
| 9 | RTX 5080, RX 7900 XT |
| 8 | RTX 5070 Ti / 4070 Ti SUPER, RX 9070 XT |
| 7 | RTX 5070 / 4070 SUPER, RX 9070 |
| 6 | RTX 5060 Ti / 4060 Ti, RX 9060 XT |
| 5 | RTX 5060 / 4060, RX 7600 |
| 4 | RTX 5050, RX 6600 |
| 3 | RTX 4050(Laptop), Arc A380 |
| 2 | GTX 1650, RX 6400 |
| 1 | GT 1030, GT 710 |

## 3. 主板（216 条）

| 规则 | 条件 | 加减分 | 依据字段 |
|---|---|---|---|
| 基础分 | X870E / Z890 | 9 | name |
| | X670E / Z790 / W790 | 8 | name |
| | X870 / B850 / B650E | 7 | name |
| | B650 / B760 / Z690 | 6 | name |
| | B660 / H670 / A620 | 4 | name |
| | H610 / A520 / H510 | 2 | name |
| | H310 / 老平台 | 1 | name |
| 品牌加成 | T1（华硕ROG/微星MEG/技嘉AORUS） | +1 | brand 判定 |
| | T3（铭瑄/七彩虹/昂达/精粤/华南） | -1 | brand 判定 |
| ITX | ITX 板型 | -1 | name/form_factor |

## 4. 内存（230 条）

| 规则 | 条件 | 加减分 | 依据字段 |
|---|---|---|---|
| 基础分 | DDR5 7800+ | 9 | speed |
| | DDR5 7200-7799 | 8 | speed |
| | DDR5 6400-7199 | 7 | speed |
| | DDR5 5600-6399 | 6 | speed |
| | DDR5 4800-5599 | 4 | speed |
| | DDR4 4000+ | 6 | speed |
| | DDR4 3600-3999 | 5 | speed |
| | DDR4 3200-3599 | 4 | speed |
| | DDR4 2666-3199 | 3 | speed |
| | DDR4 <2666 | 1 | speed |
| 时序加分 | CL ≤ 28 (DDR5) / CL ≤ 16 (DDR4) | +1 | cl |
| | CL 极高（DDR5 CL≥40 / DDR4 CL≥22） | -1 | cl |
| 品牌 | T1（金士顿/芝奇/海盗船/宏碁/威刚） | +0 | 品牌梯队 |
| | T3（博帝/金邦/创见/技嘉/华硕） | -1 | 品牌梯队 |

## 5. SSD（303 条）

| 规则 | 条件 | 加减分 | 依据字段 |
|---|---|---|---|
| 基础分 | PCIe 5.0 | 9 | interface/name |
| | PCIe 4.0 | 7 | interface/name |
| | PCIe 3.0 | 4 | interface/name |
| | SATA | 2 | interface |
| DRAM | has_dram = true | +1 | has_dram |
| 颗粒 | nand_type = QLC | -2 | nand_type |
| | nand_type = TLC | +0 | nand_type |
| 品牌加成 | T1 原厂（三星/WD/致态/英睿达/SK海力士/铠侠） | +1 | 品牌梯队 |
| | T3（达墨/梵想/爱国者/移速/幻隐等18品牌） | -1 | 品牌梯队 |
| TBW 修正 | tbw 明显低于同级（≥30%） | -1 | tbw |

## 6. 电源（256 条）

| 规则 | 条件 | 加减分 | 依据字段 |
|---|---|---|---|
| 基础分 | 80Plus 钛金 | 10 | rating |
| | 80Plus 白金 | 9 | rating |
| | 80Plus 金 | 7 | rating |
| | 80Plus 银 | 5 | rating |
| | 80Plus 铜 | 3 | rating |
| | 80Plus 白 / 无认证 | 1 | rating |
| ATX 版本 | ATX 3.1 | +1 | atx_version |
| | ATX 3.0 | +0 | atx_version |
| 电容 | 全日系 | +1 | capacitor |
| | 台系 | +0 | capacitor |
| | 国产 | -1 | capacitor |
| 质保 | ≥10 年 | +1 | warranty |
| | 3 年及以下 | -1 | warranty |
| 品牌 | T1（海韵/振华/台达/全汉） | +1 | 品牌梯队 |
| | T3（酷冷/鑫谷/先马/骨伽/撒哈拉等） | -1 | 品牌梯队 |

## 7. 散热器（169 条）

### 水冷

| 规则 | 条件 | 加减分 | 依据字段 |
|---|---|---|---|
| 基础分 | 420 | 9 | radiator_size |
| | 360 | 8 | radiator_size |
| | 280 | 7 | radiator_size |
| | 240 | 5 | radiator_size |
| | 120 | 3 | radiator_size |
| 屏幕 | has_screen = true | +1 | has_screen |
| 品牌 | T1（海盗船/NZXT/华硕ROG/恩杰/利民） | +1 | 品牌梯队 |
| | T3（爱国者/先马/赛普雷等） | -1 | 品牌梯队 |

### 风冷

| 规则 | 条件 | 加减分 | 依据字段 |
|---|---|---|---|
| 基础分 | 双塔 | 7 | tower |
| | 单塔 | 5 | tower |
| | 下压式 | 2 | tower |
| TDP 加成 | tdp_cooling ≥ 250W（双塔）或≥280W（单塔） | +1 | tdp_cooling |
| 品牌 | T1（猫头鹰/利民旗舰/九州风神等） | +1 | 品牌梯队 |
| | T3 | -1 | 品牌梯队 |

## 8. 机箱（66 条）

| 规则 | 条件 | 加减分 | 依据字段 |
|---|---|---|---|
| 基础分 | Full Tower | 8 | form_factor |
| | Mid Tower（ATX） | 6 | form_factor |
| | Mini Tower / ITX | 3 | form_factor |
| 兼容性加分 | 支持 ≥3 风扇位且顶部 360 冷排且显卡≥400mm | +2 | fan_positions/radiator_top/max_gpu_length |
| | 支持顶部 360 冷排 且 显卡≥350mm | +1 | radiator_top/max_gpu_length |
| 品牌 | T1（联力/海盗船/NZXT/追风者） | +1 | 品牌梯队 |
| | T3 | -1 | 品牌梯队 |

---

## 得分钳制

- 所有规则加减后，tier_score **钳制在 1-10 范围**
- 电子垃圾（is_e_waste=true）不受规则加分，封顶 3 分
- 最终分数=规则计算 → clamp(1,10) → 写入 `tier_score` 字段
*（内容由AI生成，仅供参考）*
