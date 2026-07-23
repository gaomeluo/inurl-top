#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SOCKS5 ProxyCommand helper for OpenSSH on Windows (no nc/plink needed).

用法（作为 ssh -o ProxyCommand 的桥接程序）：
  python3 socks_ssh_proxy.py <proxy_host> <proxy_port> %h %p

它连接本机 SOCKS5 动态隧道（ssh -D 创建），再由隧道抵达真实目标
（如 root@167.179.111.144:22），把 stdin/stdout 与隧道连通，
从而让 ssh 客户端“以为”自己在直连目标。

仅做字节桥接，不存储任何凭据。
"""
import sys
import socket
import struct
import select

PROXY_HOST = sys.argv[1]
PROXY_PORT = int(sys.argv[2])
TARGET_HOST = sys.argv[3]
TARGET_PORT = int(sys.argv[4])


def main():
    # 1) 连到本机 SOCKS5 代理
    s = socket.create_connection((PROXY_HOST, PROXY_PORT), timeout=15)
    # 2) SOCKS5 握手：无认证
    s.sendall(b"\x05\x01\x00")
    greeting = s.recv(2)
    if len(greeting) < 2 or greeting[0] != 5:
        sys.stderr.write("SOCKS5 handshake failed\n")
        sys.exit(1)
    # 3) 连接请求
    if TARGET_HOST.replace(".", "").isdigit() and ":" not in TARGET_HOST:
        s.sendall(b"\x05\x01\x00\x01" + socket.inet_aton(TARGET_HOST)
                  + struct.pack(">H", TARGET_PORT))
    else:
        h = TARGET_HOST.encode("utf-8")
        s.sendall(b"\x05\x01\x00\x03" + bytes([len(h)]) + h
                  + struct.pack(">H", TARGET_PORT))
    rep = s.recv(10)
    if len(rep) < 2 or rep[1] != 0:
        sys.stderr.write("SOCKS5 connect failed, code=%s\n" % rep[1])
        sys.exit(1)
    # 4) 桥接 stdin/stdout <-> 隧道
    while True:
        r, _, _ = select.select([s, sys.stdin], [], [])
        if s in r:
            data = s.recv(65536)
            if not data:
                break
            sys.stdout.buffer.write(data)
            sys.stdout.buffer.flush()
        if sys.stdin in r:
            data = sys.stdin.buffer.read1(65536)
            if not data:
                break
            s.sendall(data)
    s.close()


if __name__ == "__main__":
    main()
