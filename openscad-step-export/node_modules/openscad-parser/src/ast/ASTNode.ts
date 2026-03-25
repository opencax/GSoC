import CodeLocation from "../CodeLocation";
import CodeSpan from "../CodeSpan";
import Token from "../Token";
import ASTVisitor from "./ASTVisitor";

/**
 * @category AST
 */
export default abstract class ASTNode {
  constructor() {}

  abstract tokens: { [key: string]: Token | Token[] | null };

  abstract accept<R>(visitor: ASTVisitor<R>): R;

  get span(): CodeSpan {
    return CodeSpan.combine(...Object.values(this.tokens).flat().map((t) => t?.span));
  }
}
