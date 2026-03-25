import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CodeFile, ErrorCollector, Lexer, Parser } from 'openscad-parser';
import { runCli } from './cli.js';
import { OpenScadStepEvaluator } from './step-evaluator.js';
import { exportSolidsToStep } from './step-exporter.js';
function parseScad(source) {
    const codeFile = new CodeFile('test-step.scad', source);
    const errorCollector = new ErrorCollector();
    const lexer = new Lexer(codeFile, errorCollector);
    const tokens = lexer.scan();
    const parser = new Parser(codeFile, tokens, errorCollector);
    const ast = parser.parse();
    assert.equal(errorCollector.hasErrors(), false, errorCollector.errors.map((error) => error.message).join('\n'));
    return ast;
}
function solidBounds(solid) {
    const vertices = solid.faces.flatMap((face) => face.vertices);
    const xs = vertices.map((vertex) => vertex[0]);
    const ys = vertices.map((vertex) => vertex[1]);
    const zs = vertices.map((vertex) => vertex[2]);
    return {
        max: [Math.max(...xs), Math.max(...ys), Math.max(...zs)],
        min: [Math.min(...xs), Math.min(...ys), Math.min(...zs)],
    };
}
function roundTuple(values) {
    return values.map((value) => Number(value.toFixed(6)));
}
const scadSource = `
function edge(v) = v * 2;

module repeated(offset) {
    translate([offset, 0, 0]) children();
}

for (i = [0:10:10]) {
    repeated(i) cube([edge(2), 2, 2], center=true);
}

translate([0, 10, 0]) cylinder(h=6, r1=2, r2=1, center=true, $fn=8);
sphere(r=3, $fn=10);
`;
const ast = parseScad(scadSource);
const evaluator = new OpenScadStepEvaluator({ defaultFn: 10 });
const solids = evaluator.evaluate(ast);
assert.equal(solids.length, 4);
assert.deepEqual(roundTuple(solidBounds(solids[0]).min), [-2, -1, -1]);
assert.deepEqual(roundTuple(solidBounds(solids[0]).max), [2, 1, 1]);
assert.deepEqual(roundTuple(solidBounds(solids[1]).min), [8, -1, -1]);
assert.deepEqual(roundTuple(solidBounds(solids[1]).max), [12, 1, 1]);
const step = exportSolidsToStep(solids, {
    fileName: 'step-test.step',
    modelName: 'step-test',
    timestamp: new Date('2026-03-25T00:00:00Z'),
});
assert.match(step, /^ISO-10303-21;/m);
assert.match(step, /FACETED_BREP_SHAPE_REPRESENTATION/);
assert.match(step, /POLY_LOOP/);
assert.match(step, /FACE_SURFACE/);
assert.equal((step.match(/FACETED_BREP\('/g) ?? []).length, 4);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scad-step-'));
const inputPath = path.join(tempDir, 'fixture.scad');
const outputPath = path.join(tempDir, 'fixture.step');
fs.writeFileSync(inputPath, scadSource);
await runCli(['--input', inputPath, '--format', 'step', '--output', outputPath]);
assert.equal(fs.existsSync(outputPath), true);
const cliOutput = fs.readFileSync(outputPath, 'utf8');
assert.match(cliOutput, /FILE_SCHEMA\(\('CONFIG_CONTROL_DESIGN'\)\);/);
assert.match(cliOutput, /^ISO-10303-21;/m);
console.log('STEP export tests passed.');
//# sourceMappingURL=test-step-export.js.map