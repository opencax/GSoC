import AssignmentNode from "./ast/AssignmentNode";
import { GroupingExpr, LiteralExpr, LookupExpr } from "./ast/expressions";
import ScadFile from "./ast/ScadFile";
import { BlockStmt } from "./ast/statements";
import ASTPinpointer, { BinAfter, BinBefore } from "./ASTPinpointer";
import CodeFile from "./CodeFile";
import CodeLocation from "./CodeLocation";
import ErrorCollector from "./ErrorCollector";
import Lexer from "./Lexer";
import ParsingHelper from "./ParsingHelper";
import ASTScopePopulator from "./semantic/ASTScopePopulator";
import Scope from "./semantic/Scope";

describe("ASTPinpointer", () => {
  it("the internal binsearch dispatch works with simple tokens", () => {
    const f = new CodeFile("<test>", "a=5;b=a;");
    const ec = new ErrorCollector();

    const lexer = new Lexer(f, ec);
    const tokens = lexer.scan();
    ec.throwIfAny();
    class TstClass extends ASTPinpointer {
      testFunc1() {
        return this.processAssembledNode(
          [tokens[1], tokens[2]],
          new ScadFile([], { eot: tokens[tokens.length - 1] })
        );
      }
    }
    const p = new TstClass(new CodeLocation(f, 0));
    expect(p.testFunc1()).toEqual(BinBefore);

    p.pinpointLocation = new CodeLocation(f, 200);
    expect(p.testFunc1()).toEqual(BinAfter);

    p.pinpointLocation = new CodeLocation(f, 4);
    expect(p.testFunc1()).toEqual(BinAfter);
  });
  it("the internal binsearch dispatch works with function trees", () => {
    const f = new CodeFile("<test>", "a=5;b=a;");
    const ec = new ErrorCollector();

    const lexer = new Lexer(f, ec);
    const tokens = lexer.scan();
    ec.throwIfAny();
    class TstClass extends ASTPinpointer {
      testFunc1() {
        return this.processAssembledNode(
          [
            () =>
              this.processAssembledNode(
                [
                  tokens[0],
                  tokens[1],
                  () =>
                    this.processAssembledNode(
                      [tokens[2]],
                      new (LiteralExpr as any)()
                    ),
                  tokens[3],
                ],
                new (AssignmentNode as any)()
              ),
            () =>
              this.processAssembledNode(
                [
                  tokens[4],
                  tokens[5],
                  () =>
                    this.processAssembledNode(
                      [tokens[6]],
                      new (LiteralExpr as any)()
                    ),
                  tokens[7],
                ],
                new (AssignmentNode as any)()
              ),
          ],
          new (ScadFile as any)()
        );
      }
    }
    const p = new TstClass(new CodeLocation(f, 0));
    expect(p.testFunc1()).toBeInstanceOf(AssignmentNode);

    p.pinpointLocation = new CodeLocation(f, 200);
    expect(p.testFunc1()).toEqual(BinAfter);

    p.pinpointLocation = new CodeLocation(f, 1);
    expect(p.testFunc1()).toBeInstanceOf(AssignmentNode);
    p.pinpointLocation = new CodeLocation(f, 2);
    expect(p.testFunc1()).toBeInstanceOf(LiteralExpr);
    p.pinpointLocation = new CodeLocation(f, 3);
    expect(p.testFunc1()).toBeInstanceOf(AssignmentNode);
  });
  it("pinpoints nodes in a simple assignment expression", () => {
    const f = new CodeFile("<test>", "a=5;b=a;");
    //                                12345678

    const [ast, ec] = ParsingHelper.parseFile(f);
    ec.throwIfAny();
    if(!ast) {
      throw new Error("ast is null");
    }
    const ap = new ASTPinpointer(new CodeLocation(f, 1));
    let theNode = ap.doPinpoint(ast);
    expect(theNode).toBeInstanceOf(AssignmentNode);
    ap.pinpointLocation = new CodeLocation(f, 2);
    theNode = ap.doPinpoint(ast);
    expect(theNode).toBeInstanceOf(LiteralExpr);
    ap.pinpointLocation = new CodeLocation(f, 3);
    theNode = ap.doPinpoint(ast);
    expect(theNode).toBeInstanceOf(AssignmentNode);
    ap.pinpointLocation = new CodeLocation(f, 4);
    theNode = ap.doPinpoint(ast);
    expect(theNode).toBeInstanceOf(AssignmentNode);
    ap.pinpointLocation = new CodeLocation(f, 5);
    theNode = ap.doPinpoint(ast);
    expect(theNode).toBeInstanceOf(AssignmentNode);
    ap.pinpointLocation = new CodeLocation(f, 6);
    theNode = ap.doPinpoint(ast);
    expect(theNode).toBeInstanceOf(LookupExpr);
    ap.pinpointLocation = new CodeLocation(f, 7);
    theNode = ap.doPinpoint(ast);
    expect(theNode).toBeInstanceOf(AssignmentNode);
  });
  it("populates bottomUpHierarchy", () => {
    const f = new CodeFile("<test>", "x=(10);");

    const [ast, ec] = ParsingHelper.parseFile(f);
    ec.throwIfAny();
    if(!ast) {
      throw new Error("ast is null");
    }

    const ap = new ASTPinpointer(new CodeLocation(f, 4));
    let theNode = ap.doPinpoint(ast);
    expect(theNode).toBeInstanceOf(LiteralExpr);
    expect(ap.bottomUpHierarchy[0]).toBeInstanceOf(LiteralExpr);
    expect(ap.bottomUpHierarchy[1]).toBeInstanceOf(GroupingExpr);
    expect(ap.bottomUpHierarchy[2]).toBeInstanceOf(AssignmentNode);
    expect(ap.bottomUpHierarchy[3]).toBeInstanceOf(ScadFile);
  });
  it("does not throw when pinpointing in a code file with a module instantation", () => {
    const f = new CodeFile("<test>", "cube([10, 10, 10]);");

    const [ast, ec] = ParsingHelper.parseFile(f);

    ec.throwIfAny();
    if(!ast) {
      throw new Error("ast is null");
    }

    const ap = new ASTPinpointer(new CodeLocation(f, 4));
    let theNode = ap.doPinpoint(ast);
  });
  it("does not throw when pinpointing a module delcaration in a scope populated ast, pinpoints the correct ast nodes", async () => {
    const f = await CodeFile.load("./src/testdata/pinpointer_block_test.scad");

    const [ast, ec] = ParsingHelper.parseFile(f);
    const lexer = new Lexer(f, ec);
    const tokens = lexer.scan();
    ec.throwIfAny();
    if(!ast) {
      throw new Error("ast is null");
    }
    const populator = new ASTScopePopulator(new Scope());
    const astWithScopes = ast.accept(populator);
    const ap = new ASTPinpointer(new CodeLocation(f, 32));
    let theNode; //= ap.doPinpoint(astWithScopes);
    ap.pinpointLocation = new CodeLocation(f, 58);
    theNode = ap.doPinpoint(ast);
    expect(theNode).toBeInstanceOf(BlockStmt);
  });
});
