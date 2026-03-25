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
    private execAssignment;
    private execIfElse;
    private execModuleDeclaration;
    private execFunctionDeclaration;
    private execModuleInstantiation;
    private execForLoop;
    private applyTransform;
    private childScene;
    private bindArgs;
    private evalCallArgs;
    private evalExpr;
    private lookupVal;
    private evalBinary;
    private evalUnary;
    private evalTernary;
    private evalRange;
    private evalArrayLookup;
    private evalFunctionCall;
    private evalLet;
    private evalAssert;
    private evalEcho;
    private evalLcIf;
    private evalLcEach;
    private evalLcFor;
    private evalLcForC;
    private evalLcLet;
    private evalAnonFn;
    private evalMemberLookup;
    private callBuiltIn;
    private minMax;
    private numericUnary;
    private numericBinOp;
    private makeCube;
    private makeSphere;
    private makeCylinder;
    private resolveFn;
    private rotationMatrix;
    private matrixFromVal;
    private expectNumber;
    private expectBoolean;
    private expectArray;
    private expectVec3;
    private isTruthy;
    private toRad;
    private toDeg;
}
//# sourceMappingURL=step-evaluator.d.ts.map