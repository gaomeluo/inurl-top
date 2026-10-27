#!/usr/bin/env python3
# 读取 content/posts/*.md 的 frontmatter，提取 slug + views，
# 把「迁移自老 Typecho 的历史阅读量」注入 functions/api/views.js 的 SEED 块，
# 作为首方计数器的初始基数（保证迁移后数字不归零）。
import os
import re
import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS_DIR = os.path.join(ROOT, 'content', 'posts')
VIEWS_JS = os.path.join(ROOT, 'functions', 'api', 'views.js')

START = '// >>> VIEWS_SEED_START'
END = '// <<< VIEWS_SEED_END'


def parse_frontmatter(path):
    with open(path, encoding='utf-8') as f:
        txt = f.read()
    m = re.match(r'^---\s*\n(.*?)\n---\s*\n', txt, re.S)
    if not m:
        return {}
    fm = m.group(1)
    slug = re.search(r'^slug:\s*(.+)$', fm, re.M)
    views = re.search(r'^views:\s*(\d+)', fm, re.M)
    out = {}
    if slug:
        # 去掉可能被 YAML 包住的引号（如 slug: "xxx"）
        out['slug'] = slug.group(1).strip().strip('"').strip("'")
    if views:
        out['views'] = int(views.group(1))
    return out


def main():
    seed = {}
    for f in sorted(glob.glob(os.path.join(POSTS_DIR, '*.md'))):
        fm = parse_frontmatter(f)
        if fm.get('slug') and fm.get('views') is not None:
            seed[fm['slug'].lower()] = fm['views']

    lines = [f'const SEED = {{']
    for slug in sorted(seed):
        lines.append(f'  {slug!r}: {seed[slug]},')
    lines.append('};')

    with open(VIEWS_JS, encoding='utf-8') as f:
        src = f.read()

    pre = src.split(START, 1)[0] + START
    post = src.split(END, 1)[1]
    post = post.split('\n', 1)[1] if '\n' in post else ''
    new_src = pre + '\n' + '\n'.join(lines) + '\n' + END + '\n' + post

    with open(VIEWS_JS, 'w', encoding='utf-8') as f:
        f.write(new_src)

    print(f'已写入 {len(seed)} 篇文章的历史阅读量基数到 SEED。')
    print('样例:', dict(list(seed.items())[:3]))


if __name__ == '__main__':
    main()
