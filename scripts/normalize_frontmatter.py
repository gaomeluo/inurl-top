# ============================================================
# normalize_frontmatter.py
# Decap CMS 的 list 控件会把分类/标签存成对象数组，例如：
#   categories:
#     - cat: fuli
#     - cat: yuanquan
# 而 Hugo 的 taxonomy 需要字符串数组：categories: [fuli, yuanquan]
# 本脚本在每次构建时把这些对象数组压平为字符串数组。
# 已在 Cloudflare Pages 构建命令中前置运行：
#   python3 scripts/normalize_frontmatter.py && hugo --minify
# ============================================================
import re
import glob
import os

# 匹配：key: 后接若干行 "- word: value" 的对象列表
PATTERN = re.compile(
    r'^(?P<key>(?:categories|tags|category2))\s*:\s*\n(?P<items>(?:\s*-\s*\w+\s*:\s*\S+\s*\n)+)',
    re.M,
)


def flatten(m):
    key = m.group('key')
    items = m.group('items')
    vals = re.findall(r'-\s*\w+\s*:\s*(\S+)', items)
    # 去掉值两侧引号（如有），保留内部
    clean = [v.strip('"\'') for v in vals]
    return f'{key}: [{(', '.join(clean))}]\n'


def normalize(path):
    with open(path, encoding='utf-8') as f:
        text = f.read()
    if not text.startswith('---'):
        return False
    end = text.find('\n---', 3)
    if end == -1:
        return False
    fm = text[3:end]
    if not PATTERN.search(fm):
        return False
    new_fm = PATTERN.sub(flatten, fm)
    with open(path, 'w', encoding='utf-8') as f:
        f.write('---\n' + new_fm + '\n---' + text[end + 4:])
    return True


def main():
    count = 0
    for path in glob.glob('content/**/*.md', recursive=True):
        try:
            if normalize(path):
                count += 1
                print('normalized', os.path.relpath(path))
        except Exception as e:
            print('SKIP', path, '->', e)
    print(f'done: {count} file(s) normalized')


if __name__ == '__main__':
    main()
