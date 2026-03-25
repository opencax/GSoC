// ─── OpenSCAD STEP Export – AST Evaluator ────────────────────────────────────
// Tree-walking interpreter that evaluates an OpenSCAD AST into Solid[] geometry
// ready for STEP export.  Supports: cube, sphere, cylinder, translate, rotate,
// scale, mirror, multmatrix, for, if/else, functions, modules, union,
// difference, intersection, hull, and linear_extrude.

import {
    type AnonymousFunctionExpr, type ArrayLookupExpr, type AssertExpr,
    type AssignmentNode, type BinaryOpExpr, type BlockStmt, type EchoExpr,
    type Expression, type FunctionCallExpr, type FunctionDeclarationStmt,
    type GroupingExpr, type IfElseStatement, type LcEachExpr, type LcForCExpr,
    type LcForExpr, type LcIfExpr, type LcLetExpr, type LetExpr,
    type LiteralExpr, type LookupExpr, type MemberLookupExpr,
    type ModuleDeclarationStmt, type ModuleInstantiationStmt, type RangeExpr,
    type ScadFile, type Statement, type TernaryExpr, type UnaryOpExpr,
    type VectorExpr,
} from 'openscad-parser';

import {
    type Matrix4, type Solid, type Vec3,
    axisAngleRotationMatrix, cloneScene, convexHull2D, createCubeSolid,
    createCylinderSolid, createSphereSolid, deduplicateXY, differenceSolids,
    eulerRotationMatrix, hullSolids, intersectionSolids, linearExtrudeProfile,
    matrixFromRows, mirrorMatrix, regularPolygonProfile, scalingMatrix,
    transformScene, translationMatrix, unionSolids,
} from './geometry.js';

// ── Runtime types ────────────────────────────────────────────────────────────

type RuntimeScalar = boolean | null | number | string | undefined;
type RuntimeFunction = (pos: RuntimeValue[], named: Record<string, RuntimeValue>) => RuntimeValue;
type RuntimeValue = RuntimeScalar | RuntimeFunction | RuntimeValue[];
type ModuleFunction = (
    pos: RuntimeValue[], named: Record<string, RuntimeValue>, children: Solid[],
) => Solid[];

export interface StepEvaluationOptions {
    defaultFn?: number;
}

// ── Scope ────────────────────────────────────────────────────────────────────

class RuntimeScope {
    private readonly values = new Map<string, RuntimeValue>();
    private readonly modules = new Map<string, ModuleFunction>();
    private readonly functions = new Map<string, RuntimeFunction>();

    constructor(
        public readonly parent: RuntimeScope | null = null,
        public readonly childrenScene: Solid[] = [],
    ) {}

    setValue(name: string, value: RuntimeValue): void { this.values.set(name, value); }
    getValue(name: string): RuntimeValue | undefined {
        return this.values.has(name) ? this.values.get(name) : this.parent?.getValue(name);
    }
    setModule(name: string, fn: ModuleFunction): void { this.modules.set(name, fn); }
    getModule(name: string): ModuleFunction | undefined {
        return this.modules.has(name) ? this.modules.get(name) : this.parent?.getModule(name);
    }
    setFunction(name: string, fn: RuntimeFunction): void { this.functions.set(name, fn); }
    getFunction(name: string): RuntimeFunction | undefined {
        return this.functions.has(name) ? this.functions.get(name) : this.parent?.getFunction(name);
    }
}

// ── Evaluator ────────────────────────────────────────────────────────────────

export class OpenScadStepEvaluator {
    private readonly defaultFn: number;

    constructor(options: StepEvaluationOptions = {}) {
        this.defaultFn = Math.max(3, Math.floor(options.defaultFn ?? 24));
    }

    evaluate(ast: ScadFile): Solid[] {
        const scope = new RuntimeScope();
        scope.setValue('$fn', this.defaultFn);
        scope.setValue('$fa', 12);
        scope.setValue('$fs', 2);
        return this.executeNodes(ast.statements as Array<Statement | AssignmentNode>, scope);
    }

    // ── Statement execution ──────────────────────────────────────────────────

    private executeNodes(nodes: Array<Statement | AssignmentNode>, scope: RuntimeScope): Solid[] {
        const solids: Solid[] = [];
        for (const node of nodes) solids.push(...this.executeNode(node, scope));
        return solids;
    }

    private executeNode(node: Statement | AssignmentNode, scope: RuntimeScope): Solid[] {
        switch (node.constructor.name) {
            case 'AssignmentNode':       return this.execAssignment(node as AssignmentNode, scope);
            case 'ModuleInstantiationStmt': return this.execModuleInstantiation(node as ModuleInstantiationStmt, scope);
            case 'ModuleDeclarationStmt':   return this.execModuleDeclaration(node as ModuleDeclarationStmt, scope);
            case 'FunctionDeclarationStmt': return this.execFunctionDeclaration(node as FunctionDeclarationStmt, scope);
            case 'BlockStmt':            return this.executeNodes((node as BlockStmt).children as Array<Statement | AssignmentNode>, scope);
            case 'IfElseStatement':      return this.execIfElse(node as IfElseStatement, scope);
            case 'NoopStmt': case 'UseStmt': case 'IncludeStmt': case 'ErrorNode': return [];
            default: throw new Error(`Unsupported statement type ${node.constructor.name}.`);
        }
    }

    private execAssignment(node: AssignmentNode, scope: RuntimeScope): Solid[] {
        if (node.role === 0 && node.value) scope.setValue(node.name, this.evalExpr(node.value, scope));
        return [];
    }

    private execIfElse(node: IfElseStatement, scope: RuntimeScope): Solid[] {
        if (this.isTruthy(this.evalExpr(node.cond, scope)))
            return this.executeNode(node.thenBranch as Statement | AssignmentNode, scope);
        if (node.elseBranch)
            return this.executeNode(node.elseBranch as Statement | AssignmentNode, scope);
        return [];
    }

    private execModuleDeclaration(node: ModuleDeclarationStmt, scope: RuntimeScope): Solid[] {
        const declScope = scope;
        scope.setModule(node.name, (pos, named, children) => {
            const ms = new RuntimeScope(declScope, cloneScene(children));
            this.bindArgs(node.definitionArgs, pos, named, ms);
            return this.executeNode(node.stmt as Statement | AssignmentNode, ms);
        });
        return [];
    }

    private execFunctionDeclaration(node: FunctionDeclarationStmt, scope: RuntimeScope): Solid[] {
        const declScope = scope;
        scope.setFunction(node.name, (pos, named) => {
            const fs = new RuntimeScope(declScope);
            this.bindArgs(node.definitionArgs, pos, named, fs);
            return this.evalExpr(node.expr, fs);
        });
        return [];
    }

    // ── Module instantiation (primitives + transforms + CSG) ─────────────────

    private execModuleInstantiation(node: ModuleInstantiationStmt, scope: RuntimeScope): Solid[] {
        if (node.tagDisabled) return [];
        if (node.name === 'for') return this.execForLoop(node, scope);

        const { named, positional } = this.evalCallArgs(node.args, scope);
        switch (node.name) {
            // ─ Primitives ─
            case 'cube':     return [this.makeCube(positional, named)];
            case 'sphere':   return [this.makeSphere(positional, named, scope)];
            case 'cylinder': return [this.makeCylinder(positional, named, scope)];

            // ─ Transforms ─
            case 'translate':
                return this.applyTransform(node, scope,
                    translationMatrix(this.expectVec3(named.v ?? positional[0], 'translate()')));
            case 'scale':
                return this.applyTransform(node, scope,
                    scalingMatrix(this.expectVec3(named.v ?? positional[0] ?? 1, 'scale()', true)));
            case 'rotate':
                return this.applyTransform(node, scope, this.rotationMatrix(positional, named));
            case 'mirror':
                return this.applyTransform(node, scope,
                    mirrorMatrix(this.expectVec3(named.v ?? positional[0], 'mirror()')));
            case 'multmatrix':
                return this.applyTransform(node, scope, this.matrixFromVal(named.m ?? positional[0]));

            // ─ Pass-through wrappers ─
            case 'group': case 'color': case 'render':
                return cloneScene(this.childScene(node, scope));

            // ─ Boolean / CSG ─
            case 'union': {
                const ch = this.childScene(node, scope);
                return ch.length > 1 ? [unionSolids(ch, 'union')] : cloneScene(ch);
            }
            case 'difference': {
                const ch = this.childScene(node, scope);
                return ch.length > 0 ? [differenceSolids(ch, 'difference')] : [];
            }
            case 'intersection': {
                const ch = this.childScene(node, scope);
                return ch.length > 0 ? [intersectionSolids(ch, 'intersection')] : [];
            }
            case 'hull': {
                const ch = this.childScene(node, scope);
                return ch.length > 0 ? [hullSolids(ch, 'hull')] : [];
            }

            // ─ Linear extrude ─
            case 'linear_extrude': {
                const height = this.expectNumber(named.height ?? named.h ?? positional[0] ?? 1, 'linear_extrude() height');
                const center = this.expectBoolean(named.center ?? false, 'linear_extrude() center');
                const twist = typeof named.twist === 'number' ? named.twist : 0;
                const scaleTop = typeof named.scale === 'number' ? named.scale : 1;
                const fn = this.resolveFn(named, scope);
                const ch = this.childScene(node, scope);
                if (ch.length > 0) {
                    const pts: [number, number][] = [];
                    for (const s of ch) for (const f of s.faces) for (const v of f.vertices) pts.push([v[0], v[1]]);
                    if (pts.length >= 3) {
                        const profile = convexHull2D(deduplicateXY(pts));
                        if (profile.length >= 3) {
                            return [linearExtrudeProfile('linear_extrude', profile, height, center, twist, scaleTop, fn)];
                        }
                    }
                }
                const profile = regularPolygonProfile(1, fn);
                return [linearExtrudeProfile('linear_extrude', profile, height, center, twist, scaleTop, fn)];
            }

            case 'children':
                return cloneScene(scope.childrenScene);

            // ─ Not-yet-supported ─
            case 'minkowski': case 'rotate_extrude': case 'offset': case 'surface': case 'import':
                throw new Error(`${node.name}() is not yet supported by the STEP exporter.`);

            // ─ User-defined modules ─
            default: {
                const fn = scope.getModule(node.name);
                if (!fn) throw new Error(`Unknown module "${node.name}".`);
                return fn(positional, named, this.childScene(node, scope));
            }
        }
    }

    private execForLoop(node: ModuleInstantiationStmt, scope: RuntimeScope): Solid[] {
        const iterate = (idx: number, s: RuntimeScope): Solid[] => {
            if (idx >= node.args.length) return this.childScene(node, s);
            const a = node.args[idx]!;
            if (!a.name || !a.value) return iterate(idx + 1, s);
            const vals = this.expectArray(this.evalExpr(a.value, s), `for() values for ${a.name}`);
            const out: Solid[] = [];
            for (const v of vals) {
                const ls = new RuntimeScope(s, s.childrenScene);
                ls.setValue(a.name, v);
                out.push(...iterate(idx + 1, ls));
            }
            return out;
        };
        return iterate(0, scope);
    }

    private applyTransform(node: ModuleInstantiationStmt, scope: RuntimeScope, m: Matrix4): Solid[] {
        return transformScene(this.childScene(node, scope), m);
    }

    private childScene(node: ModuleInstantiationStmt, scope: RuntimeScope): Solid[] {
        return node.child ? this.executeNode(node.child as Statement | AssignmentNode, scope) : [];
    }

    // ── Argument binding ─────────────────────────────────────────────────────

    private bindArgs(defs: AssignmentNode[], pos: RuntimeValue[], named: Record<string, RuntimeValue>, scope: RuntimeScope): void {
        for (const d of defs) { if (d.value) scope.setValue(d.name, this.evalExpr(d.value, scope)); }
        for (let i = 0; i < defs.length; i++) { if (i < pos.length) scope.setValue(defs[i]!.name, pos[i]!); }
        for (const [n, v] of Object.entries(named)) scope.setValue(n, v);
    }

    private evalCallArgs(args: AssignmentNode[], scope: RuntimeScope):
        { named: Record<string, RuntimeValue>; positional: RuntimeValue[] } {
        const positional: RuntimeValue[] = [];
        const named: Record<string, RuntimeValue> = {};
        for (const a of args) {
            const v = a.value ? this.evalExpr(a.value, scope) : null;
            if (a.name) named[a.name] = v; else positional.push(v);
        }
        return { named, positional };
    }

    // ── Expression evaluation ────────────────────────────────────────────────

    private evalExpr(node: Expression, scope: RuntimeScope): RuntimeValue {
        switch (node.constructor.name) {
            case 'LiteralExpr':          return (node as LiteralExpr<RuntimeScalar>).value;
            case 'VectorExpr':           return (node as VectorExpr).children.map((c) => this.evalExpr(c, scope));
            case 'LookupExpr':           return this.lookupVal(node as LookupExpr, scope);
            case 'BinaryOpExpr':         return this.evalBinary(node as BinaryOpExpr, scope);
            case 'UnaryOpExpr':          return this.evalUnary(node as UnaryOpExpr, scope);
            case 'GroupingExpr':         return this.evalExpr((node as GroupingExpr).inner, scope);
            case 'TernaryExpr':          return this.evalTernary(node as TernaryExpr, scope);
            case 'RangeExpr':            return this.evalRange(node as RangeExpr, scope);
            case 'ArrayLookupExpr':      return this.evalArrayLookup(node as ArrayLookupExpr, scope);
            case 'FunctionCallExpr':     return this.evalFunctionCall(node as FunctionCallExpr, scope);
            case 'LetExpr':              return this.evalLet(node as LetExpr, scope);
            case 'AssertExpr':           return this.evalAssert(node as AssertExpr, scope);
            case 'EchoExpr':             return this.evalEcho(node as EchoExpr, scope);
            case 'LcIfExpr':             return this.evalLcIf(node as LcIfExpr, scope);
            case 'LcEachExpr':           return this.evalLcEach(node as LcEachExpr, scope);
            case 'LcForExpr':            return this.evalLcFor(node as LcForExpr, scope);
            case 'LcForCExpr':           return this.evalLcForC(node as LcForCExpr, scope);
            case 'LcLetExpr':            return this.evalLcLet(node as LcLetExpr, scope);
            case 'AnonymousFunctionExpr': return this.evalAnonFn(node as AnonymousFunctionExpr, scope);
            case 'MemberLookupExpr':     return this.evalMemberLookup(node as MemberLookupExpr, scope);
            default: throw new Error(`Unsupported expression type ${node.constructor.name}.`);
        }
    }

    private lookupVal(node: LookupExpr, scope: RuntimeScope): RuntimeValue {
        if (node.name === 'undef') return null;
        const v = scope.getValue(node.name);
        if (v !== undefined) return v;
        throw new Error(`Undefined symbol "${node.name}".`);
    }

    private evalBinary(node: BinaryOpExpr, scope: RuntimeScope): RuntimeValue {
        const l = this.evalExpr(node.left, scope);
        const r = this.evalExpr(node.right, scope);
        const op = node.tokens.operator.lexeme;
        switch (op) {
            case '+':  return this.numericBinOp(l, r, (a, b) => a + b, op);
            case '-':  return this.numericBinOp(l, r, (a, b) => a - b, op);
            case '*':  return this.numericBinOp(l, r, (a, b) => a * b, op);
            case '/':  return this.numericBinOp(l, r, (a, b) => a / b, op);
            case '%':  return this.numericBinOp(l, r, (a, b) => a % b, op);
            case '<':  return this.expectNumber(l, '<') <  this.expectNumber(r, '<');
            case '<=': return this.expectNumber(l, '<=') <= this.expectNumber(r, '<=');
            case '>':  return this.expectNumber(l, '>') >  this.expectNumber(r, '>');
            case '>=': return this.expectNumber(l, '>=') >= this.expectNumber(r, '>=');
            case '==': return JSON.stringify(l) === JSON.stringify(r);
            case '!=': return JSON.stringify(l) !== JSON.stringify(r);
            case '&&': return this.isTruthy(l) && this.isTruthy(r);
            case '||': return this.isTruthy(l) || this.isTruthy(r);
            default: throw new Error(`Unsupported operator "${op}".`);
        }
    }

    private evalUnary(node: UnaryOpExpr, scope: RuntimeScope): RuntimeValue {
        const v = this.evalExpr(node.right, scope);
        const op = node.tokens.operator.lexeme;
        switch (op) {
            case '-': return this.numericUnary(v, (x) => -x, op);
            case '+': return this.numericUnary(v, (x) => x, op);
            case '!': return !this.isTruthy(v);
            default:  throw new Error(`Unsupported unary "${op}".`);
        }
    }

    private evalTernary(node: TernaryExpr, scope: RuntimeScope): RuntimeValue {
        return this.isTruthy(this.evalExpr(node.cond, scope))
            ? this.evalExpr(node.ifExpr, scope)
            : this.evalExpr(node.elseExpr, scope);
    }

    private evalRange(node: RangeExpr, scope: RuntimeScope): RuntimeValue {
        const begin = this.expectNumber(this.evalExpr(node.begin, scope), 'range start');
        const step = node.step ? this.expectNumber(this.evalExpr(node.step, scope), 'range step') : 1;
        const end = this.expectNumber(this.evalExpr(node.end, scope), 'range end');
        if (step === 0) throw new Error('range() step cannot be zero.');
        const vals: RuntimeValue[] = [];
        if (step > 0) { for (let v = begin; v <= end + 1e-9; v += step) vals.push(v); }
        else          { for (let v = begin; v >= end - 1e-9; v += step) vals.push(v); }
        return vals;
    }

    private evalArrayLookup(node: ArrayLookupExpr, scope: RuntimeScope): RuntimeValue {
        const arr = this.expectArray(this.evalExpr(node.array, scope), 'array lookup');
        const idx = Math.trunc(this.expectNumber(this.evalExpr(node.index, scope), 'array index'));
        return arr[idx];
    }

    private evalFunctionCall(node: FunctionCallExpr, scope: RuntimeScope): RuntimeValue {
        const { named, positional } = this.evalCallArgs(node.args, scope);
        if (node.callee.constructor.name === 'LookupExpr') {
            const name = (node.callee as LookupExpr).name;
            const bi = this.callBuiltIn(name, positional, named);
            if (bi !== undefined) return bi;
            const fn = scope.getFunction(name) ?? scope.getValue(name);
            if (typeof fn === 'function') return fn(positional, named);
        }
        const callee = this.evalExpr(node.callee, scope);
        if (typeof callee !== 'function') throw new Error('Attempted to call a non-function.');
        return callee(positional, named);
    }

    private evalLet(node: LetExpr, scope: RuntimeScope): RuntimeValue {
        const cs = new RuntimeScope(scope);
        for (const a of node.args) cs.setValue(a.name, a.value ? this.evalExpr(a.value, cs) : null);
        return this.evalExpr(node.expr, cs);
    }

    private evalAssert(node: AssertExpr, scope: RuntimeScope): RuntimeValue {
        const cond = node.args[0]?.value ? this.evalExpr(node.args[0].value, scope) : false;
        if (!this.isTruthy(cond)) throw new Error('OpenSCAD assert() failed.');
        return this.evalExpr(node.expr, scope);
    }

    private evalEcho(node: EchoExpr, scope: RuntimeScope): RuntimeValue {
        const vals = node.args.map((a) => (a.value ? this.evalExpr(a.value, scope) : null));
        console.log('ECHO:', ...vals);
        return this.evalExpr(node.expr, scope);
    }

    private evalLcIf(node: LcIfExpr, scope: RuntimeScope): RuntimeValue {
        if (this.isTruthy(this.evalExpr(node.cond, scope))) return [this.evalExpr(node.ifExpr, scope)];
        return node.elseExpr ? [this.evalExpr(node.elseExpr, scope)] : [];
    }

    private evalLcEach(node: LcEachExpr, scope: RuntimeScope): RuntimeValue {
        return this.expectArray(this.evalExpr(node.expr, scope), 'each');
    }

    private evalLcFor(node: LcForExpr, scope: RuntimeScope): RuntimeValue {
        const out: RuntimeValue[] = [];
        const iter = (idx: number, s: RuntimeScope): void => {
            if (idx >= node.args.length) { out.push(this.evalExpr(node.expr, s)); return; }
            const a = node.args[idx]!;
            if (!a.name || !a.value) { iter(idx + 1, s); return; }
            const vals = this.expectArray(this.evalExpr(a.value, s), `lc-for ${a.name}`);
            for (const v of vals) { const ns = new RuntimeScope(s); ns.setValue(a.name, v); iter(idx + 1, ns); }
        };
        iter(0, scope);
        return out;
    }

    private evalLcForC(node: LcForCExpr, scope: RuntimeScope): RuntimeValue {
        const out: RuntimeValue[] = [];
        const ls = new RuntimeScope(scope);
        for (const a of node.args) ls.setValue(a.name, a.value ? this.evalExpr(a.value, ls) : null);
        while (this.isTruthy(this.evalExpr(node.cond, ls))) {
            out.push(this.evalExpr(node.expr, ls));
            for (const inc of node.incrArgs) {
                if (inc.name && inc.value) ls.setValue(inc.name, this.evalExpr(inc.value, ls));
            }
        }
        return out;
    }

    private evalLcLet(node: LcLetExpr, scope: RuntimeScope): RuntimeValue {
        const cs = new RuntimeScope(scope);
        for (const a of node.args) cs.setValue(a.name, a.value ? this.evalExpr(a.value, cs) : null);
        return [this.evalExpr(node.expr, cs)];
    }

    private evalAnonFn(node: AnonymousFunctionExpr, scope: RuntimeScope): RuntimeFunction {
        return (pos, named) => {
            const fs = new RuntimeScope(scope);
            this.bindArgs(node.definitionArgs, pos, named, fs);
            return this.evalExpr(node.expr, fs);
        };
    }

    private evalMemberLookup(node: MemberLookupExpr, scope: RuntimeScope): RuntimeValue {
        const val = this.evalExpr(node.expr, scope);
        if (Array.isArray(val)) {
            const map: Record<string, number> = { x: 0, y: 1, z: 2, w: 3 };
            const idx = map[node.member];
            if (idx !== undefined) return val[idx];
        }
        throw new Error(`Unsupported member .${node.member}`);
    }

    // ── Built-in functions ───────────────────────────────────────────────────

    private callBuiltIn(name: string, pos: RuntimeValue[], _named: Record<string, RuntimeValue>): RuntimeValue | undefined {
        const a0 = pos[0];
        switch (name) {
            case 'sin':   return Math.sin(this.toRad(this.expectNumber(a0, 'sin()')));
            case 'cos':   return Math.cos(this.toRad(this.expectNumber(a0, 'cos()')));
            case 'tan':   return Math.tan(this.toRad(this.expectNumber(a0, 'tan()')));
            case 'asin':  return this.toDeg(Math.asin(this.expectNumber(a0, 'asin()')));
            case 'acos':  return this.toDeg(Math.acos(this.expectNumber(a0, 'acos()')));
            case 'atan':  return this.toDeg(Math.atan(this.expectNumber(a0, 'atan()')));
            case 'atan2': return this.toDeg(Math.atan2(this.expectNumber(pos[0], 'atan2() y'), this.expectNumber(pos[1], 'atan2() x')));
            case 'sqrt':  return Math.sqrt(this.expectNumber(a0, 'sqrt()'));
            case 'abs':   return Math.abs(this.expectNumber(a0, 'abs()'));
            case 'round': return Math.round(this.expectNumber(a0, 'round()'));
            case 'ceil':  return Math.ceil(this.expectNumber(a0, 'ceil()'));
            case 'floor': return Math.floor(this.expectNumber(a0, 'floor()'));
            case 'pow':   return Math.pow(this.expectNumber(pos[0], 'pow() base'), this.expectNumber(pos[1], 'pow() exp'));
            case 'min':   return this.minMax(pos, Math.min);
            case 'max':   return this.minMax(pos, Math.max);
            case 'len': {
                if (Array.isArray(a0) || typeof a0 === 'string') return a0.length;
                throw new Error('len() expects array or string.');
            }
            case 'norm': {
                const v = this.expectArray(a0, 'norm()').map((x) => this.expectNumber(x, 'norm() el'));
                return Math.hypot(...v);
            }
            case 'concat': {
                const out: RuntimeValue[] = [];
                for (const v of pos) { Array.isArray(v) ? out.push(...v) : out.push(v); }
                return out;
            }
            case 'is_undef': return a0 === undefined || a0 === null;
            case 'str':      return pos.map((v) => String(v ?? '')).join('');
            default:         return undefined;
        }
    }

    private minMax(args: RuntimeValue[], reducer: (...n: number[]) => number): number {
        const vals = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return reducer(...vals.map((v) => this.expectNumber(v, 'min/max()')));
    }

    // ── Numeric helpers ──────────────────────────────────────────────────────

    private numericUnary(v: RuntimeValue, op: (n: number) => number, label: string): RuntimeValue {
        if (Array.isArray(v)) return v.map((x) => this.numericUnary(x, op, label));
        return op(this.expectNumber(v, label));
    }

    private numericBinOp(l: RuntimeValue, r: RuntimeValue, op: (a: number, b: number) => number, label: string): RuntimeValue {
        if (Array.isArray(l) && Array.isArray(r)) {
            if (l.length !== r.length) throw new Error(`${label} requires vectors of same length.`);
            return l.map((v, i) => this.numericBinOp(v, r[i]!, op, label));
        }
        if (Array.isArray(l)) return l.map((v) => this.numericBinOp(v, r, op, label));
        if (Array.isArray(r)) return r.map((v) => this.numericBinOp(l, v, op, label));
        return op(this.expectNumber(l, label), this.expectNumber(r, label));
    }

    // ── Primitive constructors ───────────────────────────────────────────────

    private makeCube(pos: RuntimeValue[], named: Record<string, RuntimeValue>): Solid {
        const rawSize = named.size ?? pos[0] ?? 1;
        return createCubeSolid('cube', this.expectVec3(rawSize, 'cube() size', true),
            this.expectBoolean(named.center ?? pos[1] ?? false, 'cube() center'));
    }

    private makeSphere(pos: RuntimeValue[], named: Record<string, RuntimeValue>, scope: RuntimeScope): Solid {
        let r: number;
        if (named.r !== undefined) r = this.expectNumber(named.r, 'sphere() r');
        else if (named.d !== undefined) r = this.expectNumber(named.d, 'sphere() d') / 2;
        else r = this.expectNumber(pos[0] ?? 1, 'sphere() r');
        return createSphereSolid('sphere', r, this.resolveFn(named, scope));
    }

    private makeCylinder(pos: RuntimeValue[], named: Record<string, RuntimeValue>, scope: RuntimeScope): Solid {
        const h = this.expectNumber(named.h ?? pos[0] ?? 1, 'cylinder() h');
        let br = this.expectNumber(named.r1 ?? named.r ?? pos[1] ?? 1, 'cylinder() r1');
        let tr = this.expectNumber(named.r2 ?? named.r ?? pos[2] ?? br, 'cylinder() r2');
        if (named.d !== undefined) { br = this.expectNumber(named.d, 'cylinder() d') / 2; tr = br; }
        if (named.d1 !== undefined) br = this.expectNumber(named.d1, 'cylinder() d1') / 2;
        if (named.d2 !== undefined) tr = this.expectNumber(named.d2, 'cylinder() d2') / 2;
        const center = this.expectBoolean(named.center ?? pos[3] ?? false, 'cylinder() center');
        return createCylinderSolid('cylinder', h, br, tr, center, this.resolveFn(named, scope));
    }

    private resolveFn(named: Record<string, RuntimeValue>, scope: RuntimeScope): number {
        const ov = named.$fn ?? named.fn ?? scope.getValue('$fn');
        if (ov === undefined || ov === null) return this.defaultFn;
        return Math.max(3, Math.floor(this.expectNumber(ov, '$fn')));
    }

    private rotationMatrix(pos: RuntimeValue[], named: Record<string, RuntimeValue>): Matrix4 {
        const axis = named.v ?? pos[1];
        const angle = named.a ?? pos[0];
        if (axis !== undefined && typeof angle === 'number')
            return axisAngleRotationMatrix(angle, this.expectVec3(axis, 'rotate() axis'));
        return eulerRotationMatrix(this.expectVec3(named.a ?? pos[0] ?? [0, 0, 0], 'rotate() angles'));
    }

    private matrixFromVal(v: RuntimeValue): Matrix4 {
        const rows = this.expectArray(v, 'multmatrix()').map((row) =>
            this.expectArray(row, 'multmatrix() row').map((e) => this.expectNumber(e, 'multmatrix() entry')));
        return matrixFromRows(rows);
    }

    // ── Type-checking helpers ────────────────────────────────────────────────

    private expectNumber(v: RuntimeValue, ctx: string): number {
        if (typeof v !== 'number') throw new Error(`${ctx} must be a number.`);
        return v;
    }

    private expectBoolean(v: RuntimeValue, ctx: string): boolean {
        if (typeof v === 'boolean') return v;
        if (typeof v === 'number') return v !== 0;
        throw new Error(`${ctx} must be a boolean.`);
    }

    private expectArray(v: RuntimeValue, ctx: string): RuntimeValue[] {
        if (!Array.isArray(v)) throw new Error(`${ctx} must be an array.`);
        return v;
    }

    private expectVec3(v: RuntimeValue, ctx: string, allowScalar = false): Vec3 {
        if (allowScalar && typeof v === 'number') return [v, v, v];
        const arr = this.expectArray(v, ctx);
        if (arr.length !== 3) throw new Error(`${ctx} must have 3 entries.`);
        return [this.expectNumber(arr[0], `${ctx}[0]`), this.expectNumber(arr[1], `${ctx}[1]`), this.expectNumber(arr[2], `${ctx}[2]`)];
    }

    private isTruthy(v: RuntimeValue): boolean {
        if (v === null || v === undefined) return false;
        if (typeof v === 'boolean') return v;
        if (typeof v === 'number') return v !== 0;
        if (typeof v === 'string') return v.length > 0;
        if (Array.isArray(v)) return v.length > 0;
        return true;
    }

    private toRad(d: number): number { return (d * Math.PI) / 180; }
    private toDeg(r: number): number { return (r * 180) / Math.PI; }
}
