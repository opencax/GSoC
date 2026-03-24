import CompletionProvider from "./CompletionProvider";
import CompletionSymbol from "./CompletionSymbol";
import ASTNode from "../ast/ASTNode";
import CodeLocation from "../CodeLocation";
import keywords from "../keywords";
import CompletionType from "./CompletionType";

export default class KeywordsCompletionProvider implements CompletionProvider {
  textOnly = true;
  exclusive = false;
  shouldActivate(ast: ASTNode, loc: CodeLocation): boolean {
    return true;
  }
  async getSymbolsAtLocation(
    ast: ASTNode,
    loc: CodeLocation
  ): Promise<CompletionSymbol[]> {
    return Object.keys(keywords).map(
      (kwrd) => new CompletionSymbol(CompletionType.KEYWORD, kwrd)
    );
  }
}
