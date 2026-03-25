export type Vec3 = [number, number, number];
export type Matrix4 = [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number
];
export interface Face {
    vertices: Vec3[];
}
export interface Solid {
    name: string;
    faces: Face[];
}
export declare function cloneVec3(value: Vec3): Vec3;
export declare function addVec3(left: Vec3, right: Vec3): Vec3;
export declare function subVec3(left: Vec3, right: Vec3): Vec3;
export declare function scaleVec3(value: Vec3, scalar: number): Vec3;
export declare function dotVec3(left: Vec3, right: Vec3): number;
export declare function crossVec3(left: Vec3, right: Vec3): Vec3;
export declare function lengthVec3(value: Vec3): number;
export declare function normalizeVec3(value: Vec3): Vec3;
export declare function averageVec3(values: Vec3[]): Vec3;
export declare function cloneFace(face: Face): Face;
export declare function cloneSolid(solid: Solid): Solid;
export declare function cloneScene(solids: Solid[]): Solid[];
export declare function faceCentroid(face: Face): Vec3;
export declare function faceNormal(face: Face): Vec3;
export declare function solidCentroid(solid: Solid): Vec3;
export declare function orientSolidFacesOutward(solid: Solid): Solid;
export declare function identityMatrix4(): Matrix4;
export declare function multiplyMatrix4(left: Matrix4, right: Matrix4): Matrix4;
export declare function applyMatrix4(matrix: Matrix4, value: Vec3): Vec3;
export declare function translationMatrix(offset: Vec3): Matrix4;
export declare function scalingMatrix(scale: Vec3): Matrix4;
export declare function rotationXMatrix(deg: number): Matrix4;
export declare function rotationYMatrix(deg: number): Matrix4;
export declare function rotationZMatrix(deg: number): Matrix4;
export declare function eulerRotationMatrix(angles: Vec3): Matrix4;
export declare function axisAngleRotationMatrix(deg: number, axis: Vec3): Matrix4;
export declare function mirrorMatrix(normal: Vec3): Matrix4;
export declare function matrixFromRows(rows: number[][]): Matrix4;
export declare function transformSolid(solid: Solid, matrix: Matrix4): Solid;
export declare function transformScene(solids: Solid[], matrix: Matrix4): Solid[];
export declare function createCubeSolid(name: string, size: Vec3, center: boolean): Solid;
export declare function createSphereSolid(name: string, radius: number, segments: number, rings?: number): Solid;
export declare function createCylinderSolid(name: string, height: number, bottomRadius: number, topRadius: number, center: boolean, segments: number): Solid;
/** Merge all solids into one combined shell. */
export declare function unionSolids(solids: Solid[], name: string): Solid;
/**
 * Approximate CSG difference: combines the base faces with the inverted
 * cutter faces.  This is a mesh-level approximation suitable for FACETED_BREP
 * export; a full BSP tree is tracked as future work.
 */
export declare function differenceSolids(solids: Solid[], name: string): Solid;
/**
 * Approximate CSG intersection: keeps faces of the first solid whose
 * centroid lies inside the AABB of every other solid.
 */
export declare function intersectionSolids(solids: Solid[], name: string): Solid;
interface AABB {
    min: Vec3;
    max: Vec3;
}
export declare function solidAABB(solid: Solid): AABB;
/**
 * Computes the 3-D convex hull of all vertices from the input solids.
 * Uses a simplified incremental algorithm. O(n²) — fine for small meshes.
 */
export declare function hullSolids(solids: Solid[], name: string): Solid;
export declare function deduplicateXY(pts: [number, number][]): [number, number][];
/** 2-D convex hull using Andrew's monotone-chain algorithm. */
export declare function convexHull2D(pts: [number, number][]): [number, number][];
/**
 * Extrudes a 2D profile (points in XY) along Z by height.
 * Supports twist (in degrees) and scaling of the top profile.
 */
export declare function linearExtrudeProfile(name: string, profile2d: [number, number][], height: number, center: boolean, twist: number, scaleTop: number, segments: number): Solid;
/** Regular n-gon in XY for linearExtrudeProfile(). */
export declare function regularPolygonProfile(radius: number, sides: number): [number, number][];
export {};
//# sourceMappingURL=geometry.d.ts.map