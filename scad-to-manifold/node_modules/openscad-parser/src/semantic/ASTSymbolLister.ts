import AssignmentNode, { AssignmentNodeRole } from "../ast/AssignmentNode";
import ASTNode from "../ast/ASTNode";
import {
  FunctionDeclarationStmt,
  ModuleDeclarationStmt,
} from "../ast/statements";
import ASTAssembler from "../ASTAssembler";
import CodeSpan from "../CodeSpan";
import LiteralToken from "../LiteralToken";
import Token from "../Token";

export enum SymbolKind {
  MODULE,
  FUNCTION,
  VARIABLE,
}

/**
 * Generates a symbol tree for the outline view in vscode.
 * It uses AST assembler to walk down the tree and determine the full range of a symbol.
 */
export default class ASTSymbolLister<SymType> extends ASTAssembler<Token[]> {
  constructor(
    public makeSymbol: (
      name: string,
      kind: SymbolKind,
      fullRange: CodeSpan,
      nameRange: CodeSpan,
      children: SymType[]
    ) => SymType
  ) {
    super();
  }

  /**
   * Returns the node at pinpointLocation and populates bottomUpHierarchy.
   * @param n The AST (or AST fragment) to search through.
   */
  doList(n: ASTNode): SymType[] {
    n.accept(this);
    return this.symbolsAtCurrentDepth;
  }

  private symbolsAtCurrentDepth: SymType[] = [];

  protected processAssembledNode(
    t: (Token | (() => Token[]))[],
    self: ASTNode
  ): Token[] {
    let currKind: SymbolKind | null = null;
    let currName: LiteralToken<string> | null = null;
    if (self instanceof FunctionDeclarationStmt) {
      currKind = SymbolKind.FUNCTION;
      currName = self.tokens.name as LiteralToken<string>;
    } else if (self instanceof ModuleDeclarationStmt) {
      currKind = SymbolKind.MODULE;
      currName = self.tokens.name as LiteralToken<string>;
    } else if (
      self instanceof AssignmentNode &&
      self.role === AssignmentNodeRole.VARIABLE_DECLARATION
    ) {
      currKind = SymbolKind.VARIABLE;
      currName = self.tokens.name as LiteralToken<string>;
    }
    const newArr: Token[] = [];
    for (const m of t) {
      if (typeof m === "function") {
        newArr.push(...m());
      } else {
        newArr.push(m);
      }
    }
    if (currKind != null && currName != null) {
      let savedSymbols = this.symbolsAtCurrentDepth;
      this.symbolsAtCurrentDepth = [];

      const childrenSymbols = this.symbolsAtCurrentDepth;
      this.symbolsAtCurrentDepth = savedSymbols; // restore the symbols
      this.symbolsAtCurrentDepth.push(
        this.makeSymbol(
          currName.value,
          currKind,
          CodeSpan.combine(...newArr.map((t) => t.span)),
          currName.span,
          childrenSymbols
        )
      );
      return newArr;
    } else {
      return newArr;
    }
  }
}
