#!/usr/bin/env python3
# 把原 Typecho 评论迁移进 GitHub Discussions（Giscus 只读 Discussions）
# 用法：
#   python3 scripts/migrate_comments_to_giscus.py --dry-run      # 只统计，不写
#   python3 scripts/migrate_comments_to_giscus.py --only mojie     # 只迁某一篇（验证用）
#   GITHUB_TOKEN=xxx python3 scripts/migrate_comments_to_giscus.py  # 全量迁移
import sys, os, json, argparse, datetime, time, urllib.request as urllib_request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import typecho_to_hugo as T

# 从环境变量读取 PAT（需含 write:discussions 权限），切勿把密钥明文写进仓库，
# 否则会被 GitHub 密钥扫描 / Push Protection 拦截推送。
PAT = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
if not PAT:
    raise SystemExit("缺少环境变量 GITHUB_TOKEN（GitHub PAT，需含 write:discussions 权限）")
OWNER, NAME = "gaomeluo", "inurl-top"
CATEGORY_ID = "DIC_kwDOThbWa84DB4AG"   # 与 single.html 的 data-category-id 一致
API = "https://api.github.com/graphql"

def gh(query, variables=None):
    data = json.dumps({"query": query, "variables": variables or {}}).encode()
    headers = {"Authorization": "Bearer " + PAT, "Content-Type": "application/json",
               "Accept": "application/vnd.github+json"}
    last = None
    for attempt in range(5):
        try:
            req = urllib_request.Request(API, data=data, headers=headers)
            with urllib_request.urlopen(req, timeout=30) as r:
                j = json.load(r)
            if "errors" in j and j["errors"]:
                raise SystemExit("GraphQL error: " + json.dumps(j["errors"], ensure_ascii=False))
            return j["data"]
        except Exception as e:
            last = e
            time.sleep(2 + attempt * 2)
    raise SystemExit("gh failed after retries: " + repr(last))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only", default="")
    ap.add_argument("--verify", action="store_true")
    args = ap.parse_args()

    if args.verify:
        ns = gh("query($o:String!,$n:String!){repository(owner:$o,name:$n){discussions(first:30){nodes{title comments(last:1){totalCount}}}}}",
              {"o": OWNER, "n": NAME})["repository"]["discussions"]["nodes"]
        print("仓库内讨论总数:", len(ns))
        tot = 0
        for d in ns:
            c = d["comments"]["totalCount"]
            tot += c
            print("  ", d["title"], "->", c, "条")
        print("评论合计:", tot)
        return

    sql = T.load_from_sql("_server_export/typecho.sql")
    contents = T.rows_to_dicts("typecho_contents", sql, T.DEFAULT_CONTENTS_COLS)
    comments = T.rows_to_dicts("typecho_comments", sql,
                               ["coid", "cid", "created", "author", "mail", "text", "status", "parent"])

    cid_to_slug = {c["cid"]: c["slug"] for c in contents if c.get("type") == "post"}
    coid_to_author = {c["coid"]: (c.get("author") or "匿名") for c in comments}
    by_cid = {}
    for c in comments:
        if (c.get("status") or "") == "approved":
            by_cid.setdefault(c["cid"], []).append(c)

    repo = gh("query($o:String!,$n:String!){ repository(owner:$o,name:$n){ id } }",
              {"o": OWNER, "n": NAME})["repository"]
    repo_id = repo["id"]
    print("repo id:", repo_id)

    targets = [(cid, slug) for cid, slug in cid_to_slug.items() if cid in by_cid]
    if args.only:
        targets = [(cid, slug) for cid, slug in targets if slug == args.only]
    print("待迁移文章数（有已审核评论）:", len(targets))

    done = 0
    for cid, slug in targets:
        title = "/archives/%s/" % slug          # 与 single.html data-mapping="pathname" 对齐
        cmts = sorted(by_cid[cid], key=lambda c: int(c.get("created") or 0))
        print("\n== %s : %d 条评论 ==" % (title, len(cmts)))
        if args.dry_run:
            for c in cmts:
                print("   -", (c.get("author") or "匿名"), ":", (c.get("text") or "").strip()[:40].replace("\n", " "))
            continue

        # 查是否已存在（避免重复）：拉全量讨论按 title 匹配
        existing = gh("query($o:String!,$n:String!){ repository(owner:$o,name:$n){ discussions(first:100){ nodes{ id title } } } }",
                    {"o": OWNER, "n": NAME})["repository"]["discussions"]["nodes"]
        found = [d for d in existing if d["title"] == title]
        if found:
            print("   已存在讨论，跳过:", found[0]["id"])
            done += 1
            continue

        body0 = "本帖评论由 Typecho 原站迁移而来（原作者信息保留在每条评论正文中）。"
        disc = gh("mutation($r:ID!,$c:ID!,$t:String!,$b:String!){ createDiscussion(input:{repositoryId:$r,categoryId:$c,title:$t,body:$b}){ discussion{ id title } } }",
                  {"r": repo_id, "c": CATEGORY_ID, "t": title, "b": body0})["createDiscussion"]["discussion"]
        disc_id = disc["id"]
        print("   已建讨论:", disc_id)
        for c in cmts:
            author = (c.get("author") or "匿名").strip() or "匿名"
            ts = int(c.get("created") or 0)
            date = datetime.datetime.utcfromtimestamp(ts).strftime("%Y-%m-%d") if ts else ""
            text = (c.get("text") or "").strip()
            parent = c.get("parent")
            prefix = ""
            if parent and str(parent) != "0" and parent in coid_to_author:
                prefix = "↳ 回复 %s：\n" % coid_to_author[parent]
            cbody = "**%s** 于 %s 回复：\n\n%s%s" % (author, date, prefix, text)
            gh("mutation($d:ID!,$b:String!){ addDiscussionComment(input:{discussionId:$d,body:$b}){ comment{ id } } }",
              {"d": disc_id, "b": cbody})
            print("   + 评论:", author, "|", text[:30].replace("\n", " "))
        done += 1

    print("\n完成：%d/%d 篇已处理" % (done, len(targets)))

if __name__ == "__main__":
    main()
