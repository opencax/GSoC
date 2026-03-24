import AssignmentNode from "../ast/AssignmentNode";
import ASTNode from "../ast/ASTNode";
import {
  AnonymousFunctionExpr,
  FunctionCallExpr,
  LcForCExpr,
  LcForExpr,
  LcLetExpr,
  LetExpr,
  LookupExpr,
} from "../ast/expressions";
import ScadFile from "../ast/ScadFile";
import {
  BlockStmt,
  FunctionDeclarationStmt,
  ModuleDeclarationStmt,
  ModuleInstantiationStmt,
} from "../ast/statements";
import ASTMutator from "../ASTMutator";
import ErrorCollector from "../ErrorCollector";
import NodeWithScope from "./NodeWithScope";
import {
  ResolvedLookupExpr,
  ResolvedModuleInstantiationStmt,
} from "./resolvedNodes";
import Scope from "./Scope";
import {
  UnresolvedFunctionError,
  UnresolvedModuleError,
  UnresolvedVariableError,
} from "./unresolvedSymbolErrors";

export default class SymbolResolver extends ASTMutator {
  constructor(
    private errorCollector: ErrorCollector,
    /** 
     * Represents the scope where the resolver has descended.
     * It initially is null, but the resolver should encounter a NodeWithScope 
     * and set this to the scope of that node.
     */
    public currentScope: Scope | null = null,
    public isInCallee: boolean = false
  ) {
    super();
  }

  visitLookupExpr(n: LookupExpr): ASTNode {
    if(! this.currentScope) {
      throw new Error("currentScope cannot be null when resolving lookup");
    }
    const resolved = new ResolvedLookupExpr(n.name, n.tokens);
    resolved.resolvedDeclaration = this.currentScope.lookupVariable(n.name);
    if(this.isInCallee && !resolved.resolvedDeclaration) {
      resolved.resolvedDeclaration = this.currentScope.lookupFunction(n.name);
    }
    if (!resolved.resolvedDeclaration) {
      this.errorCollector.reportError(
        new UnresolvedVariableError(n.span.start, n.name)
      );
      return n;
    }
    return resolved;
  }

  visitModuleInstantiationStmt(n: ModuleInstantiationStmt): ASTNode {
    if(! this.currentScope) {
      throw new Error("currentScope cannot be null when resolving module");
    }
    const resolved = new ResolvedModuleInstantiationStmt(
      n.name,
      n.args.map((a) => a.accept(this)) as AssignmentNode[],
      n.child ? n.child.accept(this) : null,
      n.tokens
    );
    resolved.resolvedDeclaration = this.currentScope.lookupModule(n.name);
    if (!resolved.resolvedDeclaration) {
      this.errorCollector.reportError(new UnresolvedModuleError(n.span.start, n.name));
      return n;
    }
    return resolved;
  }

 
  /**
   * visitFunctionCallExpr switches the SymbolResolver into a special mode where
   * it falls back to resolving named functions when processing lookup expressions.
   * This behaviour tries to mimic the behaviour of OpenSCAD's function call resolution,
   * it is not perfect, since you can abuse this to do things like assign a named function
   * to a variable which is not allowed in OpenSCAD. So this covers all but the most
   * pathological cases.
   * @param n 
   * @returns 
   */
  visitFunctionCallExpr(n: FunctionCallExpr): ASTNode {
    return super.visitFunctionCallExpr.call(
      this.copyWithIsInCallee(),
      n
    );
  }

  // scope handling
  private copyWithNextScope(s: Scope) {
    if (!s) {
      throw new Error("Scope cannot be falsy");
    }
    return new SymbolResolver(this.errorCollector, s, this.isInCallee);
  }

  private copyWithIsInCallee() {
    return new SymbolResolver(this.errorCollector, this.currentScope, true);
  }

  visitBlockStmt(n: BlockStmt): ASTNode {
    return super.visitBlockStmt.call(
      this.copyWithNextScope((n as unknown as NodeWithScope).scope),
      n
    );
  }
  visitLetExpr(n: LetExpr): ASTNode {
    return super.visitLetExpr.call(
      this.copyWithNextScope((n as unknown as NodeWithScope).scope),
      n
    );
  }
  visitScadFile(n: ScadFile): ASTNode {
    return super.visitScadFile.call(
      this.copyWithNextScope((n as unknown as NodeWithScope).scope),
      n
    );
  }
  visitFunctionDeclarationStmt(n: FunctionDeclarationStmt): ASTNode {
    return super.visitFunctionDeclarationStmt.call(
      this.copyWithNextScope((n as unknown as NodeWithScope).scope),
      n
    );
  }
  visitModuleDeclarationStmt(n: ModuleDeclarationStmt): ASTNode {
    return super.visitModuleDeclarationStmt.call(
      this.copyWithNextScope((n as unknown as NodeWithScope).scope),
      n
    );
  }
  visitLcLetExpr(n: LcLetExpr): ASTNode {
    return super.visitLcLetExpr.call(
      this.copyWithNextScope((n as unknown as NodeWithScope).scope),
      n
    );
  }
  visitLcForExpr(n: LcForExpr): ASTNode {
    return super.visitLcForExpr.call(
      this.copyWithNextScope((n as unknown as NodeWithScope).scope),
      n
    );
  }
  visitLcForCExpr(n: LcForCExpr): ASTNode {
    return super.visitLcForCExpr.call(
      this.copyWithNextScope((n as unknown as NodeWithScope).scope),
      n
    );
  }
  visitAnonymousFunctionExpr(n: AnonymousFunctionExpr): ASTNode {
    return super.visitAnonymousFunctionExpr.call(
      this.copyWithNextScope((n as unknown as NodeWithScope).scope),
      n
    );
  }
}
