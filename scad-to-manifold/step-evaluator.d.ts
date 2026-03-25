import { type ScadFile } from 'openscad-parser';
import { type Solid } from './geometry.js';
export interface StepEvaluationOptions {
    defaultFn?: number;
}
export declare class OpenScadStepEvaluator {
    private readonly defaultFn;
    constructor(options?: StepEvaluationOptions);
    evaluate(ast: ScadFile): Solid[];
    private executeNodes;
    private executeNode;
    private executeAssignment;
    private executeBlock;
    private executeIfElse;
    private executeModuleDeclaration;
    private executeFunctionDeclaration;
    private executeModuleInstantiation;
    private executeForLoop;
    private applyTransform;
    private evaluateChildScene;
    private bindDefinitionArguments;
    private evaluateCallArguments;
    private evaluateExpression;
    private lookupValue;
    private evaluateBinary;
    private evaluateUnary;
    private evaluateTernary;
    private evaluateRange;
    private evaluateArrayLookup;
    private evaluateFunctionCall;
    private evaluateLet;
    private evaluateAssert;
    private evaluateEcho;
    private evaluateLcIf;
    private evaluateLcEach;
    private evaluateLcFor;
    private evaluateLcForC;
    private evaluateLcLet;
    private evaluateAnonymousFunction;
    private evaluateMemberLookup;
    private callBuiltInFunction;
    private minOrMax;
    private applyNumericUnary;
    private applyNumericBinary;
    private createCube;
    private createSphere;
    private createCylinder;
    private resolveFn;
    private rotationMatrixFromArgs;
    private matrixFromValue;
    private expectNumber;
    private expectBoolean;
    private expectArray;
    private expectVec3;
    private isTruthy;
    private toRadians;
    private toDegrees;
}
//# sourceMappingURL=step-evaluator.d.ts.map