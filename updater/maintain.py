"""
数据维护工具

职责：
1. 硬件数据库校验
2. 触发搜索索引重建
3. 数据迁移脚本执行
4. 备份管理
"""
import argparse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def rebuild_index():
    from engine.search import build_index
    n = build_index()
    print(f"[updater] 搜索索引已重建，{n} 条记录")
    return n


def validate_db():
    """校验 hardware_db.json 基本完整性"""
    import json
    db_path = BASE_DIR / "hardware_db.json"
    with open(db_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    modules = ["cpu", "gpu", "motherboards", "memory", "ssd", "psu", "coolers", "cases"]
    print(f"数据库校验：{db_path}")
    for m in modules:
        count = len(data.get(m, []))
        missing = sum(1 for x in data.get(m, []) if not x.get("name") or x.get("tier_score") is None)
        print(f"  {m:15s} : {count:4d} 条  (缺name/tier_score: {missing})")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rebuild-index", action="store_true")
    parser.add_argument("--validate", action="store_true")
    args = parser.parse_args()

    if args.rebuild_index:
        rebuild_index()
    if args.validate:
        validate_db()
    if not (args.rebuild_index or args.validate):
        print("updater: 请指定 --rebuild-index 或 --validate")


if __name__ == "__main__":
    main()
