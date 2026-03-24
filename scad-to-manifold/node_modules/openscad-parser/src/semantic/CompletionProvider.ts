import ASTNode from "../ast/ASTNode";
import CodeLocation from "../CodeLocation";
import CompletionSymbol from "./CompletionSymbol";

export default interface CompletionProvider {
  /**
   * WHen set to true it means that this Completion source can work without an AST, for example when the file is syntactically invalid.
   */
  textOnly: boolean;

  /**
   * When set to true it means that no other completion source should activate when this one activates,
   */
  exclusive: boolean;

  shouldActivate(ast: ASTNode, loc: CodeLocation): boolean;
  getSymbolsAtLocation(
    ast: ASTNode,
    loc: CodeLocation
  ): Promise<CompletionSymbol[]>;
}
