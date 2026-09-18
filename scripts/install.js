#!/usr/bin/env node
'use strict';

/**
 * 安装脚本：把本仓库内容安装到本地工具目录（默认 ~/.claude）
 *
 * 用法：
 *   node scripts/install.js                         安装全部默认项（已存在的内容跳过）
 *   node scripts/install.js commands statusline.js  只安装指定项（支持子层级如 commands/codemap）
 *   node scripts/install.js commands/*              按通配符把 commands 下内容装到目标根
 *   node scripts/install.js commands/commit*        按通配符安装匹配项
 *   node scripts/install.js --force                 已存在的内容也替换
 *   node scripts/install.js --target <dir>          安装到指定目录（支持 ~，可指向其他工具的目录）
 *   node scripts/install.js --list                  列出可安装项
 *
 * 规则：
 *   - 默认只安装目标目录中不存在的内容；已存在的文件跳过，不替换。
 *   - 目录按文件级合并：目录已存在时，只向其中补入目标没有的文件。
 *   - 指定项支持子层级与通配符：* 匹配单层任意字符（不含 /），? 匹配单层单个字符。
 *     含通配符的项按 cp 语义剥掉通配符前的目录前缀：commands/* 装到目标根下。
 *   - --force 时已存在的文件会被覆盖。
 *   - .git / .gitignore / README.md / scripts / temp / node_modules 不参与安装。
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const REPO_ROOT = path.resolve(__dirname, "..");

// 不参与安装的顶层内容（仓库本地文件与目录）
const EXCLUDES = new Set(['.git', '.gitignore', 'README.md', 'scripts', 'temp', 'node_modules']);

// ---------- 工具函数 ----------

// 统一 UTC+8，格式 YYYY-MM-dd HH:mm:ss
function now() {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

function log(msg) {
  console.log(`[${now()}] ${msg}`);
}

function printHelp() {
  console.log(fs.readFileSync(__filename, 'utf8').match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, ''));
}

// 展开 ~ 并解析为绝对路径
function resolveTarget(dir) {
  if (!dir) return path.join(os.homedir(), '.claude');
  const expanded = dir.startsWith('~/') || dir === '~'
    ? path.join(os.homedir(), dir.slice(1))
    : dir;
  return path.resolve(expanded);
}

// 把单个路径段的通配符模式转为正则（* / ? 均不跨层，即不匹配 /）
function wildcardToRegExp(seg) {
  const escaped = seg.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');
  return new RegExp(`^${escaped}$`);
}

// 展开一个安装项为 { src, dst } 列表（支持子层级与通配符，如 commands/codemap、commands/*、commands/commit*）
// 通配符逐层展开：每层在已匹配目录下按模式过滤
// 安装目标按 cp 语义剥掉首个通配符前的目录前缀：commands/* 装到目标根下（codemap、commit…），
// commands/*/SKILL.md 装到 codemap/SKILL.md；无通配符的项保持原相对路径
// 不合法或无匹配时返回空数组
function expandItem(name) {
  const parts = name.replace(/\\/g, '/').split('/').filter(Boolean);
  if (parts.length === 0 || path.isAbsolute(name) || parts.some((p) => p === '..' || p === '.')) return [];
  if (EXCLUDES.has(parts[0])) return []; // 排除目录下的内容不允许安装
  const wildcardIdx = parts.findIndex((p) => /[*?]/.test(p));
  let matches = [[]];
  for (const part of parts) {
    const next = [];
    if (/[*?]/.test(part)) {
      const re = wildcardToRegExp(part);
      for (const m of matches) {
        const dir = path.join(REPO_ROOT, ...m);
        if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
        for (const e of fs.readdirSync(dir)) {
          if (re.test(e)) next.push([...m, e]);
        }
      }
    } else {
      for (const m of matches) {
        if (fs.existsSync(path.join(REPO_ROOT, ...m, part))) next.push([...m, part]);
      }
    }
    matches = next;
  }
  return matches.map((m) => ({ src: m.join('/'), dst: m.slice(Math.max(wildcardIdx, 0)).join('/') }));
}

// 仓库中可安装的顶层内容
function listInstallables() {
  return fs.readdirSync(REPO_ROOT, { withFileTypes: true })
    .filter((e) => !EXCLUDES.has(e.name))
    .map((e) => e.name);
}

/**
 * 递归复制一个顶层条目（文件或目录）到目标。
 * 目录按文件级合并：目标已存在的文件默认跳过，force 时覆盖。
 */
function copyEntry(src, dst, targetRoot, force, stat) {
  if (fs.statSync(src).isDirectory()) {
    for (const e of fs.readdirSync(src, { withFileTypes: true })) {
      copyEntry(path.join(src, e.name), path.join(dst, e.name), targetRoot, force, stat);
    }
    return;
  }
  const exists = fs.existsSync(dst);
  if (exists && !force) {
    stat.skipped++;
    return;
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  if (exists) stat.replaced++; else stat.installed++;
  log(`${exists ? '替换' : '安装'} ${path.relative(targetRoot, dst)}`);
}

// ---------- 解析参数 ----------

const args = process.argv.slice(2);
let force = false;
let listOnly = false;
let targetArg = null;
const items = [];

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--force' || a === '-f') force = true;
  else if (a === '--list' || a === '-l') listOnly = true;
  else if (a === '--target' || a === '-t') {
    targetArg = args[++i];
    if (!targetArg) {
      console.error('错误：--target 需要一个目录参数');
      process.exit(1);
    }
  } else if (a === '--help' || a === '-h') {
    printHelp();
    process.exit(0);
  } else if (a.startsWith('--')) {
    console.error(`错误：未知参数 ${a}`);
    printHelp();
    process.exit(1);
  } else {
    items.push(a);
  }
}

const installables = listInstallables();

if (listOnly) {
  console.log('可安装项：');
  for (const name of installables) console.log(`  ${name}`);
  process.exit(0);
}

// 校验并展开指定的安装项（支持子层级与通配符，如 commands/codemap、commands/commit*）
const resolvedItems = items.map((name) => ({ name, rels: expandItem(name) }));
const invalid = resolvedItems.filter((it) => it.rels.length === 0).map((it) => it.name);
if (invalid.length > 0) {
  console.error(`错误：以下内容无匹配的可安装项：${invalid.join(', ')}`);
  console.error(`可安装项（顶层，支持子层级如 commands/codemap 与通配符如 commands/*）：${installables.join(', ')}`);
  process.exit(1);
}

const targetRoot = resolveTarget(targetArg);
if (targetRoot === path.resolve(REPO_ROOT)) {
  console.error('错误：目标目录不能是本仓库自身');
  process.exit(1);
}

// ---------- 执行安装 ----------

// 无指定项时默认安装全部顶层内容；通配符展开后可能重复，按目标路径去重
const toInstall = items.length > 0
  ? [...new Map(resolvedItems.flatMap((it) => it.rels).map((p) => [p.dst, p])).values()]
  : installables.map((name) => ({ src: name, dst: name }));
fs.mkdirSync(targetRoot, { recursive: true });

log(`目标目录：${targetRoot}`);
log(`安装模式：${force ? '替换已存在' : '跳过已存在'}，共 ${toInstall.length} 项`);

const stat = { installed: 0, skipped: 0, replaced: 0 };
for (const { src, dst } of toInstall) {
  copyEntry(path.join(REPO_ROOT, src), path.join(targetRoot, dst), targetRoot, force, stat);
}

log(`完成：安装 ${stat.installed}，替换 ${stat.replaced}，跳过 ${stat.skipped}`);
