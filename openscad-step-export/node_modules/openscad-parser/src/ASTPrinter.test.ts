import { resolve } from "path";
import ScadFile from "./ast/ScadFile";
import ASTPrinter from "./ASTPrinter";
import CodeFile from "./CodeFile";
import ErrorCollector from "./ErrorCollector";
import FormattingConfiguration from "./FormattingConfiguration";
import Lexer from "./Lexer";
import ParsingHelper from "./ParsingHelper";
import ASTScopePopulator from "./semantic/ASTScopePopulator";
import Scope from "./semantic/Scope";
import TokenType from "./TokenType";

describe("ASTPrinter", () => {
  function doFormat(source: string) {
    let [ast, errorCollector] = ParsingHelper.parseFile(
      new CodeFile("<test>", source)
    );
    errorCollector.throwIfAny();
    if (!ast) {
      throw new Error("No AST");
    }
    ast = new ASTScopePopulator(new Scope()).populate(ast) as ScadFile; // populating the scopes should not change anything
    return new ASTPrinter(new FormattingConfiguration()).visitScadFile(ast);
  }
  function injectCommentsBetweenTokens(source: string): [string, string[]] {
    const ec = new ErrorCollector();
    const lexer = new Lexer(new CodeFile("<test>", source), ec);
    const tokens = lexer.scan();
    ec.throwIfAny();
    let injectId = 0;
    const injectedStrings: string[] = [];
    let codeWithInjections = "";
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      let shouldInject = true;

      // do not inject comments around the use statement since it is illegal
      if (
        tok.type === TokenType.Use ||
        (i != 0 && tokens[i - 1].type === TokenType.Use) ||
        tok.type === TokenType.Include ||
        (i != 0 && tokens[i - 1].type === TokenType.Include)
      ) {
        shouldInject = false;
      }
      if (shouldInject) {
        const injectionBefore = `/* INJ_${injectId}_B */`;
        codeWithInjections += " " + injectionBefore + " ";
        injectedStrings.push(injectionBefore);
        injectId++;
      }
      codeWithInjections += tok.lexeme;
      if (shouldInject) {
        const injectionAfter = `/* INJ_${injectId}_A */`;
        codeWithInjections += " " + injectionAfter + " ";
        injectedStrings.push(injectionAfter);
        injectId++;
      }
    }
    return [codeWithInjections, injectedStrings];
  }

  /**
   * Inserts comments between all tokens and then formats the code,
   * then checks if the comments are still there
   * @param source the source code to check
   */
  function doPreserveTest(source: string) {
    const [codeWithInjections, injectedStrings] =
      injectCommentsBetweenTokens(source);

    // we do two passes, one with all the comments and another one with the problematic ones, this is where we throw errors
    const formatted = doFormat(codeWithInjections);
    let problematicCode = codeWithInjections;
    let problematicInjections: string[] = [];
    for (const inj of injectedStrings) {
      if (formatted.indexOf(inj) !== -1) {
        // the injection exists in the formatted code se we remove it
        problematicCode = problematicCode.replace(inj, " ");
      } else {
        problematicInjections.push(inj);
      }
    }
    const problematicFormatted = doFormat(problematicCode);
    if (problematicInjections.length > 0) console.log(problematicCode);
    for (const prob of problematicInjections) {
      expect(problematicFormatted).toEqual(expect.stringContaining(prob));
    }
  }

  test("it preserves all comments in a file with all the syntactical elements", () => {
    doPreserveTest(`
    use <ddd>
    include <gfff>
    assignment = 123; the_same_line = 8;
    function ddd(argv = 10, second = !true) = (10 + 20) * 10;
    ybyby = x > 10 ? let(v = 200) doSomething() : assert(x = 20) echo("nothing") 5;
    arr = [20, if(true) each [20:50:30] else [808][0].x];
    compre = [for(a = [rang1, 2, 3]) let(x = a + 1) [sin(a)],];
    fun = function(a, b) a * b(13);
    alpha = undef || beta && gamma;
    module the_mod(arg1, arg2=2-2) {
        echo( [for (a = 0, b = 1;a < 5;a = a + 1, b = b + 2) [ a, b * b ] ] );
        if(yeah == true) {
            ;
        } else {

        }
    }
    `);
  });
  test("it preserves all comments nearby an use statement", () => {
    doPreserveTest(`
      use <ddd>
      
    `);
  });
  test("it preserves all comments nearby vectors", () => {
    doPreserveTest(`
      a = [d,];
    `);
    doPreserveTest(`
      a = [d,a,b];
    `);
    doPreserveTest(`
      a = [d];
    `);
  });
  test("it preserves all comments nearby list comprehensions with a for", () => {
    doPreserveTest(`
      compre = [for(a = [rang1, 2, 3]) x ];
    `);
  });

  test("it preserves all comments nearby exponentiation operators", () => {
    doPreserveTest(`
      expo = 3 * 2 ^ 8;
    `);
  });

  test("it preserves all comments nearby module modifiers", () => {
    doPreserveTest(`
     % asdf();
     * ffff();
     # xD();
     ! bangbang();
    `);
  });

  test("it preserves comments and tokens nearby anonymous functions", () => {
    doPreserveTest(`
    func = function (x) x * x;
    echo(func(5)); // ECHO: 25

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

  test.skip("it preserves comments in ddd.scad", async () => {
    doPreserveTest(
      (await CodeFile.load(resolve(__dirname, "testdata/ddd.scad"))).code
    );
  });
  test("it does not add a space between the closing paren and semicolon in an empty module", () => {
    const f = doFormat(`module asdf();`);

    expect(f).not.toStrictEqual(expect.stringContaining(") ;"));
  });
  test("does not cut off end chevron of an use statement", () => {
    const f = doFormat(`use <xD>`);

    expect(f).toStrictEqual(expect.stringContaining("<xD>"));
  });

  test("does not cut off modifiers in module instantations", () => {
    const f = doFormat(`
    
    
      translate([0, -100, -50]) 
      %  import("relay_din_mount.stl");
    `);
    expect(f).toStrictEqual(expect.stringContaining("%"));
  });

  test("does not introduce newlines before else branches", () => {
    const f = doFormat(`
    
      if(true) {
        doSomething();
      } else {
        doSomethingElse();
      }
    `);
    expect(f).toStrictEqual(expect.stringContaining("} else {"));
  });

  test("does not introduce newlines before else if branches", () => {
    const f = doFormat(`
    
      if(true) {
        doSomething();
      } else if(false) {
        doSomethingElse();
      }
    `);
    expect(f).toStrictEqual(expect.stringContaining("} else if(false) {"));
  });

  test("preserves exponentiation operators", () => {
    const f = doFormat(`
    expo = 3 * 2 ^ 8;
  `);
    expect(f).toStrictEqual(expect.stringContaining("^"));
  });

  test("formats 'for' comprehensions without variable names", () => {
    expect(doFormat(`x = [for([0:3]) 1];`)).toStrictEqual(
      `x = [for([0 : 3]) 1];\n`
    );
  });

  test("does not add a newline after a semicolon in an assignment if a comment follows it", () => {
    const f = doFormat(`
enum_value="a"; // [a:ayyyy, b:beee, c:seeee]
  `);
    expect(f).toStrictEqual(`
enum_value = "a"; // [a:ayyyy, b:beee, c:seeee]
`);
  });
  test("does keep a newline after a semi-colon in an assignment if the user wants it", () => {
    const f = doFormat(
      `
enum_value="a";
// [a:ayyyy, b:beee, c:seeee]
  `
    );
    expect(f).toStrictEqual(`
enum_value = "a";
// [a:ayyyy, b:beee, c:seeee]
`);
  });
  it("preserves comments in 'for' list comprehensions", () => {
    doPreserveTest(`
      x = [for(a = [0:3]) 1];
    `);
  });
  it("preserves comments in 'for' list comprehensions without variable names", () => {
    doPreserveTest(`
      x = [for([0:3]) 1];
      x = [for("abc") 1];
      x = [for(alpha) 1];
    `);
  });
  it("correctly handles comments after chained module instantiations", () => {
    const formatted = doFormat(`
$fn=4;// a comment
translate([-5,-5,-10]) scale([1,1,2]) // another comment
cube([10,10,10]);
    `);

    expect(formatted).toStrictEqual(`
$fn = 4; // a comment
translate([-5, -5, -10])
    scale([1, 1, 2]) // another comment
    cube([10, 10, 10]);
`);
  });

  it("it adds spaces between module chained instantiations in one line", () => {
    const formatted = doFormat(`
scale()cube();
    `);

    expect(formatted).toStrictEqual(`
scale() cube();
`);
  });

  it("properly breaks apart long module instantiations", () => {
    const formatted = doFormat(`
scale() translate() translate() translate() rotate() cube();
    `);
    expect(formatted).toStrictEqual(`
scale()
    translate()
    translate()
    translate()
    rotate()
    cube();
`);
  });
  it("preserves comments in varius module instantiations", () => {
    doPreserveTest(`
      scale() translate() translate() translate() rotate() cube();
      scale()
        translate()
        translate()
        translate()
        rotate()
        cube();
      scale()cube();
      $fn = 4; // a comment
translate([-5, -5, -10])
    scale([1, 1, 2]) // another comment
    cube([10, 10, 10]);
    `);
  });

  test("It preserves comments in files doing division (harness test)", async () => {
    doPreserveTest(`translate([distance1-distance1/2,8.5,0]);`);
  });

  it("doesn't break code with comment after ending brace", async () => {
    const formatted = doFormat(`
{      
{                
 } //end if
}`);

    let [ast, errorCollector] = ParsingHelper.parseFile(
      new CodeFile("<test>", formatted)
    );
    errorCollector.throwIfAny();
  });

  it("Adds newlines between stacked closing braces", async () => {
    const formatted = doFormat(`
{      
{                
 }}`);
    expect(formatted).not.toContain("}}");
  });

  it("does not add newlines near the else keyword in ifs", async () => {
    const formatted = doFormat(`
if(true) {
} else {
 
}`);
    expect(formatted).toContain("} else {");
  });

  it("doesn't break code with comment after ending brace of an else statement", async () => {
    const formatted = doFormat(`
if(true) {
} // hello
 else
 // hello
 {
 
}`);

    let [ast, errorCollector] = ParsingHelper.parseFile(
      new CodeFile("<test>", formatted)
    );
    errorCollector.throwIfAny();
  });
});
