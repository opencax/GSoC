import { resolve } from "path";
import AssignmentNode from "./ast/AssignmentNode";
import ASTNode from "./ast/ASTNode";
import {
  ArrayLookupExpr,
  AssertExpr,
  BinaryOpExpr,
  EchoExpr,
  Expression,
  FunctionCallExpr,
  GroupingExpr,
  LcEachExpr,
  LcIfExpr,
  LcLetExpr,
  LetExpr,
  LiteralExpr,
  LookupExpr,
  MemberLookupExpr,
  RangeExpr,
  UnaryOpExpr,
  VectorExpr,
} from "./ast/expressions";
import ScadFile from "./ast/ScadFile";
import {
  BlockStmt,
  IfElseStatement,
  ModuleDeclarationStmt,
  ModuleInstantiationStmt,
  NoopStmt,
  UseStmt,
} from "./ast/statements";
import CodeFile from "./CodeFile";
import CodeLocation from "./CodeLocation";
import ErrorCollector from "./ErrorCollector";
import ParsingError from "./errors/ParsingError";
import Lexer from "./Lexer";
import Parser from "./Parser";
import ParsingHelper from "./ParsingHelper";
import TokenType from "./TokenType";

describe("Parser", () => {
  function doParse(source: string): ScadFile {
    const [ast, errorCollector] = ParsingHelper.parseFile(
      new CodeFile("<test>", source)
    );
    errorCollector.throwIfAny();
    return ast!;
  }
  /**
   * Recursively removes codeLocations from the ast tree.
   * @param ast an ast node to simplify
   */
  function simplifyAst(ast: ASTNode) {
    return JSON.parse(
      JSON.stringify(ast, (key, value) => {
        if (value instanceof CodeLocation || value instanceof CodeFile) {
          return null;
        }
        if (value && typeof value === "object") {
          const proto = Object.getPrototypeOf(value);
          if (proto && proto.constructor && proto.constructor.name) {
            value.__c = proto.constructor.name;
          }
        }
        return value;
      })
    );
  }
  it("parses basic use statements", () => {
    const scadFile = doParse(`
    use <myfile.scad>
    `);
    expect(scadFile.statements[0]).toBeInstanceOf(UseStmt);
    expect((scadFile.statements[0] as UseStmt).filename).toEqual("myfile.scad");
  });
  it("parses use statements with spaces and weird symbols in the path", () => {
    const scadFile = doParse(`
    use <000988 eeeee 13-2/../92_3333.scad>
    `);
    expect(scadFile.statements[0]).toBeInstanceOf(UseStmt);
    expect((scadFile.statements[0] as UseStmt).filename).toEqual(
      "000988 eeeee 13-2/../92_3333.scad"
    );
  });
  it("throws on unterminated use statements", () => {
    expect(() =>
      doParse(`
    use <ty
    `)
    ).toThrow(Error);
  });
  it("parses block statements", () => {
    const scadFile = doParse(`
    {}
    `);
    expect(scadFile.statements[0]).toBeInstanceOf(BlockStmt);
    expect(scadFile.statements).toHaveLength(1);
  });
  it("parses nested block statements and noop statements", () => {
    const scadFile = doParse(`
    {{;}}
    `);
    expect(scadFile.statements[0]).toBeInstanceOf(BlockStmt);
    expect((scadFile.statements[0] as BlockStmt).children[0]).toBeInstanceOf(
      BlockStmt
    );
    expect(
      ((scadFile.statements[0] as BlockStmt).children[0] as BlockStmt)
        .children[0]
    ).toBeInstanceOf(NoopStmt);
  });
  it("throws on unterminated block statements", () => {
    expect(() =>
      doParse(`
        {
    `)
    ).toThrow(ParsingError);
  });
  it("parses module declarations", () => {
    const scadFile = doParse(`
    module testmod() {
      
    }
    `);
    expect(scadFile.statements[0]).toBeInstanceOf(ModuleDeclarationStmt);
    const decl = scadFile.statements[0] as ModuleDeclarationStmt;
    expect(decl.name).toEqual("testmod");
  });
  it("parses module declarations with parameters", () => {
    const scadFile = doParse(`
    module testmod(abc) {
      
    }
    `);
    expect(scadFile.statements[0]).toBeInstanceOf(ModuleDeclarationStmt);
    const decl = scadFile.statements[0] as ModuleDeclarationStmt;
    expect(decl.definitionArgs.length).toEqual(1);
    expect(decl.definitionArgs[0].name).toEqual("abc");
  });
  it("parses module declarations with multiple parameters", () => {
    const scadFile = doParse(`
    module testmod(abc, gfg) {
      
    }
    `);
    expect(scadFile.statements[0]).toBeInstanceOf(ModuleDeclarationStmt);
    const decl = scadFile.statements[0] as ModuleDeclarationStmt;
    expect(decl.definitionArgs.length).toEqual(2);
    expect(decl.definitionArgs[0].name).toEqual("abc");
    expect(decl.definitionArgs[1].name).toEqual("gfg");
  });

  it("parses module declarations with multiple parameters and weird commas", () => {
    const scadFile = doParse(`
    module testmod(,,,,abc,, gfg,,,) {
      
    }
    `);
    expect(scadFile.statements[0]).toBeInstanceOf(ModuleDeclarationStmt);
    const decl = scadFile.statements[0] as ModuleDeclarationStmt;
    expect(decl.definitionArgs.length).toEqual(2);
    expect(decl.definitionArgs[0].name).toEqual("abc");
    expect(decl.definitionArgs[1].name).toEqual("gfg");
  });
  it("parses module declarations only commas in the parameters params", () => {
    const scadFile = doParse(`
    module testmod(,,,,,) {
      
    }
    `);
    expect(scadFile.statements[0]).toBeInstanceOf(ModuleDeclarationStmt);
    const decl = scadFile.statements[0] as ModuleDeclarationStmt;
    expect(decl.definitionArgs.length).toEqual(0);
  });
  it("throws on unterminated parameters lists in module declarations", () => {
    expect(() =>
      doParse(`
        module unterminated (
    `)
    ).toThrow(ParsingError);
  });
  it("throws on unexpected tokens in module declaration parameters", () => {
    expect(() =>
      doParse(`
        module unexpected (abc-) {}
    `)
    ).toThrow(ParsingError);
  });
  it("throws on garbage in module declaration parameters", () => {
    expect(() =>
      doParse(`
        module garbage (-) {}
    `)
    ).toThrow(ParsingError);

    expect(() =>
      doParse(`
        module garbage (==!>XDD) {}
    `)
    ).toThrow(ParsingError);
  });
  it("parses function declarations", () => {
    doParse(`
     function noop (x = false) = x;
  `);
  });
  it("parses assignments", () => {
    const file = doParse(`
      x = 10;
    `);
    expect(file.statements[0]).toBeInstanceOf(AssignmentNode);
    const a = file.statements[0] as AssignmentNode;
    expect(a.name).toEqual("x");
    expect(a.value).toBeInstanceOf(LiteralExpr);
    expect(a.value).toHaveProperty("value", 10);
  });
  it("parses module instantiations", () => {
    const file = doParse(`
      cube();
    `);
    expect(file.statements[0]).toBeInstanceOf(ModuleInstantiationStmt);
    const inst = file.statements[0] as ModuleInstantiationStmt;
    expect(inst.name).toEqual("cube");
    expect(inst.args).toHaveLength(0);
    expect(inst.child).toBeInstanceOf(NoopStmt);
  });
  describe("tag parsing", () => {
    const tags: { [x: string]: keyof ModuleInstantiationStmt } = {
      "!": "tagRoot",
      "#": "tagHighlight",
      "%": "tagBackground",
      "*": "tagDisabled",
    };
    for (const tagToken of Object.keys(tags)) {
      it(`parses the '${tagToken}' tag`, () => {
        const file = doParse(`
          ${tagToken}cube();
       `);
        const inst = file.statements[0] as ModuleInstantiationStmt;
        expect(inst[tags[tagToken]]).toBeTruthy();
      });
    }
    it("parses all the tags", () => {
      const file = doParse(`
        !#%*cube();
      `);
      const inst = file.statements[0] as ModuleInstantiationStmt;
      expect(inst).toBeInstanceOf(ModuleInstantiationStmt);
      for (const tagToken of Object.keys(tags)) {
        expect(inst[tags[tagToken]]).toBeTruthy();
      }
    });
  });
  it("throws on identifiers that are neiither assignments nor module instantiations where statements are expected", () => {
    expect(() =>
      doParse(`
        dupa - 10;  
      `)
    ).toThrow(ParsingError);
  });
  it("parses module instantiations with simple children ", () => {
    const file = doParse(`
        union() cube();
    `);

    expect(file.statements[0]).toBeInstanceOf(ModuleInstantiationStmt);
    const inst = file.statements[0] as ModuleInstantiationStmt;
    expect(inst.name).toEqual("union");
    expect(inst.args).toHaveLength(0);
    expect(inst.child).toBeInstanceOf(ModuleInstantiationStmt);
    expect(inst.child).toHaveProperty("name", "cube");
    expect(inst.child).toHaveProperty("args", []);
  });
  it("parses module instantiations with block children ", () => {
    const file = doParse(`
        union() {
          cube();
          sphere();
        }
      `);

    expect(file.statements[0]).toBeInstanceOf(ModuleInstantiationStmt);
    const inst = file.statements[0] as ModuleInstantiationStmt;
    expect(inst.name).toEqual("union");
    expect(inst.child).toHaveProperty("children.length", 2);
    simplifyAst;
    expect(inst.child).toBeInstanceOf(BlockStmt);
    expect(inst.child).toHaveProperty(["children", 0, "name"], "cube");
    expect(inst.child).toHaveProperty(["children", 1, "name"], "sphere");
  });
  it("parses module instantiations with positional arguments", () => {
    expect(
      simplifyAst(
        doParse(`
          cube(true);
        `)
      )
    ).toMatchSnapshot();
  });
  it("parses module instantiations with mixed arguments", () => {
    expect(
      simplifyAst(
        doParse(`
          cube(true, r = 10);
        `)
      )
    ).toMatchSnapshot();
  });
  it("parses module instantiations which are also keywords", () => {
    const f = doParse(`
    for() {

    }
    let(x = 20) {

    }
    assert() {

    }
    echo("hello");
    each() {

    }
   `);
    expect(simplifyAst(f)).toMatchSnapshot();
  });
  it("parses simple if statements", () => {
    const file = doParse(`
      if("anything") {
        cube();
      }
    `);
    expect(file.statements[0]).toBeInstanceOf(IfElseStatement);
    expect(file.statements[0]).toHaveProperty("cond");
    expect((file.statements[0] as IfElseStatement).cond).toBeInstanceOf(
      Expression
    );
    expect((file.statements[0] as IfElseStatement).thenBranch).toBeInstanceOf(
      BlockStmt
    );
    expect((file.statements[0] as IfElseStatement).elseBranch).toBeNull();
  });
  it("parses if else statements", () => {
    const file = doParse(`
      if("anything") {
        cube();
      } else if("everything") sphere();
      else {
        echo("error");
      }
    `);
    expect(file.statements[0]).toBeInstanceOf(IfElseStatement);
    expect(file.statements[0]).toHaveProperty("cond");
    expect((file.statements[0] as IfElseStatement).cond).toBeInstanceOf(
      Expression
    );
    expect((file.statements[0] as IfElseStatement).thenBranch).toBeInstanceOf(
      BlockStmt
    );
    expect((file.statements[0] as IfElseStatement).elseBranch).toBeInstanceOf(
      IfElseStatement
    );
  });
  it("throws on if statements without a thgen branch", () => {
    expect(() =>
      doParse(`
        if(true)
      `)
    ).toThrow(ParsingError);
  });
  it("throws when a module instantiation has an unterminated argument list which may cause problems with lookahead", () => {
    expect(() =>
      doParse(`
       doSomething(abc
    `)
    ).toThrow(ParsingError);
  });
  it("parses member lookup expressions", () => {
    const file = doParse(`
      x = abc.y;
    `);
    expect(file.statements[0]).toBeInstanceOf(AssignmentNode);
    const a = file.statements[0] as AssignmentNode;
    expect(a.value).toBeInstanceOf(MemberLookupExpr);
    expect(a.value).toHaveProperty("expr.name", "abc");
    expect(a.value).toHaveProperty("member", "y");
  });
  it("throws on unterminated member expressions", () => {
    expect(() =>
      doParse(`
       mem = x.
    `)
    ).toThrow(ParsingError);
  });
  it("parses array lookup expressions", () => {
    const file = doParse(`
      x = arr[10];
    `);
    expect(file.statements[0]).toBeInstanceOf(AssignmentNode);
    const a = file.statements[0] as AssignmentNode;
    expect(a.value).toBeInstanceOf(ArrayLookupExpr);
    expect(a.value).toHaveProperty("array.name", "arr");
    expect(a.value).toHaveProperty("index.value", 10);
  });
  it("throws on unterminated array lookup expressions", () => {
    expect(() =>
      doParse(`
       val = arr[10
    `)
    ).toThrow(ParsingError);
  });
  it("parses function call expressions", () => {
    const file = doParse(`
      x = fun();
    `);
    expect(file.statements[0]).toBeInstanceOf(AssignmentNode);
    const a = file.statements[0] as AssignmentNode;
    expect(a.value).toBeInstanceOf(FunctionCallExpr);
    expect(a.value).toHaveProperty("callee");
    expect(a.value).toHaveProperty("args.length", 0);
  });
  it("parses function call expressions with positional and named arguments", () => {
    const file = doParse(`
      x = fun(arg1, arg2 = 8, arg3 = undef);
    `);
    expect(file.statements[0]).toBeInstanceOf(AssignmentNode);
    const a = file.statements[0] as AssignmentNode;
    expect(a.value).toBeInstanceOf(FunctionCallExpr);
    expect(a.value).toHaveProperty("args.length", 3);
    expect(a.value).toHaveProperty("args.0.name", "");
    expect(a.value).toHaveProperty("args.0.value.name", "arg1");
    expect(a.value).toHaveProperty("args.1.name", "arg2");
    expect(a.value).toHaveProperty("args.1.value.value", 8);
    expect(a.value).toHaveProperty("args.2.name", "arg3");
    expect(a.value).toHaveProperty("args.2.value.value", null);
  });
  it("parses multiplication", () => {
    const file = doParse(`
      x = 10 * 6;
    `);
    expect(file.statements[0]).toBeInstanceOf(AssignmentNode);
    const a = file.statements[0] as AssignmentNode;
    expect(a.value).toBeInstanceOf(BinaryOpExpr);
    expect(a.value).toHaveProperty("left.value", 10);
    expect(a.value).toHaveProperty("right.value", 6);
    expect(a.value).toHaveProperty("operation", TokenType.Star);
  });
  it("parses multiplication and division in one expression", () => {
    const file = doParse(`
      x = 10 * 6 / 5;
    `);
    expect(file.statements[0]).toBeInstanceOf(AssignmentNode);
    const a = file.statements[0] as AssignmentNode;
    expect(a.value).toBeInstanceOf(BinaryOpExpr);
    expect(a.value).toHaveProperty("left.left.value", 10);
    expect(a.value).toHaveProperty("left.operation", TokenType.Star);
    expect(a.value).toHaveProperty("left.right.value", 6);
    expect(a.value).toHaveProperty("right.value", 5);
    expect(a.value).toHaveProperty("operation", TokenType.Slash);
  });
  it("parses addition and subtraction", () => {
    const file = doParse(`
      x = 10 + 18 - 33;
    `);
    expect(file.statements[0]).toBeInstanceOf(AssignmentNode);
    const a = file.statements[0] as AssignmentNode;
    expect(simplifyAst(a.value!)).toMatchSnapshot();
  });
  it("parses addition and multiplication with grouping expression", () => {
    const file = doParse(`
      x = (88 + 3) / 10;
    `);
    expect(file.statements[0]).toBeInstanceOf(AssignmentNode);
    const a = file.statements[0] as AssignmentNode;
    expect(simplifyAst(a.value!)).toMatchSnapshot();
  });
  it("parses addition and multiplication without grouping expression", () => {
    const file = doParse(`
      x = 88 + 3 / 10;
    `);
    expect(file.statements[0]).toBeInstanceOf(AssignmentNode);
    const a = file.statements[0] as AssignmentNode;
    expect(simplifyAst(a.value!)).toMatchSnapshot();
  });

  it("it parses the ^ exponetiation operator", () => {
    const file = doParse(`
      x = 10 * 2^8;
    `);
    expect(file.statements[0]).toBeInstanceOf(AssignmentNode);
    const a = file.statements[0] as AssignmentNode;
    expect(simplifyAst(a.value!)).toMatchSnapshot();
  });
  it("parses the '-' unary operator", () => {
    const file = doParse(`
      x = -10;
    `);
    expect(file.statements[0]).toBeInstanceOf(AssignmentNode);
    const a = file.statements[0] as AssignmentNode;
    expect(a.value).toBeInstanceOf(UnaryOpExpr);
    const unary = a.value as UnaryOpExpr;
    expect(unary.operation).toEqual(TokenType.Minus);
    expect(unary).toHaveProperty("right.value", 10);
  });
  it("parses the '!' unary operator", () => {
    const file = doParse(`
      x = !22;
    `);
    expect(file.statements[0]).toBeInstanceOf(AssignmentNode);
    const a = file.statements[0] as AssignmentNode;
    expect(a.value).toBeInstanceOf(UnaryOpExpr);
    const unary = a.value as UnaryOpExpr;
    expect(unary.operation).toEqual(TokenType.Bang);
    expect(unary).toHaveProperty("right.value", 22);
  });
  it("parses the '+' unary operator", () => {
    const file = doParse(`
      x = +32;
    `);
    expect(file.statements[0]).toBeInstanceOf(AssignmentNode);
    const a = file.statements[0] as AssignmentNode;
    expect(a.value).toBeInstanceOf(UnaryOpExpr);
    const unary = a.value as UnaryOpExpr;
    expect(unary.operation).toEqual(TokenType.Plus);
    expect(unary).toHaveProperty("right.value", 32);
  });
  it("parses comparsion operators", () => {
    const file = doParse(`
      if(x > 2) {

      }
      if(x >= 5) {

      }
      if(x <= 5) {

      }
      if(x < 8) {

      }
    `);
    expect(file.statements[0]).toBeInstanceOf(IfElseStatement);
    const i = file.statements[0] as IfElseStatement;
    expect(i.cond).toBeInstanceOf(BinaryOpExpr);
    expect(i.cond).toHaveProperty("operation", TokenType.Greater);
    expect(file.statements).toHaveProperty(
      [1, "cond", "operation"],
      TokenType.GreaterEqual
    );
    expect(file.statements).toHaveProperty(
      [2, "cond", "operation"],
      TokenType.LessEqual
    );
    expect(file.statements).toHaveProperty(
      [3, "cond", "operation"],
      TokenType.Less
    );
  });
  it("parses equality operators", () => {
    const file = doParse(`
      if(x > 2 == false) {

      }
      if(x > 2 != false) {

      }
    `);
    expect(file.statements).toHaveProperty(
      [0, "cond", "operation"],
      TokenType.EqualEqual
    );
    expect(file.statements).toHaveProperty(
      [1, "cond", "operation"],
      TokenType.BangEqual
    );
  });
  it("parses logical operators", () => {
    const file = doParse(`
      if(x > 2 == false && x < 25) {

      }
      if(x > 2 != false || y != 3) {

      }
    `);
    expect(file.statements).toHaveProperty(
      [0, "cond", "operation"],
      TokenType.AND
    );
    expect(file.statements).toHaveProperty(
      [1, "cond", "operation"],
      TokenType.OR
    );
  });
  it("parses logical operators with the correct precedence", () => {
    const file = doParse(`
      if(true && false || undef) {

      }
      if(true || false && undef) {

      }

    `);
    expect(file.statements).toHaveProperty(
      [0, "cond", "operation"],
      TokenType.OR
    );
    expect(file.statements).toHaveProperty(
      [1, "cond", "operation"],
      TokenType.OR
    );
  });
  it("parses the ternary operator", () => {
    const file = doParse(`
      x = a ? b : c;
    `);
    expect(file.statements[0]).toHaveProperty("value.cond");
    expect(file.statements[0]).toHaveProperty("value.ifExpr");
    expect(file.statements[0]).toHaveProperty("value.ifExpr.name", "b");
    expect(file.statements[0]).toHaveProperty("value.elseExpr.name", "c");
  });
  it("parses nested ternary operators", () => {
    const file = doParse(`
      x = a ? x ? d : u : c;
    `);
    expect(file.statements[0]).toHaveProperty("value.cond");
    expect(file.statements[0]).toHaveProperty("value.ifExpr");
    expect(file.statements[0]).toHaveProperty("value.ifExpr.cond.name", "x");
    expect(file.statements[0]).toHaveProperty("value.ifExpr.ifExpr.name", "d");
    expect(file.statements[0]).toHaveProperty("value.elseExpr.name", "c");
  });
  it("throws on unterminated ternary operator", () => {
    expect(() =>
      doParse(`
       val = cond ? dup
    `)
    ).toThrow(ParsingError);
  });
  it("throws on empty assignment", () => {
    expect(() =>
      doParse(`
       val = 
    `)
    ).toThrow(ParsingError);
  });
  it("throws ParsingError on unfinished module tag", () => {
    expect(() =>
      doParse(`
        !
      `)
    ).toThrow(ParsingError);
  });
  it("parses empty vector literals", () => {
    const file = doParse(`
      x = [];
    `);
    expect(file.statements[0]).toHaveProperty("value.children", []);
  });
  it("throws on unterminated vector literals", () => {
    expect(() =>
      doParse(`
      asdf = [10, 
    `)
    ).toThrow(ParsingError);
  });
  it("parses a vector literal with one value", () => {
    const file = doParse(`
      x = [10];
    `);
    expect(file.statements[0]).toHaveProperty("value.children.length", 1);
    expect(file.statements[0]).toHaveProperty("value.children.0.value", 10);
  });
  it("parses a vector literal with one value and trailing commas", () => {
    const file = doParse(`
      x = [10,,,,,];
    `);
    expect(file.statements[0]).toHaveProperty("value.children.length", 1);
    expect(file.statements[0]).toHaveProperty("value.children.0.value", 10);
  });
  it("parses a vector literal with multiple values and trailing commas", () => {
    const file = doParse(`
      x = [10,,20,,,];
    `);
    expect(file.statements[0]).toHaveProperty("value.children.length", 2);
    expect(file.statements[0]).toHaveProperty("value.children.0.value", 10);
    expect(file.statements[0]).toHaveProperty("value.children.1.value", 20);
  });
  it("parses a vector literal with multiple values", () => {
    const file = doParse(`
      x = [10, "string", true];
    `);
    expect(file.statements[0]).toHaveProperty("value.children.length", 3);
    expect(file.statements[0]).toHaveProperty("value.children.0.value", 10);
    expect(file.statements[0]).toHaveProperty(
      "value.children.1.value",
      "string"
    );
    expect(file.statements[0]).toHaveProperty("value.children.2.value", true);
  });
  it("parses a vector literal with multiple values in parenthesis", () => {
    const file = doParse(`
      x = [(10 + 5), "string", true];
    `);
    expect(file.statements[0]).toHaveProperty("value.children.length", 3);
    expect((file.statements[0] as any).value.children[0]).toBeInstanceOf(
      GroupingExpr
    );
    expect(file.statements[0]).toHaveProperty(
      "value.children.1.value",
      "string"
    );
    expect(file.statements[0]).toHaveProperty("value.children.2.value", true);
  });
  it("parses a vector literal with a value that starts with a parenthesis but doesn't end with it", () => {
    const file = doParse(`
      x = [(10 + 5) * 20, "string", ((18))];
    `);
    expect(file.statements[0]).toHaveProperty("value.children.length", 3);
    expect((file.statements[0] as any).value.children[0]).toBeInstanceOf(
      BinaryOpExpr
    );
  });
  it("parses empty vector literals with useless commas", () => {
    const file = doParse(`
      x = [,,,,,,];
    `);
    expect(file.statements[0]).toHaveProperty("value.children", []);
  });
  it("throws when the vector literal contains useless leading commas, but is not empty", () => {
    expect(() =>
      doParse(`
      x = [,,,,,,20]
    `)
    ).toThrowError(ParsingError);
  });
  it("parses two element ranges", () => {
    const file = doParse(`
      x = [10:18];
    `);
    expect((file.statements[0] as any).value).toBeInstanceOf(RangeExpr);
    const range = (file.statements[0] as any).value as RangeExpr;
    expect(range.begin).toHaveProperty("value", 10);
    expect(range.end).toHaveProperty("value", 18);
    expect(range.step).toBeNull();
  });
  it("parses three element ranges", () => {
    const file = doParse(`
      x = [10:99:18];
    `);
    expect((file.statements[0] as any).value).toBeInstanceOf(RangeExpr);
    const range = (file.statements[0] as any).value as RangeExpr;
    expect(range.begin).toHaveProperty("value", 10);
    expect(range.end).toHaveProperty("value", 18);
    expect(range.step).toHaveProperty("value", 99);
  });
  it("parses the 'if' list comprehension element", () => {
    const file = doParse(`
      x = [if(a == 18) a, 22];
    `);
    const vectorExpr = (file.statements[0] as any).value as VectorExpr;
    expect(vectorExpr).toBeInstanceOf(VectorExpr);
    const ifCompr = vectorExpr.children[0] as LcIfExpr;
    expect(ifCompr).toBeInstanceOf(LcIfExpr);
    expect(ifCompr.cond).toBeInstanceOf(BinaryOpExpr);
    expect(ifCompr.ifExpr).toBeInstanceOf(LookupExpr);
  });
  it("parses the 'if' list comprehension element when wrapped in parens", () => {
    const file = doParse(`
      x = [(if(a == 18) a), 22];
    `);
    const vectorExpr = (file.statements[0] as any).value as VectorExpr;
    expect(vectorExpr).toBeInstanceOf(VectorExpr);
    const ifCompr = vectorExpr.children[0] as LcIfExpr;
    expect(ifCompr).toBeInstanceOf(LcIfExpr);
    expect(ifCompr.cond).toBeInstanceOf(BinaryOpExpr);
    expect(ifCompr.ifExpr).toBeInstanceOf(LookupExpr);
  });
  it("parses the 'if' list comprehension element with an else branch", () => {
    const file = doParse(`
      x = [undef, if(a == 18) a else 999, 22];
    `);
    const vectorExpr = (file.statements[0] as any).value as VectorExpr;
    expect(vectorExpr).toBeInstanceOf(VectorExpr);
    const ifCompr = vectorExpr.children[1] as LcIfExpr;
    expect(ifCompr).toBeInstanceOf(LcIfExpr);
    expect(ifCompr.cond).toBeInstanceOf(BinaryOpExpr);
    expect(ifCompr.ifExpr).toBeInstanceOf(LookupExpr);
    expect(ifCompr.elseExpr).toBeInstanceOf(LiteralExpr);
  });
  it("parses nested 'if' list comprehensions", () => {
    const file = doParse(`
      x = [if(a == 18) if(ddd == 999) abc, 22];
    `);
    const vectorExpr = (file.statements[0] as any).value as VectorExpr;
    expect(vectorExpr).toBeInstanceOf(VectorExpr);
    const ifCompr = vectorExpr.children[0] as LcIfExpr;
    expect(ifCompr).toBeInstanceOf(LcIfExpr);
    expect(ifCompr.cond).toBeInstanceOf(BinaryOpExpr);
    expect(ifCompr.ifExpr).toBeInstanceOf(LcIfExpr);
  });
  it("parses simple 'each' list comprehensions", () => {
    const file = doParse(`
      x = [true, false, each [1, 2, 3]];
    `);
    const vectorExpr = (file.statements[0] as any).value as VectorExpr;
    expect(vectorExpr).toBeInstanceOf(VectorExpr);
    const eachCompr = vectorExpr.children[2] as LcEachExpr;
    expect(eachCompr).toBeInstanceOf(LcEachExpr);
    expect(eachCompr.expr).toBeInstanceOf(VectorExpr);
  });
  it("parses simple 'let' list comprehensions", () => {
    const file = doParse(`
      x = [let(var = 10) var + 10];
    `);
    const vectorExpr = (file.statements[0] as any).value as VectorExpr;
    expect(vectorExpr).toBeInstanceOf(VectorExpr);
    const letCompr = vectorExpr.children[0] as LcEachExpr;
    expect(letCompr).toBeInstanceOf(LcLetExpr);
  });
  it("parses simple 'for' list comprehensions", () => {
    expect(
      simplifyAst(
        doParse(`
      x = [for(iter = [10, 15, 20]) if(iter % 2 == 0) iter];
    `)
      )
    ).toMatchSnapshot();
  });
  it("parses simple 'for' list comprehensions with three parts", () => {
    expect(
      simplifyAst(
        doParse(`
          x = [for(iter = [10, 15, 20]; iter2 == 10; iter3 = xd) if(iter % 2 == 0) iter];
        `)
      )
    ).toMatchSnapshot();
  });
  it("parses simple 'for' list comprehensions with three parts and useless commas", () => {
    expect(
      simplifyAst(
        doParse(`
          x = [for(iter = [10, 15, 20],,,,abc=10,,,; iter2 == 10; iter3 = xd) if(iter % 2 == 0) iter];
        `)
      )
    ).toMatchSnapshot();
  });
  it("throws a ParsingError on unterminated for comprehenstions", () => {
    expect(() =>
      doParse(`
          x = [for(
        `)
    ).toThrowError(ParsingError);
  });
  it("throws a ParsingError on garbage in the parameters list", () => {
    expect(() =>
      doParse(`
          x = [-];
        `)
    ).toThrowError(ParsingError);
  });
  it("parses empty for comprehensions ", () => {
    expect(
      simplifyAst(
        doParse(`
          x = [for(;false;) true];
        `)
      )
    ).toMatchSnapshot();
  });
  it("throws a ParsingError on garbage in the for comprehension params", () => {
    expect(() =>
      doParse(`
          x = [for(%%%;false;)];
        `)
    ).toThrowError(ParsingError);
    expect(() =>
      doParse(`
        x = [for(abc = 10, %%%;false;)];
      `)
    ).toThrowError(ParsingError);
    expect(() =>
      doParse(`
        x = [for(x = 22
      `)
    ).toThrowError(ParsingError);
  });
  it("parses the 'let' expression", () => {
    const file = doParse(`
      x = let(varz = 28) varz + 10;
    `);
    const letExpr = (file.statements[0] as any).value as LetExpr;
    expect(letExpr).toBeInstanceOf(LetExpr);
    expect(letExpr.args[0].name).toEqual("varz");
    expect(letExpr.args[0].value).toBeInstanceOf(LiteralExpr);
    expect(letExpr.expr).toBeInstanceOf(BinaryOpExpr);
  });

  it("parses the 'let expression' inside the ternary expression", () => {
    const file = doParse(`
    x = 0 ? 1 : let(a = 5) a;
    `);
    expect(file).toMatchSnapshot();
  });
  it("parses the 'echo' expression", () => {
    const file = doParse(`
      x = echo("dddd") varz + 10;
    `);
    const e = (file.statements[0] as any).value as EchoExpr;
    expect(e).toBeInstanceOf(EchoExpr);
    expect(e.args[0].name).toEqual("");
    expect(e.args[0].value).toBeInstanceOf(LiteralExpr);
    expect(e.expr).toBeInstanceOf(BinaryOpExpr);
  });
  it("parses the 'assert' expression", () => {
    const file = doParse(`
      x = assert(x == 22) varz + 10;
    `);
    const e = (file.statements[0] as any).value as AssertExpr;
    expect(e).toBeInstanceOf(AssertExpr);
    expect(e.args[0].name).toEqual("");
    expect(e.args[0].value).toBeInstanceOf(BinaryOpExpr);
    expect(e.expr).toBeInstanceOf(BinaryOpExpr);
  });
  it("peekNext does not crash when at end", () => {
    class ExtendedParser extends Parser {
      __test() {
        this.peekNext();
      }
    }
    const ec = new ErrorCollector();
    const l = new Lexer(new CodeFile("<test>", ``), ec);
    const p = new ExtendedParser(l.codeFile, l.scan(), ec);
    p.__test();
  });
  it("parses hull.scad", async () => {
    const file = await CodeFile.load(resolve(__dirname, "testdata/hull.scad"));
    const ec = new ErrorCollector();
    const lexer = new Lexer(file, ec);
    const parser = new Parser(file, lexer.scan(), ec);
    expect(simplifyAst(parser.parse())).toMatchSnapshot();
  });
  it("reports multiple errors when there are many problems", () => {
    const file = new CodeFile(
      "<test>",
      `function unfinished() = ;
      module ddd(sdsds = -) {}`
    );
    const ec = new ErrorCollector();
    const lexer = new Lexer(file, ec);
    const parser = new Parser(file, lexer.scan(), ec);
    parser.parse();
    expect(ec.hasErrors()).toBeTruthy();
    expect(ec.errors).toHaveLength(2);
    expect(ec.errors[0].codeLocation.formatWithContext()).toBeTruthy();
  });
  it("always sets codeFile.tokens.eot to the Eot token", () => {
    [
      ``,
      `x = assert(x == 22) varz + 10;`,
      `/*comment*/`,
      `if(true && false || undef) {}`,
      `//single-line`,
    ]
      .map(doParse)
      .forEach((f) => expect(f.tokens.eot.type).toEqual(TokenType.Eot));
  });
  it("throws an error when the use statement is not at the root of the file", () => {
    expect(() =>
      doParse(`
      module test() {
        use <error>;
      }
    `)
    ).toThrow(ParsingError);
  });
  it("throws an error when the include statement is not at the root of the file", () => {
    expect(() =>
      doParse(`
      module test() {
        include <error>;
      }
    `)
    ).toThrow(ParsingError);
  });
  it("parses function literal expressions", () => {
    doParse(`
        func = function (x) x * x;
        echo(func(5)); // ECHO: 25
    `);
  });
  it("parses weird calls to anonymous functions", () => {
    doParse(`
    a = 1;
    selector = function (which)
                 which == "add"
                 ? function (x) x + x + a
                 : function (x) x * x + a;
                 
    echo(selector("add"));     // ECHO: function(x) ((x + x) + a)
    echo(selector("add")(5));  // ECHO: 11
    
    echo(selector("mul"));     // ECHO: function(x) ((x * x) + a)
    echo(selector("mul")(5));  // ECHO: 26
    `);
  });

  it("parses calls in assignment expressions", () => {
    doParse(`
        x = func(5);
        `);
  });
  it("does not hang when parsing a declaration of a module called 'echo'", () => {
    expect(() =>
      doParse(`
        module echo() {
            echo("hello");
        }`)
    ).toThrow(ParsingError);
  });

  it("parses big_poly.scad in reasonable time", async () => {
    const file = await CodeFile.load(
      resolve(__dirname, "testdata/big_poly.scad")
    );
    ParsingHelper.parseFile(file);
  });

  it("errors out when an expression is used instead of an argument name in module declaration", () => {
    expect(() =>
      doParse(`
        module t1(good_one, 2+2) {}
      `)
    ).toThrow(ParsingError);
    expect(() =>
      doParse(`
        module t1(2+2) {}
      `)
    ).toThrow(ParsingError);
    expect(() =>
      doParse(`
        module t1(2+2, good_one) {}
      `)
    ).toThrow(ParsingError);
    expect(() =>
      doParse(`
        module t1(good_one+2) {}
      `)
    ).toThrow(ParsingError);
  });

  it("Can parse list comprehensions with unnamed variables", () => {
    doParse(`
      x = [for([0:3]) 1];
      echo(x);
    `);
    doParse(`
      x = [for("abc") 1];
      echo(x);
    `);
    doParse(`
      alpha = "abc";
      x = [for(alpha) 1];
      echo(x);
    `);
  });

  it("Can parse for loops with unnamed variables", () => {
    doParse(`
      for ([-1, 1]){
          echo("should print two times");
      }
      
      intersection_for([-1, 1]){
          echo("this also should print two times");
      }
    `)
  })
});
