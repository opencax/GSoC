import AssignmentNode from "./ast/AssignmentNode";
import ASTNode from "./ast/ASTNode";
import ASTVisitor from "./ast/ASTVisitor";
import ErrorNode from "./ast/ErrorNode";
import {
  AnonymousFunctionExpr,
  ArrayLookupExpr,
  AssertExpr,
  BinaryOpExpr,
  EchoExpr,
  FunctionCallExpr,
  GroupingExpr,
  LcEachExpr,
  LcForCExpr,
  LcForExpr,
  LcIfExpr,
  LcLetExpr,
  LetExpr,
  LiteralExpr,
  LookupExpr,
  MemberLookupExpr,
  RangeExpr,
  TernaryExpr,
  UnaryOpExpr,
  VectorExpr,
} from "./ast/expressions";
import ScadFile from "./ast/ScadFile";
import {
  BlockStmt,
  FunctionDeclarationStmt,
  IfElseStatement,
  IncludeStmt,
  ModuleDeclarationStmt,
  ModuleInstantiationStmt,
  NoopStmt,
  UseStmt,
} from "./ast/statements";
import Token from "./Token";

/**
 * This class walks through the AST and generates arrays of tokens and function, which themselves return the same array.
 * It can be used to search through the AST, or determine the ranges of AST nodes.
 */
export default abstract class ASTAssembler<R> implements ASTVisitor<R> {
  protected abstract processAssembledNode(
    t: (Token | (() => R))[],
    self: ASTNode
  ): R;
  visitScadFile(n: ScadFile): R {
    return this.processAssembledNode(
      [...n.statements.map((stmt) => () => stmt.accept(this)), n.tokens.eot],
      n
    );
  }
  visitAssignmentNode(n: AssignmentNode): R {
    const arr: (Token | (() => R))[] = [];
    if (n.tokens.name) {
      arr.push(n.tokens.name);
    }
    if (n.tokens.equals) {
      arr.push(n.tokens.equals);
    }
    if (n.value) {
      // n.value won't be modified, so we can assert it is not null
      arr.push(() => n.value!.accept(this));
    }
    if (n.tokens.trailingCommas) {
      arr.push(...n.tokens.trailingCommas);
    }
    if (n.tokens.semicolon) {
      arr.push(n.tokens.semicolon);
    }
    return this.processAssembledNode(arr, n);
  }
  visitUnaryOpExpr(n: UnaryOpExpr): R {
    return this.processAssembledNode(
      [n.tokens.operator, () => n.right.accept(this)],
      n
    );
  }
  visitBinaryOpExpr(n: BinaryOpExpr): R {
    return this.processAssembledNode(
      [
        () => n.left.accept(this),
        n.tokens.operator,
        () => n.right.accept(this),
      ],
      n
    );
  }
  visitTernaryExpr(n: TernaryExpr): R {
    return this.processAssembledNode(
      [
        () => n.cond.accept(this),
        n.tokens.questionMark,
        () => n.ifExpr.accept(this),
        n.tokens.colon,
        () => n.elseExpr.accept(this),
      ],
      n
    );
  }
  visitArrayLookupExpr(n: ArrayLookupExpr): R {
    return this.processAssembledNode(
      [
        () => n.array.accept(this),
        n.tokens.firstBracket,
        () => n.index.accept(this),
        n.tokens.secondBracket,
      ],
      n
    );
  }
  visitLiteralExpr(n: LiteralExpr<any>): R {
    return this.processAssembledNode([n.tokens.literalToken], n);
  }
  visitRangeExpr(n: RangeExpr): R {
    if (n.step && n.tokens.secondColon) {
      let parts = [() => n.begin.accept(this), n.tokens.firstColon];
      if (n.step) {
        parts.push(() => n!.step!.accept(this));
      }

      parts.push(n.tokens.secondColon, () => n.end.accept(this));
      return this.processAssembledNode(parts, n);
    }
    return this.processAssembledNode(
      [
        () => n.begin.accept(this),
        n.tokens.firstColon,
        () => n.end.accept(this),
      ],
      n
    );
  }
  visitVectorExpr(n: VectorExpr): R {
    const arr = [];
    arr.push(n.tokens.firstBracket);
    for (let i = 0; i < n.children.length; i++) {
      arr.push(() => n.children[i].accept(this));
      if (i < n.children.length - 1) {
        arr.push(n.tokens.commas[i]);
      }
    }
    arr.push(...n.tokens.commas.slice(n.children.length));
    arr.push(n.tokens.secondBracket);
    return this.processAssembledNode(arr, n);
  }
  visitLookupExpr(n: LookupExpr): R {
    return this.processAssembledNode([n.tokens.identifier], n);
  }
  visitMemberLookupExpr(n: MemberLookupExpr): R {
    return this.processAssembledNode(
      [() => n.expr.accept(this), n.tokens.dot, n.tokens.memberName],
      n
    );
  }
  visitFunctionCallExpr(n: FunctionCallExpr): R {
    return this.processAssembledNode(
      [
        () => n.callee.accept(this),
        n.tokens.firstParen,
        ...n.args.map((a) => () => a.accept(this)),
        n.tokens.secondParen,
      ],
      n
    );
  }
  visitLetExpr(n: LetExpr): R {
    return this.processAssembledNode(
      [
        n.tokens.name,
        n.tokens.firstParen,
        ...n.args.map((a) => () => a.accept(this)),
        n.tokens.secondParen,
      ],
      n
    );
  }
  visitAssertExpr(n: AssertExpr): R {
    return this.processAssembledNode(
      [
        n.tokens.name,
        n.tokens.firstParen,
        ...n.args.map((a) => () => a.accept(this)),
        n.tokens.secondParen,
      ],
      n
    );
  }
  visitEchoExpr(n: EchoExpr): R {
    return this.processAssembledNode(
      [
        n.tokens.name,
        n.tokens.firstParen,
        ...n.args.map((a) => () => a.accept(this)),
        n.tokens.secondParen,
      ],
      n
    );
  }
  visitLcIfExpr(n: LcIfExpr): R {
    const elseStuff: (Token | (() => R))[] = [];
    if (n.elseExpr && n.tokens.elseKeyword) {
      elseStuff.push(n.tokens.elseKeyword, () => n.elseExpr!.accept(this));
    }
    return this.processAssembledNode(
      [
        n.tokens.ifKeyword,
        n.tokens.firstParen,
        () => n.cond.accept(this),
        n.tokens.secondParen,
        () => n.ifExpr.accept(this),
        ...elseStuff,
      ],
      n
    );
  }
  visitLcEachExpr(n: LcEachExpr): R {
    return this.processAssembledNode(
      [n.tokens.eachKeyword, () => n.expr.accept(this)],
      n
    );
  }
  visitLcForExpr(n: LcForExpr): R {
    return this.processAssembledNode(
      [
        n.tokens.forKeyword,
        n.tokens.firstParen,
        ...n.args.map((a) => () => a.accept(this)),
        n.tokens.secondParen,
        () => n.expr.accept(this),
      ],
      n
    );
  }
  visitLcForCExpr(n: LcForCExpr): R {
    return this.processAssembledNode(
      [
        n.tokens.forKeyword,
        n.tokens.firstParen,
        ...n.args.map((a) => () => a.accept(this)),
        n.tokens.firstSemicolon,
        () => n.cond.accept(this),
        n.tokens.secondSemicolon,
        ...n.incrArgs.map((a) => () => a.accept(this)),
        n.tokens.secondParen,
        () => n.expr.accept(this),
      ],
      n
    );
  }
  visitLcLetExpr(n: LcLetExpr): R {
    return this.processAssembledNode(
      [
        n.tokens.letKeyword,
        n.tokens.firstParen,
        ...n.args.map((a) => () => a.accept(this)),
        n.tokens.secondParen,
        () => n.expr.accept(this),
      ],
      n
    );
  }
  visitGroupingExpr(n: GroupingExpr): R {
    return this.processAssembledNode(
      [n.tokens.firstParen, () => n.inner.accept(this), n.tokens.secondParen],
      n
    );
  }
  visitUseStmt(n: UseStmt): R {
    return this.processAssembledNode(
      [n.tokens.useKeyword, n.tokens.filename],
      n
    );
  }

  visitIncludeStmt(n: IncludeStmt): R {
    return this.processAssembledNode(
      [n.tokens.includeKeyword, n.tokens.filename],
      n
    );
  }
  visitModuleInstantiationStmt(n: ModuleInstantiationStmt): R {
    const arr = [];
    arr.push(...n.tokens.modifiersInOrder);
    arr.push(n.tokens.name);
    arr.push(n.tokens.firstParen);
    arr.push(...n.args.map((a) => () => a.accept(this)));
    arr.push(n.tokens.secondParen);
    if (
      n.child &&
      !(n.child instanceof ErrorNode && n.child.tokens.tokens.length === 0) // omit zero-width error nodes since they contribute nothing.
    ) {
      arr.push(() => n.child!.accept(this));
    }

    return this.processAssembledNode(arr, n);
  }
  visitModuleDeclarationStmt(n: ModuleDeclarationStmt): R {
    return this.processAssembledNode(
      [
        n.tokens.moduleKeyword,
        n.tokens.name,
        n.tokens.firstParen,
        ...n.definitionArgs.map((a) => () => a.accept(this)),
        n.tokens.secondParen,
        () => n.stmt.accept(this),
      ],
      n
    );
  }
  visitFunctionDeclarationStmt(n: FunctionDeclarationStmt): R {
    return this.processAssembledNode(
      [
        n.tokens.functionKeyword,
        n.tokens.name,
        n.tokens.firstParen,
        ...n.definitionArgs.map((a) => () => a.accept(this)),
        n.tokens.secondParen,
        () => n.expr.accept(this),
        n.tokens.semicolon,
      ],
      n
    );
  }
  visitBlockStmt(n: BlockStmt): R {
    return this.processAssembledNode(
      [
        n.tokens.firstBrace,
        ...n.children.map((a) => () => a.accept(this)),
        n.tokens.secondBrace,
      ],
      n
    );
  }
  visitNoopStmt(n: NoopStmt): R {
    return this.processAssembledNode([n.tokens.semicolon], n);
  }
  visitIfElseStatement(n: IfElseStatement): R {
    const arr = [];
    arr.push(...n.tokens.modifiersInOrder);
    arr.push(n.tokens.ifKeyword);
    arr.push(n.tokens.firstParen);
    arr.push(() => n.cond.accept(this));
    arr.push(n.tokens.secondParen);
    arr.push(() => n.thenBranch.accept(this));
    if (n.elseBranch) {
      arr.push(n!.tokens!.elseKeyword!, () => n!.elseBranch!.accept(this));
    }
    return this.processAssembledNode(arr, n);
  }
  visitAnonymousFunctionExpr(n: AnonymousFunctionExpr): R {
    return this.processAssembledNode(
      [
        n.tokens.functionKeyword,
        n.tokens.firstParen,
        ...n.definitionArgs.map((a) => () => a.accept(this)),
        n.tokens.secondParen,
        () => n.expr.accept(this),
      ],
      n
    );
  }
  visitErrorNode(n: ErrorNode): R {
    return this.processAssembledNode([...n.tokens.tokens], n);
  }
}
