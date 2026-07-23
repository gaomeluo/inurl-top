#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Typecho (MySQL dump / SQLite) -> Hugo Markdown converter
=======================================================

把从服务器导出的 Typecho 数据转成 Hugo 内容文件，保持 URL 1:1 不变：

  posts    -> content/posts/<slug>.md        URL /archives/<slug>/
  pages    -> content/pages/<slug>.md        URL /<slug>/
  category -> content/categories/<slug>/_index.md   URL /<slug>/

用法
----
  python3 typecho_to_hugo.py <typecho.sql | typecho.db> [--out DIR] [--force] [--dry-run] [--clean]

  --out DIR     输出根目录（默认脚本所在目录的上级，即仓库根）。内容写入 <DIR>/content
  --force       覆盖已存在的文件（否则跳过并提示）
  --dry-run     只打印将要生成的文件，不写盘
  --clean       生成前先清空 content/posts、content/pages、content/categories
                注意：会连带删除示例 welcome.md / about.md

支持两种输入：
  1) mysqldump 文本 ( .sql ) —— 自动解析 INSERT 语句（含 CREATE TABLE 列序、转义、多行）
  2) SQLite 文件 ( .db / .sqlite / .sqlite3 ) —— 直接 sqlite3 读取

不依赖任何第三方库（仅用 Python 标准库）。
"""

import os
import re
import sys
import gzip
import sqlite3
from datetime import datetime, timezone, timedelta

# ----------------------------------------------------------------------------
# 小工具
# ----------------------------------------------------------------------------

def q(s):
    """把字符串安全地写成 YAML 双引号标量。"""
    if s is None:
        s = ""
    s = str(s)
    s = s.replace("\\", "\\\\").replace('"', '\\"')
    return '"' + s + '"'


def slugify(text):
    """Typecho slug 为空时，从标题生成一个安全的 slug。"""
    text = (text or "").strip().lower()
    text = re.sub(r"[^\w\u4e00-\u9fa5]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text or "untitled"


def ts_to_iso(ts):
    """Typecho created/modified 是 Unix 秒级时间戳（UTC），输出 +08:00。"""
    try:
        ts = int(ts)
    except (TypeError, ValueError):
        return ""
    dt = datetime.fromtimestamp(ts, tz=timezone.utc).astimezone(
        timezone(timedelta(hours=8))
    )
    return dt.strftime("%Y-%m-%dT%H:%M:%S+08:00")


def split_top_level(s, sep=","):
    """按顶层分隔符切分（忽略括号/引号内的分隔符）。"""
    parts, buf, depth, in_str, qc, i = [], [], 0, False, "", 0
    while i < len(s):
        c = s[i]
        if in_str:
            if c == "\\" and i + 1 < len(s):
                buf.append(c); buf.append(s[i + 1]); i += 2; continue
            if c == qc:
                in_str = False
            buf.append(c)
        else:
            if c in ("'", '"'):
                in_str, qc = True, c; buf.append(c)
            elif c in "([":
                depth += 1; buf.append(c)
            elif c in ")]":
                depth -= 1; buf.append(c)
            elif c == sep and depth == 0:
                parts.append("".join(buf)); buf = []
            else:
                buf.append(c)
        i += 1
    if "".join(buf).strip():
        parts.append("".join(buf))
    return parts


def parse_create_columns(sql, table):
    """从 CREATE TABLE 语句里取出列名顺序（正确处理 int(10) 这类嵌套括号）。"""
    m = re.search(
        r"CREATE\s+TABLE\s+`?" + re.escape(table) + r"`?\s*\(",
        sql, re.IGNORECASE,
    )
    if not m:
        return None
    i, n = m.end(), len(sql)
    depth, buf = 1, []
    j = i
    while j < n:
        c = sql[j]
        if c == "(":
            depth += 1; buf.append(c)
        elif c == ")":
            depth -= 1
            if depth == 0:
                break
            buf.append(c)
        else:
            buf.append(c)
        j += 1
    body = "".join(buf)
    cols = []
    for seg in split_top_level(body):
        seg = seg.strip()
        if not seg:
            continue
        if re.match(r"(?i)^(PRIMARY|UNIQUE|KEY|CONSTRAINT|FOREIGN|INDEX|CHECK)", seg):
            continue
        m2 = re.match(r"`?([A-Za-z0-9_]+)`?", seg)
        if m2:
            cols.append(m2.group(1))
    return cols or None


def unescape_sql(f):
    """把一个 SQL 值字符串还原：NULL / 引号 / 反斜杠转义。"""
    f = f.strip()
    if f.upper() == "NULL":
        return None
    if (f.startswith("'") and f.endswith("'")) or (f.startswith('"') and f.endswith('"')):
        inner = f[1:-1]
        inner = re.sub(r"''", "'", inner)
        inner = (
            inner.replace("\\\\", "\x00")
                  .replace("\\n", "\n")
                  .replace("\\t", "\t")
                  .replace("\\r", "\r")
                  .replace("\\0", "\x00")
                  .replace("\\Z", "\x1a")
                  .replace("\\'", "'")
                  .replace('\\"', '"')
                  .replace("\x00", "\\")
        )
        return inner
    return f


def parse_insert(sql, table):
    """
    扫描某张表的全部 INSERT ... VALUES (...),(...); 返回 list[(None, [vals])]。
    用括号/引号深度扫描，只在“语句结束的 ;”（depth==0 且不在字符串内）处停止，
    因此内容里的 ; 不会截断。
    """
    rows = []
    header_re = re.compile(
        r"INSERT\s+INTO\s+`?" + re.escape(table) + r"`?"
        r"(?:\s*\([^)]*\))?\s*VALUES",
        re.IGNORECASE | re.DOTALL,
    )
    n = len(sql)
    for m in header_re.finditer(sql):
        i = m.end()
        while i < n:
            # 跳过行/字段之间的空白与逗号
            while i < n and sql[i] in " \t\r\n,":
                i += 1
            if i >= n:
                break
            if sql[i] == ";":
                break
            if sql[i] != "(":
                break
            depth, in_str, qc, buf = 0, False, "", []
            j = i
            while j < n:
                c = sql[j]
                if in_str:
                    if c == "\\" and j + 1 < n:
                        buf.append(c); buf.append(sql[j + 1]); j += 2; continue
                    if c == qc:
                        in_str = False
                    buf.append(c)
                else:
                    if c in ("'", '"'):
                        in_str, qc = True, c; buf.append(c)
                    elif c == "(":
                        depth += 1; buf.append(c)
                    elif c == ")":
                        depth -= 1; buf.append(c)
                        if depth == 0:
                            j += 1
                            break
                    else:
                        buf.append(c)
                j += 1
            row_text = "".join(buf).strip()
            if row_text.startswith("("):
                row_text = row_text[1:]
            if row_text.endswith(")"):
                row_text = row_text[:-1]
            fields = split_top_level(row_text)
            parsed = [unescape_sql(f) for f in fields]
            rows.append((None, parsed))
            i = j
    return rows


def rows_to_dicts(table, sql, default_cols):
    """把解析出的行变成 dict 列表。"""
    cols = (parse_create_columns(sql, table)) or default_cols
    out = []
    for insert_cols, vals in parse_insert(sql, table):
        use_cols = insert_cols if insert_cols else cols
        d = {}
        for idx, name in enumerate(use_cols):
            d[name] = vals[idx] if idx < len(vals) else None
        out.append(d)
    return out


# ----------------------------------------------------------------------------
# 读取数据源
# ----------------------------------------------------------------------------

def load_from_sql(path):
    if path.endswith(".gz"):
        with gzip.open(path, "rt", encoding="utf-8", errors="replace") as f:
            sql = f.read()
    else:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            sql = f.read()
    return sql


def load_from_sqlite(path):
    con = sqlite3.connect(path)
    con.row_factory = sqlite3.Row
    out = {}
    for tbl in ("typecho_contents", "typecho_metas", "typecho_relationships"):
        try:
            rows = con.execute(f"SELECT * FROM `{tbl}`").fetchall()
            out[tbl] = [dict(r) for r in rows]
        except sqlite3.Error:
            out[tbl] = []
    con.close()
    return out


# ----------------------------------------------------------------------------
# 主流程
# ----------------------------------------------------------------------------

DEFAULT_CONTENTS_COLS = [
    "cid", "title", "slug", "created", "modified", "text", "order",
    "authorId", "template", "type", "status", "password", "commentsNum",
    "allowComment", "allowPing", "allowFeed", "parent", "views",
]
DEFAULT_METAS_COLS = [
    "mid", "name", "slug", "type", "description", "count", "order", "parent",
]
DEFAULT_REL_COLS = ["cid", "mid"]


def main():
    args = sys.argv[1:]
    if not args:
        print("用法: python3 typecho_to_hugo.py <typecho.sql|typecho.db> [--out DIR] [--force] [--dry-run] [--clean]")
        sys.exit(1)

    src = args[0]
    out_dir = os.path.dirname(os.path.abspath(__file__))  # 默认脚本目录（仓库根）
    force = "--force" in args
    dry_run = "--dry-run" in args
    clean = "--clean" in args

    if "--out" in args:
        i = args.index("--out")
        if i + 1 < len(args):
            out_dir = os.path.abspath(args[i + 1])

    if not os.path.exists(src):
        print(f"[ERROR] 找不到输入文件: {src}")
        sys.exit(1)

    print(f"[INFO] 输入: {src}")
    print(f"[INFO] 输出根: {out_dir}")

    # ---- 读取 ----
    if src.lower().endswith((".db", ".sqlite", ".sqlite3")):
        data = load_from_sqlite(src)
        contents = data.get("typecho_contents", [])
        metas = data.get("typecho_metas", [])
        rels = data.get("typecho_relationships", [])
        # 转成 dict（sqlite 已是 dict）
    else:
        sql = load_from_sql(src)
        contents = rows_to_dicts("typecho_contents", sql, DEFAULT_CONTENTS_COLS)
        metas = rows_to_dicts("typecho_metas", sql, DEFAULT_METAS_COLS)
        rels = rows_to_dicts("typecho_relationships", sql, DEFAULT_REL_COLS)

    # ---- 建索引 ----
    meta_by_mid = {m.get("mid"): m for m in metas}
    rel_by_cid = {}
    for r in rels:
        cid = r.get("cid")
        mid = r.get("mid")
        rel_by_cid.setdefault(cid, []).append(mid)

    categories = [m for m in metas if m.get("type") == "category"]
    cat_slug_by_mid = {m.get("mid"): (m.get("slug") or slugify(m.get("name"))) for m in categories}
    cat_name_by_mid = {m.get("mid"): (m.get("name") or "") for m in categories}

    posts = [c for c in contents if c.get("type") == "post"]
    pages = [c for c in contents if c.get("type") == "page"]

    # ---- 分类归档页 ----
    cat_files = []
    for m in categories:
        cslug = m.get("slug") or slugify(m.get("name"))
        cname = m.get("name") or cslug
        cdesc = m.get("description") or ""
        fm = [
            "---",
            f"title: {q(cname)}",
            f"slug: {q(cslug)}",
        ]
        if cdesc:
            fm.append(f"description: {q(cdesc)}")
        fm.append("---")
        body = "\n".join(fm) + "\n"
        rel = os.path.join(out_dir, "content", "categories", cslug, "_index.md")
        cat_files.append((rel, body, cslug, cname))

    # ---- 文章 ----
    post_files = []
    for c in posts:
        slug = c.get("slug") or slugify(c.get("title"))
        title = c.get("title") or slug
        date = ts_to_iso(c.get("created"))
        status = (c.get("status") or "publish").lower()
        draft = "true" if status != "publish" else "false"
        text = c.get("text") or ""
        if text.startswith("<!--markdown-->"):
            text = text[len("<!--markdown-->"):].lstrip()
        # 摘要：取 <!--more--> 之前
        desc = ""
        if "<!--more-->" in text:
            desc = text.split("<!--more-->")[0].strip().splitlines()
            desc = " ".join(desc)[:200]
        # 分类（用 slug 关联，确保与归档页 URL 一致）
        cats = []
        for mid in rel_by_cid.get(c.get("cid"), []):
            if mid in cat_slug_by_mid:
                cats.append(cat_slug_by_mid[mid])
        fm = [
            "---",
            f"title: {q(title)}",
            f"slug: {q(slug)}",
            f"date: {q(date)}" if date else "",
            f"draft: {draft}",
            f"description: {q(desc)}" if desc else "",
            ("categories: [" + ", ".join(q(x) for x in cats) + "]") if cats else "",
            "---",
        ]
        fm = [x for x in fm if x != ""]
        body = "\n".join(fm) + "\n\n" + text.strip() + "\n"
        rel = os.path.join(out_dir, "content", "posts", f"{slug}.md")
        post_files.append((rel, body, slug, title, cats))

    # ---- 独立页面 ----
    page_files = []
    for c in pages:
        slug = c.get("slug") or slugify(c.get("title"))
        title = c.get("title") or slug
        status = (c.get("status") or "publish").lower()
        draft = "true" if status != "publish" else "false"
        text = c.get("text") or ""
        if text.startswith("<!--markdown-->"):
            text = text[len("<!--markdown-->"):].lstrip()
        fm = [
            "---",
            f"title: {q(title)}",
            f"slug: {q(slug)}",
            f"draft: {draft}",
            "---",
        ]
        body = "\n".join(fm) + "\n\n" + text.strip() + "\n"
        rel = os.path.join(out_dir, "content", "pages", f"{slug}.md")
        page_files.append((rel, body, slug, title))

    # ---- 冲突检测：页面 slug vs 分类 slug ----
    page_slugs = {s for (_, _, s, _) in page_files}
    cat_slugs = {s for (_, _, s, _) in cat_files}
    collisions = page_slugs & cat_slugs

    # ---- 写盘 ----
    all_files = cat_files + post_files + page_files

    if clean and not dry_run:
        for sub in ("posts", "pages", "categories"):
            d = os.path.join(out_dir, "content", sub)
            if os.path.isdir(d):
                import shutil
                shutil.rmtree(d)
        print("[INFO] 已清空 content/posts、content/pages、content/categories")

    written = 0
    skipped = 0
    for rel, body, *rest in all_files:
        if os.path.exists(rel) and not force and not dry_run:
            print(f"[SKIP] 已存在（用 --force 覆盖）: {os.path.relpath(rel, out_dir)}")
            skipped += 1
            continue
        if dry_run:
            print(f"[DRY ] 将生成: {os.path.relpath(rel, out_dir)}")
            continue
        os.makedirs(os.path.dirname(rel), exist_ok=True)
        with open(rel, "w", encoding="utf-8") as f:
            f.write(body)
        written += 1

    # ---- 摘要 ----
    print("\n========== 迁移摘要 ==========")
    print(f"文章(posts)      : {len(post_files)}")
    print(f"独立页面(pages)  : {len(page_files)}")
    print(f"分类(categories) : {len(cat_files)}")
    drafts = sum(1 for (_, _, _, _, _) in post_files if "draft: true" in "" )  # placeholder
    drafts = sum(1 for (_, body, *_) in post_files if "draft: true" in body)
    print(f"  其中草稿       : {drafts}")
    print(f"写入文件         : {written}")
    print(f"跳过文件         : {skipped}")
    if collisions:
        print("\n[WARNING] 页面与分类 slug 冲突（同一 /<slug>/ 会 404 或覆盖）：")
        for s in sorted(collisions):
            print(f"   - {s}")
        print("   请在导出后手动重命名其中一方的 slug。")
    print("===============================")
    print("下一步：把 content/ 推到 GitHub，连 Cloudflare Pages（构建 hugo --minify）。")


if __name__ == "__main__":
    main()
