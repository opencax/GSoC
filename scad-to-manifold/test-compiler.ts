import assert from 'node:assert/strict';
import { CodeFile, ErrorCollector, Lexer, Parser } from 'openscad-parser';
import { OpenScadCompiler } from './compiler.js';

function parseScad(source: string) {
    const codeFile = new CodeFile('test-compiler.scad', source);
    const errorCollector = new ErrorCollector();
    const lexer = new Lexer(codeFile, errorCollector);
    const tokens = lexer.scan();
    const parser = new Parser(codeFile, tokens, errorCollector);
    const ast = parser.parse();

    assert.equal(errorCollector.hasErrors(), false, errorCollector.errors.map((error) => error.message).join('\n'));
    return ast;
}

const ast = parseScad(`
module post(size) {
    cube(size=size, center=true);
}

for (i = [0:5:10]) {
    translate([i, 0, 0]) post(4);
}
`);

const compiler = new OpenScadCompiler();
const result = compiler.compile(ast);

assert.match(result, /import \{ Mesh \} from 'manifold-3d';/);
assert.match(result, /async function module_post/);
assert.match(result, /Mesh\.cube/);
assert.match(result, /for \(let val of range\(0, 5, 10\)\)/);

console.log('Compiler tests passed.');
