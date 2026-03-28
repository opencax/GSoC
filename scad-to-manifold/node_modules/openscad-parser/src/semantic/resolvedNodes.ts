import AssignmentNode from "../ast/AssignmentNode";
import { FunctionCallExpr, LookupExpr } from "../ast/expressions";
import {
  FunctionDeclarationStmt,
  ModuleDeclarationStmt,
  ModuleInstantiationStmt,
} from "../ast/statements";

/**
 * Represents a resolved lookup expression. It can either
 * point to an assignment node, or to a named function declaration.
 * 
 * resolvedDeclaration must be set by the instantiating class.
 */
export class ResolvedLookupExpr extends LookupExpr {
  resolvedDeclaration!: AssignmentNode | FunctionDeclarationStmt;
}

export class ResolvedModuleInstantiationStmt extends ModuleInstantiationStmt {
  resolvedDeclaration!: ModuleDeclarationStmt;
}
