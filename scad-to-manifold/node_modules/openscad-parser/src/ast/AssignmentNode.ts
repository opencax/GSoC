import CodeLocation from "../CodeLocation";
import DocComment from "../comments/DocComment";
import Token from "../Token";
import ASTNode from "./ASTNode";
import ASTVisitor from "./ASTVisitor";
import { Expression } from "./expressions";

export enum AssignmentNodeRole {
  VARIABLE_DECLARATION,
  ARGUMENT_DECLARATION,
  ARGUMENT_ASSIGNMENT,
}

/**
 * Represents a value being assigned to a name. Used when declaring and calling modules or functions.
 * It is also used in control flow structures such as for loops and let expressions.
 * @category AST
 */
export default class AssignmentNode extends ASTNode {
  /**
   * The name of the value being assigned.
   * The name field may be empty when it represents a positional argument in a call.
   */
  name: string;

  /**
   * THe value of the name being assigned.
   * It can be null when the AssignmentNode is used as a function parameter without a default value.
   */
  value: Expression | null;

  /**
   * The documentation and annotations connected with this variable.
   */
  docComment: DocComment | null = null;

  constructor(
    name: string,
    value: Expression | null,
    public role: AssignmentNodeRole,
    public tokens: {
      name: Token | null;
      equals: Token | null;
      trailingCommas: Token[] | null;
      semicolon: Token | null;
    }
  ) {
    super();
    this.name = name;
    this.value = value;
  }
  accept<R>(visitor: ASTVisitor<R>): R {
    return visitor.visitAssignmentNode(this);
  }
}
