import { Lexer, Parser, ErrorCollector, CodeFile } from 'openscad-parser';
import { OpenScadCompiler } from './compiler.js';
import process from 'node:process';
const scadCode = `
for (i = [0:10:50]) {
    translate([i, 0, 0]) {
        cube(size=i);
    }
}
`;
const codeFile = new CodeFile("example.scad", scadCode);
const errorCollector = new ErrorCollector();
const lexer = new Lexer(codeFile, errorCollector);
const tokens = lexer.scan();
const parser = new Parser(codeFile, tokens, errorCollector);
const ast = parser.parse();
if (errorCollector.hasErrors()) {
    errorCollector.errors.forEach(e => console.error(e.message));
    process.exit(1);
}
const compiler = new OpenScadCompiler();
const result = compiler.compile(ast);
console.log(result);
//# sourceMappingURL=test-compiler.js.map