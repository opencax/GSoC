import CodeLocation from "../CodeLocation";
import LexingError from "./LexingError";

/**
 * @category Error
 */
export class UnterminatedMultilineCommentLexingError extends LexingError {
  constructor(pos: CodeLocation) {
    super(pos, `Unterminated multiline comment.`);
  }
}

/**
 * @category Error
 */
export class SingleCharacterNotAllowedLexingError extends LexingError {
  constructor(pos: CodeLocation, char: string) {
    super(pos, `Single '${char}' is not allowed.`);
  }
}

/**
 * @category Error
 */
export class UnexpectedCharacterLexingError extends LexingError {
  constructor(pos: CodeLocation, char: string) {
    super(pos, `Unexpected character '${char}'.`);
  }
}

/**
 * @category Error
 */
export class IllegalStringEscapeSequenceLexingError extends LexingError {
  constructor(pos: CodeLocation, sequence: string) {
    super(pos, `Illegal string escape sequence '${sequence}'.`);
  }
}

/**
 * @category Error
 */
export class UnterminatedStringLiteralLexingError extends LexingError {
  constructor(pos: CodeLocation) {
    super(pos, `Unterminated string literal.`);
  }
}

/**
 * @category Error
 */
export class TooManyDotsInNumberLiteralLexingError extends LexingError {
  constructor(pos: CodeLocation, lexeme: string) {
    super(
      pos,
      `Too many dots in number literal ${lexeme}. Number literals must contain zero or one dot.`
    );
  }
}

/**
 * @category Error
 */
export class TooManyEInNumberLiteralLexingError extends LexingError {
  constructor(pos: CodeLocation, lexeme: string) {
    super(
      pos,
      `Too many 'e' separators in number literal ${lexeme}. Number literals must contain zero or one 'e'.`
    );
  }
}

/**
 * @category Error
 */
export class InvalidNumberLiteralLexingError extends LexingError {
  constructor(pos: CodeLocation, lexeme: string) {
    super(pos, `Invalid number literal ${lexeme}.`);
  }
}

/**
 * @category Error
 */
export class UnterminatedFilenameLexingError extends LexingError {
  constructor(pos: CodeLocation) {
    super(pos, `Unterminated filename.`);
  }
}
