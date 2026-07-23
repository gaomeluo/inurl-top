#!/usr/bin/env bash
# ============================================================
#  Typecho 全站导出脚本（在【服务器】上以 root 运行）
#  作用：定位配置 → 导出数据库 → 打包 usr/uploads 图片
#         →（可选）打包主题/插件 → 汇总成一个 tar.gz
#  特点：纯只读导出，不删库、不重启服务，可放心跑
#  用法：把本文件传到服务器后 `bash export-typecho.sh`，
#        或直接把下面命令逐行粘到 SSH 终端执行
# ============================================================
set -euo pipefail

# ↓↓↓ 改成你 Typecho 实际安装目录（宝塔默认如下，非宝塔请自查）↓↓↓
WORKDIR="/www/wwwroot/inurl.top"

BACKUP="/root/inurl_top_backup_$(date +%Y%m%d)"
mkdir -p "$BACKUP"

echo "==> 1. 定位数据库配置文件"
DB_CFG=""
for f in "$WORKDIR/config.inc.php" "$WORKDIR/config.php" "$WORKDIR/usr/config.inc.php"; do
  [ -f "$f" ] && DB_CFG="$f" && break
done
[ -z "$DB_CFG" ] && { echo "找不到配置文件，请检查 WORKDIR 路径"; exit 1; }
echo "      配置：$DB_CFG"

echo "==> 2. 解析数据库连接信息"
get_cfg () { awk -F"'" "/$1/ {print \$4}" "$DB_CFG"; }
DB_DRIVER=$(get_cfg '__TYPECHO_DB_DRIVER__')
DB_NAME=$(get_cfg    '__TYPECHO_DB_NAME__')
DB_USER=$(get_cfg    '__TYPECHO_DB_USER__')
DB_PASS=$(get_cfg    '__TYPECHO_DB_PASSWORD__')
DB_HOST=$(get_cfg    '__TYPECHO_DB_HOST__')
DB_PORT=$(get_cfg    '__TYPECHO_DB_PORT__')
DB_PORT=${DB_PORT:-3306}

echo "      驱动=$DB_DRIVER 库=$DB_NAME 用户=$DB_USER 地址=$DB_HOST:$DB_PORT"

echo "==> 3. 导出数据库"
if echo "$DB_DRIVER" | grep -qi 'sqlite'; then
  # SQLite：数据库本身是个文件
  DB_FILE=$(get_cfg '__TYPECHO_DB_FILE__')
  [ -z "$DB_FILE" ] && DB_FILE="$WORKDIR/usr/typecho.db"
  cp "$DB_FILE" "$BACKUP/typecho.sqlite" \
    && echo "      -> $BACKUP/typecho.sqlite"
else
  mysqldump -u"$DB_USER" -p"$DB_PASS" -h"$DB_HOST" -P"$DB_PORT" \
    --single-transaction --routines --triggers --default-character-set=utf8mb4 \
    "$DB_NAME" > "$BACKUP/typecho.sql" \
    && echo "      -> $BACKUP/typecho.sql ($(du -h "$BACKUP/typecho.sql" | cut -f1))"
fi

echo "==> 4. 打包上传目录（图片/附件真实文件，DB 里只有路径）"
if [ -d "$WORKDIR/usr/uploads" ]; then
  tar czf "$BACKUP/uploads.tar.gz" -C "$WORKDIR" usr/uploads \
    && echo "      -> $BACKUP/uploads.tar.gz ($(du -h "$BACKUP/uploads.tar.gz" | cut -f1))"
else
  echo "      未找到 usr/uploads，跳过（请确认上传目录位置）"
fi

echo "==> 5. 打包主题/插件（还原外观用，可选）"
tar czf "$BACKUP/theme_plugins.tar.gz" -C "$WORKDIR" usr/themes usr/plugins 2>/dev/null \
  && echo "      -> $BACKUP/theme_plugins.tar.gz" \
  || echo "      无自定义主题/插件，跳过"

echo "==> 6. 汇总成一个文件"
tar czf "$BACKUP.tar.gz" -C /root "$(basename "$BACKUP")"
rm -rf "$BACKUP"
echo ""
echo "完成！备份文件：$BACKUP.tar.gz"
echo "把它下载到本地（在你【电脑】的终端执行）："
echo "   scp root@<服务器IP>:$BACKUP.tar.gz ./"
