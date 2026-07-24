#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把原 Typecho 站的 标签 + 阅读量 注入到 content/posts/*.md 的 frontmatter。
- 标签：typecho_metas(type=tag) 经 typecho_relationships 映射到每篇 post 的 slug。
- 阅读量：typecho_contents.views（导出库里 31 篇全有真实值）。
复用 scripts/typecho_to_hugo.py 的 mysqldump 解析器。

只改 frontmatter（tags:/views: 两行），绝不触碰正文。
Decap 兼容：tags 写成 ["a","b"] 扁平字符串列表，正好对应 config.yml 里
  tags: { widget: list, field: { name: tag, widget: string } }。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import typecho_to_hugo as T

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQL = os.path.join(ROOT, "_server_export", "typecho.sql")
POSTS = os.path.join(ROOT, "content", "posts")


def q(s):
    s = str(s)
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def main():
    if not os.path.exists(SQL):
        print(f"[ERROR] 找不到 {SQL}")
        return 1
    sql = T.load_from_sql(SQL)
    contents = T.rows_to_dicts("typecho_contents", sql, T.DEFAULT_CONTENTS_COLS)
    metas = T.rows_to_dicts("typecho_metas", sql, T.DEFAULT_METAS_COLS)
    rels = T.rows_to_dicts("typecho_relationships", sql, T.DEFAULT_REL_COLS)

    meta_by_mid = {m.get("mid"): m for m in metas}
    rel_by_cid = {}
    for r in rels:
        rel_by_cid.setdefault(r.get("cid"), []).append(r.get("mid"))

    info = {}
    for c in contents:
        if c.get("type") != "post":
            continue
        slug = c.get("slug") or T.slugify(c.get("title"))
        tags = []
        for mid in rel_by_cid.get(c.get("cid"), []):
            m = meta_by_mid.get(mid)
            if m and m.get("type") == "tag":
                tags.append(m.get("name"))
        try:
            views = int(c.get("views") or 0)
        except (TypeError, ValueError):
            views = 0
        info[slug] = {"tags": tags, "views": views}

    done = 0
    for fn in sorted(os.listdir(POSTS)):
        if not fn.endswith(".md"):
            continue
        p = os.path.join(POSTS, fn)
        with open(p, encoding="utf-8") as f:
            raw = f.read()
        if not raw.startswith("---"):
            continue
        end = raw.find("\n---", 3)
        if end == -1:
            continue
        fm = raw[3:end]
        body = raw[end + 4:]
        kept = []
        for line in fm.split("\n"):
            ls = line.strip()
            if ls.startswith("tags:") or ls.startswith("views:"):
                continue
            kept.append(line)
        fm = "\n".join(kept).rstrip("\n")
        slug = fn[:-3]
        d = info.get(slug)
        if not d:
            continue
        add = []
        if d["tags"]:
            add.append("tags: [" + ", ".join(q(t) for t in d["tags"]) + "]")
        add.append("views: " + str(d["views"]))
        fm = fm + "\n" + "\n".join(add) + "\n"
        with open(p, "w", encoding="utf-8") as f:
            f.write("---\n" + fm + "---" + body)
        done += 1
        print(f"[OK] {fn}: tags={len(d['tags'])} views={d['views']}")
    print(f"\nDONE: 注入 {done} 篇")
    return 0


if __name__ == "__main__":
    sys.exit(main())
