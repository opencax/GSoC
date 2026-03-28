import { notStrictEqual } from "assert";
import AssignmentNode, { AssignmentNodeRole } from "../ast/AssignmentNode";
import ASTNode from "../ast/ASTNode";
import ASTVisitor from "../ast/ASTVisitor";
import ErrorNode from "../ast/ErrorNode";
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
} from "../ast/expressions";
import ScadFile from "../ast/ScadFile";
import {
  BlockStmt,
  FunctionDeclarationStmt,
  IfElseStatement,
  IncludeStmt,
  ModuleDeclarationStmt,
  ModuleInstantiationStmt,
  NoopStmt,
  Statement,
  UseStmt,
} from "../ast/statements";
import {
  AnonymousFunctionExprWithScope,
  BlockStmtWithScope,
  FunctionDeclarationStmtWithScope,
  LcForCExprWithScope,
  LcForExprWithScope,
  LcLetExprWithScope,
  LetExprWithScope,
  ModuleDeclarationStmtWithScope,
  ModuleInstantiationStmtWithScope,
  ScadFileWithScope,
} from "./nodesWithScopes";
import Scope from "./Scope";

export default class ASTScopePopulator implements ASTVisitor<ASTNode> {
  nearestScope: Scope;
  constructor(rootScope: Scope) {
    this.nearestScope = rootScope;
  }

  protected copyWithNewNearestScope(newScope: Scope) {
    return new ASTScopePopulator(newScope);
  }
  populate(n: ASTNode) {
    return n.accept(this);
  }
  visitScadFile(n: ScadFile): ASTNode {
    const sf = new ScadFileWithScope(
      n.statements.map((stmt) => stmt.accept(this)),
      n.tokens
    );
    sf.scope = this.nearestScope; // we assume the nearest scope is the root scope, since we are processing the scad file
    return sf;
  }
  visitAssignmentNode(n: AssignmentNode): ASTNode {
    const an = new AssignmentNode(
      n.name,
      n.value ? n.value.accept(this) : null,
      n.role,
      n.tokens
    );
    if (n.name && n.role != AssignmentNodeRole.ARGUMENT_ASSIGNMENT) {
      this.nearestScope.variables.set(an.name, an);
    }
    return an;
  }
  visitUnaryOpExpr(n: UnaryOpExpr): ASTNode {
    return new UnaryOpExpr(n.operation, n.right.accept(this), n.tokens);
  }
  visitBinaryOpExpr(n: BinaryOpExpr): ASTNode {
    return new BinaryOpExpr(
      n.left.accept(this),
      n.operation,
      n.right.accept(this),
      n.tokens
    );
  }
  visitTernaryExpr(n: TernaryExpr): ASTNode {
    return new TernaryExpr(
      n.cond.accept(this),
      n.ifExpr.accept(this),
      n.elseExpr.accept(this),
      n.tokens
    );
  }
  visitArrayLookupExpr(n: ArrayLookupExpr): ASTNode {
    return new ArrayLookupExpr(
      n.array.accept(this),
      n.index.accept(this),
      n.tokens
    );
  }
  visitLiteralExpr(n: LiteralExpr<any>): ASTNode {
    return new LiteralExpr<any>(n.value, n.tokens);
  }
  visitRangeExpr(n: RangeExpr): ASTNode {
    return new RangeExpr(
      n.begin.accept(this),
      n.step ? n.step.accept(this) : null,
      n.end.accept(this),
      n.tokens
    );
  }
  visitVectorExpr(n: VectorExpr): ASTNode {
    return new VectorExpr(
      n.children.map((c) => c.accept(this)),
      n.tokens
    );
  }
  visitLookupExpr(n: LookupExpr): ASTNode {
    return new LookupExpr(n.name, n.tokens);
  }
  visitMemberLookupExpr(n: MemberLookupExpr): ASTNode {
    return new MemberLookupExpr(n.expr.accept(this), n.member, n.tokens);
  }
  visitFunctionCallExpr(n: FunctionCallExpr): ASTNode {
    return new FunctionCallExpr(
      n.callee,
      n.args.map((a) => a.accept(this)) as AssignmentNode[],
      n.tokens
    );
  }
  visitLetExpr(n: LetExpr): ASTNode {
    const letExprWithScope = new LetExprWithScope(
      null as unknown as any,
      null as unknown as any,
      n.tokens
    );
    letExprWithScope.scope = new Scope();
    letExprWithScope.scope.parent = this.nearestScope;
    const copy = this.copyWithNewNearestScope(letExprWithScope.scope);
    letExprWithScope.args = n.args.map((a) =>
      a.accept(copy)
    ) as AssignmentNode[];
    letExprWithScope.expr = n.expr.accept(copy);
    for (const a of letExprWithScope.args) {
      if (a.name) {
        letExprWithScope.scope.variables.set(a.name, a);
      }
    }
    return letExprWithScope;
  }
  visitAssertExpr(n: AssertExpr): ASTNode {
    return new AssertExpr(
      n.args.map((a) => a.accept(this)) as AssignmentNode[],
      n.expr.accept(this),
      n.tokens
    );
  }
  visitEchoExpr(n: EchoExpr): ASTNode {
    return new EchoExpr(
      n.args.map((a) => a.accept(this)) as AssignmentNode[],
      n.expr.accept(this),
      n.tokens
    );
  }
  visitLcIfExpr(n: LcIfExpr): ASTNode {
    return new LcIfExpr(
      n.cond.accept(this),
      n.ifExpr.accept(this),
      n.elseExpr ? n.elseExpr.accept(this) : null,
      n.tokens
    );
  }
  visitLcEachExpr(n: LcEachExpr): ASTNode {
    return new LcEachExpr(n.expr.accept(this), n.tokens);
  }
  visitLcForExpr(n: LcForExpr): ASTNode {
    const newNode = new LcForExprWithScope(
      null as unknown as any,
      null as unknown as any,
      n.tokens
    );
    newNode.scope = new Scope();
    newNode.scope.parent = this.nearestScope;
    const copy = this.copyWithNewNearestScope(newNode.scope);
    newNode.args = n.args.map((a) => a.accept(copy)) as AssignmentNode[];
    newNode.expr = n.expr.accept(copy);
    return newNode;
  }
  visitLcForCExpr(n: LcForCExpr): ASTNode {
    const newNode = new LcForCExprWithScope(
      null as unknown as any,
      null as unknown as any,
      null as unknown as any,
      null as unknown as any,
      n.tokens
    );
    newNode.scope = new Scope();
    newNode.scope.parent = this.nearestScope;
    const copy = this.copyWithNewNearestScope(newNode.scope);
    newNode.args = n.args.map((a) => a.accept(copy)) as AssignmentNode[];
    newNode.incrArgs = n.incrArgs.map((a) =>
      a.accept(copy)
    ) as AssignmentNode[];
    newNode.cond = n.cond.accept(copy);
    newNode.expr = n.expr.accept(copy);
    return newNode;
  }
  visitLcLetExpr(n: LcLetExpr): ASTNode {
    const lcLetWithScopeExpr = new LcLetExprWithScope(
      null as unknown as any,
      null as unknown as any,
      n.tokens
    );
    lcLetWithScopeExpr.scope = new Scope();
    lcLetWithScopeExpr.scope.parent = this.nearestScope;
    const copy = this.copyWithNewNearestScope(lcLetWithScopeExpr.scope);
    lcLetWithScopeExpr.args = n.args.map((a) =>
      a.accept(copy)
    ) as AssignmentNode[];
    lcLetWithScopeExpr.expr = n.expr.accept(copy);
    return lcLetWithScopeExpr;
  }
  visitGroupingExpr(n: GroupingExpr): ASTNode {
    return new GroupingExpr(n.inner.accept(this), n.tokens);
  }
  visitUseStmt(n: UseStmt): ASTNode {
    return n;
  }
  visitIncludeStmt(n: IncludeStmt): ASTNode {
    return n;
  }
  visitModuleInstantiationStmt(n: ModuleInstantiationStmt): ASTNode {
    if (n.name === "for" || n.name === "intersection_for") {
      const inst = new ModuleInstantiationStmtWithScope(
        n.name,
        null as unknown as any,
        null,
        n.tokens
      );
      inst.scope = new Scope();
      inst.scope.parent = this.nearestScope;
      const copy = this.copyWithNewNearestScope(inst.scope);
      inst.args = n.args.map((a) => a.accept(copy)) as AssignmentNode[];
      inst.child = n.child ? n.child.accept(copy) : null;
    }
    const inst = new ModuleInstantiationStmt(
      n.name,
      n.args.map((a) => a.accept(this)) as AssignmentNode[],
      n.child ? n.child.accept(this) : null,
      n.tokens
    );
    inst.tagRoot = n.tagRoot;
    inst.tagHighlight = n.tagHighlight;
    inst.tagBackground = n.tagBackground;
    inst.tagDisabled = n.tagDisabled;
    return inst;
  }
  visitModuleDeclarationStmt(n: ModuleDeclarationStmt): ASTNode {
    const md = new ModuleDeclarationStmtWithScope(
      n.name,
      null as unknown as any,
      null as unknown as any,
      n.tokens,
      n.docComment
    );
    this.nearestScope.modules.set(md.name, md);
    md.scope = new Scope();
    md.scope.parent = this.nearestScope;
    const copy = this.copyWithNewNearestScope(md.scope);
    md.definitionArgs = n.definitionArgs.map((a) =>
      a.accept(copy)
    ) as AssignmentNode[];
    md.stmt = n.stmt.accept(copy);
    return md;
  }
  visitFunctionDeclarationStmt(n: FunctionDeclarationStmt): ASTNode {
    const fDecl = new FunctionDeclarationStmtWithScope(
      n.name,
      null as unknown as any,
      null as unknown as any,
      n.tokens,
      n.docComment
    );
    this.nearestScope.functions.set(n.name, fDecl);
    fDecl.scope = new Scope();
    fDecl.scope.parent = this.nearestScope;
    const newPopulator = this.copyWithNewNearestScope(fDecl.scope);
    fDecl.definitionArgs = n.definitionArgs.map((a) =>
      a.accept(newPopulator)
    ) as AssignmentNode[];
    fDecl.expr = n.expr.accept(newPopulator);
    return fDecl;
  }
  visitAnonymousFunctionExpr(n: AnonymousFunctionExpr): ASTNode {
    const fDecl = new AnonymousFunctionExprWithScope(
      null as unknown as any,
      null as unknown as any,
      n.tokens
    );
    fDecl.scope = new Scope();
    fDecl.scope.parent = this.nearestScope;
    const newPopulator = this.copyWithNewNearestScope(fDecl.scope);
    fDecl.definitionArgs = n.definitionArgs.map((a) =>
      a.accept(newPopulator)
    ) as AssignmentNode[];
    fDecl.expr = n.expr.accept(newPopulator);
    return fDecl;
  }
  visitBlockStmt(n: BlockStmt): ASTNode {
    const blk = new BlockStmtWithScope(null as unknown as any, n.tokens);
    blk.scope = new Scope();
    blk.scope.parent = this.nearestScope;
    blk.children = n.children.map((c) =>
      c.accept(this.copyWithNewNearestScope(blk.scope))
    ) as Statement[];
    return blk;
  }
  visitNoopStmt(n: NoopStmt): ASTNode {
    return new NoopStmt(n.tokens);
  }
  visitIfElseStatement(n: IfElseStatement): ASTNode {
    return new IfElseStatement(
      n.cond.accept(this),
      n.thenBranch.accept(this),
      n.elseBranch ? n.elseBranch.accept(this) : null,
      n.tokens
    );
  }
  visitErrorNode(n: ErrorNode): ASTNode {
    return new ErrorNode(n.tokens);
  }
}
