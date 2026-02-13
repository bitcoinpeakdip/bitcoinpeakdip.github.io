#!/usr/bin/env node
/**
 * Build Script for Bitcoin PeakDip
 * Auto-increment version và update references
 * Usage: node build-version.js [patch|minor|major]
 */

const fs = require('fs');
const path = require('path');

// Command line argument
const bumpType = process.argv[2] || 'patch';

// Đọc version hiện tại
const versionPath = path.join(__dirname, 'version.json');
let versionInfo;
try {
    versionInfo = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
    console.log(`📦 Current version: ${versionInfo.version}`);
} catch (error) {
    console.error('❌ Could not read version.json:', error.message);
    process.exit(1);
}

// Tăng version theo semver
function incrementVersion(version, type) {
    const [major, minor, patch] = version.split('.').map(Number);
    
    switch (type.toLowerCase()) {
        case 'major':
            return `${major + 1}.0.0`;
        case 'minor':
            return `${major}.${minor + 1}.0`;
        case 'patch':
        default:
            return `${major}.${minor}.${patch + 1}`;
    }
}

// Tăng version
const newVersion = incrementVersion(versionInfo.version, bumpType);
console.log(`🔄 Bumping ${bumpType} version: ${versionInfo.version} → ${newVersion}`);

// Cập nhật version.json
versionInfo.version = newVersion;
versionInfo.build_date = new Date().toISOString().split('T')[0];
versionInfo.build_time = new Date().toLocaleTimeString('en-US', { hour12: false });
versionInfo.build_timestamp = Date.now();

// Lưu lại version.json
fs.writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2));
console.log('✅ Updated version.json');

// ========== CẬP NHẬT HTML FILES ==========
const htmlFiles = [
    'signals.html',
    'index.html',
    'about.html',
    'product.html'
];

htmlFiles.forEach(filename => {
    const filePath = path.join(__dirname, filename);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ Skipping ${filename} (not found)`);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    // Update JS files với version parameter
    content = content.replace(
        /(src="js\/[^"]+\.js)(?:\?v=[^&"]+)?(")/g,
        `$1?v=${newVersion}$2`
    );
    
    // Update CSS files với version parameter
    content = content.replace(
        /(href="styles\/[^"]+\.css)(?:\?v=[^&"]+)?(")/g,
        `$1?v=${newVersion}$2`
    );
    
    // Update app version trong inline script (nếu có)
    content = content.replace(
        /(const APP_VERSION = ['"])[^'"]+(['"])/g,
        `$1${newVersion}$2`
    );
    
    // Ghi lại file
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${filename}`);
});

// ========== CẬP NHẬT JS FILES ==========
const jsFiles = [
    'js/signals.js',
    'js/main.js'
];

jsFiles.forEach(filename => {
    const filePath = path.join(__dirname, filename);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ Skipping ${filename} (not found)`);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update APP_VERSION constant
    content = content.replace(
        /(const APP_VERSION = ['"])[^'"]+(['"])/g,
        `$1${newVersion}$2`
    );
    
    // Update version comments
    content = content.replace(
        /(Version:\s*)[\d\.]+/g,
        `$1${newVersion}`
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${filename}`);
});

// ========== TẠO CHANGELOG ENTRY ==========
const changelogPath = path.join(__dirname, 'CHANGELOG.md');
let changelogContent = '';

if (fs.existsSync(changelogPath)) {
    changelogContent = fs.readFileSync(changelogPath, 'utf8');
}

const today = new Date().toISOString().split('T')[0];
const newEntry = `
## ${newVersion} - ${today}

### 🚀 New Features
- [FEATURE] Describe new features here

### 🐛 Bug Fixes  
- [FIX] Describe bug fixes here

### 🔧 Improvements
- [IMPROVEMENT] Describe improvements here

`;

// Thêm entry mới vào đầu file
const updatedChangelog = `# Bitcoin PeakDip Changelog\n${newEntry}${changelogContent.replace('# Bitcoin PeakDip Changelog\n', '')}`;
fs.writeFileSync(changelogPath, updatedChangelog);
console.log('✅ Updated CHANGELOG.md');

// ========== CREATE RELEASE NOTES ==========
const releaseNotes = `
# Bitcoin PeakDip v${newVersion}
**Build Date:** ${versionInfo.build_date}
**Build Time:** ${versionInfo.build_time}

## Deployment Checklist:
- [ ] Test trên desktop (Chrome, Firefox)
- [ ] Test trên mobile (iOS Safari, Android Chrome)
- [ ] Verify CSV data loading
- [ ] Verify chart rendering
- [ ] Verify mobile scroll functionality
- [ ] Check console for errors

## Files Updated:
${htmlFiles.map(f => `- ${f}`).join('\n')}
${jsFiles.map(f => `- ${f}`).join('\n')}
- version.json
- CHANGELOG.md

## Next Steps:
1. Commit changes: \`git add . && git commit -m "Release v${newVersion}"\`
2. Push to repository: \`git push\`
3. Deploy to server
4. Verify production build
`;

const releasePath = path.join(__dirname, `RELEASE_v${newVersion}.md`);
fs.writeFileSync(releasePath, releaseNotes);
console.log(`✅ Created release notes: RELEASE_v${newVersion}.md`);

console.log('\n🎉 Build completed successfully!');
console.log(`📊 New Version: ${newVersion}`);
console.log(`📅 Build Date: ${versionInfo.build_date}`);
console.log('\n📋 Next steps:`);
console.log(`  1. Review RELEASE_v${newVersion}.md`);
console.log('  2. Test the application');
console.log('  3. Deploy to production');

// ========== PWA MANIFEST UPDATE ==========
const manifestPath = path.join(__dirname, 'manifest.json');
if (fs.existsSync(manifestPath)) {
    let manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.start_url = `/?v=${newVersion}`;
    manifest.name = `Bitcoin PeakDip v${newVersion}`;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('✅ Updated manifest.json');
}

// ========== SERVICE WORKER UPDATE ==========
const swPath = path.join(__dirname, 'service-worker.js');
if (fs.existsSync(swPath)) {
    let swContent = fs.readFileSync(swPath, 'utf8');
    // Update cache version
    swContent = swContent.replace(
        /const CACHE_NAME = 'bitcoin-peakdip-v[\d\.]+';/,
        `const CACHE_NAME = 'bitcoin-peakdip-v${newVersion}';`
    );
    swContent = swContent.replace(
        /const DYNAMIC_CACHE = 'bitcoin-peakdip-dynamic-v[\d\.]+';/,
        `const DYNAMIC_CACHE = 'bitcoin-peakdip-dynamic-v${newVersion}';`
    );
    fs.writeFileSync(swPath, swContent);
    console.log('✅ Updated service-worker.js');
}