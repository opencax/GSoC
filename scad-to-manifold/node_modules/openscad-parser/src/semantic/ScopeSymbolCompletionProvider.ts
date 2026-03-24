import ASTNode from "../ast/ASTNode";
import ASTPinpointer from "../ASTPinpointer";
import CodeLocation from "../CodeLocation";
import CompletionProvider from "./CompletionProvider";
import CompletionSymbol from "./CompletionSymbol";
import CompletionType from "./CompletionType";
import NodeWithScope from "./NodeWithScope";
import Scope from "./Scope";

export default class ScopeSymbolCompletionProvider
  implements CompletionProvider
{
  textOnly = false;
  exclusive = false;
  shouldActivate(ast: ASTNode, loc: CodeLocation): boolean {
    return true;
  }
  async getSymbolsAtLocation(
    ast: ASTNode,
    loc: CodeLocation
  ): Promise<CompletionSymbol[]> {
    const pp = new ASTPinpointer(loc);
    pp.doPinpoint(ast);
    let symbols: CompletionSymbol[] = [];
    const scopesToShow: Scope[] = [];
    for (const h of pp.bottomUpHierarchy) {
      const hh: NodeWithScope = h as NodeWithScope;
      if ("scope" in hh && hh.scope instanceof Scope) {
        scopesToShow.push(hh.scope);
        scopesToShow.push(...hh.scope.siblingScopes);
      }
    }
    for (const scope of scopesToShow) {
      for (const v of scope.variables) {
        symbols.push(
          new CompletionSymbol(CompletionType.VARIABLE, v[1].name, v[1])
        );
      }
      for (const f of scope.functions) {
        symbols.push(
          new CompletionSymbol(CompletionType.FUNCTION, f[1].name, f[1])
        );
      }
      for (const m of scope.modules) {
        symbols.push(
          new CompletionSymbol(CompletionType.MODULE, m[1].name, m[1])
        );
      }
    }

    return symbols;
  }
}
