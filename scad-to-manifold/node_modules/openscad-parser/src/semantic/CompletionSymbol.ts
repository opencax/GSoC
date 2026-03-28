import {
  AssignmentNode,
  DocComment,
  FunctionDeclarationStmt,
  ModuleDeclarationStmt,
} from "..";
import CompletionType from "./CompletionType";

export type Declaration =
  | AssignmentNode
  | ModuleDeclarationStmt
  | FunctionDeclarationStmt;

export default class CompletionSymbol {
  constructor(
    public type: CompletionType,
    public name: string,
    public decl?: Declaration
  ) {}
}
