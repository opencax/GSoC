// ─── OpenSCAD STEP Export – CLI ──────────────────────────────────────────────
// Usage: node dist/cli.js -i model.scad -o model.step [-f step|js] [--validate]
import { CodeFile, ErrorCollector, Lexer, Parser } from 'openscad-parser';
import { OpenScadStepEvaluator } from './step-evaluator.js';
import { exportSolidsToStep } from './step-exporter.js';
import { validateStepFile } from './step-validator.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
function createArgParser(args) {
    return yargs(args)
        .option('input', { alias: 'i', type: 'string', demandOption: true, description: 'Input .scad file' })
        .option('output', { alias: 'o', type: 'string', description: 'Output file path' })
        .option('format', { alias: 'f', choices: ['step', 'js'], default: 'step', description: 'Output format' })
        .option('validate', { type: 'boolean', default: false, description: 'Validate STEP output' })
        .option('fn', { type: 'number', default: 24, description: 'Default $fn resolution' })
        .help();
}
export async function runCli(args = hideBin(process.argv)) {
    const argv = await createArgParser(args).parseAsync();
    if (!fs.existsSync(argv.input)) {
        console.error(`Error: file "${argv.input}" not found.`);
        process.exit(1);
    }
    const scad = fs.readFileSync(argv.input, 'utf-8');
    const ext = argv.format === 'step' ? '.step' : '.js';
    const outPath = argv.output ?? argv.input.replace(/\.scad$/i, ext);
    // Parse
    const codeFile = new CodeFile(path.basename(argv.input), scad);
    const collector = new ErrorCollector();
    const tokens = new Lexer(codeFile, collector).scan();
    const ast = new Parser(codeFile, tokens, collector).parse();
    if (collector.hasErrors()) {
        console.error('Parse errors:');
        collector.errors.forEach((e) => console.error(' ', e.message));
        process.exit(1);
    }
    // Evaluate & export
    const evaluator = new OpenScadStepEvaluator({ defaultFn: argv.fn });
    const solids = evaluator.evaluate(ast);
    const result = exportSolidsToStep(solids, {
        fileName: path.basename(outPath),
        modelName: path.parse(outPath).name,
    });
    fs.writeFileSync(outPath, result);
    console.log(`✓ Exported ${argv.input} → ${outPath}  (${solids.length} solid(s))`);
    // Optional validation
    if (argv.validate) {
        const report = validateStepFile(result);
        if (report.valid) {
            console.log(`✓ STEP validation passed (${report.entityCount} entities)`);
        }
        else {
            console.error('✗ STEP validation failed:');
            report.errors.forEach((e) => console.error('  ERROR:', e));
        }
        if (report.warnings.length > 0) {
            report.warnings.forEach((w) => console.warn('  WARN:', w));
        }
    }
}
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    runCli().catch((err) => { console.error('Fatal:', err); process.exit(1); });
}
//# sourceMappingURL=cli.js.map