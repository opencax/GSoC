import ASTVisitor from "../ast/ASTVisitor";
import { AnonymousFunctionExpr, LcForCExpr, LcForExpr, LcLetExpr, LetExpr } from "../ast/expressions";
import ScadFile from "../ast/ScadFile";
import {
  BlockStmt,
  FunctionDeclarationStmt,
  ModuleDeclarationStmt,
  ModuleInstantiationStmt,
} from "../ast/statements";
import NodeWithScope from "./NodeWithScope";
import Scope from "./Scope";

export interface ASTVisitorForNodesWithScopes<R> extends ASTVisitor<R> {
  visitBlockStmtWithScope(n: BlockStmtWithScope): R;
  visitLetExprWithScope(n: LetExprWithScope): R;
  visitScadFileWithScope(n: ScadFileWithScope): R;
  visitFunctionDeclarationStmtWithScope(n: FunctionDeclarationStmtWithScope): R;
  visitModuleDeclarationStmtWithScope(n: ModuleDeclarationStmtWithScope): R;
  visitLcLetExprWithScope(n: LcLetExprWithScope): R;
  visitLcForExprWithScope(n: LcForExprWithScope): R;
  visitLcForCExprWithScope(n: LcForCExprWithScope): R;
  visitModuleInstantiationStmtWithScope(n: ModuleInstantiationStmtWithScope): R;
  visitAnonymousFunctionExprWithScope(n: AnonymousFunctionExprWithScope): R;
}

export class BlockStmtWithScope extends BlockStmt implements NodeWithScope {
  scope!: Scope;
  accept<R>(visitor: ASTVisitorForNodesWithScopes<R>): R {
    if (visitor.visitBlockStmtWithScope) {
      return visitor.visitBlockStmtWithScope(this);
    }
    return visitor.visitBlockStmt(this);
  }
}
export class LetExprWithScope extends LetExpr implements NodeWithScope {
  scope!: Scope;
  accept<R>(visitor: ASTVisitorForNodesWithScopes<R>): R {
    if (visitor.visitLetExprWithScope) {
      return visitor.visitLetExprWithScope(this);
    }
    return visitor.visitLetExpr(this);
  }
}

export class ScadFileWithScope extends ScadFile implements NodeWithScope {
  scope!: Scope;
  accept<R>(visitor: ASTVisitorForNodesWithScopes<R>): R {
    if (visitor.visitScadFileWithScope) {
      return visitor.visitScadFileWithScope(this);
    }
    return visitor.visitScadFile(this);
  }
}

export class FunctionDeclarationStmtWithScope
  extends FunctionDeclarationStmt
  implements NodeWithScope
{
  scope!: Scope;
  accept<R>(visitor: ASTVisitorForNodesWithScopes<R>): R {
    if (visitor.visitFunctionDeclarationStmtWithScope) {
      return visitor.visitFunctionDeclarationStmtWithScope(this);
    }
    return visitor.visitFunctionDeclarationStmt(this);
  }
}

export class ModuleDeclarationStmtWithScope
  extends ModuleDeclarationStmt
  implements NodeWithScope
{
  scope!: Scope;
  accept<R>(visitor: ASTVisitorForNodesWithScopes<R>): R {
    if (visitor.visitModuleDeclarationStmtWithScope) {
      return visitor.visitModuleDeclarationStmtWithScope(this);
    }
    return visitor.visitModuleDeclarationStmt(this);
  }
}

export class ModuleInstantiationStmtWithScope
  extends ModuleInstantiationStmt
  implements NodeWithScope
{
  scope!: Scope;
  accept<R>(visitor: ASTVisitorForNodesWithScopes<R>): R {
    if (visitor.visitModuleInstantiationStmtWithScope) {
      return visitor.visitModuleInstantiationStmtWithScope(this);
    }
    return visitor.visitModuleInstantiationStmt(this);
  }
}

export class LcLetExprWithScope extends LcLetExpr implements NodeWithScope {
  scope!: Scope;
  accept<R>(visitor: ASTVisitorForNodesWithScopes<R>): R {
    if (visitor.visitLcLetExprWithScope) {
      return visitor.visitLcLetExprWithScope(this);
    }
    return visitor.visitLcLetExpr(this);
  }
}

export class LcForExprWithScope extends LcForExpr implements NodeWithScope {
  scope!: Scope;
  accept<R>(visitor: ASTVisitorForNodesWithScopes<R>): R {
    if (visitor.visitLcForExprWithScope) {
      return visitor.visitLcForExprWithScope(this);
    }
    return visitor.visitLcForExpr(this);
  }
}

export class LcForCExprWithScope extends LcForCExpr implements NodeWithScope {
  scope!: Scope;
  accept<R>(visitor: ASTVisitorForNodesWithScopes<R>): R {
    if (visitor.visitLcForCExprWithScope) {
      return visitor.visitLcForCExprWithScope(this);
    }
    return visitor.visitLcForCExpr(this);
  }
}

export class AnonymousFunctionExprWithScope extends AnonymousFunctionExpr implements NodeWithScope {
  scope!: Scope;
  accept<R>(visitor: ASTVisitorForNodesWithScopes<R>): R {
    if (visitor.visitAnonymousFunctionExprWithScope) {
      return visitor.visitAnonymousFunctionExprWithScope(this);
    }
    return visitor.visitAnonymousFunctionExpr(this);
  }
}
