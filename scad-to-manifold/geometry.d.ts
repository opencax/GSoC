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
export declare function cloneFace(face: Face): Face;
export declare function cloneSolid(solid: Solid): Solid;
export declare function cloneScene(solids: Solid[]): Solid[];
export declare function addVec3(left: Vec3, right: Vec3): Vec3;
export declare function subVec3(left: Vec3, right: Vec3): Vec3;
export declare function scaleVec3(value: Vec3, scalar: number): Vec3;
export declare function dotVec3(left: Vec3, right: Vec3): number;
export declare function crossVec3(left: Vec3, right: Vec3): Vec3;
export declare function lengthVec3(value: Vec3): number;
export declare function normalizeVec3(value: Vec3): Vec3;
export declare function averageVec3(values: Vec3[]): Vec3;
export declare function faceCentroid(face: Face): Vec3;
export declare function faceNormal(face: Face): Vec3;
export declare function solidCentroid(solid: Solid): Vec3;
export declare function orientSolidFacesOutward(solid: Solid): Solid;
export declare function identityMatrix4(): Matrix4;
export declare function multiplyMatrix4(left: Matrix4, right: Matrix4): Matrix4;
export declare function applyMatrix4(matrix: Matrix4, value: Vec3): Vec3;
export declare function translationMatrix(offset: Vec3): Matrix4;
export declare function scalingMatrix(scale: Vec3): Matrix4;
export declare function rotationXMatrix(angleDegrees: number): Matrix4;
export declare function rotationYMatrix(angleDegrees: number): Matrix4;
export declare function rotationZMatrix(angleDegrees: number): Matrix4;
export declare function eulerRotationMatrix(angles: Vec3): Matrix4;
export declare function axisAngleRotationMatrix(angleDegrees: number, axis: Vec3): Matrix4;
export declare function mirrorMatrix(normal: Vec3): Matrix4;
export declare function matrixFromRows(rows: number[][]): Matrix4;
export declare function transformSolid(solid: Solid, matrix: Matrix4): Solid;
export declare function transformScene(solids: Solid[], matrix: Matrix4): Solid[];
export declare function createCubeSolid(name: string, size: Vec3, center: boolean): Solid;
export declare function createSphereSolid(name: string, radius: number, segments: number, rings?: number): Solid;
export declare function createCylinderSolid(name: string, height: number, bottomRadius: number, topRadius: number, center: boolean, segments: number): Solid;
//# sourceMappingURL=geometry.d.ts.map