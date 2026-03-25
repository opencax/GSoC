import * as exp from "constants";
import { resolve } from "path";
import CodeFile from "./CodeFile";
import ErrorCollector from "./ErrorCollector";
import LexingError from "./errors/LexingError";
import {
  MultiLineComment,
  NewLineExtraToken,
  SingleLineComment,
} from "./extraTokens";
import Lexer from "./Lexer";
import LiteralToken from "./LiteralToken";
import Token from "./Token";
import TokenType from "./TokenType";

function lexToTTStream(code: string) {
  const lexer = new Lexer(new CodeFile("<test>", code), new ErrorCollector());
  return lexer.scan().map((token) => token.type);
}

function lexTokens(code: string) {
  const lexer = new Lexer(new CodeFile("<test>", code), new ErrorCollector());
  return lexer.scan();
}

function simplifyTokens(tokens: Token[]) {
  return tokens.map((token) => {
    if (token instanceof LiteralToken) {
      return {
        val: token.value,
        posChar: token.span.start.char,
        type: TokenType[token.type],
        l: token.lexeme,
      };
    }
    return {
      posChar: token.span.start.char,
      type: TokenType[token.type], // reverse lookup the token type so that it is easier to read the snaps
      l: token.lexeme,
    };
  });
}

describe("Lexer", () => {
  it("constructs without crashing", () => {
    new Lexer(new CodeFile("asdf", "b"), new ErrorCollector());
  });
  it("scans simple tokens", () => {
    const tts = lexToTTStream(`%`);
    expect(tts).toEqual([TokenType.Percent, TokenType.Eot]);
  });
  it("scans an empty code file", () => {
    const tts = lexToTTStream(``);
    expect(tts).toEqual([TokenType.Eot]);
  });
  it("ignores whitespace", () => {
    const tts = lexToTTStream(`% {
        
    }`);
    expect(tts).toEqual([
      TokenType.Percent,
      TokenType.LeftBrace,
      TokenType.RightBrace,
      TokenType.Eot,
    ]);
  });
  it("scans braces, parens and brackets", () => {
    const tts = lexToTTStream(`[]{}()`);
    expect(tts).toEqual([
      TokenType.LeftBracket,
      TokenType.RightBracket,
      TokenType.LeftBrace,
      TokenType.RightBrace,
      TokenType.LeftParen,
      TokenType.RightParen,
      TokenType.Eot,
    ]);
  });
  it("scans braces, parens and brackets", () => {
    const tts = lexToTTStream(`[]{}()`);
    expect(tts).toEqual([
      TokenType.LeftBracket,
      TokenType.RightBracket,
      TokenType.LeftBrace,
      TokenType.RightBrace,
      TokenType.LeftParen,
      TokenType.RightParen,
      TokenType.Eot,
    ]);
  });
  it("scans identifiers", () => {
    const tts = lexToTTStream(`abc;`);
    expect(tts).toEqual([
      TokenType.Identifier,
      TokenType.Semicolon,
      TokenType.Eot,
    ]);
  });
  it("scans number literals", () => {
    const tts = lexToTTStream(`5;`);
    expect(tts).toEqual([
      TokenType.NumberLiteral,
      TokenType.Semicolon,
      TokenType.Eot,
    ]);
  });
  it("scans identifiers starting with a digit", () => {
    const expectNumberSemi = (str: string) => {
      expect(lexToTTStream(str)).toEqual([
        TokenType.NumberLiteral,
        TokenType.Semicolon,
        TokenType.Eot,
      ]);
    };

    expectNumberSemi("1e3;");
    expectNumberSemi(".3e3;");

    const expectIdentifierSemi = (str: string) =>
      expect(lexToTTStream(str)).toEqual([
        TokenType.Identifier,
        TokenType.Semicolon,
        TokenType.Eot,
      ]);

    expectIdentifierSemi("0z;");
    expectIdentifierSemi("0ea;");

    expectIdentifierSemi("999e9e9999;");
    expect(lexToTTStream("999e9e9999")).toEqual([
      TokenType.Identifier,
      TokenType.Eot,
    ]);

    expect(lexToTTStream("7_")).toEqual([TokenType.Identifier, TokenType.Eot]);
    expect(lexToTTStream("7_1")).toEqual([TokenType.Identifier, TokenType.Eot]);
    expect(lexToTTStream("0a1")).toEqual([TokenType.Identifier, TokenType.Eot]);

    expect(lexToTTStream("0e.x")).toEqual([
      TokenType.Identifier,
      TokenType.Dot,
      TokenType.Identifier,
      TokenType.Eot,
    ]);

    expect(lexToTTStream("7_segDisplay.x")).toEqual([
      TokenType.Identifier,
      TokenType.Dot,
      TokenType.Identifier,
      TokenType.Eot,
    ]);
  });
  it("scans string literals", () => {
    const tts = lexToTTStream(`"abc";`);
    expect(tts).toEqual([
      TokenType.StringLiteral,
      TokenType.Semicolon,
      TokenType.Eot,
    ]);
  });

  it("scans && and ||", () => {
    const tts = lexToTTStream(`abc && ddd || afs;`);
    expect(tts).toEqual([
      TokenType.Identifier,
      TokenType.AND,
      TokenType.Identifier,
      TokenType.OR,
      TokenType.Identifier,
      TokenType.Semicolon,
      TokenType.Eot,
    ]);
  });

  it("scans dots", () => {
    const tts = lexToTTStream(`abc.ddd;`);
    expect(tts).toEqual([
      TokenType.Identifier,
      TokenType.Dot,
      TokenType.Identifier,
      TokenType.Semicolon,
      TokenType.Eot,
    ]);
  });
  it("scans hashes", () => {
    const tts = lexToTTStream(`#{}`);
    expect(tts).toEqual([
      TokenType.Hash,
      TokenType.LeftBrace,
      TokenType.RightBrace,
      TokenType.Eot,
    ]);
  });
  it("scans single line comments", () => {
    const tts = lexToTTStream(`x = 20; // some note +-//asdf`);
    expect(tts).toEqual([
      TokenType.Identifier,
      TokenType.Equal,
      TokenType.NumberLiteral,
      TokenType.Semicolon,
      TokenType.Eot,
    ]);
  });
  it("scans multiline comments", () => {
    const tts = lexToTTStream(`/* ddd \n asdf */`);
    expect(tts).toEqual([TokenType.Eot]);
  });
  it("throws LexingError on unterminated multiline comments", () => {
    expect(() => lexToTTStream(`/* ahdsh`)).toThrowError(LexingError);
  });
  it("throws LexingError on single & and single |", () => {
    expect(() => lexToTTStream(`&`)).toThrowError(LexingError);
    expect(() => lexToTTStream(`|`)).toThrowError(LexingError);
  });

  it("throws LexingError on unexpected characters", () => {
    expect(() => lexToTTStream(`~~~~~~`)).toThrowError(LexingError);
  });

  it("adds extraTokens when scanning comments", () => {
    const toks = lexTokens(`/* a comment */asdf//really cool\n\r\n`);
    expect(toks[0].extraTokens).toHaveLength(1);
    expect(toks[0].extraTokens[0]).toBeInstanceOf(MultiLineComment);
    expect((toks[0].extraTokens[0] as MultiLineComment).contents).toEqual(
      " a comment "
    );
    expect(toks[1].extraTokens[0]).toBeInstanceOf(SingleLineComment);
    expect((toks[1].extraTokens[0] as SingleLineComment).contents).toEqual(
      "really cool"
    );
    expect(toks[1].extraTokens[1]).toBeInstanceOf(NewLineExtraToken);
  });
  describe("number lexing", () => {
    function testNumberLexing(source: string) {
      const tokens = lexTokens(source);
      if (!(tokens[0] instanceof LiteralToken)) {
        throw new Error("First token is not a literal. Fix that test!");
      }

      return (tokens[0] as LiteralToken<number>).value;
    }
    it("lexes one digit numbers", () => {
      expect(testNumberLexing("9")).toEqual(9);
    });
    it("lexes zero", () => {
      expect(testNumberLexing("0")).toEqual(0);
      expect(testNumberLexing("0.0")).toEqual(0);
    });
    it("lexes numbers with multiple digits", () => {
      expect(testNumberLexing("786")).toEqual(786);
    });
    it("lexes numbers with decimal point", () => {
      expect(testNumberLexing("333.87")).toEqual(333.87);
    });
    it("lexes exponential numbers", () => {
      expect(testNumberLexing("20e10")).toEqual(20e10);
    });
    it("lexes exponential numbers with negative exponents", () => {
      expect(testNumberLexing("1e-9")).toEqual(1e-9);
    });
    it("lexes exponential numbers with commas", () => {
      expect(testNumberLexing("2.787272e10")).toEqual(2.787272e10);
    });
    it("lexes exponents with a sign", () => {
      expect(testNumberLexing("1.25e+6")).toEqual(1.25e6);
      expect(testNumberLexing("0.25e-2")).toEqual(0.25e-2);
      expect(testNumberLexing("1.E-2")).toEqual(1e-2);
    });

    it("throws LexingError when an invalid number is given", () => {
      expect(() => testNumberLexing("2.2.2")).toThrowError(LexingError);
      expect(() => testNumberLexing("999e99999")).toThrowError(LexingError);
    });
    it("lexes numbers starting with a dot", () => {
      expect(testNumberLexing(".9")).toEqual(0.9);
    });
    it("parses an unfinished decimal even when it may cause problems with lookahead", () => {
      expect(lexToTTStream(`1.`)).toEqual([
        TokenType.NumberLiteral,
        TokenType.Eot,
      ]);
    });
    it("accepts unfinished decimal before rparen", () => {
      expect(lexToTTStream(`linear_extrude(scale=1.)`)).toEqual([
        TokenType.Identifier,
        TokenType.LeftParen,
        TokenType.Identifier,
        TokenType.Equal,
        TokenType.NumberLiteral,
        TokenType.RightParen,
        TokenType.Eot,
      ]);
    });
    it("parses a minus correctly", () => {
      expect(lexToTTStream(`1.e-4`)).toEqual([
        TokenType.NumberLiteral,
        TokenType.Eot,
      ]);

      expect(lexToTTStream(`1.27-1.0`)).toEqual([
        TokenType.NumberLiteral,
        TokenType.Minus,
        TokenType.NumberLiteral,
        TokenType.Eot,
      ]);

      expect(lexToTTStream(`1.27+1.0`)).toEqual([
        TokenType.NumberLiteral,
        TokenType.Plus,
        TokenType.NumberLiteral,
        TokenType.Eot,
      ]);

      expect(lexToTTStream(`1.27e+4`)).toEqual([
        TokenType.NumberLiteral,
        TokenType.Eot,
      ]);

      expect(lexToTTStream(`1.27e-4`)).toEqual([
        TokenType.NumberLiteral,
        TokenType.Eot,
      ]);
    });
  });

  describe("string lexing", () => {
    function testStringLexing(source: string) {
      const tokens = lexTokens(source);
      if (!(tokens[0] instanceof LiteralToken)) {
        throw new Error("First token is not a literal. Fix that test!");
      }

      return (tokens[0] as LiteralToken<string>).value;
    }
    it("lexes simple strings", () => {
      expect(testStringLexing(`"hello"`)).toEqual("hello");
    });
    it("lexes empty strings", () => {
      expect(testStringLexing(`""`)).toEqual("");
    });
    it("lexes strings with escape sequences", () => {
      expect(testStringLexing(`"a\\nb\\t\\rc\\\\gg\\"g"`)).toEqual(
        'a\nb\t\rc\\gg"g'
      );
    });
    it("throws LexingError on invalid escape sequences", () => {
      expect(() => testStringLexing(`"\\XD"`)).toThrowError(LexingError);
    });
    it("throws LexingError on unterminated strings", () => {
      expect(() => testStringLexing(`"aaaa`)).toThrowError(LexingError);
    });
  });
  describe("use statement lexing", () => {
    it("does generate a FilenameInChevronsToken", () => {
      const tokens = lexTokens(`use <ddd/astd.scad>`);
      expect(tokens[0].type).toEqual(TokenType.Use);
      expect(tokens[0].lexeme).toEqual("use");
      expect(tokens[1].type).toEqual(TokenType.FilenameInChevrons);
      expect(tokens[1].lexeme).toEqual("<ddd/astd.scad>");
      expect(tokens[1]).toBeInstanceOf(LiteralToken);
      expect((tokens[1] as LiteralToken<string>).value).toEqual(
        "ddd/astd.scad"
      );
    });
    it("does lex an include<...> statement", () => {
      const tokens = lexTokens(`include <ddd/astd.scad>`);
      expect(tokens[0].type).toEqual(TokenType.Include);
      expect(tokens[0].lexeme).toEqual("include");
      expect(tokens[1].type).toEqual(TokenType.FilenameInChevrons);
      expect(tokens[1].lexeme).toEqual("<ddd/astd.scad>");
      expect(tokens[1]).toBeInstanceOf(LiteralToken);
    });
    it("throws when there is no filename after the use keyword", () => {
      expect(() => lexTokens(`use ;`)).toThrowError(LexingError);
    });
    it("throws when there is an unterminated filename", () => {
      expect(() => lexTokens(`use <xD`)).toThrowError(LexingError);
    });
  });
  it("lexes braces with comments properly", () => {
    const tokens = lexTokens(`
{      
{                
 } //end if
}
    `);
    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.LeftBrace,
      TokenType.LeftBrace,
      TokenType.RightBrace,
      TokenType.RightBrace,
      TokenType.Eot,
    ]);
    expect(tokens[3].extraTokens).toHaveLength(2);
    expect(tokens[3].extraTokens[0]).toBeInstanceOf(SingleLineComment);
    expect((tokens[3].extraTokens[0] as SingleLineComment).contents).toEqual(
      `end if`
    );
    expect(tokens[3].extraTokens[1]).toBeInstanceOf(NewLineExtraToken);
  });
  it("does not add duplicate extraTokens", () => {
    const tokens = lexTokens(`
      module indented() {
        asdf = 5;
        // comment
      }
    `);
    expect(tokens.map((t) => t.type)).toEqual([
      /*  0 */ TokenType.Module,
      /*  1 */ TokenType.Identifier,
      /*  2 */ TokenType.LeftParen,
      /*  3 */ TokenType.RightParen,
      /*  4 */ TokenType.LeftBrace,
      /*  5 */ TokenType.Identifier,
      /*  6 */ TokenType.Equal,
      /*  7 */ TokenType.NumberLiteral,
      /*  8 */ TokenType.Semicolon,
      /*  9 */ TokenType.RightBrace,
      /* 10 */ TokenType.Eot,
    ]);
    expect(tokens[9].extraTokens).toHaveLength(3);
    expect(tokens[10].extraTokens).toHaveLength(1);
  });
  it("sets pos and and end of tokens so that there is no gaps between them", () => {
    const tokens = lexTokens(`{     }{}`); // 5 spaces
    expect(tokens[0].span.end.char).toEqual(tokens[1].startWithWhitespace.char);
  });
  it("generates start and and in spans", () => {
    const tokens = lexTokens(`b();`); // 5 spaces
    expect(tokens.length).not.toBe(0);
    tokens.every((t) => {
      expect(t.span.start).toBeTruthy();
      expect(t.span.end).toBeTruthy();
    });
  });
  describe.skip("lexing of random files found on the internet", () => {
    async function lexFile(path: string) {
      const file = await CodeFile.load(resolve(__dirname, path));
      const lexer = new Lexer(file, new ErrorCollector());
      return lexer.scan();
    }
    it("lexes hull.scad and matches snapshot", async () => {
      const tokens = await lexFile("testdata/hull.scad");
      expect(simplifyTokens(tokens)).toMatchSnapshot();
    });
  });
});
