#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
在本机 127.0.0.1 的所有 LISTEN 端口里，找出真正响应 SSH 握手横幅的端口
（即 ssh -L 本地转发端点）。只读探测，不写入、不认证。
"""
import socket
import subprocess
import re

def get_listen_ports():
    out = subprocess.run(
        ["netstat", "-ano"], capture_output=True,
        text=True, errors="replace", timeout=20
    ).stdout
    # 收集所有监听地址： (ip, port)
    addr = set()
    for line in out.splitlines():
        # TCP    127.0.0.1:14022   0.0.0.0:0   LISTENING 10244
        m = re.search(r"TCP\s+(\d+\.\d+\.\d+\.\d+):(\d+)\s+\S+\s+LISTENING", line)
        if m:
            ip, port = m.group(1), int(m.group(2))
            # 0.0.0.0 / [::] 绑全网卡 -> 用 127.0.0.1 探
            if ip in ("0.0.0.0", "::", "[::]"):
                ip = "127.0.0.1"
            addr.add((ip, port))
    return sorted(addr)

def probe_ssh_addr(ip, port):
    try:
        s = socket.create_connection((ip, port), timeout=2.5)
        s.sendall(b"SSH-2.0-Probe\r\n")
        s.settimeout(2.5)
        try:
            data = s.recv(64)
        except socket.timeout:
            data = b""
        s.close()
        if data and b"SSH" in data:
            return data
    except Exception:
        pass
    return None

if __name__ == "__main__":
    addrs = get_listen_ports()
    print(f"[INFO] 本机 TCP LISTEN 地址共 {len(addrs)} 个，逐個探测 SSH 横幅…\n")
    found = []
    for ip, p in addrs:
        b = probe_ssh_addr(ip, p)
        if b:
            found.append((ip, p, b))
            print(f"  ✅ {ip}:{p}  ->  SSH 横幅: {b!r}")
    if not found:
        print("  ❌ 未找到任何响应 SSH 横幅的本地端口。")
        print("     说明：当前没有 ssh -L 转发端点在此机监听；")
        print("     若你的隧道是 TUN/虚拟网卡(VPN式)，服务器可能走隧道内网 IP 可达，")
        print("     请把服务器在隧道内的内网地址（如 198.18.x.x / 10.x / 192.168.x.x）告诉我，")
        print("     或把你在自己机器上连这台服务器用的 `ssh` 命令原样贴给我。")
    else:
        print(f"\n[RESULT] 疑似 ssh -L 端点：{', '.join(f'{ip}:{p}' for ip,_,_ in found)}")
