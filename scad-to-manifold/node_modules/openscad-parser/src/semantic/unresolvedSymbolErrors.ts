import CodeLocation from "../CodeLocation";
import CodeError from "../errors/CodeError";

export class UnresolvedFunctionError extends CodeError {
  constructor(pos: CodeLocation, functionName: string) {
    super(pos, `Unresolved function '${functionName}'.`);
  }
}

export class UnresolvedModuleError extends CodeError {
  constructor(pos: CodeLocation, functionName: string) {
    super(pos, `Unresolved module '${functionName}'.`);
  }
}

export class UnresolvedVariableError extends CodeError {
  constructor(pos: CodeLocation, functionName: string) {
    super(pos, `Unresolved variable '${functionName}'.`);
  }
}
