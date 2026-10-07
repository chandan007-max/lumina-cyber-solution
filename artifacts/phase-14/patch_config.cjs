const fs = require('node:fs');
const path = require('node:path');
const file = path.resolve('src', 'server', 'config.ts');
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const idx = lines.findIndex((l) => l.includes("else if (rawEnv === 'test') env = 'test';"));
if (idx === -1) {
  console.error('Marker not found!');
  process.exit(1);
}
const insert = [
  '',
  "  const defaultDbPath = path.resolve(process.cwd(), 'src', 'server', 'data_server_authority.sqlite');",
  '  const dbPath = process.env.LUMINA_DB_PATH ? path.resolve(process.env.LUMINA_DB_PATH) : defaultDbPath;',
  '',
  "  const defaultBackupDir = path.resolve(path.dirname(dbPath), 'backups');",
];
lines.splice(idx + 1, 0, ...insert);
fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('Successfully patched config.ts!');
