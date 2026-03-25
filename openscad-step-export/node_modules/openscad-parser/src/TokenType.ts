enum TokenType {
  Error,
  /**
   * Eot is always pushed as the last token and used by the parser to detect the endo of the file.
   */
  Eot,
  /**
   * The module keyword.
   */
  Module,
  /**
   * The function keyword.
   */
  Function,
  /**
   * The if keyword.
   */
  If,
  /**
   * The else keyword.
   */
  Else,
  /**
   * The for keyword.
   */
  For,
  /**
   * The let keyword.
   */
  Let,
  /**
   * The assert keyword.
   */
  Assert,
  /**
   * The echo keyword.
   */
  Echo,
  /**
   * The each keyword.
   */
  Each,
  /**
   * The use keyword.
   */
  Use,
  /**
   * An identifier, represents a function, module or variable name
   */
  Identifier,
  /**
   * A string literal (e.g. quoted color names)
   */
  StringLiteral,
  /**
   * A number literal.
   */
  NumberLiteral,

  /**
   * The true keyword.
   */
  True,
  /**
   * The false keyword.
   */
  False,
  /**
   * The undef keyword.
   */
  Undef,

  /**
   * !
   */
  Bang,
  /**
   * <
   */
  Less,
  /**
   * >
   */
  Greater,
  /**
   * <=
   */
  LessEqual,
  /**
   * >=
   */
  GreaterEqual,
  /**
   * ==
   */
  EqualEqual,
  /**
   * =
   */
  Equal,
  /**
   * !=
   */
  BangEqual,
  /**
   * &&
   */
  AND,
  /**
   * ||
   */
  OR,

  Plus,
  Minus,
  Star,
  Slash,
  Percent,
  Caret,
  
  /**
   * Left parenthesis: (
   */
  LeftParen,
  /**
   * Right parenthesis: )
   */
  RightParen,
  /**
   * Left bracket: [
   */
  LeftBracket,
  /**
   * Right bracket: ]
   */
  RightBracket,
  /**
   * Left brace: {
   */
  LeftBrace,
  /**
   * Right brace: }
   */
  RightBrace,
  /**
   * ;
   */
  Semicolon,
  /**
   * ,
   */
  Comma,
  /**
   * .
   */
  Dot,

  /**
   * The ? symbol
   */
  QuestionMark,

  /**
   * The : symbol
   */
  Colon,

  /**
   * The '#' symbol
   */
  Hash,

  /**
   * The filename of an imported file e.g. '<file.scad>'
   */
  FilenameInChevrons,

  /**
   * The include keyword.
   */
  Include,
}

export default TokenType;
