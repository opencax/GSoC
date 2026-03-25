import { Lexer, Parser, ErrorCollector, CodeFile } from 'openscad-parser';
import { OpenScadCompiler } from './compiler.js';
import { OpenScadStepEvaluator } from './step-evaluator.js';
import { exportSolidsToStep } from './step-exporter.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
function createArgParser(args) {
    return yargs(args)
        .option('input', {
        alias: 'i',
        description: 'Input OpenSCAD file',
        type: 'string',
        demandOption: true
    })
        .option('output', {
        alias: 'o',
        description: 'Output file',
        type: 'string'
    })
        .option('format', {
        alias: 'f',
        description: 'Output format',
        choices: ['js', 'step'],
        default: 'js'
    })
        .help();
}
export const runCli = async (args = hideBin(process.argv)) => {
    const { format, input, output } = await createArgParser(args).parseAsync();
    if (!fs.existsSync(input)) {
        console.error(`Error: Input file ${input} does not exist.`);
        process.exit(1);
    }
    const scadCode = fs.readFileSync(input, 'utf-8');
    const extension = format === 'step' ? '.step' : '.js';
    const outPath = output || input.replace(/\.scad$/i, extension);
    const codeFile = new CodeFile(path.basename(input), scadCode);
    const errorCollector = new ErrorCollector();
    const lexer = new Lexer(codeFile, errorCollector);
    const tokens = lexer.scan();
    const parser = new Parser(codeFile, tokens, errorCollector);
    const ast = parser.parse();
    if (errorCollector.hasErrors()) {
        console.error("Errors encountered during parsing:");
        errorCollector.errors.forEach(e => console.error(e.message));
        process.exit(1);
    }
    let result;
    if (format === 'step') {
        const evaluator = new OpenScadStepEvaluator();
        const solids = evaluator.evaluate(ast);
        result = exportSolidsToStep(solids, {
            fileName: path.basename(outPath),
            modelName: path.parse(outPath).name,
        });
    }
    else {
        const compiler = new OpenScadCompiler();
        result = compiler.compile(ast);
    }
    fs.writeFileSync(outPath, result);
    console.log(`Success: Exported ${input} to ${outPath}`);
    if (format === 'js') {
        console.log(`To run the output, make sure to install 'manifold-3d' and import 'main'.`);
    }
    else {
        console.log(`STEP export currently targets the direct geometry subset implemented in this repository.`);
    }
};
const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
    runCli().catch(err => {
        console.error("Execution failed:", err);
        process.exit(1);
    });
}
//# sourceMappingURL=cli.js.map