#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
通过 SSH 把 Typecho 全站导出并下载到本地（只读）。
- 直接按已探明的连接方式做 mysqldump + tar，不依赖 config 解析脚本。
- 凭证全部来自环境变量，绝不写进命令行参数 / 日志。

用法（在已装 paramiko 的 venv 里）：
  INURL_HOST=167.179.111.144 INURL_PORT=22 INURL_USER=root \
  INURL_PASS='<ssh_root密码>' \
  INURL_DB_USER=inurltop INURL_DB_PASS='<数据库密码>' \
  INURL_DB_NAME=inurltop INURL_DB_HOST=localhost INURL_DB_PORT=3306 \
  INURL_WD=/www/wwwroot/inurltop \
  python scripts/download_export.py
"""
import os
import sys
import tarfile
import paramiko

HOST = os.environ.get("INURL_HOST", "167.179.111.144")
PORT = int(os.environ.get("INURL_PORT", "22"))
USER = os.environ.get("INURL_USER", "root")
PASS = os.environ.get("INURL_PASS", "")

DB_USER = os.environ.get("INURL_DB_USER", "inurltop")
DB_PASS = os.environ.get("INURL_DB_PASS", "")
DB_NAME = os.environ.get("INURL_DB_NAME", "inurltop")
DB_HOST = os.environ.get("INURL_DB_HOST", "localhost")
DB_PORT = os.environ.get("INURL_DB_PORT", "3306")
WD = os.environ.get("INURL_WD", "/www/wwwroot/inurltop")

LOCAL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOWNLOAD_TO = os.path.join(LOCAL_DIR, "_server_export")

if not PASS:
    sys.exit("缺少环境变量 INURL_PASS（服务器 root 密码）")
if not DB_PASS:
    sys.exit("缺少环境变量 INURL_DB_PASS（数据库密码）")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())


def run(cmd, timeout=900):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    status = stdout.channel.recv_exit_status()
    return out, err, status


def main():
    print(f"[1/6] 连接 {USER}@{HOST}:{PORT} ...")
    ssh.connect(hostname=HOST, port=PORT, username=USER, password=PASS,
                timeout=30, look_for_keys=False, allow_agent=False,
                banner_timeout=30, auth_timeout=30)
    print("      连接成功。")

    print("[2/6] 预检工作目录与命令...")
    pre, _, _ = run(
        f"echo WD_OK=$( [ -d {WD} ] && echo yes || echo NO );"
        f" echo MYSQLDUMP=$(command -v mysqldump || echo none);"
        f" echo TAR=$(command -v tar || echo none);"
        f" echo UP_OK=$( [ -d {WD}/usr/uploads ] && echo yes || echo NO )"
    )
    print("      " + pre.replace("\n", "  "))
    if "WD_OK=NO" in pre:
        print("⚠️ 工作目录不存在，请检查 INURL_WD。")
        return 1

    # 远端暂存目录
    REMOTE = "/tmp/inurl_export"
    print(f"[3/6] 在 {REMOTE} 生成导出（mysqldump，只读）...")
    dump_cmd = (
        f"mkdir -p {REMOTE} && "
        f"mysqldump -u{DB_USER} -p'{DB_PASS}' -h{DB_HOST} -P{DB_PORT} "
        f"--single-transaction --routines --triggers --default-character-set=utf8mb4 "
        f"{DB_NAME} > {REMOTE}/typecho.sql "
        f"&& echo DUMP_OK=$(du -h {REMOTE}/typecho.sql | cut -f1)"
    )
    out, err, st = run(dump_cmd)
    print("      " + out.strip().replace("\n", "  "))
    if st != 0:
        print("⚠️ mysqldump 失败："); print(err.strip())
        return 1

    print(f"[4/6] 打包 usr/uploads 与 usr/themes,usr/plugins ...")
    arch, archerr, arcst = run(
        f"tar czf {REMOTE}/uploads.tar.gz -C {WD} usr/uploads "
        f"&& echo UP_OK=$(du -h {REMOTE}/uploads.tar.gz | cut -f1); "
        f"tar czf {REMOTE}/theme_plugins.tar.gz -C {WD} usr/themes usr/plugins 2>/dev/null "
        f"&& echo TP_OK=$(du -h {REMOTE}/theme_plugins.tar.gz | cut -f1) || echo TP_SKIP"
    )
    print("      " + arch.strip().replace("\n", "  "))

    print(f"[5/6] SFTP 下载到 {DOWNLOAD_TO}/")
    os.makedirs(DOWNLOAD_TO, exist_ok=True)
    sftp = ssh.open_sftp()
    remote_files = ["typecho.sql", "uploads.tar.gz", "theme_plugins.tar.gz"]
    for rf in remote_files:
        rpath = f"{REMOTE}/{rf}"
        try:
            lpath = os.path.join(DOWNLOAD_TO, rf)
            sftp.get(rpath, lpath)
            print(f"      ✅ {rf} ({os.path.getsize(lpath)} bytes)")
        except IOError:
            print(f"      ⏭️  跳过（不存在）：{rf}")
    sftp.close()

    print("[6/6] 解包 uploads / theme_plugins ...")
    for arc in ("uploads.tar.gz", "theme_plugins.tar.gz"):
        p = os.path.join(DOWNLOAD_TO, arc)
        if os.path.exists(p):
            with tarfile.open(p, "r:gz") as tf:
                tf.extractall(DOWNLOAD_TO)
            print(f"      ✅ 解包 {arc}")

    print("\n================ 导出结果 ================")
    print(f"  数据库导出  : {os.path.join(DOWNLOAD_TO, 'typecho.sql')}")
    print(f"  上传目录包  : {os.path.join(DOWNLOAD_TO, 'uploads.tar.gz')} (图片原 URL 结构保留)")
    print(f"  主题/插件包 : {os.path.join(DOWNLOAD_TO, 'theme_plugins.tar.gz')} (外观还原用，可选)")
    print("  下一步：运行  python scripts/typecho_to_hugo.py _server_export/typecho.sql --out content")
    print("==========================================")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except paramiko.AuthenticationException:
        print("❌ 认证失败：SSH 用户名/密码不正确。")
        sys.exit(2)
    except paramiko.SSHException as e:
        print(f"❌ SSH 错误：{e}")
        sys.exit(3)
    except Exception as e:
        print(f"❌ 意外错误：{e}")
        sys.exit(4)
