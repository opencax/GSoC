// Public API barrel export
export { type Vec3, type Matrix4, type Face, type Solid } from './geometry.js';
export {
    createCubeSolid, createSphereSolid, createCylinderSolid,
    unionSolids, differenceSolids, intersectionSolids, hullSolids,
    linearExtrudeProfile, regularPolygonProfile,
    translationMatrix, scalingMatrix, eulerRotationMatrix,
    transformSolid, transformScene, cloneScene,
    solidAABB,
} from './geometry.js';
export { exportSolidsToStep, type StepExportOptions } from './step-exporter.js';
export { OpenScadStepEvaluator, type StepEvaluationOptions } from './step-evaluator.js';
export { validateStepFile, isValidStepFile, type ValidationResult } from './step-validator.js';
