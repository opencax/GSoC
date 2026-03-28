import CodeLocation from "../CodeLocation";
import Token from "../Token";
import ASTNode from "./ASTNode";
import ASTVisitor from "./ASTVisitor";
import { Statement } from "./statements";

/**
 * The root node of any AST tree.
 *
 * Contains top-level statements including the use statements.
 *
 * @category AST
 */
export default class ScadFile extends ASTNode {
  constructor(
    public statements: Statement[],
    public tokens: {
      eot: Token;
    }
  ) {
    super();
  }
  accept<R>(visitor: ASTVisitor<R>): R {
    return visitor.visitScadFile(this);
  }
}
