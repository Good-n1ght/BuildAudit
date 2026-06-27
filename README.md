# 硬件对比助手 Hardware Match

> 本地硬件数据库 + 打分引擎 + 配置推荐，帮你装机不踩坑。

## 数据规模

| 模块 | 条目数 | 品牌数 | 状态 |
|---|---|---|---|
| CPU | 104 | 2 (Intel/AMD) | ✅ |
| GPU | 1,578 | N/A | ✅ |
| 主板 | 188 | N/A | ✅ |
| 内存 | 230 | 30 | ✅ |
| SSD | 290 | 30 | ✅ |
| 电源 | 245 | 32 | ✅ |
| 散热 | 156 | 25 | ✅ |
| 机箱 | 47 | 16 | ✅ |
| **合计** | **2,844** | | |

## 快速开始

```bash
# 构建搜索索引
python -m updater.maintain --rebuild-index

# 校验数据库
python -m updater.maintain --validate

# 测试搜索
python engine/search.py
```

## 目录结构

```
硬件对比/
├── data/               # 数据层：JSON 主库 + SQLite 索引
│   ├── hardware_db.json
│   ├── search_index.db
│   └── schema/
├── engine/             # 引擎层：搜索/打分/兼容性
│   ├── search.py       # SQLite FTS5 搜索
│   ├── scorer.py       # 打分 + 颜色分级
│   └── compatibility.py
├── api/                # API 层：对外接口
├── updater/            # 维护层：校验/索引重建/备份
├── docs/               # 文档
│   ├── 项目脑洞与设计理念.md
│   ├── 颜色分级体系.md
│   ├── 品牌梯队标准.md
│   └── 开发路线图.md
└── README.md
```

## 颜色分级

| 分值 | 颜色 | 含义 |
|---|---|---|
| 0-59 | 白色 | 不推荐 |
| 60-69 | 绿色 | 能用 |
| 70-79 | 蓝色 | 合理 |
| 80-89 | 紫色 | 优秀 |
| 90-95 | 金色 | 顶级 |
| 96-99 | 红色 | 极致拉满 |
| 100 | 黑色 | 至高无上 |

## 许可证

私有项目。
