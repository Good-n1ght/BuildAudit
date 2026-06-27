"""
硬件搜索索引引擎 - 基于 SQLite FTS5 全文搜索
解决裸 JSON substring 匹配的噪音和遗漏问题
"""
import json
import sqlite3
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "search_index.db"
JSON_PATH = BASE_DIR / "hardware_db.json"

# 别名映射：解决"判客"vs"叛客"类问题
ALIAS_MAP = {
    "电竞判客": "电竞叛客",
    "盈通": "盈通",
    "花嫁": "盈通花嫁",
    "猛禽": "ROG猛禽",
    "火神": "七彩虹火神",
    "水神": "七彩虹水神",
    "大雕": "技嘉大雕",
    "超龙": "微星超龙",
    "魔龙": "微星魔龙",
    "名人堂": "影驰名人堂",
    "九段": "七彩虹九段",
    "猫扇": "猫头鹰",
    "贼船": "海盗船",
    "打人硕": "华硕",
    "军规星": "微星",
    "拒保嘉": "技嘉",
    "凄惨红": "七彩虹",
}


def get_alias(term: str) -> str:
    """返回 term 的正式名称，无别名则返回原值"""
    return ALIAS_MAP.get(term, term)


def build_index():
    """从 hardware_db.json 构建/重建 FTS5 全文索引"""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("DROP TABLE IF EXISTS hardware_fts")
    conn.execute("""
        CREATE VIRTUAL TABLE hardware_fts USING fts5(
            module,         -- cpu/gpu/motherboard/memory/ssd/psu/cooler/case
            name,           -- 产品名称
            brand,          -- 品牌（从 name 提取）
            keywords,       -- 搜索关键词（型号、规格关键信息）
            src_key,        -- hardware_db.json 中的模块 key
            src_idx,        -- 该模块内的数组索引
            tokenize='unicode61 remove_diacritics 2'
        )
    """)

    total = 0
    module_map = {
        "cpu": "cpu",
        "gpu": "gpu",
        "motherboard": "motherboard",
        "memory": "memory",
        "ssd": "ssd",
        "psu": "psu",
        "cooler": "cooler",
        "case": "case",
    }

    rows = []
    for json_key, module_name in module_map.items():
        items = data.get(json_key, [])
        for idx, item in enumerate(items):
            name = item.get("name", "")
            if not name:
                continue
            # 组装搜索关键词：名称 + 规格字段
            keywords_parts = [name]
            for field in ["chipset", "socket", "capacity", "speed", "rating",
                          "wattage", "tdp_cooling", "form_factor", "interface", "type"]:
                val = item.get(field)
                if val:
                    keywords_parts.append(str(val))
            keywords = " ".join(keywords_parts)
            rows.append((module_name, name, "", keywords, json_key, str(idx)))
            total += 1

    conn.executemany(
        "INSERT INTO hardware_fts(module, name, brand, keywords, src_key, src_idx) VALUES (?, ?, ?, ?, ?, ?)",
        rows
    )
    conn.commit()
    conn.close()
    return total


def search(query: str, module: str = None, limit: int = 20) -> list[dict]:
    """搜索硬件

    Args:
        query: 搜索词
        module: 限定模块（cpu/gpu/motherboard/memory/ssd/psu/cooler/case），None=全搜
        limit: 最大返回数

    Returns:
        [{"name": str, "module": str, "raw_index": (str, int), "score": float}, ...]
    """
    # 别名替换
    query = get_alias(query)

    if not DB_PATH.exists():
        return []

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row

    # 构造 FTS5 查询：转义特殊字符，支持多词模糊匹配
    def escape_fts5(term):
        # FTS5 保留字符需要双引号包裹
        special = set('~!@#$%^&*()-+=[]{}|;:<>?,./')
        if any(c in special for c in term):
            return f'"{term}"'
        return term

    terms = [escape_fts5(t) for t in query.strip().split()]
    fts_query = " OR ".join(terms)
    # 额外加前缀匹配，提升首字母搜索精度
    prefix_terms = [f'"{t}"*' for t in query.strip().split() if len(t) >= 2]
    if prefix_terms:
        fts_query = f"({fts_query}) OR ({' OR '.join(prefix_terms)})"

    where = "AND module = ?" if module else ""
    params = [module] if module else []

    sql = f"""
        SELECT module, name, keywords, src_key, src_idx, rank as score
        FROM hardware_fts
        WHERE hardware_fts MATCH ? {where}
        ORDER BY rank
        LIMIT ?
    """
    params.insert(0, fts_query)
    params.append(limit)

    results = []
    try:
        for row in conn.execute(sql, params):
            results.append({
                "name": row["name"],
                "module": row["module"],
                "raw_index": (row["src_key"], int(row["src_idx"])),
                "score": row["score"],
            })
    except sqlite3.OperationalError:
        # FTS5 语法错误时回退到简单匹配
        for row in conn.execute("""
            SELECT module, name, keywords, src_key, src_idx, rank as score
            FROM hardware_fts
            WHERE hardware_fts MATCH ? """ + where + """ ORDER BY rank LIMIT ?""",
            params
        ):
            results.append({
                "name": row["name"],
                "module": row["module"],
                "raw_index": (row["src_key"], int(row["src_idx"])),
                "score": row["score"],
            })

    conn.close()
    return results


def get_item(raw_index: tuple) -> dict:
    """通过索引获取完整 item"""
    json_key, idx = raw_index
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get(json_key, [])[idx]


if __name__ == "__main__":
    print(f"构建索引...")
    n = build_index()
    print(f"已索引 {n} 条记录")

    # 测试
    tests = ["电竞判客", "9", "火神", "海韵", "三星"]
    for q in tests:
        r = search(q)
        print(f"\n搜索 '{q}' → {len(r)} 条")
        for item in r[:5]:
            print(f"  [{item['module']}] {item['name']} (score={item['score']:.1f})")
