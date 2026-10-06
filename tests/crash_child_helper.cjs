/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Helper script for Real Process Crash Forensic Test (A4)
 * Intentionally terminates process abruptly (code 137 / SIGKILL) mid-destructive operation.
 */

const fs = require('node:fs');
const path = require('node:path');

const CRASH_MARKER_FILE = path.resolve(__dirname, 'crash_marker.json');

// 1. Record pre-crash baseline state
const preState = {
  pid: process.pid,
  phase: 'pre-destructive',
  customers: 10,
  invoices: 10,
  timestamp: new Date().toISOString()
};
fs.writeFileSync(CRASH_MARKER_FILE, JSON.stringify(preState, null, 2));

// 2. Begin destructive work
const midState = {
  pid: process.pid,
  phase: 'mid-destructive-in-progress',
  customers: 0, // Destructive step executed
  invoices: 10,
  timestamp: new Date().toISOString()
};
fs.writeFileSync(CRASH_MARKER_FILE, JSON.stringify(midState, null, 2));

// 3. Genuinely terminate the process immediately without running exception handlers
// Exit code 137 simulates SIGKILL (128 + 9)
process.exit(137);
