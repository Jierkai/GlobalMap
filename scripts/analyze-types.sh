#!/bin/bash
# TypeScript any 类型分析报告脚本

echo "=== TypeScript any 类型使用分析 ==="
echo ""

SRC_DIR="src"

echo "1. 总体统计"
echo "-----------"
TOTAL=$(grep -rn ": any" --include="*.ts" $SRC_DIR | wc -l)
echo "使用 ': any' 的总次数：$TOTAL"
echo ""

echo "2. 按目录统计"
echo "-------------"
grep -rn ": any" --include="*.ts" $SRC_DIR | \
  awk -F: '{print $1}' | \
  cut -d'/' -f1 | \
  sort | uniq -c | sort -rn

echo ""
echo "3. 按文件统计 (Top 30)"
echo "----------------------"
grep -rn ": any" --include="*.ts" $SRC_DIR | \
  awk -F: '{print $1}' | \
  sort | uniq -c | sort -rn | head -30

echo ""
echo "4. 核心文件分析"
echo "---------------"
for file in "core/Map.ts" "core/BaseClass.ts" "layer/BaseLayer.ts" "entity/BaseEntity.ts" "layer/TilesetLayer.ts"; do
  if [ -f "$SRC_DIR/$file" ]; then
    COUNT=$(grep -c ": any" "$SRC_DIR/$file" 2>/dev/null || echo 0)
    echo "$file: $COUNT 处"
  fi
done

echo ""
echo "5. 常见 any 模式"
echo "----------------"
echo "构造函数参数:"
grep -rn "constructor(options: any" --include="*.ts" $SRC_DIR | wc -l
echo "返回值类型:"
grep -rn "): any {" --include="*.ts" $SRC_DIR | wc -l
echo "私有属性:"
grep -rn "private.*: any" --include="*.ts" $SRC_DIR | wc -l
echo "protected 属性:"
grep -rn "protected.*: any" --include="*.ts" $SRC_DIR | wc -l
