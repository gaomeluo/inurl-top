#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""检查 /www/wwwroot/inurltop 的数据库配置与上传目录。"""
import os
import paramiko

HOST = os.environ.get("INURL_HOST", "167.179.111.144")
PORT = int(os.environ.get("INURL_PORT", "22"))
USER = os.environ.get("INURL_USER", "root")
PASS = os.environ.get("INURL_PASS", "")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())


def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=120)
    return (stdout.read().decode("utf-8", "replace"),
            stderr.read().decode("utf-8", "replace"),
            stdout.channel.recv_exit_status())


ssh.connect(hostname=HOST, port=PORT, username=USER, password=PASS,
            timeout=30, look_for_keys=False, allow_agent=False,
            banner_timeout=30, auth_timeout=30)

WD = "/www/wwwroot/inurltop"
print(f"=== A) config.inc.php 中的数据库常量（{WD}/config.inc.php） ===")
out, _, _ = run(f"grep -nE \"define\\('__TYPECHO_DB\" {WD}/config.inc.php 2>/dev/null | sed -E \"s/(PASSWORD.*',\\s*')[^']*('/<hidden>/\" ")
print(out.strip() or "（grep 无输出，可能常量名不同，下面打印文件头 40 行）")
if not out.strip():
    out2, _, _ = run(f"sed -n '1,40p' {WD}/config.inc.php")
    print(out2)

print(f"\n=== B) usr/uploads 是否存在及大小 ===")
out, _, _ = run(
    f"[ -d {WD}/usr/uploads ] && echo EXISTS && du -sh {WD}/usr/uploads && "
    f"echo '文件数:' $(find {WD}/usr/uploads -type f | wc -l) "
    f"|| echo 'NO usr/uploads'"
)
print(out.strip())

print(f"\n=== C) 站点根目录顶层结构 ===")
out, _, _ = run(f"ls -la {WD} | head -30")
print(out.strip())

print(f"\n=== D) 数据库类型快速确认（看 host/port/name） ===")
out, _, _ = run(
    f"grep -oE \"__TYPECHO_DB_(DRIVER|HOST|PORT|NAME|USER|FILE)__',\\s*'[^']*'\" {WD}/config.inc.php"
)
print(out.strip() or "（无匹配，见 A 段原始输出）")

ssh.close()
