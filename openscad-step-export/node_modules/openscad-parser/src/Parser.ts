import AssignmentNode, { AssignmentNodeRole } from "./ast/AssignmentNode";
import ErrorNode from "./ast/ErrorNode";
import {
  AnonymousFunctionExpr,
  ArrayLookupExpr,
  AssertExpr,
  BinaryOpExpr,
  EchoExpr,
  Expression,
  FunctionCallExpr,
  GroupingExpr,
  LcEachExpr,
  LcForCExpr,
  LcForExpr,
  LcIfExpr,
  LcLetExpr,
  LetExpr,
  ListComprehensionExpression,
  LiteralExpr,
  LookupExpr,
  MemberLookupExpr,
  RangeExpr,
  TernaryExpr,
  UnaryOpExpr,
  VectorExpr,
} from "./ast/expressions";
import ScadFile from "./ast/ScadFile";
import {
  BlockStmt,
  FunctionDeclarationStmt,
  IfElseStatement,
  IncludeStmt,
  ModuleDeclarationStmt,
  ModuleInstantiationStmt,
  NoopStmt,
  Statement,
  UseStmt,
} from "./ast/statements";
import CodeFile from "./CodeFile";
import CodeLocation from "./CodeLocation";
import { IntrinsicRenameAnnotation } from "./comments/annotations";
import DocComment from "./comments/DocComment";
import ErrorCollector from "./ErrorCollector";
import ParsingError from "./errors/ParsingError";
import {
  ConsumptionParsingError,
  FailedToMatchPrimaryExpressionParsingError,
  UnexpectedEndOfFileBeforeModuleInstantiationParsingError,
  UnexpectedIncludeStatementParsingError,
  UnexpectedTokenAfterIdentifierInStatementParsingError,
  UnexpectedTokenInForLoopParamsListParsingError,
  UnexpectedTokenInNamedArgumentsListParsingError,
  UnexpectedTokenWhenStatementParsingError,
  UnexpectedUseStatementParsingError,
  UnterminatedForLoopParamsParsingError,
  UnterminatedParametersListParsingError,
  UnterminatedVectorExpressionParsingError,
} from "./errors/parsingErrors";
import keywords from "./keywords";
import LiteralToken from "./LiteralToken";
import Token from "./Token";
import TokenType from "./TokenType";

const moduleInstantiationTagTokens = [
  TokenType.Bang,
  TokenType.Hash,
  TokenType.Percent,
  TokenType.Star,
];

const keywordModuleNames = [
  TokenType.For,
  TokenType.Let,
  TokenType.Assert,
  TokenType.Echo,
  TokenType.Each,
  TokenType.If,
];

const listComprehensionElementKeywords = [
  TokenType.For,
  TokenType.Let,
  TokenType.Each,
  TokenType.If,
];

export default class Parser {
  protected currentToken = 0;

  /**
   * The code file being parsed.
   */
  public code: CodeFile;

  /**
   * The tokens being parsed. They have to be provided from the lexer
   * @see [[Lexer.scan]]
   */
  public tokens: Token[];

  /**
   * The ErrorCollector for this parser. All the errors encountered by the parser will be put there, since it does not throw on non-fatal errors.
   */
  public errorCollector: ErrorCollector;

  constructor(code: CodeFile, tokens: Token[], errorCollector: ErrorCollector) {
    this.code = code;
    this.tokens = tokens;
    this.errorCollector = errorCollector;
  }

  /**
   * Attempts to parse a file and return the AST with the ScadFile as a root node.
   * @throws ParsingError
   */
  parse(): ScadFile {
    const statements: Statement[] = [];
    while (!this.isAtEnd()) {
      statements.push(this.statement(true));
    }
    const eot = this.peek();
    return new ScadFile(statements, { eot });
  }

  protected synchronize(e: ParsingError) {
    if (e instanceof ConsumptionParsingError) {
      if (e.expected === TokenType.Semicolon) {
        if (this.peek().hasNewlineInExtraTokens()) {
          return;
        }
      }
    }
    if (e instanceof FailedToMatchPrimaryExpressionParsingError) {
      if (this.peek().hasNewlineInExtraTokens()) {
        // assume that when there is a newline we want to parse the next statement
        return;
      }
    }
    if (e instanceof UnexpectedTokenAfterIdentifierInStatementParsingError) {
      if (this.peek().hasNewlineInExtraTokens()) {
        return;
      }
    }
    this.advance();
    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.Semicolon) return;
      switch (this.peek().type) {
        case TokenType.Module:
        case TokenType.Function:
        case TokenType.If:
        case TokenType.For:
        case TokenType.Echo:
        case TokenType.Assert:
        case TokenType.Let:
          return;
      }
      this.advance();
    }
  }

  /**
   * Parses a statement, including `use` and `include` when isAtRoot is set to true.
   * @param isAtRoot whther we are parsing a statement in the root of the file, set to false inside blocks or modules.
   */
  protected statement(isAtRoot = false) {
    const syncStartToken = this.currentToken;
    const syncStartLocation = this.getLocation();
    try {
      if (this.matchToken(TokenType.Use)) {
        if (!isAtRoot) {
          throw this.errorCollector.reportError(
            new UnexpectedUseStatementParsingError(this.getLocation())
          );
        }
        const useKeyword = this.previous();
        const filenameToken: LiteralToken<string> = this.consume(
          TokenType.FilenameInChevrons,
          "after 'use' keyword"
        ) as LiteralToken<string>;

        return new UseStmt(filenameToken.value, {
          useKeyword,
          filename: filenameToken,
        });
      }
      if (this.matchToken(TokenType.Include)) {
        if (!isAtRoot) {
          throw this.errorCollector.reportError(
            new UnexpectedIncludeStatementParsingError(this.getLocation())
          );
        }
        const includeKeyword = this.previous();
        const filenameToken: LiteralToken<string> = this.consume(
          TokenType.FilenameInChevrons,
          "after 'include' keyword"
        ) as LiteralToken<string>;

        return new IncludeStmt(filenameToken.value, {
          includeKeyword,
          filename: filenameToken,
        });
      }
      if (this.matchToken(TokenType.Semicolon)) {
        const semicolon = this.previous();
        return new NoopStmt({ semicolon });
      }
      if (this.matchToken(TokenType.LeftBrace)) {
        return this.blockStatement();
      }
      if (this.matchToken(TokenType.Module)) {
        return this.moduleDeclarationStatement();
      }
      if (this.matchToken(TokenType.Function)) {
        return this.functionDeclarationStatement();
      }
      const assignmentOrInst = this.matchAssignmentOrModuleInstantation();
      if (assignmentOrInst) {
        return assignmentOrInst;
      }
      throw this.errorCollector.reportError(
        new UnexpectedTokenWhenStatementParsingError(
          this.getLocation(),
          this.peek().type
        )
      );
    } catch (e) {
      if (e instanceof ParsingError) {
        this.synchronize(e);
        return new ErrorNode({
          tokens: this.tokens.slice(syncStartToken, this.currentToken),
        });
      } else {
        throw e;
      }
    }
  }
  protected matchAssignmentOrModuleInstantation() {
    // identifiers can mean either an instantiation is incoming or an assignment
    if (this.matchToken(TokenType.Identifier)) {
      if (this.peek().type === TokenType.Equal) {
        return this.assignmentStatement();
      }
      if (this.peek().type === TokenType.LeftParen) {
        return this.moduleInstantiationStatement();
      }
      throw this.errorCollector.reportError(
        new UnexpectedTokenAfterIdentifierInStatementParsingError(
          this.getLocation(),
          this.peek().type
        )
      );
    }
    if (
      this.matchToken(...moduleInstantiationTagTokens, ...keywordModuleNames)
    ) {
      return this.moduleInstantiationStatement();
    }
    return null;
  }
  protected blockStatement() {
    const firstBrace = this.previous();
    const startLocation = this.getLocation();
    const innerStatements: Statement[] = [];
    while (!this.checkToken(TokenType.RightBrace) && !this.isAtEnd()) {
      innerStatements.push(this.statement());
    }
    this.consume(TokenType.RightBrace, "after block statement");
    const secondBrace = this.previous();
    return new BlockStmt(innerStatements, {
      firstBrace,
      secondBrace,
    });
  }
  protected moduleDeclarationStatement(): ModuleDeclarationStmt {
    const moduleKeyword = this.previous();
    const nameToken = this.consume(
      TokenType.Identifier,
      "after 'module' keyword"
    );
    this.consume(TokenType.LeftParen, "after module name");
    const firstParen = this.previous();
    const args: AssignmentNode[] = this.args();
    const secondParen = this.previous();
    const body = this.statement();
    const doc = DocComment.fromExtraTokens(moduleKeyword.extraTokens);
    let name = (nameToken as LiteralToken<string>).value;

    // handle renaming of the symbol via annotations in documentation comments
    // used by the prelude
    const renameAnnotation = doc.annotations.find(
      (a) => a instanceof IntrinsicRenameAnnotation
    ) as IntrinsicRenameAnnotation;
    if (renameAnnotation) {
      name = renameAnnotation.newName;
    }
    return new ModuleDeclarationStmt(
      name,
      args,
      body,
      {
        moduleKeyword,
        name: nameToken,
        firstParen,
        secondParen,
      },
      doc
    );
  }
  protected functionDeclarationStatement(): FunctionDeclarationStmt {
    const functionKeyword = this.previous();
    const nameToken = this.consume(
      TokenType.Identifier,
      "after 'function' keyword"
    );
    this.consume(TokenType.LeftParen, "after function name");
    const firstParen = this.previous();
    const args = this.args();
    const secondParen = this.previous();
    this.consume(TokenType.Equal, "after function parameters");
    const equals = this.previous();
    const body = this.expression();
    this.consume(TokenType.Semicolon, "after function declaration");
    const semicolon = this.previous();
    return new FunctionDeclarationStmt(
      (nameToken as LiteralToken<string>).value,
      args,
      body,
      {
        functionKeyword,
        equals,
        firstParen,
        name: nameToken,
        secondParen,
        semicolon,
      },
      DocComment.fromExtraTokens(functionKeyword.extraTokens)
    );
  }

  protected assignmentStatement() {
    const pos = this.getLocation();
    const name = this.previous() as LiteralToken<string>;
    this.consume(TokenType.Equal, "after assignment name");
    const equals = this.previous();
    const expr = this.expression();
    this.consume(TokenType.Semicolon, "after assignment statement");
    const semicolon = this.previous();
    const node = new AssignmentNode(
      name.value,
      expr,
      AssignmentNodeRole.VARIABLE_DECLARATION,
      {
        name,
        equals,
        trailingCommas: null,
        semicolon,
      }
    );
    node.docComment = DocComment.fromExtraTokens(name.extraTokens);
    return node;
  }
  protected moduleInstantiationStatement():
    | ModuleInstantiationStmt
    | IfElseStatement {
    if (this.isAtEnd()) {
      throw this.errorCollector.reportError(
        new UnexpectedEndOfFileBeforeModuleInstantiationParsingError(
          this.getLocation()
        )
      );
    }
    if (this.previous().type === TokenType.Bang) {
      const tagToken = this.previous();
      this.advance();
      const mod = this.moduleInstantiationStatement();
      mod.tagRoot = true;
      mod.tokens.modifiersInOrder.push(tagToken);
      return mod;
    }
    if (this.previous().type === TokenType.Hash) {
      const tagToken = this.previous();
      this.advance();
      const mod = this.moduleInstantiationStatement();
      mod.tagHighlight = true;
      mod.tokens.modifiersInOrder.push(tagToken);
      return mod;
    }
    if (this.previous().type === TokenType.Percent) {
      const tagToken = this.previous();
      this.advance();
      const mod = this.moduleInstantiationStatement();
      mod.tagBackground = true;
      mod.tokens.modifiersInOrder.push(tagToken);
      return mod;
    }
    if (this.previous().type === TokenType.Star) {
      const tagToken = this.previous();
      this.advance();
      const mod = this.moduleInstantiationStatement();
      mod.tagDisabled = true;
      mod.tokens.modifiersInOrder.push(tagToken);
      return mod;
    }
    const mod = this.singleModuleInstantiation();
    if (!(mod instanceof IfElseStatement)) {
      mod.child = this.statement();
    }
    return mod;
  }
  protected ifElseStatement(): IfElseStatement {
    const ifKeyword = this.previous();
    this.consume(TokenType.LeftParen, "after the if keyword");
    const firstParen = this.previous();
    const cond = this.expression();
    this.consume(TokenType.RightParen, "after the if condition");
    const secondParen = this.previous();
    const thenBranch = this.statement();
    let elseBranch: Statement | null = null;
    let elseKeyword = null;
    if (this.matchToken(TokenType.Else)) {
      elseKeyword = this.previous();
      elseBranch = this.statement();
    }
    return new IfElseStatement(cond, thenBranch, elseBranch, {
      ifKeyword,
      elseKeyword,
      firstParen,
      secondParen,
      modifiersInOrder: [],
    });
  }
  protected singleModuleInstantiation() {
    const prev = this.previous();
    if (prev.type === TokenType.If) {
      return this.ifElseStatement();
    }
    this.consume(TokenType.LeftParen, "after module instantation");
    const firstParen = this.previous();
    let name!: string;
    if (prev instanceof LiteralToken) {
      name = prev.value as string;
    } else {
      for (const keywordName of Object.keys(keywords)) {
        if (keywords[keywordName] === prev.type) {
          name = keywordName;
          break;
        }
      }
    }
    let isForLoop = name === "for" || name === "intersection_for";
    const args = this.args(true, isForLoop ? AssignmentNodeRole.VARIABLE_DECLARATION : null);
    const secondParen = this.previous();
    return new ModuleInstantiationStmt(name, args, null, {
      firstParen,
      name: prev,
      secondParen,
      modifiersInOrder: [],
    });
  }
  /**
   * Parses an argument list including the finishing paren. Can handle trailing and extra commas as well as an empty arguments list.
   * The initial paren must be consumed.
   * @param allowPositional Set to true when in call mode, positional arguments will be allowed.
   */
  protected args(
    allowPositional = false,
    forceType: AssignmentNodeRole | null = null
  ): AssignmentNode[] {
    this.consumeUselessCommas();
    const args: AssignmentNode[] = [];
    if (this.matchToken(TokenType.RightParen)) {
      return args;
    }
    while (true) {
      if (this.isAtEnd()) {
        break;
      }
      if (!allowPositional && this.peek().type !== TokenType.Identifier) {
        // error out when we encounter a positional argument when it is not allowed
        break;
      }
      let value: Expression | null = null;
      let name: string;
      let nameToken: Token | null = null;
      let equals: Token | null = null;
      if (!allowPositional || this.peekNext().type === TokenType.Equal) {
        // this is a named parameter
        name = (this.advance() as LiteralToken<string>).value;
        nameToken = this.previous();
        // a value is provided for this param
        if (this.matchToken(TokenType.Equal)) {
          equals = this.previous();
          value = this.expression();
        }
      } else {
        name = "";
        value = this.expression();
        // this is a positional paramater
      }

      const arg = new AssignmentNode(
        name,
        value,
        forceType == null
          ? allowPositional
            ? AssignmentNodeRole.ARGUMENT_ASSIGNMENT
            : AssignmentNodeRole.ARGUMENT_DECLARATION
          : forceType,
        {
          name: nameToken,
          equals,
          semicolon: null,
          trailingCommas: [],
        }
      );
      args.push(arg);

      if (this.matchToken(TokenType.Comma)) {
        arg.tokens.trailingCommas!.push(this.previous());
        this.consumeUselessCommas(arg.tokens.trailingCommas!);
        if (this.matchToken(TokenType.RightParen)) {
          return args;
        }
        continue;
      }
      this.consumeUselessCommas(arg.tokens.trailingCommas!);
      // end of named arguments
      if (this.matchToken(TokenType.RightParen)) {
        return args;
      }
    }
    if (this.isAtEnd()) {
      throw this.errorCollector.reportError(
        new UnterminatedParametersListParsingError(this.getLocation())
      );
    }
    throw this.errorCollector.reportError(
      new UnexpectedTokenInNamedArgumentsListParsingError(
        this.getLocation(),
        this.advance().type
      )
    );
  }
  /**
   * Parses arguments from the 'for' loop comprehension.
   * The initial paren must be consumed. Stops on semicolon or right paren, but does not consume them.
   */
  protected forComprehensionArgs(): AssignmentNode[] {
    this.consumeUselessCommas();
    const args: AssignmentNode[] = [];
    if (
      this.checkToken(TokenType.RightParen) ||
      this.checkToken(TokenType.Semicolon)
    ) {
      return args;
    }
    while (true) {
      if (this.isAtEnd()) {
        break;
      }

      let arg;

      if (
        this.peek().type === TokenType.Identifier &&
        this.peekNext().type === TokenType.Equal
      ) {
        // Named for loop variable
        const name = (this.advance() as LiteralToken<string>).value;
        const nameToken = this.previous();
        // a value is provided for this param
        this.consume(
          TokenType.Equal,
          "after variable name in the 'for' list comprehension"
        );
        const equals = this.previous();
        const value = this.expression();

        arg = new AssignmentNode(
          name,
          value,
          AssignmentNodeRole.VARIABLE_DECLARATION,
          {
            equals,
            semicolon: null,
            name: nameToken,
            trailingCommas: [],
          }
        );
        args.push(arg);
      } else {
        // This condition handles this a pathological case where the for list comprehension can
        // have a single expression without any variable declaration.
        // This can be used to repeat the same element a number of times.
        // See: https://github.com/alufers/openscad-parser/issues/27
        const value = this.expression();
        arg = new AssignmentNode(
          "",
          value,
          AssignmentNodeRole.ARGUMENT_ASSIGNMENT,
          {
            equals: null,
            semicolon: null,
            name: null,
            trailingCommas: [],
          }
        );
        args.push(arg);
      }

      if (this.matchToken(TokenType.Comma)) {
        arg.tokens.trailingCommas!.push(this.previous());
        this.consumeUselessCommas(arg.tokens.trailingCommas!);
        if (
          this.checkToken(TokenType.RightParen) ||
          this.checkToken(TokenType.Semicolon)
        ) {
          return args;
        }
        continue;
      }
      this.consumeUselessCommas(arg.tokens.trailingCommas!);
      if (
        this.checkToken(TokenType.RightParen) ||
        this.checkToken(TokenType.Semicolon)
      ) {
        return args;
      }
    }
    if (this.isAtEnd()) {
      throw this.errorCollector.reportError(
        new UnterminatedForLoopParamsParsingError(this.getLocation())
      );
    }
    throw this.errorCollector.reportError(
      new UnexpectedTokenInForLoopParamsListParsingError(
        this.getLocation(),
        this.advance().type
      )
    );
  }
  /**
   * Consumes redundant commas and returns true if it consumed any.
   *
   * You can also pass an array of tokens to which all the comma tokens will be pushed.
   */
  protected consumeUselessCommas(trailingArr?: Token[]) {
    let ret = false;
    while (this.matchToken(TokenType.Comma) && !this.isAtEnd()) {
      if (trailingArr) {
        trailingArr.push(this.previous());
      }
      ret = true;
    }
    return ret;
  }
  protected expression(): Expression {
    return this.ternary();
  }
  /**
   * Parses the ternary '? :' expression
   */
  protected ternary() {
    let expr = this.logicalOr();
    while (this.matchToken(TokenType.QuestionMark)) {
      const questionMark = this.previous();
      const thenBranch = this.ternary();
      this.consume(TokenType.Colon, "between ternary expression branches");
      const colon = this.previous();
      const elseBranch = this.ternary();
      expr = new TernaryExpr(expr, thenBranch, elseBranch, {
        questionMark,
        colon,
      });
    }
    return expr;
  }
  /**
   * Parses the '||' operators
   */
  protected logicalOr() {
    let expr = this.logicalAnd();
    while (this.matchToken(TokenType.OR)) {
      const operator = this.previous();
      const right = this.logicalAnd();
      expr = new BinaryOpExpr(expr, operator.type, right, {
        operator,
      });
    }
    return expr;
  }
  /**
   * Parses the '&&' operators
   */
  protected logicalAnd() {
    let expr = this.equality();
    while (this.matchToken(TokenType.AND)) {
      const operator = this.previous();
      const right = this.equality();
      expr = new BinaryOpExpr(expr, operator.type, right, {
        operator,
      });
    }
    return expr;
  }
  /**
   * Parses the '==' and '!=' operators.
   */
  protected equality(): Expression {
    let expr = this.comparsion();
    while (this.matchToken(TokenType.EqualEqual, TokenType.BangEqual)) {
      const operator = this.previous();
      const right = this.comparsion();
      expr = new BinaryOpExpr(expr, operator.type, right, {
        operator,
      });
    }
    return expr;
  }
  protected comparsion(): Expression {
    let expr = this.addition();
    while (
      this.matchToken(
        TokenType.Less,
        TokenType.LessEqual,
        TokenType.Greater,
        TokenType.GreaterEqual
      )
    ) {
      const operator = this.previous();
      const right = this.addition();
      expr = new BinaryOpExpr(expr, operator.type, right, {
        operator,
      });
    }
    return expr;
  }
  protected addition(): Expression {
    let expr = this.multiplication();
    while (this.matchToken(TokenType.Plus, TokenType.Minus)) {
      const operator = this.previous();
      const right = this.multiplication();
      expr = new BinaryOpExpr(expr, operator.type, right, {
        operator,
      });
    }
    return expr;
  }
  protected multiplication(): Expression {
    let expr = this.exponentiation();
    while (
      this.matchToken(TokenType.Star, TokenType.Slash, TokenType.Percent)
    ) {
      const operator = this.previous();
      const right = this.exponentiation();
      expr = new BinaryOpExpr(expr, operator.type, right, {
        operator,
      });
    }
    return expr;
  }

  /**
   * Parses b ^ e.
   */
  protected exponentiation(): Expression {
    let expr = this.unary();
    while (this.matchToken(TokenType.Caret)) {
      const operator = this.previous();
      const right = this.unary();
      expr = new BinaryOpExpr(expr, operator.type, right, {
        operator,
      });
    }
    return expr;
  }

  /**
   * Parses +expr, -expr and !expr.
   */
  protected unary(): Expression {
    if (this.matchToken(TokenType.Plus, TokenType.Minus, TokenType.Bang)) {
      const operator = this.previous();
      const right = this.unary();
      return new UnaryOpExpr(operator.type, right, {
        operator,
      });
    }
    return this.memberLookupOrArrayLookup();
  }
  protected memberLookupOrArrayLookup() {
    let expr = this.primary();
    while (true) {
      if (this.matchToken(TokenType.Dot)) {
        const dot = this.previous();
        const name = this.consume(
          TokenType.Identifier,
          "after '.'"
        ) as LiteralToken<string>;
        expr = new MemberLookupExpr(expr, name.value, {
          dot,
          memberName: name,
        });
      } else if (this.matchToken(TokenType.LeftBracket)) {
        const firstBracket = this.previous();
        const index = this.expression();
        this.consume(TokenType.RightBracket, "after array index expression");
        const secondBracket = this.previous();
        expr = new ArrayLookupExpr(expr, index, {
          firstBracket,
          secondBracket,
        });
      } else if (this.matchToken(TokenType.LeftParen)) {
        expr = this.finishCall(expr);
      } else {
        break;
      }
    }
    return expr;
  }
  protected finishCall(callee: Expression): Expression {
    const firstParen = this.previous();
    const args = this.args(true);
    const secondParen = this.previous();
    return new FunctionCallExpr(callee, args, {
      firstParen,
      secondParen,
    });
  }
  protected primary(): Expression {
    if (this.matchToken(TokenType.True)) {
      return new LiteralExpr(true, {
        literalToken: this.previous() as LiteralToken<any>,
      });
    }
    if (this.matchToken(TokenType.False)) {
      return new LiteralExpr(false, {
        literalToken: this.previous() as LiteralToken<any>,
      });
    }
    if (this.matchToken(TokenType.Undef)) {
      return new LiteralExpr<null>(null, {
        literalToken: this.previous() as LiteralToken<any>,
      });
    }
    if (this.matchToken(TokenType.NumberLiteral)) {
      return new LiteralExpr((this.previous() as LiteralToken<number>).value, {
        literalToken: this.previous() as LiteralToken<any>,
      });
    }
    if (this.matchToken(TokenType.StringLiteral)) {
      return new LiteralExpr((this.previous() as LiteralToken<string>).value, {
        literalToken: this.previous() as LiteralToken<any>,
      });
    }
    if (this.matchToken(TokenType.Identifier)) {
      const tok = this.previous() as LiteralToken<string>;
      return new LookupExpr(tok.value, {
        identifier: tok,
      });
    }
    if (this.matchToken(TokenType.Assert)) {
      const keyword = this.previous();
      this.consume(TokenType.LeftParen, "after call expression");
      const firstParen = this.previous();
      const vars = this.args(true);
      const secondParen = this.previous();
      const innerExpr = this.expression();
      return new AssertExpr(vars, innerExpr, {
        firstParen,
        secondParen,
        name: keyword,
      });
    }
    if (this.matchToken(TokenType.Let)) {
      const keyword = this.previous();
      this.consume(TokenType.LeftParen, `after call expression`);
      const firstParen = this.previous();
      const vars = this.args(true);
      const secondParen = this.previous();
      const innerExpr = this.expression();
      return new LetExpr(vars, innerExpr, {
        firstParen,
        secondParen,
        name: keyword,
      });
    }
    if (this.matchToken(TokenType.Echo)) {
      const keyword = this.previous();
      this.consume(TokenType.LeftParen, `after call expression`);
      const firstParen = this.previous();
      const vars = this.args(true);
      const secondParen = this.previous();
      const innerExpr = this.expression();
      return new EchoExpr(vars, innerExpr, {
        firstParen,
        secondParen,
        name: keyword,
      });
    }
    if (this.matchToken(TokenType.Function)) {
      return this.anonymousFunction();
    }
    if (this.matchToken(TokenType.LeftParen)) {
      const firstParen = this.previous();
      const expr = this.expression();
      this.consume(TokenType.RightParen, "after grouping expression");
      const secondParen = this.previous();
      return new GroupingExpr(expr, {
        firstParen,
        secondParen,
      });
    }
    if (this.matchToken(TokenType.LeftBracket)) {
      return this.bracketInsides();
    }
    throw this.errorCollector.reportError(
      new FailedToMatchPrimaryExpressionParsingError(this.previous().span.start)
    );
  }
  /**
   * Handles the parsing of vector literals and range literals.
   */
  protected bracketInsides(): Expression {
    const startBracket = this.previous();
    // the openscad bison parser has a weird thing where it allows optional commas only if the brackets represent an empty vector
    // Good: [,,,,,,]
    // Bad: [,,,,10]
    // Bad [,,,,,10: 20 : 20]
    const uselessCommaTokens: Token[] = [];
    if (this.consumeUselessCommas(uselessCommaTokens)) {
      this.consume(
        TokenType.RightBracket,
        "after leading commas in a vector literal"
      );
      const secondBracket = this.previous();
      return new VectorExpr([], {
        firstBracket: startBracket,
        secondBracket,
        commas: uselessCommaTokens,
      });
    }

    if (this.matchToken(TokenType.RightBracket)) {
      const secondBracket = this.previous();
      return new VectorExpr([], {
        firstBracket: startBracket,
        commas: [],
        secondBracket,
      });
    }

    const first = this.listComprehensionElementsOrExpr();
    // check if we are parsing a range
    if (
      !(first instanceof ListComprehensionExpression) &&
      this.matchToken(TokenType.Colon)
    ) {
      const firstColon = this.previous();
      let secondRangeExpr = this.expression();
      let thirdRangeExpr = null;
      let secondColon = null;
      if (this.matchToken(TokenType.Colon)) {
        secondColon = this.previous();
        thirdRangeExpr = this.expression();
      }
      this.consume(
        TokenType.RightBracket,
        "after expression in a range literal"
      );
      const secondBracket = this.previous();
      if (thirdRangeExpr) {
        return new RangeExpr(first, secondRangeExpr, thirdRangeExpr, {
          firstBracket: startBracket,
          firstColon,
          secondColon,
          secondBracket,
        });
      } else {
        return new RangeExpr(first, null, secondRangeExpr, {
          firstBracket: startBracket,
          firstColon,
          secondColon,
          secondBracket,
        });
      }
    }

    // we are parsing a vector expression
    const vectorLiteral = new VectorExpr([first], {
      commas: [],
      firstBracket: startBracket,
      secondBracket: null as unknown as any, // we will add the second bracket later in the parsing, so we allow to have a null here
    });
    if (this.matchToken(TokenType.Comma)) {
      vectorLiteral.tokens.commas.push(this.previous()); // add the comma to the tokens list, because we matchedIt
      this.consumeUselessCommas(vectorLiteral.tokens.commas);
      if (this.matchToken(TokenType.RightBracket)) {
        vectorLiteral.tokens.secondBracket = this.previous();
        return vectorLiteral;
      }
      while (true) {
        if (this.isAtEnd()) {
          throw this.errorCollector.reportError(
            new UnterminatedVectorExpressionParsingError(this.getLocation())
          );
        }

        vectorLiteral.children.push(this.listComprehensionElementsOrExpr());
        if (this.matchToken(TokenType.RightBracket)) {
          vectorLiteral.tokens.secondBracket = this.previous();
          break;
        }
        this.consume(TokenType.Comma, "after vector literal element");
        vectorLiteral.tokens.commas.push(this.previous()); // we musn't forget about adding the comma to the array since it may contain comments
        this.consumeUselessCommas(vectorLiteral.tokens.commas);
        if (this.matchToken(TokenType.RightBracket)) {
          vectorLiteral.tokens.secondBracket = this.previous();
          break;
        }
      }
    } else {
      this.consume(
        TokenType.RightBracket,
        "after the only vector expression element"
      );
      vectorLiteral.tokens.secondBracket = this.previous();
    }

    return vectorLiteral;
  }

  protected anonymousFunction(): AnonymousFunctionExpr {
    const functionKeyword = this.previous();
    const firstParen = this.consume(
      TokenType.LeftParen,
      "after function keyword in anonymous function"
    );
    const args = this.args();
    const secondParen = this.previous();
    const body = this.expression();
    return new AnonymousFunctionExpr(args, body, {
      functionKeyword,
      firstParen,
      secondParen,
    });
  }

  protected listComprehensionElements(): Expression {
    if (this.matchToken(TokenType.Let)) {
      const letKwrd = this.previous();
      this.consume(TokenType.LeftParen, "after the let keyword");
      const firstParen = this.previous();
      const args = this.args();
      const secondParen = this.previous();
      const next = this.listComprehensionElementsOrExpr();
      return new LcLetExpr(args, next, {
        letKeyword: letKwrd,
        firstParen,
        secondParen,
      });
    }
    if (this.matchToken(TokenType.Each)) {
      const eachKwrd = this.previous();
      const next = this.listComprehensionElementsOrExpr();
      return new LcEachExpr(next, {
        eachKeyword: eachKwrd,
      });
    }
    if (this.matchToken(TokenType.For)) {
      return this.listComprehensionFor();
    }
    if (this.matchToken(TokenType.If)) {
      const ifKwrd = this.previous();
      this.consume(TokenType.LeftParen, "after the if keyword");
      const firstParen = this.previous();
      const cond = this.expression();
      this.consume(
        TokenType.RightParen,
        "after the if comprehension condition"
      );
      const secondParen = this.previous();
      const thenBranch = this.listComprehensionElementsOrExpr();
      let elseBranch: Expression | null = null;
      let elseKeyword = null;
      if (this.matchToken(TokenType.Else)) {
        elseKeyword = this.previous();
        elseBranch = this.listComprehensionElementsOrExpr();
      }
      return new LcIfExpr(cond, thenBranch, elseBranch, {
        ifKeyword: ifKwrd,
        elseKeyword,
        firstParen,
        secondParen,
      });
    }
    // we should not get here
    throw new Error(
      "Unexpected token in list comprehension elements! THIS SHOULD NOT HAPPEN"
    );
  }
  protected listComprehensionFor(): Expression {
    const forKwrd = this.previous();
    this.consume(
      TokenType.LeftParen,
      "after for keyword in list comprehension"
    );
    const firstParen = this.previous();
    const firstArgs = this.forComprehensionArgs();
    if (this.matchToken(TokenType.RightParen)) {
      const secondParen = this.previous();
      return new LcForExpr(firstArgs, this.listComprehensionElementsOrExpr(), {
        forKeyword: forKwrd,
        firstParen,
        secondParen,
      });
    }
    this.consume(
      TokenType.Semicolon,
      "after first 'for' comprehension parameters"
    );
    const firstSemicolon = this.previous();
    const condition = this.expression();
    this.consume(TokenType.Semicolon, "after 'for' comprehension condition");
    const secondSemicolon = this.previous();
    const secondArgs = this.forComprehensionArgs();
    this.consume(
      TokenType.RightParen,
      "after second 'for' comprehension parameters"
    );
    const secondParen = this.previous();
    const next = this.listComprehensionElementsOrExpr();
    return new LcForCExpr(firstArgs, secondArgs, condition, next, {
      firstParen,
      forKeyword: forKwrd,
      firstSemicolon,
      secondParen,
      secondSemicolon,
    });
  }
  protected listComprehensionElementsOrExpr(): Expression {
    // checks if we have a list comprehension element.
    if (
      listComprehensionElementKeywords.includes(this.peek().type) ||
      (this.peek().type === TokenType.LeftParen &&
        listComprehensionElementKeywords.includes(this.peekNext().type))
    ) {
      let withParens = false;

      if (this.matchToken(TokenType.LeftParen)) {
        withParens = true;
      }
      const comprElemsResult = this.listComprehensionElements();
      if (withParens) {
        this.consume(
          TokenType.RightParen,
          "after parenthesized list comprehension expression"
        );
      }
      return comprElemsResult;
    }

    return this.expression();
  }
  protected consume(tt: TokenType, where: string) {
    if (this.checkToken(tt)) {
      return this.advance();
    }
    throw this.errorCollector.reportError(
      new ConsumptionParsingError(
        this.getLocation(),
        this.peek().type,
        tt,
        where
      )
    );
  }
  protected matchToken(...toMatch: TokenType[]) {
    for (const tt of toMatch) {
      if (this.checkToken(tt)) {
        this.advance();
        return true;
      }
    }
    return false;
  }
  protected checkToken(tt: TokenType) {
    if (this.isAtEnd()) {
      return false;
    }
    return this.peek().type == tt;
  }
  protected advance() {
    if (!this.isAtEnd()) {
      this.currentToken++;
    }
    return this.previous();
  }
  protected isAtEnd() {
    return this.peek().type === TokenType.Eot;
  }
  protected peek(): Token {
    return this.tokens[this.currentToken];
  }
  protected peekNext(): Token {
    if (this.tokens[this.currentToken].type === TokenType.Eot) {
      return this.tokens[this.currentToken];
    }
    return this.tokens[this.currentToken + 1];
  }
  protected getLocation() {
    return this.peek().span.start;
  }
  protected previous(): Token {
    return this.tokens[this.currentToken - 1];
  }
}
