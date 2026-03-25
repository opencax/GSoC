import CodeLocation from "../CodeLocation";
import friendlyTokenNames from "../friendlyTokenNames";
import TokenType from "../TokenType";
import ParsingError from "./ParsingError";

/**
 * @category Error
 */
export class UnterminatedUseStatementParsingError extends ParsingError {
  constructor(pos: CodeLocation) {
    super(pos, `Unterminated 'use' statement.`);
  }
}

/**
 * @category Error
 */
export class UnexpectedTokenParsingError extends ParsingError {
  constructor(pos: CodeLocation, tt: TokenType, extraMsg?: string) {
    if (extraMsg) {
      super(pos, `Unexpected token ${friendlyTokenNames[tt]}${extraMsg}`);
    } else {
      super(pos, `Unexpected token ${friendlyTokenNames[tt]}.`);
    }
  }
}

/**
 * @category Error
 */
export class UnexpectedTokenWhenStatementParsingError extends UnexpectedTokenParsingError {
  constructor(pos: CodeLocation, tt: TokenType) {
    super(pos, tt, `, expected statement.`);
  }
}

/**
 * @category Error
 */
export class UnexpectedTokenAfterIdentifierInStatementParsingError extends UnexpectedTokenParsingError {
  constructor(pos: CodeLocation, tt: TokenType) {
    super(
      pos,
      tt,
      `, expected ${friendlyTokenNames[TokenType.LeftParen]} or ${
        friendlyTokenNames[TokenType.Equal]
      } after identifier in statement.`
    );
  }
}

/**
 * @category Error
 */
export class UnexpectedEndOfFileBeforeModuleInstantiationParsingError extends ParsingError {
  constructor(pos: CodeLocation) {
    super(pos, `Unexpected end of file before module instantiation.`);
  }
}

/**
 * @category Error
 */
export class UnterminatedParametersListParsingError extends ParsingError {
  constructor(pos: CodeLocation) {
    super(pos, `Unterminated parameters list.`);
  }
}

/**
 * @category Error
 */
export class UnexpectedTokenInNamedArgumentsListParsingError extends UnexpectedTokenParsingError {
  constructor(pos: CodeLocation, tt: TokenType) {
    super(pos, tt, ` in named arguments list.`);
  }
}

/**
 * @category Error
 */
export class UnterminatedForLoopParamsParsingError extends ParsingError {
  constructor(pos: CodeLocation) {
    super(pos, `Unterminated for loop params.`);
  }
}

/**
 * @category Error
 */
export class UnexpectedTokenInForLoopParamsListParsingError extends UnexpectedTokenParsingError {
  constructor(pos: CodeLocation, tt: TokenType) {
    super(pos, tt, ` in for loop params list.`);
  }
}

/**
 * @category Error
 */
export class FailedToMatchPrimaryExpressionParsingError extends ParsingError {
  constructor(pos: CodeLocation) {
    super(pos, `Failed to match primary expression.`);
  }
}

/**
 * @category Error
 */
export class UnterminatedVectorExpressionParsingError extends ParsingError {
  constructor(pos: CodeLocation) {
    super(pos, `Unterminated vector literal.`);
  }
}

/**
 * @category Error
 */
export class ConsumptionParsingError extends UnexpectedTokenParsingError {
  constructor(
    pos: CodeLocation,
    public real: TokenType,
    public expected: TokenType,
    where: string
  ) {
    super(pos, real, `, expected ${friendlyTokenNames[expected]} ${where}.`);
  }
}

/**
 * @category Error
 */
export class UnexpectedCommentBeforeUseChevronParsingError extends ParsingError {
  constructor(pos: CodeLocation) {
    super(pos, `Comments are illegal before '<' in the use statement.`);
  }
}

/**
 * @category Error
 */
export class UnexpectedUseStatementParsingError extends ParsingError {
  constructor(pos: CodeLocation) {
    super(
      pos,
      `Use ('use <...>') statements are only allowed at the root scope of the file, not inside of blocks.`
    );
  }
}

/**
 * @category Error
 */
export class UnexpectedIncludeStatementParsingError extends ParsingError {
  constructor(pos: CodeLocation) {
    super(
      pos,
      `Include ('include <...>') statements are only allowed at the root scope of the file, not inside of blocks.`
    );
  }
}
