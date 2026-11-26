#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成文章后台用的轻量索引 static/editor-index.json。

背景：编辑器原来要为每个 md 文件单独请求一次 GitHub Contents API，
文章多时列表加载很慢。构建时把标题/日期/分类/标签等元数据汇总成一个 JSON，
编辑器一次请求即可渲染列表，打开文章时再按需取原文。
"""
import os
import re
import json
import glob
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'static', 'editor-index.json')


def parse_fm(text):
    m = re.match(r'^---\s*\n(.*?)\n---\s*(?:\n|$)', text, re.S)
    if not m:
        return {}
    lines = m.group(1).split('\n')
    fm = {}
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip() or line.lstrip().startswith('#'):
            i += 1
            continue
        mm = re.match(r'^([A-Za-z0-9_-]+):\s*(.*)$', line)
        if not mm:
            i += 1
            continue
        key, val = mm.group(1), mm.group(2).strip()
        # 块标量 description: |- / key: >
        if re.fullmatch(r'[|>][+-]?\d*', val):
            i += 1
            buf = []
            while i < len(lines) and (lines[i].startswith((' ', '\t')) or lines[i] == ''):
                if lines[i] == '' and i + 1 < len(lines) and not lines[i + 1].startswith((' ', '\t')):
                    break
                buf.append(lines[i].lstrip())
                i += 1
            fm[key] = '\n'.join(buf).strip()
            continue
        # 空值 -> 块列表
        if val == '':
            i += 1
            items = []
            while i < len(lines) and re.match(r'^\s+-\s+', lines[i]):
                items.append(re.sub(r'^\s+-\s+', '', lines[i]).strip().strip('"\''))
                i += 1
            fm[key] = items if items else ''
            continue
        # 内联数组 [a, b]
        if val.startswith('[') and val.endswith(']'):
            fm[key] = [x.strip().strip('"\'') for x in val[1:-1].split(',') if x.strip()]
            i += 1
            continue
        if len(val) >= 2 and val[0] == val[-1] and val[0] in ('"', "'"):
            val = val[1:-1]
        fm[key] = val
        i += 1
    return fm


def as_list(v):
    if isinstance(v, list):
        return [str(x) for x in v if x]
    if v in (None, ''):
        return []
    return [str(v)]


def read_fm(path):
    try:
        with open(path, encoding='utf-8', errors='replace') as f:
            return parse_fm(f.read())
    except Exception:
        return {}


def main():
    content = os.path.join(ROOT, 'content')
    posts = []
    for fp in sorted(glob.glob(os.path.join(content, '**', '*.md'), recursive=True)):
        rel = os.path.relpath(fp, ROOT).replace(os.sep, '/')
        fm = read_fm(fp)
        posts.append({
            'path': rel,
            'name': os.path.basename(fp),
            'title': str(fm.get('title') or os.path.splitext(os.path.basename(fp))[0]),
            'slug': str(fm.get('slug') or ''),
            'date': str(fm.get('date') or ''),
            'categories': as_list(fm.get('categories')),
            'tags': as_list(fm.get('tags')),
        })
    posts.sort(key=lambda p: str(p.get('date') or ''), reverse=True)

    categories = {}
    for fp in glob.glob(os.path.join(content, 'categories', '*', '_index.md')):
        name = os.path.basename(os.path.dirname(fp))
        title = read_fm(fp).get('title')
        if title:
            categories[name] = str(title)
    tags = {}
    for fp in glob.glob(os.path.join(content, 'tags', '*', '_index.md')):
        name = os.path.basename(os.path.dirname(fp))
        title = read_fm(fp).get('title')
        if title:
            tags[name] = str(title)

    data = {
        'generated_at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'posts': posts,
        'categories': categories,
        'tags': tags,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print(f'editor index: {len(posts)} posts -> {OUT}')


if __name__ == '__main__':
    main()
