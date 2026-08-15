#!/usr/bin/env bash
#
# 生成 / 更新 LichKingMod → BeiDou 移植清单（docs/lichkingmod-port-manifest.tsv）。
#
#   用法: bash docs/tools/gen-port-manifest.sh [LK仓库路径]
#
# 这个脚本负责「分母」：把 LK 从基线到最终态的全部改动，按文件展开成一份清单。
# 它 **不会** 覆盖人工填过的 disposition —— 重跑时已判定的行原样保留，
# 只有 pending 行会按最新的自动判定刷新，新增文件追加为 pending。
#
# 为什么不按 commit 追踪：commit 不是功能原子（一条提交塞十几件事），
# 且 LK 跨两年反复推翻自己的决定，按 commit 回放会「实现完再删掉」。
# 详见 docs/lichkingmod-port.md 第 1、6 节。
#
set -euo pipefail
export LC_ALL=C

LK="${1:-/e/Programming/MapleStoryPS/HeavenMS_LichKingMod}"

# 钉死分析区间。LK 最后一次提交是 2024-10-12，源仓库已冻结，所以分母稳定。
BASE="b0671161"    # initial commit：HeavenMS 2022 快照，即分叉基线
HEADC="ac7830b5"   # LK 最后一个提交
FORMAT="91235cf0"  # "format all source code"：一次性重排 623 个文件，最大噪音源

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BD="$(cd "$SELF_DIR/../.." && pwd)"
SRV="$BD/gms-server"
OUT="$BD/docs/lichkingmod-port-manifest.tsv"

[ -d "$LK/.git" ] || { echo "找不到 LK 仓库: $LK" >&2; exit 1; }
[ -d "$SRV/scripts" ] || { echo "找不到 BeiDou 服务端: $SRV" >&2; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

g() { git -C "$LK" "$@"; }

echo "分析中… base=$BASE head=$HEADC" >&2

# ---------------------------------------------------------------- BeiDou 现状清单
( cd "$SRV/scripts"       && find . -name '*.js'  | sed 's|^\./||' ) | sort > "$TMP/bd_script_en"
( cd "$SRV/scripts-zh-CN" && find . -name '*.js'  | sed 's|^\./||' ) | sort > "$TMP/bd_script_zh"
sort -u "$TMP/bd_script_en" "$TMP/bd_script_zh"                            > "$TMP/bd_script_any"
( cd "$SRV/wz"            && find . -name '*.xml' | sed 's|^\./||' ) | sort > "$TMP/bd_wz_en"
( cd "$SRV/wz-zh-CN"      && find . -name '*.xml' | sed 's|^\./||' ) | sort > "$TMP/bd_wz_zh"

# ---------------------------------------------------------------- 1. Java
# 绕开 format 提交：分别统计它之前和之后的两段，再按文件合并。
# -w --ignore-blank-lines 去掉纯空白改动；仍残留换行重排噪音，靠人工 disposition 兜底。
{
  g diff -w --ignore-blank-lines --numstat --no-renames "$BASE" "${FORMAT}^" -- src
  g diff -w --ignore-blank-lines --numstat --no-renames "$FORMAT" "$HEADC"   -- src
} 2>/dev/null | awk -F'\t' '$1+$2>0 { a[$3]+=$1; d[$3]+=$2 } END { for (f in a) printf "%s\t%d\t%d\n", f, a[f], d[f] }' \
  | sort > "$TMP/java"

g diff --diff-filter=A --name-only --no-renames "$BASE" "$HEADC" -- src 2>/dev/null | sort > "$TMP/java_new"

awk -F'\t' -v OFS='\t' '
  NR==FNR { isnew[$1]=1; next }
  { print $1, (($1 in isnew) ? "java-new" : "java"), $2, $3, "pending", "" }
' "$TMP/java_new" "$TMP/java" > "$TMP/rows"

# -w 之后无差异的 src 文件（被 format 提交扫到但没有实质改动）也要进分母，判为 noise。
g diff --name-only --no-renames "$BASE" "$HEADC" -- src 2>/dev/null | sort > "$TMP/java_all"
cut -f1 "$TMP/java" | sort > "$TMP/java_real"
comm -23 "$TMP/java_all" "$TMP/java_real" \
  | awk -v OFS='\t' '{ print $0, "java", 0, 0, "noise", "仅格式化/空白改动（git diff -w 后无差异）" }' >> "$TMP/rows"

# ---------------------------------------------------------------- 2. 脚本
# 只有「可证明改动全部落在字符串字面量和注释里」的文件才自动判为 noise，其余一律 pending。
#
# 做法：把每一条 +/- 行归一化 —— 抹掉字符串字面量内容、去掉注释、压缩空白 —— 然后比较
# 新增行与删除行的归一化多重集。相等 ⇒ 代码骨架没变，改动只在文案里 ⇒ noise。
#
# 不能用「新增行里不含中文的行数 ≤ N」这种启发式：反例如 CafePQ_1.js 的
# `var minPlayers = 3` → `1`、BalrogBattle.js 的 `maxLevel = 255` → `200`、
# reactor/5511000.js 新增的 `if (rm.getMapId() != ...) return;`，
# 非中文新增行都 ≤ 2，却全是真逻辑改动。
g diff -w --ignore-blank-lines --no-renames "$BASE" "$HEADC" -- scripts 2>/dev/null | awk '
  function norm(s,   out, i, c, inq, q, p) {
    out = ""; inq = 0; q = ""
    for (i = 1; i <= length(s); i++) {
      c = substr(s, i, 1)
      if (inq) {
        if (c == "\\") { i++; continue }          # 跳过转义字符
        if (c == q)    { inq = 0; out = out "@S@" }
        continue
      }
      if (c == "\"" || c == "'"'"'") { inq = 1; q = c; continue }
      out = out c
    }
    UNBAL = inq                                    # 引号未闭合（跨行字符串）⇒ 归一化不可靠
    p = index(out, "//"); if (p > 0) out = substr(out, 1, p - 1)
    gsub(/\/\*.*\*\//, "", out)
    gsub(/[ \t]+/, " ", out)
    gsub(/^ +| +$/, "", out)
    return out
  }
  /^diff --git/ { split($0, p, " b/"); cur = p[2]; seen[cur] = 1; next }
  /^(\+\+\+|---)/ { next }
  /^[+-]/ {
    if (cur == "") next
    side = (substr($0, 1, 1) == "+") ? "A" : "R"
    n = norm(substr($0, 2))
    if (UNBAL) print cur "\tU\t1"                  # 保守：整个文件退回 pending
    print cur "\t" side "\t" n
  }
  END { for (f in seen) print f "\tZ\t" }          # 占位，保证零改动文件也有一行
' | sed 's|^scripts/||' | sort -t'	' -k1,1 -k2,2 -k3,3 > "$TMP/script_lines"

awk -F'\t' -v OFS='\t' '
  { if ($1 != cur) { flush(); cur = $1; sigA = ""; sigR = ""; unsafe = 0 }
    if ($2 == "U")      unsafe = 1
    else if ($2 == "A") sigA = sigA "\x01" $3
    else if ($2 == "R") sigR = sigR "\x01" $3
  }
  END { flush() }
  function flush() {
    if (cur == "") return
    if (sigA == "" && sigR == "")      print cur, "WHITESPACE"
    else if (!unsafe && sigA == sigR)  print cur, "STRINGONLY"   # 代码骨架未变，改动只在文案里
    else                               print cur, "CODE"
  }
' "$TMP/script_lines" | sort > "$TMP/script_class"

awk -F'\t' -v OFS='\t' '
  NR==FNR { inbd[$0]=1; next }
  {
    path = $1; klass = $2
    if (!(path in inbd))            print "scripts/" path, "script-new", 0, 0, "pending", "BeiDou 两个语言层都没有"
    else if (klass == "WHITESPACE") print "scripts/" path, "script", 0, 0, "noise", "仅空白/换行改动"
    else if (klass == "STRINGONLY") print "scripts/" path, "script", 0, 0, "noise", "改动可证明只落在字符串字面量与注释内（代码骨架未变）"
    else                            print "scripts/" path, "script", 0, 0, "pending", "含代码改动；只搬逻辑不搬译文"
  }
' "$TMP/bd_script_any" "$TMP/script_class" >> "$TMP/rows"

# ---------------------------------------------------------------- 3. wz
# _backups 整目录删除是噪音，直接排除。
# Character.wz 是 8000+ 个皇家点装文件，压成一行整体决策，不逐个列。
g diff --name-only --no-renames "$BASE" "$HEADC" -- wz 2>/dev/null \
  | grep -v '_backups' | sed 's|^wz/||' | sort -u > "$TMP/wz_all"

CHAR_N="$(grep -c '^Character\.wz/' "$TMP/wz_all" || true)"
grep -v '^Character\.wz/' "$TMP/wz_all" > "$TMP/wz_rest" || true
# 其中 BeiDou 完全没有的那部分，是批次 8 真正要新增的量
grep '^Character\.wz/' "$TMP/wz_all" | sort > "$TMP/wz_char"
CHAR_MISS="$(comm -23 "$TMP/wz_char" "$TMP/bd_wz_en" | comm -23 - "$TMP/bd_wz_zh" | wc -l | tr -d ' ')"

awk -F'\t' -v OFS='\t' -v n="$CHAR_N" -v miss="$CHAR_MISS" 'BEGIN {
  print "wz/Character.wz/**", "wz-cosmetic", n, 0, "pending", \
        "皇家点装/发型/脸型：LK 改动 " n " 个，其中 BeiDou 完全没有 " miss " 个；批次 8 整体决策，不逐个列"
}' >> "$TMP/rows"

awk -v OFS='\t' '
  NR==FNR && FILENAME ~ /bd_wz_zh$/ { zh[$0]=1; next }
  NR==FNR                           { next }
  FILENAME ~ /bd_wz_en$/            { en[$0]=1; next }
  {
    if ($0 in zh)      print "wz/" $0, "wz", 0, 0, "pending", "BeiDou 中文层已有同名文件，需 diff 判断改动是否已覆盖"
    else if ($0 in en) print "wz/" $0, "wz", 0, 0, "pending", "BeiDou 英文基础层已有同名文件，需 diff 判断改动是否已覆盖"
    else               print "wz/" $0, "wz-missing", 0, 0, "pending", "BeiDou 完全没有此文件"
  }
' "$TMP/bd_wz_zh" "$TMP/bd_wz_en" "$TMP/wz_rest" >> "$TMP/rows"

# ---------------------------------------------------------------- 4. SQL
g diff --numstat --no-renames "$BASE" "$HEADC" -- sql 2>/dev/null \
  | awk -F'\t' -v OFS='\t' '{ print $3, "sql", $1, $2, "pending", "需转成 Flyway 迁移，不能直接跑" }' >> "$TMP/rows"

# ---------------------------------------------------------------- 5. 其余全部路径
# 分母必须是「仓库全量」，否则「pending 归零 = 全部处理完毕」不成立。
# 顶层配置尤其重要：config.yaml / configServer*.yaml 里是倍率、开关、投票回调、召回限制等真配置。
# 只把可证明无关的（IDE 工程文件、Ant 构建、JVM 崩溃日志、构建产物）自动判为 noise。
g diff --numstat --no-renames "$BASE" "$HEADC" 2>/dev/null \
  | awk -F'\t' '$3 !~ /^(src|scripts|wz|sql)\//' \
  | awk -F'\t' -v OFS='\t' '
    { add = ($1 == "-" ? 0 : $1); del = ($2 == "-" ? 0 : $2); p = $3 }

    p ~ /\.iml$/ || p ~ /^(\.idea|nbproject)\// {
      print p, "other", add, del, "noise", "IDE 工程文件"; next }
    p == "build.xml" {
      print p, "other", add, del, "noise", "Ant 构建脚本；BeiDou 用 Maven"; next }
    p ~ /^(hs_err_pid|replay_pid)/ {
      print p, "other", add, del, "noise", "JVM 崩溃/回放日志，误提交的垃圾文件"; next }
    p ~ /^(logs|out|dist|build|backup)\// {
      print p, "other", add, del, "noise", "构建产物 / 运行日志 / 备份目录"; next }

    p == "config.yaml" || p ~ /^configServer[0-9]*\.yaml$/ {
      print p, "config", add, del, "pending", "真配置：倍率/开关/投票回调/召回限制等，须落成 game_config 记录（批次 0）"; next }
    p ~ /^handbook\// {
      print p, "handbook", add, del, "pending", "GM 手册参考数据；BeiDou 有自己的 gms-server/handbook，需比对"; next }
    p ~ /^cores\// {
      print p, "other", add, del, "pending", "第三方依赖 jar；BeiDou 用 Maven 声明依赖而非入库"; next }

    { print p, "other", add, del, "pending", "未分类，需人工判定" }
  ' >> "$TMP/rows"

# ---------------------------------------------------------------- 分母自检
# 全量 diff 里的每一个路径都必须能在清单里找到归宿，否则「pending 归零 = 全部完成」不成立。
# 两类例外：_backups（整目录删除的噪音）与 Character.wz（压成一行）。
g diff --name-only --no-renames "$BASE" "$HEADC" 2>/dev/null \
  | grep -v '^wz/_backups/' | grep -v '^wz/Character\.wz/' | sort -u > "$TMP/all_paths"
cut -f1 "$TMP/rows" | sort -u > "$TMP/covered_paths"
UNCOVERED="$(comm -23 "$TMP/all_paths" "$TMP/covered_paths" || true)"
if [ -n "$UNCOVERED" ]; then
  echo "!! 分母自检失败：以下路径在 diff 中但没进清单" >&2
  echo "$UNCOVERED" | head -20 >&2
  echo "!! 共 $(echo "$UNCOVERED" | wc -l | tr -d ' ') 条。修好路由规则再提交。" >&2
  exit 1
fi
echo "分母自检通过：$(wc -l < "$TMP/all_paths" | tr -d ' ') 个变更路径全部有归宿" >&2

# ---------------------------------------------------------------- 合并：人工判定优先
sort -t'	' -k2,2 -k1,1 "$TMP/rows" > "$TMP/rows_sorted"

if [ -f "$OUT" ]; then
  grep -v '^#' "$OUT" | tail -n +2 > "$TMP/old" || true
  awk -F'\t' -v OFS='\t' '
    NR==FNR { if ($1 != "") { disp[$1]=$5; ev[$1]=$6 }; next }
    {
      # 人工填过的（非 pending）原样保留；pending 行按最新自动判定刷新。
      if (($1 in disp) && disp[$1] != "pending" && disp[$1] != "") print $1, $2, $3, $4, disp[$1], ev[$1]
      else print
    }
  ' "$TMP/old" "$TMP/rows_sorted" > "$TMP/merged"

  cut -f1 "$TMP/old"         | sort > "$TMP/old_paths"
  cut -f1 "$TMP/rows_sorted" | sort > "$TMP/new_paths"
  GONE="$(comm -23 "$TMP/old_paths" "$TMP/new_paths" | wc -l | tr -d ' ')"
  [ "$GONE" != "0" ] && echo "警告：$GONE 行在旧清单里有、新清单里没有（源仓库或算法变了？）" >&2
else
  cp "$TMP/rows_sorted" "$TMP/merged"
fi

# ---------------------------------------------------------------- 输出
{
  echo "# LichKingMod → BeiDou 移植清单（由 docs/tools/gen-port-manifest.sh 生成，勿手工增删行）"
  echo "# 源仓库: $LK"
  echo "# base=$BASE  head=$HEADC  跳过的格式化提交=$FORMAT"
  echo "#"
  echo "# 刻意不写生成时间戳：重跑后 git diff 为空 == 分母没变，这个信号比时间戳有用。"
  echo "# 上次再生成的时间去 git log 查。"
  echo "#"
  echo "# disposition 只能是以下六种："
  echo "#   ported        已移植      —— evidence 必须填 BeiDou 侧文件路径"
  echo "#   already-fixed BeiDou 已有 —— evidence 必须填 文件:行号（不填就是垃圾桶）"
  echo "#   rejected      明确不搬    —— evidence 必须填一句理由。这是终局决定"
  echo "#   deferred      暂缓        —— evidence 必须填「为什么缓」+「什么条件下重启」"
  echo "#   noise         格式化/汉化/垃圾"
  echo "#   pending       还没看"
  echo "#"
  echo "# 收工判据是 pending 归零 且 deferred 清单被逐条复核过。"
  echo "# deferred 不等于做完：它是一笔记在账上的待办，跟 rejected（终局不做）是两回事，"
  echo "# 不给它单独一档的话，暂缓项会混进 rejected 里再也没人翻出来。"
  printf 'path\tarea\tadded\tdeleted\tdisposition\tevidence\n'
  cat "$TMP/merged"
} > "$OUT"

# ---------------------------------------------------------------- 汇总
echo >&2
echo "已写入 $OUT" >&2
awk -F'\t' '
  /^#/      { next }   # 注释头
  $1=="path"{ next }   # 表头
  {
    tot[$2]++
    if ($5 == "pending")  { pend[$2]++;  allpend++ }
    if ($5 == "deferred") { defer[$2]++; alldefer++ }
    all++
  }
  END {
    printf "\n%-14s %8s %8s %8s\n", "区域", "总行数", "pending", "deferred"
    n = asorti(tot, idx)
    for (i = 1; i <= n; i++) {
      a = idx[i]
      printf "%-14s %8d %8d %8d\n", a, tot[a], (a in pend ? pend[a] : 0), (a in defer ? defer[a] : 0)
    }
    printf "%-14s %8d %8d %8d\n", "合计", all, allpend, alldefer
    printf "\n覆盖率: %.1f%%  (pending 归零 且 deferred 逐条复核过，才算全部处理完毕)\n",
           (all ? (all-allpend)*100.0/all : 0)
    if (alldefer > 0) {
      printf "注意: 有 %d 行 deferred，收工前必须逐条复核（grep deferred 清单文件即可列出）\n", alldefer
    }
  }' "$OUT" >&2
