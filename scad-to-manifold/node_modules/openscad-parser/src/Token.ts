import CodeLocation from "./CodeLocation";
import CodeSpan from "./CodeSpan";
import { ExtraToken, NewLineExtraToken } from "./extraTokens";
import TokenType from "./TokenType";

export default class Token {
  /**
   * All the newlines and comments that appear before this token and should be preserved when printing the AST.
   */
  public extraTokens: ExtraToken[] = [];

  /**
   * Start of this token, including all the whitespace before it.
   * 
   * Set externally in the lexer.
   */
  public startWithWhitespace!: CodeLocation;

  constructor(
    public type: TokenType,
    public span: CodeSpan,
    public lexeme: string
  ) {}

  toString(): string {
    return `token ${TokenType[this.type]} ${this.span.toString()}`;
  }

  hasNewlineInExtraTokens() {
    return this.extraTokens.some((t) => t instanceof NewLineExtraToken);
  }
}
