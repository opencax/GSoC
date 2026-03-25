// ─── Test: STEP exporter + evaluator + validator ─────────────────────────────
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CodeFile, ErrorCollector, Lexer, Parser } from 'openscad-parser';
import { OpenScadStepEvaluator } from '../step-evaluator.js';
import { exportSolidsToStep } from '../step-exporter.js';
import { validateStepFile, isValidStepFile } from '../step-validator.js';
import { solidAABB } from '../geometry.js';
import { runCli } from '../cli.js';

function parseScad(source: string) {
    const codeFile = new CodeFile('test.scad', source);
    const ec = new ErrorCollector();
    const tokens = new Lexer(codeFile, ec).scan();
    const ast = new Parser(codeFile, tokens, ec).parse();
    assert.equal(ec.hasErrors(), false, ec.errors.map((e) => e.message).join('\n'));
    return ast;
}

function roundArr(arr: number[]) {
    return arr.map((v) => Number(v.toFixed(6)));
}

// ─── Basic primitives ────────────────────────────────────────────────────────

{
    const ast = parseScad('cube([4,2,2], center=true);');
    const ev = new OpenScadStepEvaluator({ defaultFn: 8 });
    const solids = ev.evaluate(ast);
    assert.equal(solids.length, 1);
    const b = solidAABB(solids[0]!);
    assert.deepEqual(roundArr(b.min), [-2, -1, -1]);
    assert.deepEqual(roundArr(b.max), [2, 1, 1]);
    console.log('  ✓ cube primitive');
}

{
    const ast = parseScad('sphere(r=3, $fn=10);');
    const ev = new OpenScadStepEvaluator({ defaultFn: 10 });
    const solids = ev.evaluate(ast);
    assert.equal(solids.length, 1);
    const b = solidAABB(solids[0]!);
    assert.ok(b.max[2]! <= 3.01);
    console.log('  ✓ sphere primitive');
}

{
    const ast = parseScad('cylinder(h=6, r=2, center=true, $fn=8);');
    const ev = new OpenScadStepEvaluator({ defaultFn: 8 });
    const solids = ev.evaluate(ast);
    assert.equal(solids.length, 1);
    const b = solidAABB(solids[0]!);
    assert.ok(Math.abs(b.min[2]! + 3) < 0.01);
    assert.ok(Math.abs(b.max[2]! - 3) < 0.01);
    console.log('  ✓ cylinder primitive');
}

// ─── Transforms ──────────────────────────────────────────────────────────────

{
    const ast = parseScad('translate([10,0,0]) cube(1);');
    const ev = new OpenScadStepEvaluator();
    const solids = ev.evaluate(ast);
    assert.equal(solids.length, 1);
    const b = solidAABB(solids[0]!);
    assert.ok(b.min[0]! >= 9.99);
    console.log('  ✓ translate');
}

{
    const ast = parseScad('scale([2,1,1]) cube(1);');
    const ev = new OpenScadStepEvaluator();
    const solids = ev.evaluate(ast);
    const b = solidAABB(solids[0]!);
    assert.ok(Math.abs(b.max[0]! - 2) < 0.01);
    console.log('  ✓ scale');
}

// ─── For loops + user modules + functions ────────────────────────────────────

{
    const src = `
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
    const ast = parseScad(src);
    const ev = new OpenScadStepEvaluator({ defaultFn: 10 });
    const solids = ev.evaluate(ast);
    assert.equal(solids.length, 4);
    assert.deepEqual(roundArr(solidAABB(solids[0]!).min), [-2, -1, -1]);
    assert.deepEqual(roundArr(solidAABB(solids[0]!).max), [2, 1, 1]);
    assert.deepEqual(roundArr(solidAABB(solids[1]!).min), [8, -1, -1]);
    assert.deepEqual(roundArr(solidAABB(solids[1]!).max), [12, 1, 1]);
    console.log('  ✓ for-loops + modules + functions');
}

// ─── Boolean CSG ─────────────────────────────────────────────────────────────

{
    const ast = parseScad('union() { cube(5); translate([3,0,0]) cube(5); }');
    const ev = new OpenScadStepEvaluator();
    const solids = ev.evaluate(ast);
    assert.equal(solids.length, 1);
    assert.ok(solids[0]!.faces.length >= 12);
    console.log('  ✓ union()');
}

{
    const ast = parseScad('difference() { cube(10, center=true); sphere(r=3, $fn=8); }');
    const ev = new OpenScadStepEvaluator({ defaultFn: 8 });
    const solids = ev.evaluate(ast);
    assert.equal(solids.length, 1);
    assert.ok(solids[0]!.faces.length > 6);
    console.log('  ✓ difference()');
}

{
    const ast = parseScad('intersection() { cube(10, center=true); sphere(r=7, $fn=10); }');
    const ev = new OpenScadStepEvaluator({ defaultFn: 10 });
    const solids = ev.evaluate(ast);
    assert.equal(solids.length, 1);
    assert.ok(solids[0]!.faces.length > 0);
    console.log('  ✓ intersection()');
}

{
    const ast = parseScad('hull() { cube(1); translate([5,0,0]) cube(1); }');
    const ev = new OpenScadStepEvaluator();
    const solids = ev.evaluate(ast);
    assert.equal(solids.length, 1);
    const b = solidAABB(solids[0]!);
    assert.ok(b.max[0]! >= 5.0);
    console.log('  ✓ hull()');
}

// ─── STEP export structure ───────────────────────────────────────────────────

{
    const src = 'cube(5); sphere(r=2, $fn=8);';
    const ast = parseScad(src);
    const ev = new OpenScadStepEvaluator({ defaultFn: 8 });
    const solids = ev.evaluate(ast);
    const step = exportSolidsToStep(solids, {
        fileName: 'test.step',
        modelName: 'test-model',
        timestamp: new Date('2026-03-25T00:00:00Z'),
    });

    assert.match(step, /^ISO-10303-21;/m);
    assert.match(step, /END-ISO-10303-21;/);
    assert.match(step, /FACETED_BREP_SHAPE_REPRESENTATION/);
    assert.match(step, /POLY_LOOP/);
    assert.match(step, /FACE_SURFACE/);
    assert.match(step, /CLOSED_SHELL/);
    assert.match(step, /FILE_SCHEMA\(\('CONFIG_CONTROL_DESIGN'\)\)/);
    assert.equal((step.match(/FACETED_BREP\('/g) ?? []).length, 2);
    console.log('  ✓ STEP export structure');
}

// ─── STEP validator ──────────────────────────────────────────────────────────

{
    const src = 'cube(5);';
    const ast = parseScad(src);
    const ev = new OpenScadStepEvaluator();
    const step = exportSolidsToStep(ev.evaluate(ast));

    const result = validateStepFile(step);
    assert.equal(result.valid, true, `Validation errors: ${result.errors.join(', ')}`);
    assert.ok(result.entityCount > 10);
    assert.ok(result.entityTypes.has('FACETED_BREP'));
    assert.ok(result.entityTypes.has('CLOSED_SHELL'));
    assert.ok(isValidStepFile(step));
    console.log('  ✓ STEP validator passes');
}

{
    // Invalid STEP
    assert.equal(isValidStepFile('not a step file'), false);
    console.log('  ✓ STEP validator rejects invalid input');
}

// ─── CLI integration ─────────────────────────────────────────────────────────

{
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'step-test-'));
    const inputPath = path.join(tmpDir, 'test-cli.scad');
    const outputPath = path.join(tmpDir, 'test-cli.step');
    fs.writeFileSync(inputPath, 'cube(5); translate([10,0,0]) sphere(r=2, $fn=8);');

    await runCli(['--input', inputPath, '--output', outputPath, '--validate']);

    assert.ok(fs.existsSync(outputPath));
    const content = fs.readFileSync(outputPath, 'utf8');
    assert.match(content, /^ISO-10303-21;/m);
    assert.match(content, /FILE_SCHEMA\(\('CONFIG_CONTROL_DESIGN'\)\)/);
    assert.ok(isValidStepFile(content));

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log('  ✓ CLI integration');
}

console.log('step-export tests: all passed ✓');
