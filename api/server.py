"""
API 服务入口（占位）

前端统一入口，封装 engine 层调用。
Phase 2 实现：搜索 / 打分 / 推荐接口。
"""
from pathlib import Path
import json


def load_db():
    """加载主数据库"""
    db_path = Path(__file__).resolve().parent.parent / "hardware_db.json"
    with open(db_path, "r", encoding="utf-8") as f:
        return json.load(f)
