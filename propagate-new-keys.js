/**
 * Propagate new i18n keys from en.json to all other locale files (English fallback).
 * Run: node propagate-new-keys.js
 */
const fs = require('fs');
const path = require('path');

function deepMerge(target, source) {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = deepMerge(result[key] || {}, value);
    } else {
      // Only add if not already present
      if (result[key] === undefined) {
        result[key] = value;
      }
    }
  }
  return result;
}

function processLocales(panelPath) {
  const localesDir = path.join(panelPath, 'src/i18n/translations');
  const enPath = path.join(localesDir, 'en.json');
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  
  const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json') && f !== 'en.json' && f !== 'tr.json' && f !== '$schema.json');
  
  for (const file of files) {
    const filePath = path.join(localesDir, file);
    const locale = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const merged = deepMerge(locale, en);
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
    process.stdout.write('.');
  }
  console.log(`\n${panelPath}: ${files.length} locales updated`);
}

processLocales('c:/Kayı.com/admin-panel');
processLocales('c:/Kayı.com/vendor-panel');
