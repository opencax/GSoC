// ─── Test runner – runs all test suites sequentially ─────────────────────────
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('═══════════════════════════════════════════');
console.log('  OpenSCAD STEP Export — Test Suite');
console.log('═══════════════════════════════════════════\n');

console.log('▸ Running geometry tests...');
await import(pathToFileURL(join(__dirname, 'test-geometry.js')).href);
console.log('');

console.log('▸ Running STEP export tests...');
await import(pathToFileURL(join(__dirname, 'test-step-export.js')).href);
console.log('');

console.log('═══════════════════════════════════════════');
console.log('  All tests passed ✓');
console.log('═══════════════════════════════════════════');
