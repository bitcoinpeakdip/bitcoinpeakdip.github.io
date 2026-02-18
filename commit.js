#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');

// Đọc phiên bản
const version = JSON.parse(fs.readFileSync('version.json', 'utf8')).version;

// Thực thi lệnh git
try {
  console.log(`📦 Đang commit phiên bản ${version}...`);
  execSync('git add .', { stdio: 'inherit' });
  execSync(`git commit -m "Release v${version}"`, { stdio: 'inherit' });
  console.log('✅ Commit thành công!');
} catch (error) {
  console.error('❌ Commit thất bại:', error.message);
  process.exit(1);
}