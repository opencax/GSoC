import {} from 'openscad-parser';
import { axisAngleRotationMatrix, cloneScene, createCubeSolid, createCylinderSolid, createSphereSolid, eulerRotationMatrix, matrixFromRows, mirrorMatrix, scalingMatrix, transformScene, translationMatrix, } from './geometry.js';
class RuntimeScope {
    parent;
    childrenScene;
    values = new Map();
    modules = new Map();
    functions = new Map();
    constructor(parent = null, childrenScene = []) {
        this.parent = parent;
        this.childrenScene = childrenScene;
    }
    setValue(name, value) {
        this.values.set(name, value);
    }
    getValue(name) {
        if (this.values.has(name)) {
            return this.values.get(name);
        }
        return this.parent?.getValue(name);
    }
    setModule(name, value) {
        this.modules.set(name, value);
    }
    getModule(name) {
        if (this.modules.has(name)) {
            return this.modules.get(name);
        }
        return this.parent?.getModule(name);
    }
    setFunction(name, value) {
        this.functions.set(name, value);
    }
    getFunction(name) {
        if (this.functions.has(name)) {
            return this.functions.get(name);
        }
        return this.parent?.getFunction(name);
    }
}
export class OpenScadStepEvaluator {
    defaultFn;
    constructor(options = {}) {
        this.defaultFn = Math.max(3, Math.floor(options.defaultFn ?? 24));
    }
    evaluate(ast) {
        const scope = new RuntimeScope();
        scope.setValue('$fn', this.defaultFn);
        scope.setValue('$fa', 12);
        scope.setValue('$fs', 2);
        return this.executeNodes(ast.statements, scope);
    }
    executeNodes(nodes, scope) {
        const solids = [];
        for (const node of nodes) {
            solids.push(...this.executeNode(node, scope));
        }
        return solids;
    }
    executeNode(node, scope) {
        switch (node.constructor.name) {
            case 'AssignmentNode':
                return this.executeAssignment(node, scope);
            case 'ModuleInstantiationStmt':
                return this.executeModuleInstantiation(node, scope);
            case 'ModuleDeclarationStmt':
                return this.executeModuleDeclaration(node, scope);
            case 'FunctionDeclarationStmt':
                return this.executeFunctionDeclaration(node, scope);
            case 'BlockStmt':
                return this.executeBlock(node, scope);
            case 'IfElseStatement':
                return this.executeIfElse(node, scope);
            case 'NoopStmt':
            case 'UseStmt':
            case 'IncludeStmt':
            case 'ErrorNode':
                return [];
            default:
                throw new Error(`Unsupported statement type ${node.constructor.name}.`);
        }
    }
    executeAssignment(node, scope) {
        if (node.role === 0 && node.value) {
            scope.setValue(node.name, this.evaluateExpression(node.value, scope));
        }
        return [];
    }
    executeBlock(node, scope) {
        return this.executeNodes(node.children, scope);
    }
    executeIfElse(node, scope) {
        if (this.isTruthy(this.evaluateExpression(node.cond, scope))) {
            return this.executeNode(node.thenBranch, scope);
        }
        if (node.elseBranch) {
            return this.executeNode(node.elseBranch, scope);
        }
        return [];
    }
    executeModuleDeclaration(node, scope) {
        const declarationScope = scope;
        scope.setModule(node.name, (positionalArgs, namedArgs, childScene) => {
            const moduleScope = new RuntimeScope(declarationScope, cloneScene(childScene));
            this.bindDefinitionArguments(node.definitionArgs, positionalArgs, namedArgs, moduleScope);
            return this.executeNode(node.stmt, moduleScope);
        });
        return [];
    }
    executeFunctionDeclaration(node, scope) {
        const declarationScope = scope;
        scope.setFunction(node.name, (positionalArgs, namedArgs) => {
            const functionScope = new RuntimeScope(declarationScope);
            this.bindDefinitionArguments(node.definitionArgs, positionalArgs, namedArgs, functionScope);
            return this.evaluateExpression(node.expr, functionScope);
        });
        return [];
    }
    executeModuleInstantiation(node, scope) {
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
    executeForLoop(node, scope) {
        const iterate = (index, activeScope) => {
            if (index >= node.args.length) {
                return this.evaluateChildScene(node, activeScope);
            }
            const assignment = node.args[index];
            if (!assignment.name || !assignment.value) {
                return iterate(index + 1, activeScope);
            }
            const rawValues = this.evaluateExpression(assignment.value, activeScope);
            const values = this.expectArray(rawValues, `for() values for ${assignment.name}`);
            const solids = [];
            for (const value of values) {
                const loopScope = new RuntimeScope(activeScope, activeScope.childrenScene);
                loopScope.setValue(assignment.name, value);
                solids.push(...iterate(index + 1, loopScope));
            }
            return solids;
        };
        return iterate(0, scope);
    }
    applyTransform(node, scope, matrix) {
        return transformScene(this.evaluateChildScene(node, scope), matrix);
    }
    evaluateChildScene(node, scope) {
        if (!node.child) {
            return [];
        }
        return this.executeNode(node.child, scope);
    }
    bindDefinitionArguments(definitionArgs, positionalArgs, namedArgs, scope) {
        for (const definition of definitionArgs) {
            if (definition.value) {
                scope.setValue(definition.name, this.evaluateExpression(definition.value, scope));
            }
        }
        for (let index = 0; index < definitionArgs.length; index++) {
            const definition = definitionArgs[index];
            if (index < positionalArgs.length) {
                scope.setValue(definition.name, positionalArgs[index]);
            }
        }
        for (const [name, value] of Object.entries(namedArgs)) {
            scope.setValue(name, value);
        }
    }
    evaluateCallArguments(args, scope) {
        const positional = [];
        const named = {};
        for (const arg of args) {
            const value = arg.value ? this.evaluateExpression(arg.value, scope) : null;
            if (arg.name) {
                named[arg.name] = value;
            }
            else {
                positional.push(value);
            }
        }
        return { named, positional };
    }
    evaluateExpression(node, scope) {
        switch (node.constructor.name) {
            case 'LiteralExpr':
                return node.value;
            case 'VectorExpr':
                return node.children.map((child) => this.evaluateExpression(child, scope));
            case 'LookupExpr':
                return this.lookupValue(node, scope);
            case 'BinaryOpExpr':
                return this.evaluateBinary(node, scope);
            case 'UnaryOpExpr':
                return this.evaluateUnary(node, scope);
            case 'GroupingExpr':
                return this.evaluateExpression(node.inner, scope);
            case 'TernaryExpr':
                return this.evaluateTernary(node, scope);
            case 'RangeExpr':
                return this.evaluateRange(node, scope);
            case 'ArrayLookupExpr':
                return this.evaluateArrayLookup(node, scope);
            case 'FunctionCallExpr':
                return this.evaluateFunctionCall(node, scope);
            case 'LetExpr':
                return this.evaluateLet(node, scope);
            case 'AssertExpr':
                return this.evaluateAssert(node, scope);
            case 'EchoExpr':
                return this.evaluateEcho(node, scope);
            case 'LcIfExpr':
                return this.evaluateLcIf(node, scope);
            case 'LcEachExpr':
                return this.evaluateLcEach(node, scope);
            case 'LcForExpr':
                return this.evaluateLcFor(node, scope);
            case 'LcForCExpr':
                return this.evaluateLcForC(node, scope);
            case 'LcLetExpr':
                return this.evaluateLcLet(node, scope);
            case 'AnonymousFunctionExpr':
                return this.evaluateAnonymousFunction(node, scope);
            case 'MemberLookupExpr':
                return this.evaluateMemberLookup(node, scope);
            default:
                throw new Error(`Unsupported expression type ${node.constructor.name}.`);
        }
    }
    lookupValue(node, scope) {
        if (node.name === 'undef') {
            return null;
        }
        const value = scope.getValue(node.name);
        if (value !== undefined) {
            return value;
        }
        throw new Error(`Undefined symbol "${node.name}".`);
    }
    evaluateBinary(node, scope) {
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
    evaluateUnary(node, scope) {
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
    evaluateTernary(node, scope) {
        return this.isTruthy(this.evaluateExpression(node.cond, scope))
            ? this.evaluateExpression(node.ifExpr, scope)
            : this.evaluateExpression(node.elseExpr, scope);
    }
    evaluateRange(node, scope) {
        const begin = this.expectNumber(this.evaluateExpression(node.begin, scope), 'range() start');
        const step = node.step
            ? this.expectNumber(this.evaluateExpression(node.step, scope), 'range() step')
            : 1;
        const end = this.expectNumber(this.evaluateExpression(node.end, scope), 'range() end');
        if (step === 0) {
            throw new Error('range() step cannot be zero.');
        }
        const values = [];
        if (step > 0) {
            for (let value = begin; value <= end + 1e-9; value += step) {
                values.push(value);
            }
        }
        else {
            for (let value = begin; value >= end - 1e-9; value += step) {
                values.push(value);
            }
        }
        return values;
    }
    evaluateArrayLookup(node, scope) {
        const value = this.evaluateExpression(node.array, scope);
        const array = this.expectArray(value, 'array lookup');
        const index = Math.trunc(this.expectNumber(this.evaluateExpression(node.index, scope), 'array index'));
        return array[index];
    }
    evaluateFunctionCall(node, scope) {
        const { named, positional } = this.evaluateCallArguments(node.args, scope);
        if (node.callee.constructor.name === 'LookupExpr') {
            const name = node.callee.name;
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
    evaluateLet(node, scope) {
        const childScope = new RuntimeScope(scope);
        for (const arg of node.args) {
            childScope.setValue(arg.name, arg.value ? this.evaluateExpression(arg.value, childScope) : null);
        }
        return this.evaluateExpression(node.expr, childScope);
    }
    evaluateAssert(node, scope) {
        const conditionValue = node.args[0]?.value ? this.evaluateExpression(node.args[0].value, scope) : false;
        if (!this.isTruthy(conditionValue)) {
            throw new Error('OpenSCAD assert() failed while evaluating STEP export.');
        }
        return this.evaluateExpression(node.expr, scope);
    }
    evaluateEcho(node, scope) {
        const values = node.args.map((arg) => (arg.value ? this.evaluateExpression(arg.value, scope) : null));
        console.log('ECHO:', ...values);
        return this.evaluateExpression(node.expr, scope);
    }
    evaluateLcIf(node, scope) {
        if (this.isTruthy(this.evaluateExpression(node.cond, scope))) {
            return [this.evaluateExpression(node.ifExpr, scope)];
        }
        if (node.elseExpr) {
            return [this.evaluateExpression(node.elseExpr, scope)];
        }
        return [];
    }
    evaluateLcEach(node, scope) {
        const value = this.evaluateExpression(node.expr, scope);
        return this.expectArray(value, 'each expression');
    }
    evaluateLcFor(node, scope) {
        const values = [];
        const iterate = (index, activeScope) => {
            if (index >= node.args.length) {
                values.push(this.evaluateExpression(node.expr, activeScope));
                return;
            }
            const assignment = node.args[index];
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
    evaluateLcForC(node, scope) {
        const values = [];
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
    evaluateLcLet(node, scope) {
        const childScope = new RuntimeScope(scope);
        for (const arg of node.args) {
            childScope.setValue(arg.name, arg.value ? this.evaluateExpression(arg.value, childScope) : null);
        }
        return [this.evaluateExpression(node.expr, childScope)];
    }
    evaluateAnonymousFunction(node, scope) {
        return (positionalArgs, namedArgs) => {
            const functionScope = new RuntimeScope(scope);
            this.bindDefinitionArguments(node.definitionArgs, positionalArgs, namedArgs, functionScope);
            return this.evaluateExpression(node.expr, functionScope);
        };
    }
    evaluateMemberLookup(node, scope) {
        const value = this.evaluateExpression(node.expr, scope);
        if (Array.isArray(value)) {
            const lookup = { x: 0, y: 1, z: 2, w: 3 };
            const index = lookup[node.member];
            if (index !== undefined) {
                return value[index];
            }
        }
        throw new Error(`Unsupported member lookup .${node.member}`);
    }
    callBuiltInFunction(name, positionalArgs, namedArgs) {
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
                return this.toDegrees(Math.atan2(this.expectNumber(positionalArgs[0], 'atan2() y argument'), this.expectNumber(positionalArgs[1], 'atan2() x argument')));
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
                return Math.pow(this.expectNumber(positionalArgs[0], 'pow() base'), this.expectNumber(positionalArgs[1], 'pow() exponent'));
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
                const concatenated = [];
                for (const value of positionalArgs) {
                    if (Array.isArray(value)) {
                        concatenated.push(...value);
                    }
                    else {
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
    minOrMax(args, reducer) {
        const values = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const numbers = values.map((value) => this.expectNumber(value, 'min()/max() argument'));
        return reducer(...numbers);
    }
    applyNumericUnary(value, operation, label) {
        if (Array.isArray(value)) {
            return value.map((item) => this.applyNumericUnary(item, operation, label));
        }
        return operation(this.expectNumber(value, `operand for ${label}`));
    }
    applyNumericBinary(left, right, operation, label) {
        if (Array.isArray(left) && Array.isArray(right)) {
            if (left.length !== right.length) {
                throw new Error(`Operator ${label} requires vectors of the same length.`);
            }
            return left.map((value, index) => this.applyNumericBinary(value, right[index], operation, label));
        }
        if (Array.isArray(left)) {
            return left.map((value) => this.applyNumericBinary(value, right, operation, label));
        }
        if (Array.isArray(right)) {
            return right.map((value) => this.applyNumericBinary(left, value, operation, label));
        }
        return operation(this.expectNumber(left, `left operand of ${label}`), this.expectNumber(right, `right operand of ${label}`));
    }
    createCube(positional, named) {
        const rawSize = named.size ?? positional[0] ?? 1;
        const size = this.expectVec3(rawSize, 'cube() size', true);
        const center = this.expectBoolean(named.center ?? positional[1] ?? false, 'cube() center');
        return createCubeSolid('cube', size, center);
    }
    createSphere(positional, named, scope) {
        let radius;
        if (named.r !== undefined) {
            radius = this.expectNumber(named.r, 'sphere() radius');
        }
        else if (named.d !== undefined) {
            radius = this.expectNumber(named.d, 'sphere() diameter') / 2;
        }
        else {
            radius = this.expectNumber(positional[0] ?? 1, 'sphere() radius');
        }
        return createSphereSolid('sphere', radius, this.resolveFn(named, scope));
    }
    createCylinder(positional, named, scope) {
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
    resolveFn(named, scope) {
        const override = named.$fn ?? named.fn ?? scope.getValue('$fn');
        if (override === undefined || override === null) {
            return this.defaultFn;
        }
        return Math.max(3, Math.floor(this.expectNumber(override, '$fn')));
    }
    rotationMatrixFromArgs(positional, named) {
        const axis = named.v ?? positional[1];
        const angle = named.a ?? positional[0];
        if (axis !== undefined && typeof angle === 'number') {
            return axisAngleRotationMatrix(angle, this.expectVec3(axis, 'rotate() axis'));
        }
        const euler = this.expectVec3(named.a ?? positional[0] ?? [0, 0, 0], 'rotate() angles');
        return eulerRotationMatrix(euler);
    }
    matrixFromValue(value) {
        const rows = this.expectArray(value, 'multmatrix() matrix').map((row) => this.expectArray(row, 'multmatrix() row').map((entry) => this.expectNumber(entry, 'multmatrix() entry')));
        return matrixFromRows(rows);
    }
    expectNumber(value, context) {
        if (typeof value !== 'number') {
            throw new Error(`${context} must evaluate to a number.`);
        }
        return value;
    }
    expectBoolean(value, context) {
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'number') {
            return value !== 0;
        }
        throw new Error(`${context} must evaluate to a boolean.`);
    }
    expectArray(value, context) {
        if (!Array.isArray(value)) {
            throw new Error(`${context} must evaluate to an array.`);
        }
        return value;
    }
    expectVec3(value, context, allowScalar = false) {
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
    isTruthy(value) {
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
    toRadians(angle) {
        return (angle * Math.PI) / 180;
    }
    toDegrees(angle) {
        return (angle * 180) / Math.PI;
    }
}
//# sourceMappingURL=step-evaluator.js.map