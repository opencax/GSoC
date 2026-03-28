import ASTNode from "../ast/ASTNode";
import Scope from "./Scope";

export default interface NodeWithScope extends ASTNode {
  scope: Scope;
}
