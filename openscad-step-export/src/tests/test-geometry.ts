// ─── Test: Geometry module ───────────────────────────────────────────────────
import assert from 'node:assert/strict';
import {
    addVec3, subVec3, scaleVec3, dotVec3, crossVec3, lengthVec3, normalizeVec3,
    createCubeSolid, createSphereSolid, createCylinderSolid,
    unionSolids, differenceSolids, intersectionSolids, hullSolids,
    linearExtrudeProfile, regularPolygonProfile,
    translationMatrix, scalingMatrix, applyMatrix4, transformSolid,
    solidAABB, convexHull2D, deduplicateXY,
    type Vec3, type Solid,
} from '../geometry.js';

// ── Vec3 arithmetic ──────────────────────────────────────────────────────────

assert.deepEqual(addVec3([1, 2, 3], [4, 5, 6]), [5, 7, 9]);
assert.deepEqual(subVec3([5, 7, 9], [1, 2, 3]), [4, 5, 6]);
assert.deepEqual(scaleVec3([1, 2, 3], 2), [2, 4, 6]);
assert.equal(dotVec3([1, 0, 0], [0, 1, 0]), 0);
assert.deepEqual(crossVec3([1, 0, 0], [0, 1, 0]), [0, 0, 1]);
assert.ok(Math.abs(lengthVec3([3, 4, 0]) - 5) < 1e-9);

const norm = normalizeVec3([3, 0, 0]);
assert.ok(Math.abs(norm[0] - 1) < 1e-9);
assert.ok(Math.abs(norm[1]) < 1e-9);

console.log('  ✓ Vec3 arithmetic');

// ── Matrix4 transforms ──────────────────────────────────────────────────────

const translated = applyMatrix4(translationMatrix([10, 20, 30]), [0, 0, 0]);
assert.deepEqual(translated, [10, 20, 30]);

const scaled = applyMatrix4(scalingMatrix([2, 3, 4]), [1, 1, 1]);
assert.deepEqual(scaled, [2, 3, 4]);

console.log('  ✓ Matrix4 transforms');

// ── Cube ─────────────────────────────────────────────────────────────────────

const cube = createCubeSolid('test-cube', [2, 2, 2], false);
assert.equal(cube.faces.length, 6);
const cubeBounds = solidAABB(cube);
assert.deepEqual(cubeBounds.min.map(Math.round), [0, 0, 0]);
assert.deepEqual(cubeBounds.max.map(Math.round), [2, 2, 2]);

const centeredCube = createCubeSolid('centered', [4, 4, 4], true);
const ccBounds = solidAABB(centeredCube);
assert.deepEqual(ccBounds.min.map(Math.round), [-2, -2, -2]);
assert.deepEqual(ccBounds.max.map(Math.round), [2, 2, 2]);

console.log('  ✓ Cube primitive');

// ── Sphere ───────────────────────────────────────────────────────────────────

const sphere = createSphereSolid('test-sphere', 5, 12);
assert.ok(sphere.faces.length > 20);
const sBounds = solidAABB(sphere);
assert.ok(sBounds.max[2]! <= 5.01 && sBounds.min[2]! >= -5.01);

console.log('  ✓ Sphere primitive');

// ── Cylinder ─────────────────────────────────────────────────────────────────

const cyl = createCylinderSolid('test-cyl', 10, 3, 3, false, 8);
assert.ok(cyl.faces.length >= 10);  // 8 sides + 2 caps
const cylBounds = solidAABB(cyl);
assert.ok(cylBounds.min[2]! >= -0.01);
assert.ok(cylBounds.max[2]! <= 10.01);

const cone = createCylinderSolid('cone', 5, 2, 0, true, 6);
assert.ok(cone.faces.length >= 7);  // 6 triangles + bottom cap

console.log('  ✓ Cylinder / cone primitives');

// ── Union ────────────────────────────────────────────────────────────────────

const cubeA = createCubeSolid('a', [1, 1, 1], false);
const cubeB = createCubeSolid('b', [1, 1, 1], false);
const merged = unionSolids([cubeA, cubeB], 'merged');
assert.equal(merged.faces.length, cubeA.faces.length + cubeB.faces.length);

console.log('  ✓ Union (mesh merge)');

// ── Difference ───────────────────────────────────────────────────────────────

const diffResult = differenceSolids(
    [createCubeSolid('base', [10, 10, 10], true), createSphereSolid('cut', 3, 8)],
    'diff',
);
assert.ok(diffResult.faces.length > 0);

console.log('  ✓ Difference (approx)');

// ── Intersection ─────────────────────────────────────────────────────────────

const intResult = intersectionSolids(
    [createCubeSolid('a', [10, 10, 10], true), createSphereSolid('b', 7, 10)],
    'int',
);
assert.ok(intResult.faces.length > 0);

console.log('  ✓ Intersection (approx)');

// ── Hull ─────────────────────────────────────────────────────────────────────

const c1 = createCubeSolid('c1', [1, 1, 1], false);
const c2 = createCubeSolid('c2', [1, 1, 1], false);
const c2t = transformSolid(c2, translationMatrix([5, 0, 0]));
const hull = hullSolids([c1, c2t], 'hull-test');
assert.ok(hull.faces.length >= 4); // At least a tetrahedron
const hBounds = solidAABB(hull);
assert.ok(hBounds.max[0]! >= 5.0);

console.log('  ✓ Hull');

// ── 2D Convex Hull ───────────────────────────────────────────────────────────

const pts2d: [number, number][] = [[0, 0], [1, 0], [0.5, 0.5], [0, 1], [1, 1]];
const hull2d = convexHull2D(pts2d);
assert.ok(hull2d.length === 4); // Square corners; interior point excluded.

console.log('  ✓ 2D convex hull');

// ── Deduplicate XY ───────────────────────────────────────────────────────────

const dup: [number, number][] = [[1, 2], [1, 2], [3, 4]];
assert.equal(deduplicateXY(dup).length, 2);

console.log('  ✓ deduplicateXY');

// ── Linear extrude ───────────────────────────────────────────────────────────

const profile = regularPolygonProfile(5, 6);
assert.equal(profile.length, 6);

const extruded = linearExtrudeProfile('ext', profile, 10, false, 0, 1, 6);
assert.ok(extruded.faces.length >= 8); // 6 sides + 2 caps

const twistedExtrude = linearExtrudeProfile('twist', profile, 10, true, 90, 1, 6);
assert.ok(twistedExtrude.faces.length > extruded.faces.length);

console.log('  ✓ Linear extrude');
console.log('geometry tests: all passed ✓');
