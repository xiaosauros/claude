#!/usr/bin/env node
'use strict';

/**
 * 安装脚本：把本仓库内容安装到本地工具目录（默认 ~/.claude）
 *
 * 用法：
 *   node scripts/install.js                         安装全部默认项（已存在的内容跳过）
 *   node scripts/install.js commands statusline.js  只安装指定项（支持子层级如 commands/codemap）
 *   node scripts/install.js --force                 已存在的内容也替换
 *   node scripts/install.js --target <dir>          安装到指定目录（支持 ~，可指向其他工具的目录）
 *   node scripts/install.js --list                  列出可安装项
 *
 * 规则：
 *   - 默认只安装目标目录中不存在的内容；已存在的文件跳过，不替换。
 *   - 目录按文件级合并：目录已存在时，只向其中补入目标没有的文件。
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

// 校验并解析一个安装项（支持子层级，如 commands/codemap）
// 返回相对路径（/ 分隔），不合法或不存在时返回 null
function resolveItem(name) {
  const parts = name.replace(/\\/g, '/').split('/').filter(Boolean);
  if (parts.length === 0 || path.isAbsolute(name) || parts.some((p) => p === '..' || p === '.')) return null;
  if (EXCLUDES.has(parts[0])) return null; // 排除目录下的内容不允许安装
  if (!fs.existsSync(path.join(REPO_ROOT, ...parts))) return null;
  return parts.join('/');
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

// 校验指定的安装项（支持子层级，如 commands/codemap）
const resolvedItems = items.map((name) => ({ name, rel: resolveItem(name) }));
const invalid = resolvedItems.filter((it) => !it.rel).map((it) => it.name);
if (invalid.length > 0) {
  console.error(`错误：以下内容不在可安装项中：${invalid.join(', ')}`);
  console.error(`可安装项（顶层，支持子层级如 commands/codemap）：${installables.join(', ')}`);
  process.exit(1);
}

const targetRoot = resolveTarget(targetArg);
if (targetRoot === path.resolve(REPO_ROOT)) {
  console.error('错误：目标目录不能是本仓库自身');
  process.exit(1);
}

// ---------- 执行安装 ----------

// 无指定项时默认安装全部顶层内容
const toInstall = items.length > 0
  ? resolvedItems.map((it) => it.rel)
  : installables;
fs.mkdirSync(targetRoot, { recursive: true });

log(`目标目录：${targetRoot}`);
log(`安装模式：${force ? '替换已存在' : '跳过已存在'}，共 ${toInstall.length} 项`);

const stat = { installed: 0, skipped: 0, replaced: 0 };
for (const rel of toInstall) {
  copyEntry(path.join(REPO_ROOT, rel), path.join(targetRoot, rel), targetRoot, force, stat);
}

log(`完成：安装 ${stat.installed}，替换 ${stat.replaced}，跳过 ${stat.skipped}`);
