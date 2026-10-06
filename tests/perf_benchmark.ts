import { getAuthorityDatabase } from '../src/server/db';
import { getDatabaseDiagnostics } from '../src/server/operations';
import fs from 'node:fs';

const db = getAuthorityDatabase();
const dbPath = './src/server/data_server_authority.sqlite';
const dbStat = fs.existsSync(dbPath) ? fs.statSync(dbPath) : { size: 0 };

console.log('Environment: Node.js ' + process.version + ' on Windows (x64), SQLite WAL mode');
console.log('Database Size: ' + dbStat.size + ' bytes');

// Prepare table for benchmark
db.exec('CREATE TABLE IF NOT EXISTS bench_invoices (id TEXT PRIMARY KEY, amount REAL, created_at TEXT);');

function runTransactions(count: number): number[] {
  const latencies: number[] = [];
  for (let i = 0; i < count; i++) {
    const t0 = performance.now();
    db.prepare('INSERT OR REPLACE INTO bench_invoices VALUES (?, ?, ?)').run('inv_' + i + '_' + Math.random(), 100 + i, new Date().toISOString());
    db.prepare('SELECT * FROM bench_invoices WHERE id LIKE ? LIMIT 5').all('inv_' + i + '%');
    const elapsed = performance.now() - t0;
    latencies.push(elapsed);
  }
  return latencies;
}

function calculatePercentiles(latencies: number[]) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.50)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const max = sorted[sorted.length - 1];
  const sum = sorted.reduce((a, b) => a + b, 0);
  return { count: sorted.length, durationMs: sum, p50, p95, p99, max };
}

// 1. BASELINE BENCHMARK
const tBaseStart = performance.now();
const baseLatencies = runTransactions(100);
const baseTotalDuration = performance.now() - tBaseStart;
const baseStats = calculatePercentiles(baseLatencies);

console.log('\n--- BASELINE METRICS (100 Transactions) ---');
console.log('Transaction Count:', baseStats.count);
console.log('Total Duration:', baseTotalDuration.toFixed(2), 'ms');
console.log('p50:', baseStats.p50.toFixed(2), 'ms');
console.log('p95:', baseStats.p95.toFixed(2), 'ms');
console.log('p99:', baseStats.p99.toFixed(2), 'ms');
console.log('max:', baseStats.max.toFixed(2), 'ms');

// 2. CONCURRENT DIAGNOSTICS ACTIVE (25 concurrent diagnostic requests)
const tConcStart = performance.now();
const diagPromises = Array.from({ length: 25 }, async () => {
  for (let d = 0; d < 4; d++) {
    getDatabaseDiagnostics();
  }
});

const concLatencies = runTransactions(100);
await Promise.all(diagPromises);
const concTotalDuration = performance.now() - tConcStart;
const concStats = calculatePercentiles(concLatencies);

console.log('\n--- CONCURRENT DIAGNOSTICS ACTIVE (25 Concurrent Requests + 100 Transactions) ---');
console.log('Transaction Count:', concStats.count);
console.log('Total Duration:', concTotalDuration.toFixed(2), 'ms');
console.log('p50:', concStats.p50.toFixed(2), 'ms');
console.log('p95:', concStats.p95.toFixed(2), 'ms');
console.log('p99:', concStats.p99.toFixed(2), 'ms');
console.log('max:', concStats.max.toFixed(2), 'ms');

// Cleanup
db.exec('DROP TABLE IF EXISTS bench_invoices;');
