# ============================================================
# migrate_views.py  (robust 版 v2)
# 从 Typecho 导出库(_server_export/typecho.sql)提取每篇文章
# 的历史阅读量(contents.views)，按 slug 值匹配写入
# content/posts/*.md 的 frontmatter: views: N
# 这样迁移后阅读量 = 旧量(views) + 不蒜子新增量。
#
# 方法（避开该 dump 不一致的引号转义）：
#   每行以 `),\n(` 切分；slug 字段形如 `,'slug'`；
#   views 是整行中最后一个 `,\d+)`（末列，恒在正文之后）。
#   对 Hugo 每个 slug，定位其所在行，取该行末尾最后一个整型 = views。
# ============================================================
import re
import os
import glob

SQL = '_server_export/typecho.sql'
POSTS = 'content/posts'


def hugo_slugs():
    s = set()
    for p in glob.glob(os.path.join(POSTS, '*.md')):
        t = open(p, encoding='utf-8').read()
        if t.startswith('---'):
            fm = t[3:t.find('\n---', 3)]
            m = re.search(r'(?m)^slug\s*:\s*"?([^"\n]+)"?', fm)
            s.add((m.group(1).strip().lower() if m
                   else os.path.splitext(os.path.basename(p))[0].lower()))
        else:
            s.add(os.path.splitext(os.path.basename(p))[0].lower())
    return s


def parse_sql(path, slugs):
    txt = open(path, encoding='utf-8', errors='ignore').read()
    m = re.search(r'INSERT INTO `typecho_contents` VALUES (.*?);', txt, re.S)
    if not m:
        raise SystemExit('未找到 typecho_contents 的 INSERT 语句')
    body = m.group(1)
    # 行边界（行尾 ),\n( 或整个 VALUES 结尾）
    seps = [x.end() for x in re.finditer(r'\),\n\(', body)]
    bounds = [0] + seps + [len(body)]

    out = {}
    for slug in slugs:
        pat = re.compile(r",'" + re.escape(slug) + r"'")
        found = None
        for i in range(len(bounds) - 1):
            seg = body[bounds[i]:bounds[i + 1]]
            for fm in pat.finditer(seg):
                after = seg[fm.end():]
                ints = re.findall(r',\s*(\d+)\)', after)
                if ints:
                    found = int(ints[-1])
        if found is not None:
            out[slug] = found
    return out


def read_frontmatter(path):
    txt = open(path, encoding='utf-8').read()
    if not txt.startswith('---'):
        return None, txt
    end = txt.find('\n---', 3)
    if end == -1:
        return None, txt
    return txt[3:end], txt[end + 4:]


def write_views(fm, views):
    if re.search(r'(?m)^views\s*:', fm):
        return re.sub(r'(?m)^views\s*:.*$', 'views: %d' % views, fm)
    return fm.rstrip('\n') + '\nviews: %d\n' % views


def main():
    slugs = hugo_slugs()
    views_map = parse_sql(SQL, slugs)
    print('匹配到 %d 个 slug->views' % len(views_map))
    for s, v in sorted(views_map.items(), key=lambda kv: -kv[1]):
        print('   %-28s %d' % (s, v))

    matched = changed = 0
    unmatched = []
    for path in sorted(glob.glob(os.path.join(POSTS, '*.md'))):
        fm, rest = read_frontmatter(path)
        if fm is None:
            continue
        m = re.search(r'(?m)^slug\s*:\s*"?([^"\n]+)"?', fm)
        slug = (m.group(1).strip().lower() if m
                else os.path.splitext(os.path.basename(path))[0].lower())
        v = views_map.get(slug)
        if v is None or v == 0:
            unmatched.append((os.path.basename(path), slug, v))
            continue
        matched += 1
        new_fm = write_views(fm, v)
        with open(path, 'w', encoding='utf-8') as f:
            f.write('---\n' + new_fm + '\n---' + rest)
        changed += 1

    print('写入 %d 篇（views>0）；未匹配 %d 篇' % (changed, len(unmatched)))
    if unmatched:
        print('未匹配（dump 无该 slug 或 views=0）：')
        for name, slug, v in unmatched:
            print('   %-26s slug=%-26s views=%s' % (name, slug, v))


if __name__ == '__main__':
    main()
