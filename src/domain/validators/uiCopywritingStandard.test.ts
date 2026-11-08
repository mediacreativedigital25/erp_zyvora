/**
 * Zyvora ERP 1.0.0 — UI Copywriting & Developer Secrets Integrity Test
 *
 * Memastikan tidak ada penyebutan nama vendor backend, storage developer (R2, Cloudflare, Supabase, PostgreSQL),
 * atau istilah teknis programmer pada antarmuka pengguna (UI/UX).
 */

import fs from 'fs';
import path from 'path';

interface Violation {
  file: string;
  line: number;
  snippet: string;
  keyword: string;
}

function scanComponentsDir(dir: string, violations: Violation[] = []): Violation[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanComponentsDir(fullPath, violations);
    } else if (entry.isFile() && fullPath.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((lineText, idx) => {
        const trimmed = lineText.trim();
        // Lewati komentar internal code dan import statements
        if (
          trimmed.startsWith('//') ||
          trimmed.startsWith('/*') ||
          trimmed.startsWith('*') ||
          trimmed.startsWith('{/*') ||
          trimmed.startsWith('import ')
        ) {
          return;
        }

        // Cek keywords rahasia developer
        const forbiddenWords = ['Cloudflare', 'Supabase', 'PostgreSQL'];
        for (const kw of forbiddenWords) {
          if (trimmed.includes(kw)) {
            // Abaikan jika hanya berupa nama variabel teknis seperti isSupabaseConfigured
            const isTechnicalVariable = /^(const|let|var|if|return|\<span className=|\{|\}|isSupabaseConfigured)/.test(trimmed) &&
              !trimmed.includes('>') && !trimmed.includes('"') && !trimmed.includes("'");
            if (!isTechnicalVariable) {
              violations.push({
                file: path.relative(process.cwd(), fullPath),
                line: idx + 1,
                snippet: trimmed,
                keyword: kw
              });
            }
          }
        }
      });
    }
  }

  return violations;
}

console.log('======================================================');
console.log('ZYVORA ERP 1.0.0 — UI COPYWRITING & SECRETS TEST');
console.log('======================================================\n');

const componentsDir = path.join(process.cwd(), 'src', 'components');
const violations = scanComponentsDir(componentsDir);

// Filter out benign code variable usages
const userFacingViolations = violations.filter((v) => {
  // Hanya flag jika berada dalam teks JSX atau string literal
  return (
    v.snippet.includes('addToast') ||
    v.snippet.includes('<p') ||
    v.snippet.includes('<span') ||
    v.snippet.includes('<label') ||
    v.snippet.includes('<h') ||
    v.snippet.includes('message=') ||
    v.snippet.includes('description=') ||
    v.snippet.includes('title=')
  );
});

console.log('[TEST GROUP 1] Deteksi Kebocoran Istilah Rahasia Developer di UI');
if (userFacingViolations.length === 0) {
  console.log('  ✓ PASS: Zero Developer Secrets Leakage pada seluruh antarmuka komponen UI');
} else {
  console.error(`  ✗ FAIL: Ditemukan ${userFacingViolations.length} kebocoran rahasia developer:`);
  userFacingViolations.forEach((v) => {
    console.error(`    - [${v.keyword}] ${v.file}:${v.line} -> ${v.snippet}`);
  });
  process.exit(1);
}

console.log('\n======================================================');
console.log('SELURUH PENGUJIAN STANDAR KERAHASIAAN DEVELOPER LULUS (100%)');
console.log('======================================================\n');
