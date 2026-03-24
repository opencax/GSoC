import CodeLocation from "../CodeLocation";
import LiteralToken from "../LiteralToken";
import Token from "../Token";
import TokenType from "../TokenType";
import AssignmentNode from "./AssignmentNode";
import ASTNode from "./ASTNode";
import ASTVisitor from "./ASTVisitor";

export abstract class Expression extends ASTNode {}

/**
 * Represents an unary expression (!right, -right)
 * @category AST
 */
export class UnaryOpExpr extends Expression {
  /**
   * The operation of this unary expression.
   */
  operation: TokenType;

  /**
   * The expression on which the operation is performed.
   */
  right: Expression;

  constructor(
    op: TokenType,
    right: Expression,
    public tokens: { operator: Token }
  ) {
    super();
    this.operation = op;
    this.right = right;
  }
  accept<R>(visitor: ASTVisitor<R>): R {
    return visitor.visitUnaryOpExpr(this);
  }
}

/**
 * Represents a binary expression (LogicalAnd, LogicalOr, Multiply, Divide, Modulo, Plus, Minus, Less, LessEqual, Greater, GreaterEqual, Equal, NotEqual).
 * @category AST
 */
export class BinaryOpExpr extends Expression {
  /**
   * The left side of the operation.
   */
  left: Expression;

  /**
   * The type of the operation performed.
   */
  operation: TokenType;

  /**
   * The right side of the operation
   */
  right: Expression;

  constructor(
    left: Expression,
    operation: TokenType,
    right: Expression,
    public tokens: { operator: Token }
  ) {
    super();
    this.left = left;
    this.operation = operation;
    this.right = right;
  }
  accept<R>(visitor: ASTVisitor<R>): R {
    return visitor.visitBinaryOpExpr(this);
  }
}

/**
 * Represents a ternary expression (cond ? ifexpr : elsexpr)
 * @category AST
 */
export class TernaryExpr extends Expression {
  cond: Expression;
  ifExpr: Expression;
  elseExpr: Expression;
  constructor(
    cond: Expression,
    ifExpr: Expression,
    elseExpr: Expression,
    public tokens: {
      questionMark: Token;
      colon: Token;
    }
  ) {
    super();
    this.cond = cond;
    this.ifExpr = ifExpr;
    this.elseExpr = elseExpr;
  }
  accept<R>(visitor: ASTVisitor<R>): R {
    return visitor.visitTernaryExpr(this);
  }
}

/**
 * Represents a lookup operation on an array (indexing). Example: arr[5]
 * @category AST
 */
export class ArrayLookupExpr extends Expression {
  /**
   * The array being indexed.
   */
  array: Expression;

  /**
   * The index which is being looked up.
   */
  index: Expression;

  constructor(
    array: Expression,
    index: Expression,
    public tokens: {
      firstBracket: Token;
      secondBracket: Token;
    }
  ) {
    super();
    this.array = array;
    this.index = index;
  }
  accept<R>(visitor: ASTVisitor<R>): R {
    return visitor.visitArrayLookupExpr(this);
  }
}

/**
 * A literal expression (just a simple number, string or a boolean)
 * @category AST
 */
export class LiteralExpr<TValue> extends Expression {
  value: TValue;

  constructor(
    value: TValue,
    public tokens: {
      literalToken: LiteralToken<TValue>;
    }
  ) {
    super();
    this.value = value;
  }
  accept<R>(visitor: ASTVisitor<R>): R {
    return visitor.visitLiteralExpr(this);
  }
}

/**
 * A range epxression. Example: [0: 1 :20]
 * @category AST
 */
export class RangeExpr extends Expression {
  begin: Expression;
  /**
   * The optional step expression.
   * It defaults to 1 if not specified.
   */
  step: Expression | null;
  end: Expression;
  constructor(
    begin: Expression,
    step: Expression | null,
    end: Expression,
    public tokens: {
      firstBracket: Token;
      firstColon: Token;
      secondColon: Token | null;
      secondBracket: Token;
    }
  ) {
    super();
    this.begin = begin;
    this.step = step;
    this.end = end;
  }
  accept<R>(visitor: ASTVisitor<R>): R {
    return visitor.visitRangeExpr(this);
  }
}

/**
 * A vector literal expression. Example: [1, 2, 3, 4]
 * @category AST
 */
export class VectorExpr extends Expression {
  children: Expression[];
  constructor(
    children: Expression[],
    public tokens: {
      firstBracket: Token;
      commas: Token[];
      secondBracket: Token;
    }
  ) {
    super();
    this.children = children;
  }
  accept<R>(visitor: ASTVisitor<R>): R {
    return visitor.visitVectorExpr(this);
  }
}

/**
 * A lookup expression, it references a variable, module or function by name.
 * @category AST
 */
export class LookupExpr extends Expression {
  name: string;

  constructor(name: string, public tokens: { identifier: Token }) {
    super();
    this.name = name;
  }
  accept<R>(visitor: ASTVisitor<R>): R {
    return visitor.visitLookupExpr(this);
  }
}

/**
 * A member lookup expression, (abc.ddd)
 * @category AST
 */
export class MemberLookupExpr extends Expression {
  expr: Expression;
  member: string;

  constructor(
    expr: Expression,
    member: string,
    public tokens: {
      dot: Token;
      memberName: LiteralToken<string>;
    }
  ) {
    super();
    this.expr = expr;
    this.member = member;
  }
  accept<R>(visitor: ASTVisitor<R>): R {
    return visitor.visitMemberLookupExpr(this);
  }
}

/**
 * A function call expression. Example: sin(10)
 * @category AST
 */
export class FunctionCallExpr extends Expression {
  /**
   * The expression that is being called.
   */
  callee: Expression;

  /**
   * The named arguments of the function call
   */
  args: AssignmentNode[];
  constructor(
    callee: Expression,
    args: AssignmentNode[],
    public tokens: {
      firstParen: Token;
      secondParen: Token;
    }
  ) {
    super();
    this.callee = callee;
    this.args = args;
  }
  accept<R>(visitor: ASTVisitor<R>): R {
    return visitor.visitFunctionCallExpr(this);
  }
}

/**
 * A common class for the Echo, Assert and Let expression so that the constructor is not copied.
 * @category AST
 */
export abstract class FunctionCallLikeExpr extends Expression {
  /**
   * The names of the assigned variables in this let expression.
   */
  args: AssignmentNode[];

  /**
   * The inner expression which will use the expression.
   */
  expr: Expression;

  constructor(
    args: AssignmentNode[],
    expr: Expression,
    public tokens: { name: Token; firstParen: Token; secondParen: Token }
  ) {
    super();
    this.args = args;
    this.expr = expr;
  }
}

/**
 * Represents a let expression. Please note that this is syntactically diffrent from the let module instantation and the let list comprehension.
 * @category AST
 */
export class LetExpr extends FunctionCallLikeExpr {
  accept<R>(visitor: ASTVisitor<R>): R {
    return visitor.visitLetExpr(this);
  }
}

/**
 * @category AST
 */
export class AssertExpr extends FunctionCallLikeExpr {
  accept<R>(visitor: ASTVisitor<R>): R {
    return visitor.visitAssertExpr(this);
  }
}

/**
 * @category AST
 */
export class EchoExpr extends FunctionCallLikeExpr {
  accept<R>(visitor: ASTVisitor<R>): R {
    return visitor.visitEchoExpr(this);
  }
}

/**
 * @category AST
 */
export abstract class ListComprehensionExpression extends Expression {}

/**
 * @category AST
 */
export class LcIfExpr extends ListComprehensionExpression {
  cond: Expression;
  ifExpr: Expression;
  elseExpr: Expression | null;
  constructor(
    cond: Expression,
    ifExpr: Expression,
    elseExpr: Expression | null,
    public tokens: {
      ifKeyword: Token;
      firstParen: Token;
      secondParen: Token;
      elseKeyword: Token | null;
    }
  ) {
    super();
    this.cond = cond;
    this.ifExpr = ifExpr;
    this.elseExpr = elseExpr;
  }
  accept<R>(visitor: ASTVisitor<R>): R {
    return visitor.visitLcIfExpr(this);
  }
}

/**
 * @category AST
 */
export class LcEachExpr extends ListComprehensionExpression {
  /**
   * The expression where the declared variables will be accessible.
   */
  expr: Expression;

  constructor(
    expr: Expression,
    public tokens: {
      eachKeyword: Token;
    }
  ) {
    super();

    this.expr = expr;
  }
  accept<R>(visitor: ASTVisitor<R>): R {
    return visitor.visitLcEachExpr(this);
  }
}

/**
 * @category AST
 */
export class LcForExpr extends ListComprehensionExpression {
  /**
   * The variable names in the for expression
   */
  args: AssignmentNode[];

  /**
   * The expression which will be looped.
   */
  expr: Expression;

  constructor(
    args: AssignmentNode[],
    expr: Expression,
    public tokens: {
      forKeyword: Token;
      firstParen: Token;
      secondParen: Token;
    }
  ) {
    super();
    this.args = args;
    this.expr = expr;
  }

  accept<R>(visitor: ASTVisitor<R>): R {
    return visitor.visitLcForExpr(this);
  }
}

/**
 * @category AST
 */
export class LcForCExpr extends ListComprehensionExpression {
  /**
   * The variable names in the for expression
   */
  args: AssignmentNode[];

  incrArgs: AssignmentNode[];

  cond: Expression;
  /**
   * The expression which will be looped.
   */
  expr: Expression;

  constructor(
    args: AssignmentNode[],
    incrArgs: AssignmentNode[],
    cond: Expression,
    expr: Expression,
    public tokens: {
      forKeyword: Token;
      firstParen: Token;
      firstSemicolon: Token;
      secondSemicolon: Token;
      secondParen: Token;
    }
  ) {
    super();
    this.args = args;
    this.incrArgs = incrArgs;
    this.cond = cond;
    this.expr = expr;
  }
  accept<R>(visitor: ASTVisitor<R>): R {
    return visitor.visitLcForCExpr(this);
  }
}

/**
 * @category AST
 */
export class LcLetExpr extends ListComprehensionExpression {
  /**
   * The variable names in the let expression
   */
  args: AssignmentNode[];

  /**
   * The expression where the declared variables will be accessible.
   */
  expr: Expression;

  constructor(
    args: AssignmentNode[],
    expr: Expression,
    public tokens: {
      letKeyword: Token;
      firstParen: Token;
      secondParen: Token;
    }
  ) {
    super();
    this.args = args;
    this.expr = expr;
  }
  accept<R>(visitor: ASTVisitor<R>): R {
    return visitor.visitLcLetExpr(this);
  }
}

/**
 * An expression enclosed in parenthesis.
 * @category AST
 */
export class GroupingExpr extends Expression {
  inner: Expression;
  constructor(
    inner: Expression,
    public tokens: {
      firstParen: Token;
      secondParen: Token;
    }
  ) {
    super();
    this.inner = inner;
  }
  accept<R>(visitor: ASTVisitor<R>): R {
    return visitor.visitGroupingExpr(this);
  }
}

/**
 * AnonymousFunctionExpr represents a function expression. 'function(x) x * x'
 * @category AST
 */
export class AnonymousFunctionExpr extends Expression {
  constructor(
    public definitionArgs: AssignmentNode[],
    public expr: Expression,
    public tokens: {
      functionKeyword: Token;
      firstParen: Token;
      secondParen: Token;
    }
  ) {
    super();
  }
  accept<R>(visitor: ASTVisitor<R>): R {
    return visitor.visitAnonymousFunctionExpr(this);
  }
}
