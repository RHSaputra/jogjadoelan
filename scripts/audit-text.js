/* eslint-disable @typescript-eslint/no-require-imports -- legacy CJS script, executed directly with node */
const fs = require('fs');
const path = require('path');

const TARGET_DIRS = ['app', 'components', 'lib'];
const IGNORED_FILES = ['node_modules', '.next', '.git'];

// Patterns to search for
const SLANG_WORDS = [
  { word: 'bikin', replacement: 'buat / produksi', category: 'Bahasa tidak formal', severity: 'MEDIUM' },
  { word: 'dibikin', replacement: 'dibuat / diproduksi', category: 'Bahasa tidak formal', severity: 'MEDIUM' },
  { word: 'temen', replacement: 'teman', category: 'Bahasa tidak formal', severity: 'MEDIUM' },
  { word: 'bareng', replacement: 'bersama', category: 'Bahasa tidak formal', severity: 'MEDIUM' },
];

const ENCODING_PATTERNS = [
  { pattern: /â†/g, char: 'â†', replacement: '←', category: 'Encoding rusak', severity: 'HIGH' },
  { pattern: /â‰/g, char: 'â‰', replacement: '≤', category: 'Encoding rusak', severity: 'HIGH' },
  { pattern: /Â±/g, char: 'Â±', replacement: '±', category: 'Encoding rusak', severity: 'HIGH' },
  { pattern: /â€”/g, char: 'â€”', replacement: '—', category: 'Encoding rusak', severity: 'HIGH' },
  { pattern: /Â·/g, char: 'Â·', replacement: '·', category: 'Encoding rusak', severity: 'HIGH' },
  { pattern: /â€¦/g, char: 'â€¦', replacement: '...', category: 'Encoding rusak', severity: 'HIGH' },
  { pattern: /â†’/g, char: 'â†’', replacement: '→', category: 'Encoding rusak', severity: 'HIGH' },
  { pattern: /â/g, char: 'â', replacement: 'Karakter UTF-8 rusak', category: 'Encoding rusak', severity: 'HIGH' },
  { pattern: /Â/g, char: 'Â', replacement: 'Karakter UTF-8 rusak', category: 'Encoding rusak', severity: 'HIGH' },
];

const INCONSISTENCY_WORDS = [
  { word: 'helmet', replacement: 'helm (bila dalam konteks teks Indonesia)', category: 'Campuran bahasa / Istilah tidak konsisten', severity: 'LOW' },
  { word: 'LogOut', replacement: 'Logout', category: 'Typo / Salah kapitalisasi', severity: 'LOW' },
];

const results = [];

function walk(dir) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (!IGNORED_FILES.includes(file)) {
        walk(filePath);
      }
    } else {
      const ext = path.extname(filePath);
      if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
        auditFile(filePath);
      }
    }
  }
}

function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Skip comments if possible, but keep simple checks
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      // Still search comments for encoding issues but skip slang / language checks
      ENCODING_PATTERNS.forEach(({ pattern, char, replacement, category, severity }) => {
        if (pattern.test(line)) {
          results.push({
            file: filePath,
            location: `Baris ${lineNum}`,
            oldText: line.trim(),
            category,
            severity,
            recommendation: `Ganti '${char}' dengan '${replacement}'`,
            replacementText: line.replace(pattern, replacement).trim(),
          });
        }
      });
      return;
    }

    // 1. Check Encoding
    ENCODING_PATTERNS.forEach(({ pattern, char, replacement, category, severity }) => {
      if (pattern.test(line)) {
        results.push({
          file: filePath,
          location: `Baris ${lineNum}`,
          oldText: line.trim(),
          category,
          severity,
          recommendation: `Ganti '${char}' dengan '${replacement}'`,
          replacementText: line.replace(pattern, replacement).trim(),
        });
      }
    });

    // 2. Check Slang
    SLANG_WORDS.forEach(({ word, replacement, category, severity }) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      if (regex.test(line)) {
        results.push({
          file: filePath,
          location: `Baris ${lineNum}`,
          oldText: line.trim(),
          category,
          severity,
          recommendation: `Ganti slang '${word}' dengan kata baku '${replacement}'`,
          replacementText: line.replace(regex, replacement).trim(),
        });
      }
    });

    // 3. Check Inconsistencies
    INCONSISTENCY_WORDS.forEach(({ word, replacement, category, severity }) => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      if (regex.test(line)) {
        // Skip brands or names like "KYT Helmet" or "Jogjadoelan Vintage Helmet" or component imports
        if (word === 'helmet' && (line.includes('KYT') || line.includes('GM') || line.includes('NHK') || line.includes('Vintage') || line.includes('import') || line.includes('customhelmet'))) {
          return;
        }
        results.push({
          file: filePath,
          location: `Baris ${lineNum}`,
          oldText: line.trim(),
          category,
          severity,
          recommendation: `Ganti '${word}' dengan '${replacement}'`,
          replacementText: line.replace(regex, replacement).trim(),
        });
      }
    });
  });
}

TARGET_DIRS.forEach(dir => {
  const fullPath = path.resolve(dir);
  if (fs.existsSync(fullPath)) {
    walk(fullPath);
  }
});

// Format output as JSON file
fs.writeFileSync('scripts/audit-results.json', JSON.stringify(results, null, 2), 'utf8');
console.log(`Audit complete. Found ${results.length} issues. Saved to scripts/audit-results.json`);
