import { Lexer, Parser, ErrorCollector, CodeFile } from 'openscad-parser';
import { OpenScadCompiler } from './compiler.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'node:fs';
import path from 'node:path';
const argv = yargs(hideBin(process.argv))
    .option('input', {
    alias: 'i',
    description: 'Input OpenSCAD file',
    type: 'string',
    demandOption: true
})
    .option('output', {
    alias: 'o',
    description: 'Output JavaScript file',
    type: 'string'
})
    .help()
    .argv;
const run = async () => {
    const { input, output } = await argv;
    if (!fs.existsSync(input)) {
        console.error(`Error: Input file ${input} does not exist.`);
        process.exit(1);
    }
    const scadCode = fs.readFileSync(input, 'utf-8');
    const outPath = output || input.replace('.scad', '.js');
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
    const compiler = new OpenScadCompiler();
    const result = compiler.compile(ast);
    fs.writeFileSync(outPath, result);
    console.log(`Success: Compiled ${input} to ${outPath}`);
    console.log(`To run the output, make sure to install 'manifold-3d' and import 'main'.`);
};
run().catch(err => {
    console.error("Execution failed:", err);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map