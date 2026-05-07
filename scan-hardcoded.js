const fs = require('fs');
const path = require('path');

function scanDir(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) scanDir(full, results);
    else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      const hits = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('import') || trimmed.startsWith('type ') || trimmed.startsWith('interface ')) continue;
        if (line.includes('t(') || line.includes('{t(')) continue;

        // JSX text node: >Some English text<
        const jsxText = trimmed.match(/^>([A-Z][a-zA-Z ]{3,})</);
        // prop with string: label="Some Text" or title="Some Text"
        const strProp = trimmed.match(/(?:^|\s)(?:label|title|placeholder|heading|description|subtitle)\s*=\s*"([A-Z][^"]{3,})"/);
        // toast/notification string
        const toastMsg = trimmed.match(/(?:title|description):\s*["'`]([A-Z][^"'`]{3,})["'`]/);

        if (jsxText) hits.push((i+1) + ': ' + trimmed.substring(0, 90));
        else if (strProp) hits.push((i+1) + ': ' + trimmed.substring(0, 90));
        else if (toastMsg) hits.push((i+1) + ': ' + trimmed.substring(0, 90));
      }
      if (hits.length > 0) {
        results.push({file: full.replace(/\\/g, '/').replace('c:/Kayı.com/', ''), hits: hits.slice(0, 8)});
      }
    }
  }
  return results;
}

const adminResults = scanDir('c:/Kayı.com/admin-panel/src/routes');
const vendorResults = scanDir('c:/Kayı.com/vendor-panel/src/routes');
const vendorHooks = scanDir('c:/Kayı.com/vendor-panel/src/hooks');
const vendorComponents = scanDir('c:/Kayı.com/vendor-panel/src/components');
const adminComponents = scanDir('c:/Kayı.com/admin-panel/src/components');
const allResults = [...adminResults, ...vendorResults, ...vendorHooks, ...vendorComponents, ...adminComponents];

for (const r of allResults) {
  console.log('\n--- ' + r.file);
  r.hits.forEach(h => console.log('  ' + h));
}
console.log('\nTotal files with potential hardcoded strings:', allResults.length);
