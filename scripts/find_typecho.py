#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""在服务器上定位 Typecho 安装目录（config.inc.php 含 __TYPECHO_ 常量）。"""
import os
import sys
import paramiko

HOST = os.environ.get("INURL_HOST", "167.179.111.144")
PORT = int(os.environ.get("INURL_PORT", "22"))
USER = os.environ.get("INURL_USER", "root")
PASS = os.environ.get("INURL_PASS", "")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())


def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=120)
    return (
        stdout.read().decode("utf-8", "replace"),
        stderr.read().decode("utf-8", "replace"),
        stdout.channel.recv_exit_status(),
    )


ssh.connect(hostname=HOST, port=PORT, username=USER, password=PASS,
            timeout=30, look_for_keys=False, allow_agent=False,
            banner_timeout=30, auth_timeout=30)

print("=== 1) 全盘查找 config.inc.php（Typecho 根配置） ===")
out, err, st = run(
    "for d in /www /home /var/www /data /srv /opt; do "
    "[ -d \"$d\" ] && find \"$d\" -maxdepth 4 -name config.inc.php 2>/dev/null; done; "
    "echo '--- done ---'"
)
print(out.strip())

print("\n=== 2) 在找到的文件中筛出含 __TYPECHO_ 的那个（即真配置） ===")
out2, _, _ = run(
    "for d in /www /home /var/www /data /srv /opt; do "
    "[ -d \"$d\" ] && find \"$d\" -maxdepth 4 -name config.inc.php 2>/dev/null; done "
    "| while read f; do grep -lq '__TYPECHO_DB_' \"$f\" && echo \"MATCH: $f\"; done; "
    "echo '--- done ---'"
)
print(out2.strip() or "（未匹配）")

print("\n=== 3) nginx 虚拟主机里的 root（网页真实目录） ===")
out3, _, _ = run(
    "for f in $(find /www/server/nginx -name '*.conf' 2>/dev/null) "
    "$(find /etc/nginx -name '*.conf' 2>/dev/null); do "
    "echo \"### $f\"; grep -iE 'server_name|root ' \"$f\" 2>/dev/null | head -6; done; "
    "echo '--- done ---'"
)
print(out3.strip() or "（没有 nginx 配置）")

ssh.close()
