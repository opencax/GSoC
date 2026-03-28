import ScadFile from "./ast/ScadFile";

import ASTVisitor from "./ast/ASTVisitor";
import {
  UnaryOpExpr,
  BinaryOpExpr,
  TernaryExpr,
  ArrayLookupExpr,
  LiteralExpr,
  RangeExpr,
  VectorExpr,
  LookupExpr,
  MemberLookupExpr,
  FunctionCallExpr,
  LetExpr,
  AssertExpr,
  EchoExpr,
  LcIfExpr,
  LcEachExpr,
  LcForExpr,
  LcForCExpr,
  LcLetExpr,
  GroupingExpr,
  AnonymousFunctionExpr,
} from "./ast/expressions";
import {
  UseStmt,
  IncludeStmt,
  ModuleInstantiationStmt,
  ModuleDeclarationStmt,
  FunctionDeclarationStmt,
  BlockStmt,
  NoopStmt,
  IfElseStatement,
} from "./ast/statements";
import DocComment from "./comments/DocComment";
import {
  ASTVisitorForNodesWithScopes,
  BlockStmtWithScope,
  LetExprWithScope,
  ScadFileWithScope,
  FunctionDeclarationStmtWithScope,
  ModuleDeclarationStmtWithScope,
  LcLetExprWithScope,
  LcForExprWithScope,
  LcForCExprWithScope,
  ModuleInstantiationStmtWithScope,
  AnonymousFunctionExprWithScope,
} from "./semantic/nodesWithScopes";
import AssignmentNode from "./ast/AssignmentNode";
import ASTNode from "./ast/ASTNode";
import ErrorNode from "./ast/ErrorNode";

export default class ASTMutator
  implements ASTVisitorForNodesWithScopes<ASTNode>
{
  visitScadFile(n: ScadFile): ASTNode {
    const stmts = n.statements.map((s) => s.accept(this));
    if (stmts.length === n.statements.length) {
      let modified = false;
      for (let i = 0; i < stmts.length; i++) {
        if (stmts[i] !== n.statements[i]) {
          modified = true;
          break;
        }
      }
      if (!modified) {
        return n;
      }
    }

    return new ScadFile(stmts, n.tokens);
  }
  visitAssignmentNode(n: AssignmentNode): ASTNode {
    const newValue = n.value ? n.value.accept(this) : null;
    if (newValue === n.value) {
      return n;
    }
    return new AssignmentNode(n.name, newValue, n.role, n.tokens);
  }
  visitUnaryOpExpr(n: UnaryOpExpr): ASTNode {
    const newRight = n.right.accept(this);
    if (newRight === n.right) {
      return n;
    }
    return new UnaryOpExpr(n.operation, newRight, n.tokens);
  }
  visitBinaryOpExpr(n: BinaryOpExpr): ASTNode {
    const newLeft = n.left.accept(this);
    const newRight = n.right.accept(this);
    if (newRight === n.right && newLeft === n.left) {
      return n;
    }
    return new BinaryOpExpr(newLeft, n.operation, newRight, n.tokens);
  }
  visitTernaryExpr(n: TernaryExpr): ASTNode {
    const newCond = n.cond.accept(this);
    const newIfExpr = n.ifExpr.accept(this);
    const newElseExpr = n.elseExpr.accept(this);
    if (
      newCond === n.cond &&
      newIfExpr === n.ifExpr &&
      newElseExpr === n.elseExpr
    ) {
      return n;
    }
    return new TernaryExpr(n.cond, n.ifExpr, n.elseExpr, n.tokens);
  }
  visitArrayLookupExpr(n: ArrayLookupExpr): ASTNode {
    const newArray = n.array.accept(this);
    const newIndex = n.index.accept(this);
    if (newArray === n.array && newIndex === n.index) {
      return n;
    }
    return new ArrayLookupExpr(newArray, newIndex, n.tokens);
  }
  visitLiteralExpr(n: LiteralExpr<any>): ASTNode {
    return n;
  }
  visitRangeExpr(n: RangeExpr): ASTNode {
    const newBegin = n.begin.accept(this);
    const newStep = n.step ? n.step.accept(this) : null;
    const newEnd = n.end.accept(this);
    if (newBegin === n.begin && newStep === n.step && newEnd === n.end) {
      return n;
    }
    return new RangeExpr(newBegin, newStep, newEnd, n.tokens);
  }
  visitVectorExpr(n: VectorExpr): ASTNode {
    const newChildren = n.children.map((c) => c.accept(this));
    if (newChildren.length === n.children.length) {
      let modified = false;
      for (let i = 0; i < newChildren.length; i++) {
        if (newChildren[i] !== n.children[i]) {
          modified = true;
          break;
        }
      }
      if (!modified) return n;
    }
    return new VectorExpr(newChildren, n.tokens);
  }
  visitLookupExpr(n: LookupExpr): ASTNode {
    return n;
  }
  visitMemberLookupExpr(n: MemberLookupExpr): ASTNode {
    const newExpr = n.expr.accept(this);
    if (newExpr === n.expr) {
      return n;
    }
    return new MemberLookupExpr(newExpr, n.member, n.tokens);
  }
  visitFunctionCallExpr(n: FunctionCallExpr): ASTNode {
    const newArgs = n.args.map((a) => a.accept(this)) as AssignmentNode[];
    const newCalee = n.callee.accept(this);
    if (newArgs.length === n.args.length && newCalee === n.callee) {
      let modified = false;
      for (let i = 0; i < newArgs.length; i++) {
        if (newArgs[i] !== n.args[i]) {
          modified = true;
          break;
        }
      }
      if (!modified) return n;
    }
    return new FunctionCallExpr(newCalee, newArgs, n.tokens);
  }
  visitLetExpr(n: LetExpr): ASTNode {
    const newExpr = n.expr.accept(this);
    const newArgs = n.args.map((a) => a.accept(this)) as AssignmentNode[];
    if (newArgs.length === n.args.length && newExpr === n.expr) {
      let modified = false;
      for (let i = 0; i < newArgs.length; i++) {
        if (newArgs[i] !== n.args[i]) {
          modified = true;
          break;
        }
      }
      if (!modified) return n;
    }

    return new LetExpr(newArgs, newExpr, n.tokens);
  }
  visitAssertExpr(n: AssertExpr): ASTNode {
    const newExpr = n.expr.accept(this);
    const newArgs = n.args.map((a) => a.accept(this)) as AssignmentNode[];
    if (newArgs.length === n.args.length && newExpr === n.expr) {
      let modified = false;
      for (let i = 0; i < newArgs.length; i++) {
        if (newArgs[i] !== n.args[i]) {
          modified = true;
          break;
        }
      }
      if (!modified) return n;
    }

    return new AssertExpr(newArgs, newExpr, n.tokens);
  }
  visitEchoExpr(n: EchoExpr): ASTNode {
    const newExpr = n.expr.accept(this);
    const newArgs = n.args.map((a) => a.accept(this)) as AssignmentNode[];
    if (newArgs.length === n.args.length && newExpr === n.expr) {
      let modified = false;
      for (let i = 0; i < newArgs.length; i++) {
        if (newArgs[i] !== n.args[i]) {
          modified = true;
          break;
        }
      }
      if (!modified) return n;
    }

    return new EchoExpr(newArgs, newExpr, n.tokens);
  }
  visitLcIfExpr(n: LcIfExpr): ASTNode {
    const newCond = n.cond.accept(this);
    const newIfExpr = n.ifExpr.accept(this);
    const newElseExpr = n.elseExpr ? n.elseExpr.accept(this) : null;
    if (
      newCond === n.cond &&
      newIfExpr === n.ifExpr &&
      newElseExpr === n.elseExpr
    ) {
      return n;
    }
    return new LcIfExpr(newCond, newIfExpr, newElseExpr, n.tokens);
  }
  visitLcEachExpr(n: LcEachExpr): ASTNode {
    const newExpr = n.expr.accept(this);
    if (newExpr === n.expr) {
      return n;
    }
    return new LcEachExpr(newExpr, n.tokens);
  }
  visitLcForExpr(n: LcForExpr): ASTNode {
    const newExpr = n.expr.accept(this);
    const newArgs = n.args.map((a) => a.accept(this)) as AssignmentNode[];
    if (newArgs.length === n.args.length && newExpr === n.expr) {
      let modified = false;
      for (let i = 0; i < newArgs.length; i++) {
        if (newArgs[i] !== n.args[i]) {
          modified = true;
          break;
        }
      }
      if (!modified) return n;
    }
    return new LcForExpr(newArgs, newExpr, n.tokens);
  }
  visitLcForCExpr(n: LcForCExpr): ASTNode {
    const newArgs = n.args.map((a) => a.accept(this)) as AssignmentNode[];
    const newIncrArgs = n.incrArgs.map((a) =>
      a.accept(this)
    ) as AssignmentNode[];
    const newExpr = n.expr.accept(this);
    const newCond = n.cond.accept(this);
    if (
      newArgs.length === n.args.length &&
      newIncrArgs.length === n.incrArgs.length &&
      newExpr === n.expr &&
      newCond === n.cond
    ) {
      let modified = false;
      for (let i = 0; i < newArgs.length; i++) {
        if (newArgs[i] !== n.args[i]) {
          modified = true;
          break;
        }
      }
      for (let i = 0; i < newIncrArgs.length; i++) {
        if (newIncrArgs[i] !== n.incrArgs[i]) {
          modified = true;
          break;
        }
      }
      if (!modified) return n;
    }
    return new LcForCExpr(newArgs, newIncrArgs, newCond, newExpr, n.tokens);
  }
  visitLcLetExpr(n: LcLetExpr): ASTNode {
    const newExpr = n.expr.accept(this);
    const newArgs = n.args.map((a) => a.accept(this)) as AssignmentNode[];
    if (newArgs.length === n.args.length && newExpr === n.expr) {
      let modified = false;
      for (let i = 0; i < newArgs.length; i++) {
        if (newArgs[i] !== n.args[i]) {
          modified = true;
          break;
        }
      }
      if (!modified) return n;
    }
    return new LcLetExpr(newArgs, newExpr, n.tokens);
  }
  visitGroupingExpr(n: GroupingExpr): ASTNode {
    const newInner = n.inner.accept(this);
    if (newInner === n.inner) {
      return n;
    }
    return new GroupingExpr(n.inner.accept(this), n.tokens);
  }
  visitUseStmt(n: UseStmt): ASTNode {
    return n;
  }
  visitIncludeStmt(n: IncludeStmt): ASTNode {
    return n;
  }
  visitModuleInstantiationStmt(n: ModuleInstantiationStmt): ASTNode {
    // TODO: add cached check
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
    const newDefinitionArgs = n.definitionArgs.map((a) =>
      a.accept(this)
    ) as AssignmentNode[];
    const newStmt = n.stmt.accept(this);
    if (
      newDefinitionArgs.length === n.definitionArgs.length &&
      newStmt === n.stmt
    ) {
      let modified = false;
      for (let i = 0; i < newDefinitionArgs.length; i++) {
        if (newDefinitionArgs[i] !== n.definitionArgs[i]) {
          modified = true;
          break;
        }
      }
      if (!modified) return n;
    }
    return new ModuleDeclarationStmt(
      n.name,
      newDefinitionArgs,
      newStmt,
      n.tokens,
      n.docComment
    );
  }
  visitFunctionDeclarationStmt(n: FunctionDeclarationStmt): ASTNode {
    const newDefinitionArgs = n.definitionArgs.map((a) =>
      a.accept(this)
    ) as AssignmentNode[];
    const newExpr = n.expr.accept(this);
    if (
      newDefinitionArgs.length === n.definitionArgs.length &&
      newExpr === n.expr
    ) {
      let modified = false;
      for (let i = 0; i < newDefinitionArgs.length; i++) {
        if (newDefinitionArgs[i] !== n.definitionArgs[i]) {
          modified = true;
          break;
        }
      }
      if (!modified) return n;
    }
    return new FunctionDeclarationStmt(
      n.name,
      newDefinitionArgs,
      newExpr,
      n.tokens,
      n.docComment
    );
  }
  visitBlockStmt(n: BlockStmt): ASTNode {
    const children = n.children.map((s) => s.accept(this));
    if (children.length === n.children.length) {
      let modified = false;
      for (let i = 0; i < children.length; i++) {
        if (children[i] !== n.children[i]) {
          modified = true;
          break;
        }
      }
      if (!modified) {
        return n;
      }
    }

    return new BlockStmt(children, n.tokens);
  }
  visitNoopStmt(n: NoopStmt): ASTNode {
    return n;
  }
  visitIfElseStatement(n: IfElseStatement): ASTNode {
    const newCond = n.cond.accept(this);
    const newThenBranch = n.thenBranch.accept(this);
    const newElseBranch = n.elseBranch ? n.elseBranch.accept(this) : null;
    if (
      newCond === n.cond &&
      newThenBranch === n.thenBranch &&
      newElseBranch === n.elseBranch
    ) {
      return n;
    }
    return new IfElseStatement(newCond, newThenBranch, newElseBranch, n.tokens);
  }
  visitErrorNode(n: ErrorNode): ASTNode {
    return n;
  }

  visitAnonymousFunctionExpr(n: AnonymousFunctionExpr): ASTNode {
    const newArgs = n.definitionArgs.map((a) =>
      a.accept(this)
    ) as AssignmentNode[];
    const newBody = n.expr.accept(this);
    if (newArgs.length === n.definitionArgs.length && newBody === n.expr) {
      let modified = false;
      for (let i = 0; i < newArgs.length; i++) {
        if (newArgs[i] !== n.definitionArgs[i]) {
          modified = true;
          break;
        }
      }
      if (!modified) return n;
    }
    return new AnonymousFunctionExpr(newArgs, newBody, n.tokens);
  }

  visitBlockStmtWithScope(n: BlockStmtWithScope): ASTNode {
    const oldNode = this.visitBlockStmt(n) as BlockStmt;
    const newNode = new BlockStmtWithScope(oldNode.children, oldNode.tokens);
    newNode.scope = n.scope;
    return newNode;
  }
  visitLetExprWithScope(n: LetExprWithScope): ASTNode {
    const oldNode = this.visitLetExpr(n) as LetExpr;
    const newNode = new LetExprWithScope(
      oldNode.args,
      oldNode.expr,
      oldNode.tokens
    );
    newNode.scope = n.scope;
    return newNode;
  }
  visitScadFileWithScope(n: ScadFileWithScope): ASTNode {
    const oldNode = this.visitScadFile(n) as ScadFile;
    const newNode = new ScadFileWithScope(oldNode.statements, oldNode.tokens);
    newNode.scope = n.scope;
    return newNode;
  }
  visitFunctionDeclarationStmtWithScope(
    n: FunctionDeclarationStmtWithScope
  ): ASTNode {
    const oldNode = this.visitFunctionDeclarationStmt(
      n
    ) as FunctionDeclarationStmt;
    const newNode = new FunctionDeclarationStmtWithScope(
      oldNode.name,
      oldNode.definitionArgs,
      oldNode.expr,
      oldNode.tokens,
      oldNode.docComment
    );
    newNode.scope = n.scope;
    return newNode;
  }
  visitModuleDeclarationStmtWithScope(
    n: ModuleDeclarationStmtWithScope
  ): ASTNode {
    const oldNode = this.visitModuleDeclarationStmt(n) as ModuleDeclarationStmt;
    const newNode = new ModuleDeclarationStmtWithScope(
      oldNode.name,
      oldNode.definitionArgs,
      oldNode.stmt,
      oldNode.tokens,
      n.docComment
    );
    newNode.scope = n.scope;
    return newNode;
  }
  visitModuleInstantiationStmtWithScope(n: ModuleInstantiationStmtWithScope) {
    const oldNode = this.visitModuleInstantiationStmt(
      n
    ) as ModuleInstantiationStmt;
    const newNode = new ModuleInstantiationStmtWithScope(
      oldNode.name,
      oldNode.args,
      oldNode.child,
      oldNode.tokens
    );
    newNode.scope = n.scope;
    return newNode;
  }
  visitLcLetExprWithScope(n: LcLetExprWithScope): ASTNode {
    const oldNode = this.visitLcLetExpr(n) as LcLetExpr;
    const newNode = new LcLetExprWithScope(
      oldNode.args,
      oldNode.expr,
      oldNode.tokens
    );
    newNode.scope = n.scope;
    return newNode;
  }
  visitLcForExprWithScope(n: LcForExprWithScope): ASTNode {
    const oldNode = this.visitLcForExpr(n) as LcForExpr;
    const newNode = new LcForExprWithScope(
      oldNode.args,
      oldNode.expr,
      oldNode.tokens
    );
    newNode.scope = n.scope;
    return newNode;
  }
  visitLcForCExprWithScope(n: LcForCExprWithScope): ASTNode {
    const oldNode = this.visitLcForCExpr(n) as LcForCExpr;
    const newNode = new LcForCExprWithScope(
      oldNode.args,
      oldNode.incrArgs,
      oldNode.cond,
      oldNode.expr,
      oldNode.tokens
    );
    newNode.scope = n.scope;
    return newNode;
  }

  visitAnonymousFunctionExprWithScope(n: AnonymousFunctionExprWithScope) {
    const oldNode = this.visitAnonymousFunctionExpr(n) as AnonymousFunctionExpr;
    const newNode = new AnonymousFunctionExprWithScope(
      oldNode.definitionArgs,
      oldNode.expr,
      oldNode.tokens
    );
    newNode.scope = n.scope;
    return newNode;
  }
}
