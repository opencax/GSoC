import ASTNode from "../ast/ASTNode";
import CodeLocation from "../CodeLocation";
import CompletionProvider from "./CompletionProvider";
import FilenameCompletionProvider from "./FilenameCompletionProvider";
import KeywordsCompletionProvider from "./KeywordsCompletionProvider";
import ScopeSymbolCompletionProvider from "./ScopeSymbolCompletionProvider";
import CompletionSymbol from "./CompletionSymbol";

export default class CompletionUtil {
  static completionProviders: CompletionProvider[] = [
    new FilenameCompletionProvider(),
    new KeywordsCompletionProvider(),
    new ScopeSymbolCompletionProvider(),
  ];
  static async getSymbolsAtLocation(
    ast: ASTNode,
    loc: CodeLocation
  ): Promise<CompletionSymbol[]> {
    let symbols: CompletionSymbol[] = [];
    for (const cp of this.completionProviders) {
      if (!cp.textOnly && !ast) continue;
      if (cp.shouldActivate(ast, loc)) {
        symbols = [...symbols, ...(await cp.getSymbolsAtLocation(ast, loc))];
        if (cp.exclusive) {
          break;
        }
      }
    }
    return symbols;
  }
}
