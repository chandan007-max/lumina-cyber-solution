const fs = require('fs');
const path = require('path');

const targets = ['src', 'dist', 'server.ts'];
const patterns = [
  { name: 'RSA Private Key Header', regex: /-----BEGIN (RSA )?PRIVATE KEY-----/ },
  { name: 'Hardcoded Admin Key Assignment', regex: /LUMINA_ADMIN_KEY\s*=\s*['"][a-zA-Z0-9_-]{8,}['"]/ },
  { name: 'Hardcoded Production Private Key Assignment', regex: /LUMINA_LICENSE_PRIVATE_KEY\s*=\s*['"][a-zA-Z0-9_-]{16,}['"]/ },
  { name: 'Hardcoded Vault Master Key', regex: /LUMINA_VAULT_MASTER_KEY\s*=\s*['"][a-zA-Z0-9_-]{8,}['"]/ },
  { name: 'Hardcoded SMTP Password', regex: /(?:smtp_pass|smtp_password)\s*[:=]\s*['"][^'"]+['"]/i },
  { name: 'Production DB Password', regex: /(?:db_password|database_password)\s*[:=]\s*['"][^'"]+['"]/i }
];

let findings = [];

function scanFile(filePath) {
  if (filePath.endsWith('.sqlite') || filePath.endsWith('.sqlite-wal') || filePath.endsWith('.sqlite-shm') || filePath.includes('node_modules')) return;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    patterns.forEach(p => {
      if (p.regex.test(content)) {
        findings.push({ file: filePath, rule: p.name });
      }
    });
  } catch (_) {}
}

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') scanDir(full);
    } else {
      scanFile(full);
    }
  }
}

for (const t of targets) {
  const p = path.resolve(t);
  if (fs.existsSync(p)) {
    if (fs.statSync(p).isDirectory()) scanDir(p);
    else scanFile(p);
  }
}

console.log('Secret Scan Results:', findings.length === 0 ? 'CLEAN (0 production secrets detected)' : JSON.stringify(findings, null, 2));
