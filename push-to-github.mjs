/**
 * Push to GitHub using isomorphic-git (pure JS, no git binary needed).
 *
 * Usage: node push-to-github.mjs <github-token>
 *
 * Get a token at: https://github.com/settings/tokens
 * Needs "repo" scope.
 */

import fs from 'fs';
import path from 'path';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node/index.js';

const REPO_URL = 'https://github.com/Linlyee/Linxiaodai';
const PROJECT_DIR = path.resolve(import.meta.dirname || '.');

// Read token from github.txt (parent directory)
function getToken() {
  const tokenArg = process.argv[2];
  if (tokenArg) return tokenArg;

  // Try reading from github.txt
  const tokenFile = path.resolve(PROJECT_DIR, '..', 'github.txt');
  if (fs.existsSync(tokenFile)) {
    const lines = fs.readFileSync(tokenFile, 'utf-8').trim().split('\n');
    // Last non-empty line is the token
    const lastLine = lines.filter(l => l.trim()).pop();
    if (lastLine && lastLine.startsWith('github_pat_')) return lastLine.trim();
  }

  console.error('❌ 未找到 GitHub Token');
  console.error('   请确保 E:\\play\\github.txt 最后一行包含 Token');
  process.exit(1);
}

const TOKEN = getToken();

const GIT_DIR = path.join(PROJECT_DIR, '.git');

async function getAllFiles(dir, baseDir = dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    // Skip these
    if (entry.name === '.git' || entry.name === 'node_modules' ||
        entry.name === '.next' || entry.name === 'push-to-github.mjs') continue;

    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      files.push(...await getAllFiles(fullPath, baseDir));
    } else {
      files.push({ fullPath, relativePath });
    }
  }

  return files;
}

async function main() {
  console.log('🚀 饭小智 - 推送到 GitHub');
  console.log(`   仓库: ${REPO_URL}\n`);

  // Step 1: Initialize git repo
  console.log('📦 初始化 Git 仓库...');
  await git.init({ fs, dir: PROJECT_DIR, defaultBranch: 'main' });
  console.log('   ✓ 已初始化');

  // Step 2: Get all files
  console.log('📁 收集文件...');
  const files = await getAllFiles(PROJECT_DIR);
  console.log(`   ✓ 找到 ${files.length} 个文件`);

  // Step 3: Add all files to staging and commit
  console.log('📝 暂存并提交...');

  // Add files in batches
  const batchSize = 50;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    for (const file of batch) {
      try {
        await git.add({ fs, dir: PROJECT_DIR, filepath: file.relativePath });
      } catch (e) {
        // File might be ignored
      }
    }
  }
  console.log('   ✓ 文件已暂存');

  // Step 4: Create commit
  const sha = await git.commit({
    fs,
    dir: PROJECT_DIR,
    author: { name: 'Linlyee', email: 'linlyee@github.com' },
    message: '🍜 初始化饭小智项目 - AI外卖决策助手\n\n' +
      '- Next.js 16 + TypeScript + Tailwind CSS\n' +
      '- 24家餐厅 + 80+餐品种子数据\n' +
      '- AI对话 + 外卖盲盒 + 购物车 + 订单追踪\n' +
      '- Provider抽象层（Agent/Restaurant）\n' +
      '- SSE实时订单追踪\n' +
      '- 内存数据库模式（无需PostgreSQL即可运行）',
  });
  console.log(`   ✓ 提交: ${sha.slice(0, 7)}`);

  // Step 5: Push to GitHub
  console.log('\n📤 推送到 GitHub...');

  try {
    const pushResult = await git.push({
      fs,
      http,
      dir: PROJECT_DIR,
      remote: 'origin',
      remoteRef: 'refs/heads/main',
      url: REPO_URL,
      onAuth: () => ({ username: TOKEN, password: 'x-oauth-basic' }),
      onMessage: (msg) => console.log(`   [remote] ${msg}`),
    });

    if (pushResult.ok) {
      console.log('\n✅ 推送成功！');
      console.log(`   查看: ${REPO_URL}`);
    } else {
      console.log('\n⚠️  推送结果:', pushResult);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('401')) {
      console.error('\n❌ 认证失败！请检查 Token 是否正确，以及是否勾选了 "repo" 权限');
      console.error('   获取新 Token: https://github.com/settings/tokens');
    } else {
      console.error('\n❌ 推送失败:', error instanceof Error ? error.message : error);
      throw error;
    }
  }
}

main().catch((err) => {
  console.error('失败:', err.message);
  process.exit(1);
});
