import {
    type AnonymousFunctionExpr,
    type ArrayLookupExpr,
    type AssertExpr,
    type AssignmentNode,
    type BinaryOpExpr,
    type BlockStmt,
    type EchoExpr,
    type Expression,
    type FunctionCallExpr,
    type FunctionDeclarationStmt,
    type GroupingExpr,
    type IfElseStatement,
    type LcEachExpr,
    type LcForCExpr,
    type LcForExpr,
    type LcIfExpr,
    type LcLetExpr,
    type LetExpr,
    type LiteralExpr,
    type LookupExpr,
    type MemberLookupExpr,
    type ModuleDeclarationStmt,
    type ModuleInstantiationStmt,
    type RangeExpr,
    type ScadFile,
    type Statement,
    type TernaryExpr,
    type UnaryOpExpr,
    type VectorExpr,
} from 'openscad-parser';
import {
    type Matrix4,
    type Solid,
    type Vec3,
    axisAngleRotationMatrix,
    cloneScene,
    createCubeSolid,
    createCylinderSolid,
    createSphereSolid,
    eulerRotationMatrix,
    matrixFromRows,
    mirrorMatrix,
    scalingMatrix,
    transformScene,
    translationMatrix,
} from './geometry.js';

type RuntimeScalar = boolean | null | number | string | undefined;
type RuntimeFunction = (positionalArgs: RuntimeValue[], namedArgs: Record<string, RuntimeValue>) => RuntimeValue;
type RuntimeValue = RuntimeScalar | RuntimeFunction | RuntimeValue[];
type ModuleFunction = (
    positionalArgs: RuntimeValue[],
    namedArgs: Record<string, RuntimeValue>,
    childScene: Solid[],
) => Solid[];

export interface StepEvaluationOptions {
    defaultFn?: number;
}

class RuntimeScope {
    private readonly values = new Map<string, RuntimeValue>();
    private readonly modules = new Map<string, ModuleFunction>();
    private readonly functions = new Map<string, RuntimeFunction>();

    constructor(
        public readonly parent: RuntimeScope | null = null,
        public readonly childrenScene: Solid[] = [],
    ) {}

    setValue(name: string, value: RuntimeValue): void {
        this.values.set(name, value);
    }

    getValue(name: string): RuntimeValue | undefined {
        if (this.values.has(name)) {
            return this.values.get(name);
        }
        return this.parent?.getValue(name);
    }

    setModule(name: string, value: ModuleFunction): void {
        this.modules.set(name, value);
    }

    getModule(name: string): ModuleFunction | undefined {
        if (this.modules.has(name)) {
            return this.modules.get(name);
        }
        return this.parent?.getModule(name);
    }

    setFunction(name: string, value: RuntimeFunction): void {
        this.functions.set(name, value);
    }

    getFunction(name: string): RuntimeFunction | undefined {
        if (this.functions.has(name)) {
            return this.functions.get(name);
        }
        return this.parent?.getFunction(name);
    }
}

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

    private executeNodes(nodes: Array<Statement | AssignmentNode>, scope: RuntimeScope): Solid[] {
        const solids: Solid[] = [];
        for (const node of nodes) {
            solids.push(...this.executeNode(node, scope));
        }
        return solids;
    }

    private executeNode(node: Statement | AssignmentNode, scope: RuntimeScope): Solid[] {
        switch (node.constructor.name) {
            case 'AssignmentNode':
                return this.executeAssignment(node as AssignmentNode, scope);
            case 'ModuleInstantiationStmt':
                return this.executeModuleInstantiation(node as ModuleInstantiationStmt, scope);
            case 'ModuleDeclarationStmt':
                return this.executeModuleDeclaration(node as ModuleDeclarationStmt, scope);
            case 'FunctionDeclarationStmt':
                return this.executeFunctionDeclaration(node as FunctionDeclarationStmt, scope);
            case 'BlockStmt':
                return this.executeBlock(node as BlockStmt, scope);
            case 'IfElseStatement':
                return this.executeIfElse(node as IfElseStatement, scope);
            case 'NoopStmt':
            case 'UseStmt':
            case 'IncludeStmt':
            case 'ErrorNode':
                return [];
            default:
                throw new Error(`Unsupported statement type ${node.constructor.name}.`);
        }
    }

    private executeAssignment(node: AssignmentNode, scope: RuntimeScope): Solid[] {
        if (node.role === 0 && node.value) {
            scope.setValue(node.name, this.evaluateExpression(node.value, scope));
        }
        return [];
    }

    private executeBlock(node: BlockStmt, scope: RuntimeScope): Solid[] {
        return this.executeNodes(node.children as Array<Statement | AssignmentNode>, scope);
    }

    private executeIfElse(node: IfElseStatement, scope: RuntimeScope): Solid[] {
        if (this.isTruthy(this.evaluateExpression(node.cond, scope))) {
            return this.executeNode(node.thenBranch as Statement | AssignmentNode, scope);
        }
        if (node.elseBranch) {
            return this.executeNode(node.elseBranch as Statement | AssignmentNode, scope);
        }
        return [];
    }

    private executeModuleDeclaration(node: ModuleDeclarationStmt, scope: RuntimeScope): Solid[] {
        const declarationScope = scope;
        scope.setModule(node.name, (positionalArgs, namedArgs, childScene) => {
            const moduleScope = new RuntimeScope(declarationScope, cloneScene(childScene));
            this.bindDefinitionArguments(node.definitionArgs, positionalArgs, namedArgs, moduleScope);
            return this.executeNode(node.stmt as Statement | AssignmentNode, moduleScope);
        });
        return [];
    }

    private executeFunctionDeclaration(node: FunctionDeclarationStmt, scope: RuntimeScope): Solid[] {
        const declarationScope = scope;
        scope.setFunction(node.name, (positionalArgs, namedArgs) => {
            const functionScope = new RuntimeScope(declarationScope);
            this.bindDefinitionArguments(node.definitionArgs, positionalArgs, namedArgs, functionScope);
            return this.evaluateExpression(node.expr, functionScope);
        });
        return [];
    }

    private executeModuleInstantiation(node: ModuleInstantiationStmt, scope: RuntimeScope): Solid[] {
        if (node.tagDisabled) {
            return [];
        }

        if (node.name === 'for') {
            return this.executeForLoop(node, scope);
        }

        const { named, positional } = this.evaluateCallArguments(node.args, scope);
        switch (node.name) {
            case 'cube':
                return [this.createCube(positional, named)];
            case 'sphere':
                return [this.createSphere(positional, named, scope)];
            case 'cylinder':
                return [this.createCylinder(positional, named, scope)];
            case 'translate':
                return this.applyTransform(node, scope, translationMatrix(this.expectVec3(named.v ?? positional[0], 'translate() vector')));
            case 'scale':
                return this.applyTransform(node, scope, scalingMatrix(this.expectVec3(named.v ?? positional[0] ?? 1, 'scale() vector', true)));
            case 'rotate':
                return this.applyTransform(node, scope, this.rotationMatrixFromArgs(positional, named));
            case 'mirror':
                return this.applyTransform(node, scope, mirrorMatrix(this.expectVec3(named.v ?? positional[0], 'mirror() vector')));
            case 'multmatrix':
                return this.applyTransform(node, scope, this.matrixFromValue(named.m ?? positional[0]));
            case 'union':
            case 'group':
            case 'color':
            case 'render':
                return cloneScene(this.evaluateChildScene(node, scope));
            case 'children':
                return cloneScene(scope.childrenScene);
            case 'difference':
            case 'intersection':
            case 'hull':
            case 'minkowski':
            case 'linear_extrude':
            case 'rotate_extrude':
            case 'offset':
            case 'surface':
            case 'import':
                throw new Error(`${node.name}() is not yet supported by the STEP exporter path.`);
            default: {
                const moduleFn = scope.getModule(node.name);
                if (!moduleFn) {
                    throw new Error(`Unsupported module "${node.name}" in STEP exporter path.`);
                }
                return moduleFn(positional, named, this.evaluateChildScene(node, scope));
            }
        }
    }

    private executeForLoop(node: ModuleInstantiationStmt, scope: RuntimeScope): Solid[] {
        const iterate = (index: number, activeScope: RuntimeScope): Solid[] => {
            if (index >= node.args.length) {
                return this.evaluateChildScene(node, activeScope);
            }

            const assignment = node.args[index]!;
            if (!assignment.name || !assignment.value) {
                return iterate(index + 1, activeScope);
            }

            const rawValues = this.evaluateExpression(assignment.value, activeScope);
            const values = this.expectArray(rawValues, `for() values for ${assignment.name}`);
            const solids: Solid[] = [];

            for (const value of values) {
                const loopScope = new RuntimeScope(activeScope, activeScope.childrenScene);
                loopScope.setValue(assignment.name, value);
                solids.push(...iterate(index + 1, loopScope));
            }

            return solids;
        };

        return iterate(0, scope);
    }

    private applyTransform(node: ModuleInstantiationStmt, scope: RuntimeScope, matrix: Matrix4): Solid[] {
        return transformScene(this.evaluateChildScene(node, scope), matrix);
    }

    private evaluateChildScene(node: ModuleInstantiationStmt, scope: RuntimeScope): Solid[] {
        if (!node.child) {
            return [];
        }
        return this.executeNode(node.child as Statement | AssignmentNode, scope);
    }

    private bindDefinitionArguments(
        definitionArgs: AssignmentNode[],
        positionalArgs: RuntimeValue[],
        namedArgs: Record<string, RuntimeValue>,
        scope: RuntimeScope,
    ): void {
        for (const definition of definitionArgs) {
            if (definition.value) {
                scope.setValue(definition.name, this.evaluateExpression(definition.value, scope));
            }
        }

        for (let index = 0; index < definitionArgs.length; index++) {
            const definition = definitionArgs[index]!;
            if (index < positionalArgs.length) {
                scope.setValue(definition.name, positionalArgs[index]!);
            }
        }

        for (const [name, value] of Object.entries(namedArgs)) {
            scope.setValue(name, value);
        }
    }

    private evaluateCallArguments(
        args: AssignmentNode[],
        scope: RuntimeScope,
    ): { named: Record<string, RuntimeValue>; positional: RuntimeValue[] } {
        const positional: RuntimeValue[] = [];
        const named: Record<string, RuntimeValue> = {};

        for (const arg of args) {
            const value = arg.value ? this.evaluateExpression(arg.value, scope) : null;
            if (arg.name) {
                named[arg.name] = value;
            } else {
                positional.push(value);
            }
        }

        return { named, positional };
    }

    private evaluateExpression(node: Expression, scope: RuntimeScope): RuntimeValue {
        switch (node.constructor.name) {
            case 'LiteralExpr':
                return (node as LiteralExpr<RuntimeScalar>).value;
            case 'VectorExpr':
                return (node as VectorExpr).children.map((child) => this.evaluateExpression(child, scope));
            case 'LookupExpr':
                return this.lookupValue(node as LookupExpr, scope);
            case 'BinaryOpExpr':
                return this.evaluateBinary(node as BinaryOpExpr, scope);
            case 'UnaryOpExpr':
                return this.evaluateUnary(node as UnaryOpExpr, scope);
            case 'GroupingExpr':
                return this.evaluateExpression((node as GroupingExpr).inner, scope);
            case 'TernaryExpr':
                return this.evaluateTernary(node as TernaryExpr, scope);
            case 'RangeExpr':
                return this.evaluateRange(node as RangeExpr, scope);
            case 'ArrayLookupExpr':
                return this.evaluateArrayLookup(node as ArrayLookupExpr, scope);
            case 'FunctionCallExpr':
                return this.evaluateFunctionCall(node as FunctionCallExpr, scope);
            case 'LetExpr':
                return this.evaluateLet(node as LetExpr, scope);
            case 'AssertExpr':
                return this.evaluateAssert(node as AssertExpr, scope);
            case 'EchoExpr':
                return this.evaluateEcho(node as EchoExpr, scope);
            case 'LcIfExpr':
                return this.evaluateLcIf(node as LcIfExpr, scope);
            case 'LcEachExpr':
                return this.evaluateLcEach(node as LcEachExpr, scope);
            case 'LcForExpr':
                return this.evaluateLcFor(node as LcForExpr, scope);
            case 'LcForCExpr':
                return this.evaluateLcForC(node as LcForCExpr, scope);
            case 'LcLetExpr':
                return this.evaluateLcLet(node as LcLetExpr, scope);
            case 'AnonymousFunctionExpr':
                return this.evaluateAnonymousFunction(node as AnonymousFunctionExpr, scope);
            case 'MemberLookupExpr':
                return this.evaluateMemberLookup(node as MemberLookupExpr, scope);
            default:
                throw new Error(`Unsupported expression type ${node.constructor.name}.`);
        }
    }

    private lookupValue(node: LookupExpr, scope: RuntimeScope): RuntimeValue {
        if (node.name === 'undef') {
            return null;
        }

        const value = scope.getValue(node.name);
        if (value !== undefined) {
            return value;
        }

        throw new Error(`Undefined symbol "${node.name}".`);
    }

    private evaluateBinary(node: BinaryOpExpr, scope: RuntimeScope): RuntimeValue {
        const left = this.evaluateExpression(node.left, scope);
        const right = this.evaluateExpression(node.right, scope);
        const operator = node.tokens.operator.lexeme;

        switch (operator) {
            case '+':
                return this.applyNumericBinary(left, right, (a, b) => a + b, operator);
            case '-':
                return this.applyNumericBinary(left, right, (a, b) => a - b, operator);
            case '*':
                return this.applyNumericBinary(left, right, (a, b) => a * b, operator);
            case '/':
                return this.applyNumericBinary(left, right, (a, b) => a / b, operator);
            case '%':
                return this.applyNumericBinary(left, right, (a, b) => a % b, operator);
            case '<':
                return this.expectNumber(left, 'left-hand side of <') < this.expectNumber(right, 'right-hand side of <');
            case '<=':
                return this.expectNumber(left, 'left-hand side of <=') <= this.expectNumber(right, 'right-hand side of <=');
            case '>':
                return this.expectNumber(left, 'left-hand side of >') > this.expectNumber(right, 'right-hand side of >');
            case '>=':
                return this.expectNumber(left, 'left-hand side of >=') >= this.expectNumber(right, 'right-hand side of >=');
            case '==':
                return JSON.stringify(left) === JSON.stringify(right);
            case '!=':
                return JSON.stringify(left) !== JSON.stringify(right);
            case '&&':
                return this.isTruthy(left) && this.isTruthy(right);
            case '||':
                return this.isTruthy(left) || this.isTruthy(right);
            default:
                throw new Error(`Unsupported binary operator "${operator}".`);
        }
    }

    private evaluateUnary(node: UnaryOpExpr, scope: RuntimeScope): RuntimeValue {
        const right = this.evaluateExpression(node.right, scope);
        const operator = node.tokens.operator.lexeme;

        switch (operator) {
            case '-':
                return this.applyNumericUnary(right, (value) => -value, operator);
            case '+':
                return this.applyNumericUnary(right, (value) => value, operator);
            case '!':
                return !this.isTruthy(right);
            default:
                throw new Error(`Unsupported unary operator "${operator}".`);
        }
    }

    private evaluateTernary(node: TernaryExpr, scope: RuntimeScope): RuntimeValue {
        return this.isTruthy(this.evaluateExpression(node.cond, scope))
            ? this.evaluateExpression(node.ifExpr, scope)
            : this.evaluateExpression(node.elseExpr, scope);
    }

    private evaluateRange(node: RangeExpr, scope: RuntimeScope): RuntimeValue {
        const begin = this.expectNumber(this.evaluateExpression(node.begin, scope), 'range() start');
        const step = node.step
            ? this.expectNumber(this.evaluateExpression(node.step, scope), 'range() step')
            : 1;
        const end = this.expectNumber(this.evaluateExpression(node.end, scope), 'range() end');

        if (step === 0) {
            throw new Error('range() step cannot be zero.');
        }

        const values: RuntimeValue[] = [];
        if (step > 0) {
            for (let value = begin; value <= end + 1e-9; value += step) {
                values.push(value);
            }
        } else {
            for (let value = begin; value >= end - 1e-9; value += step) {
                values.push(value);
            }
        }

        return values;
    }

    private evaluateArrayLookup(node: ArrayLookupExpr, scope: RuntimeScope): RuntimeValue {
        const value = this.evaluateExpression(node.array, scope);
        const array = this.expectArray(value, 'array lookup');
        const index = Math.trunc(this.expectNumber(this.evaluateExpression(node.index, scope), 'array index'));
        return array[index];
    }

    private evaluateFunctionCall(node: FunctionCallExpr, scope: RuntimeScope): RuntimeValue {
        const { named, positional } = this.evaluateCallArguments(node.args, scope);

        if (node.callee.constructor.name === 'LookupExpr') {
            const name = (node.callee as LookupExpr).name;
            const builtIn = this.callBuiltInFunction(name, positional, named);
            if (builtIn !== undefined) {
                return builtIn;
            }

            const fn = scope.getFunction(name) ?? scope.getValue(name);
            if (typeof fn === 'function') {
                return fn(positional, named);
            }
        }

        const callee = this.evaluateExpression(node.callee, scope);
        if (typeof callee !== 'function') {
            throw new Error('Attempted to call a non-function value.');
        }
        return callee(positional, named);
    }

    private evaluateLet(node: LetExpr, scope: RuntimeScope): RuntimeValue {
        const childScope = new RuntimeScope(scope);
        for (const arg of node.args) {
            childScope.setValue(arg.name, arg.value ? this.evaluateExpression(arg.value, childScope) : null);
        }
        return this.evaluateExpression(node.expr, childScope);
    }

    private evaluateAssert(node: AssertExpr, scope: RuntimeScope): RuntimeValue {
        const conditionValue = node.args[0]?.value ? this.evaluateExpression(node.args[0].value, scope) : false;
        if (!this.isTruthy(conditionValue)) {
            throw new Error('OpenSCAD assert() failed while evaluating STEP export.');
        }
        return this.evaluateExpression(node.expr, scope);
    }

    private evaluateEcho(node: EchoExpr, scope: RuntimeScope): RuntimeValue {
        const values = node.args.map((arg) => (arg.value ? this.evaluateExpression(arg.value, scope) : null));
        console.log('ECHO:', ...values);
        return this.evaluateExpression(node.expr, scope);
    }

    private evaluateLcIf(node: LcIfExpr, scope: RuntimeScope): RuntimeValue {
        if (this.isTruthy(this.evaluateExpression(node.cond, scope))) {
            return [this.evaluateExpression(node.ifExpr, scope)];
        }
        if (node.elseExpr) {
            return [this.evaluateExpression(node.elseExpr, scope)];
        }
        return [];
    }

    private evaluateLcEach(node: LcEachExpr, scope: RuntimeScope): RuntimeValue {
        const value = this.evaluateExpression(node.expr, scope);
        return this.expectArray(value, 'each expression');
    }

    private evaluateLcFor(node: LcForExpr, scope: RuntimeScope): RuntimeValue {
        const values: RuntimeValue[] = [];
        const iterate = (index: number, activeScope: RuntimeScope): void => {
            if (index >= node.args.length) {
                values.push(this.evaluateExpression(node.expr, activeScope));
                return;
            }

            const assignment = node.args[index]!;
            if (!assignment.name || !assignment.value) {
                iterate(index + 1, activeScope);
                return;
            }

            const loopValues = this.expectArray(this.evaluateExpression(assignment.value, activeScope), `list comprehension for ${assignment.name}`);
            for (const value of loopValues) {
                const loopScope = new RuntimeScope(activeScope);
                loopScope.setValue(assignment.name, value);
                iterate(index + 1, loopScope);
            }
        };

        iterate(0, scope);
        return values;
    }

    private evaluateLcForC(node: LcForCExpr, scope: RuntimeScope): RuntimeValue {
        const values: RuntimeValue[] = [];
        const loopScope = new RuntimeScope(scope);

        for (const arg of node.args) {
            loopScope.setValue(arg.name, arg.value ? this.evaluateExpression(arg.value, loopScope) : null);
        }

        while (this.isTruthy(this.evaluateExpression(node.cond, loopScope))) {
            values.push(this.evaluateExpression(node.expr, loopScope));
            for (const increment of node.incrArgs) {
                if (increment.name && increment.value) {
                    loopScope.setValue(increment.name, this.evaluateExpression(increment.value, loopScope));
                }
            }
        }

        return values;
    }

    private evaluateLcLet(node: LcLetExpr, scope: RuntimeScope): RuntimeValue {
        const childScope = new RuntimeScope(scope);
        for (const arg of node.args) {
            childScope.setValue(arg.name, arg.value ? this.evaluateExpression(arg.value, childScope) : null);
        }
        return [this.evaluateExpression(node.expr, childScope)];
    }

    private evaluateAnonymousFunction(node: AnonymousFunctionExpr, scope: RuntimeScope): RuntimeFunction {
        return (positionalArgs, namedArgs) => {
            const functionScope = new RuntimeScope(scope);
            this.bindDefinitionArguments(node.definitionArgs, positionalArgs, namedArgs, functionScope);
            return this.evaluateExpression(node.expr, functionScope);
        };
    }

    private evaluateMemberLookup(node: MemberLookupExpr, scope: RuntimeScope): RuntimeValue {
        const value = this.evaluateExpression(node.expr, scope);
        if (Array.isArray(value)) {
            const lookup: Record<string, number> = { x: 0, y: 1, z: 2, w: 3 };
            const index = lookup[node.member];
            if (index !== undefined) {
                return value[index];
            }
        }

        throw new Error(`Unsupported member lookup .${node.member}`);
    }

    private callBuiltInFunction(
        name: string,
        positionalArgs: RuntimeValue[],
        namedArgs: Record<string, RuntimeValue>,
    ): RuntimeValue | undefined {
        const firstArg = positionalArgs[0];
        switch (name) {
            case 'sin':
                return Math.sin(this.toRadians(this.expectNumber(firstArg, 'sin() argument')));
            case 'cos':
                return Math.cos(this.toRadians(this.expectNumber(firstArg, 'cos() argument')));
            case 'tan':
                return Math.tan(this.toRadians(this.expectNumber(firstArg, 'tan() argument')));
            case 'asin':
                return this.toDegrees(Math.asin(this.expectNumber(firstArg, 'asin() argument')));
            case 'acos':
                return this.toDegrees(Math.acos(this.expectNumber(firstArg, 'acos() argument')));
            case 'atan':
                return this.toDegrees(Math.atan(this.expectNumber(firstArg, 'atan() argument')));
            case 'atan2':
                return this.toDegrees(
                    Math.atan2(
                        this.expectNumber(positionalArgs[0], 'atan2() y argument'),
                        this.expectNumber(positionalArgs[1], 'atan2() x argument'),
                    ),
                );
            case 'sqrt':
                return Math.sqrt(this.expectNumber(firstArg, 'sqrt() argument'));
            case 'abs':
                return Math.abs(this.expectNumber(firstArg, 'abs() argument'));
            case 'round':
                return Math.round(this.expectNumber(firstArg, 'round() argument'));
            case 'ceil':
                return Math.ceil(this.expectNumber(firstArg, 'ceil() argument'));
            case 'floor':
                return Math.floor(this.expectNumber(firstArg, 'floor() argument'));
            case 'pow':
                return Math.pow(
                    this.expectNumber(positionalArgs[0], 'pow() base'),
                    this.expectNumber(positionalArgs[1], 'pow() exponent'),
                );
            case 'min':
                return this.minOrMax(positionalArgs, Math.min);
            case 'max':
                return this.minOrMax(positionalArgs, Math.max);
            case 'len': {
                const value = firstArg;
                if (Array.isArray(value) || typeof value === 'string') {
                    return value.length;
                }
                throw new Error('len() expects an array or string.');
            }
            case 'norm': {
                const vector = this.expectArray(firstArg, 'norm() argument').map((item) => this.expectNumber(item, 'norm() component'));
                return Math.hypot(...vector);
            }
            case 'concat': {
                const concatenated: RuntimeValue[] = [];
                for (const value of positionalArgs) {
                    if (Array.isArray(value)) {
                        concatenated.push(...value);
                    } else {
                        concatenated.push(value);
                    }
                }
                return concatenated;
            }
            case 'is_undef':
                return firstArg === undefined || firstArg === null;
            case 'str':
                return positionalArgs.map((value) => String(value ?? '')).join('');
            default:
                return undefined;
        }
    }

    private minOrMax(args: RuntimeValue[], reducer: (...values: number[]) => number): number {
        const values = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const numbers = values.map((value) => this.expectNumber(value, 'min()/max() argument'));
        return reducer(...numbers);
    }

    private applyNumericUnary(
        value: RuntimeValue,
        operation: (scalar: number) => number,
        label: string,
    ): RuntimeValue {
        if (Array.isArray(value)) {
            return value.map((item) => this.applyNumericUnary(item, operation, label));
        }
        return operation(this.expectNumber(value, `operand for ${label}`));
    }

    private applyNumericBinary(
        left: RuntimeValue,
        right: RuntimeValue,
        operation: (left: number, right: number) => number,
        label: string,
    ): RuntimeValue {
        if (Array.isArray(left) && Array.isArray(right)) {
            if (left.length !== right.length) {
                throw new Error(`Operator ${label} requires vectors of the same length.`);
            }
            return left.map((value, index) => this.applyNumericBinary(value, right[index]!, operation, label));
        }
        if (Array.isArray(left)) {
            return left.map((value) => this.applyNumericBinary(value, right, operation, label));
        }
        if (Array.isArray(right)) {
            return right.map((value) => this.applyNumericBinary(left, value, operation, label));
        }
        return operation(this.expectNumber(left, `left operand of ${label}`), this.expectNumber(right, `right operand of ${label}`));
    }

    private createCube(positional: RuntimeValue[], named: Record<string, RuntimeValue>): Solid {
        const rawSize = named.size ?? positional[0] ?? 1;
        const size = this.expectVec3(rawSize, 'cube() size', true);
        const center = this.expectBoolean(named.center ?? positional[1] ?? false, 'cube() center');
        return createCubeSolid('cube', size, center);
    }

    private createSphere(
        positional: RuntimeValue[],
        named: Record<string, RuntimeValue>,
        scope: RuntimeScope,
    ): Solid {
        let radius: number;
        if (named.r !== undefined) {
            radius = this.expectNumber(named.r, 'sphere() radius');
        } else if (named.d !== undefined) {
            radius = this.expectNumber(named.d, 'sphere() diameter') / 2;
        } else {
            radius = this.expectNumber(positional[0] ?? 1, 'sphere() radius');
        }

        return createSphereSolid('sphere', radius, this.resolveFn(named, scope));
    }

    private createCylinder(
        positional: RuntimeValue[],
        named: Record<string, RuntimeValue>,
        scope: RuntimeScope,
    ): Solid {
        const height = this.expectNumber(named.h ?? positional[0] ?? 1, 'cylinder() height');
        let bottomRadius = this.expectNumber(named.r1 ?? named.r ?? positional[1] ?? 1, 'cylinder() bottom radius');
        let topRadius = this.expectNumber(named.r2 ?? named.r ?? positional[2] ?? bottomRadius, 'cylinder() top radius');

        if (named.d !== undefined) {
            bottomRadius = this.expectNumber(named.d, 'cylinder() diameter') / 2;
            topRadius = bottomRadius;
        }
        if (named.d1 !== undefined) {
            bottomRadius = this.expectNumber(named.d1, 'cylinder() bottom diameter') / 2;
        }
        if (named.d2 !== undefined) {
            topRadius = this.expectNumber(named.d2, 'cylinder() top diameter') / 2;
        }

        const center = this.expectBoolean(named.center ?? positional[3] ?? false, 'cylinder() center');
        return createCylinderSolid('cylinder', height, bottomRadius, topRadius, center, this.resolveFn(named, scope));
    }

    private resolveFn(named: Record<string, RuntimeValue>, scope: RuntimeScope): number {
        const override = named.$fn ?? named.fn ?? scope.getValue('$fn');
        if (override === undefined || override === null) {
            return this.defaultFn;
        }
        return Math.max(3, Math.floor(this.expectNumber(override, '$fn')));
    }

    private rotationMatrixFromArgs(positional: RuntimeValue[], named: Record<string, RuntimeValue>): Matrix4 {
        const axis = named.v ?? positional[1];
        const angle = named.a ?? positional[0];

        if (axis !== undefined && typeof angle === 'number') {
            return axisAngleRotationMatrix(angle, this.expectVec3(axis, 'rotate() axis'));
        }

        const euler = this.expectVec3(named.a ?? positional[0] ?? [0, 0, 0], 'rotate() angles');
        return eulerRotationMatrix(euler);
    }

    private matrixFromValue(value: RuntimeValue): Matrix4 {
        const rows = this.expectArray(value, 'multmatrix() matrix').map((row) =>
            this.expectArray(row, 'multmatrix() row').map((entry) => this.expectNumber(entry, 'multmatrix() entry')),
        );
        return matrixFromRows(rows);
    }

    private expectNumber(value: RuntimeValue, context: string): number {
        if (typeof value !== 'number') {
            throw new Error(`${context} must evaluate to a number.`);
        }
        return value;
    }

    private expectBoolean(value: RuntimeValue, context: string): boolean {
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'number') {
            return value !== 0;
        }
        throw new Error(`${context} must evaluate to a boolean.`);
    }

    private expectArray(value: RuntimeValue, context: string): RuntimeValue[] {
        if (!Array.isArray(value)) {
            throw new Error(`${context} must evaluate to an array.`);
        }
        return value;
    }

    private expectVec3(value: RuntimeValue, context: string, allowScalar = false): Vec3 {
        if (allowScalar && typeof value === 'number') {
            return [value, value, value];
        }
        const vector = this.expectArray(value, context);
        if (vector.length !== 3) {
            throw new Error(`${context} must contain exactly 3 entries.`);
        }
        return [
            this.expectNumber(vector[0], `${context}[0]`),
            this.expectNumber(vector[1], `${context}[1]`),
            this.expectNumber(vector[2], `${context}[2]`),
        ];
    }

    private isTruthy(value: RuntimeValue): boolean {
        if (value === null || value === undefined) {
            return false;
        }
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'number') {
            return value !== 0;
        }
        if (typeof value === 'string') {
            return value.length > 0;
        }
        if (Array.isArray(value)) {
            return value.length > 0;
        }
        return true;
    }

    private toRadians(angle: number): number {
        return (angle * Math.PI) / 180;
    }

    private toDegrees(angle: number): number {
        return (angle * 180) / Math.PI;
    }
}
