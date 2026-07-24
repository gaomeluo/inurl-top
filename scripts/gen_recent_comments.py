#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从原 Typecho 站的导出库生成 data/recent_comments.yaml（"最近回复"侧栏快照）。
- 取 typecho_comments 中 status=approved，按 created 倒序前 10 条。
- 经 cid -> typecho_contents.slug 解析文章 URL（新站 /archives/<slug>/）。
- 作者 + 摘要（去 HTML、截断 35 字），对齐原站 Widget_Comments_Recent 的 "作者: 摘要"。
只迁移历史数据；新评论走 Giscus。
"""
import os
import re
import sys
import html as _html

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import typecho_to_hugo as T

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQL = os.path.join(ROOT, "_server_export", "typecho.sql")
OUT = os.path.join(ROOT, "data", "recent_comments.yaml")


def strip_html(s):
    s = re.sub(r"<[^>]+>", "", s or "")
    s = _html.unescape(s)
    s = re.sub(r"\s+", " ", s).strip()
    if len(s) > 35:
        s = s[:35] + "..."
    return s


def q(s):
    s = str(s).replace("\\", "\\\\").replace('"', '\\"')
    return '"' + s + '"'


def main():
    if not os.path.exists(SQL):
        print(f"[ERROR] 找不到 {SQL}")
        return 1
    sql = T.load_from_sql(SQL)
    contents = T.rows_to_dicts("typecho_contents", sql, T.DEFAULT_CONTENTS_COLS)
    comments = T.rows_to_dicts(
        "typecho_comments", sql,
        ["coid", "cid", "created", "author", "mail", "text", "status", "parent"],
    )

    slug_by_cid = {
        c.get("cid"): (c.get("slug") or T.slugify(c.get("title")))
        for c in contents if c.get("type") == "post"
    }

    approved = [c for c in comments if c.get("status") == "approved"]
    approved.sort(key=lambda c: int(c.get("created") or 0), reverse=True)
    top = approved[:10]

    lines = ["# 自动生成：原 Typecho 站“最近回复”快照（迁移用，新评论走 Giscus）"]
    for c in top:
        slug = slug_by_cid.get(c.get("cid"))
        url = ("/archives/" + slug + "/") if slug else "/"
        author = (c.get("author") or "匿名").replace('"', "'")
        text = strip_html(c.get("text")).replace('"', "'")
        lines.append("- author: " + q(author))
        lines.append("  text: " + q(text))
        lines.append("  url: " + q(url))

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"[OK] 写入 {OUT}（{len(top)} 条）")
    for c in top:
        print("   -", c.get("author"), ":", strip_html(c.get("text")))
    return 0


if __name__ == "__main__":
    sys.exit(main())
