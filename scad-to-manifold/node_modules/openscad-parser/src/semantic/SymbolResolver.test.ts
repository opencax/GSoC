import { PreludeUtil } from "..";
import AssignmentNode from "../ast/AssignmentNode";
import { AssertExpr, LiteralExpr } from "../ast/expressions";
import ScadFile from "../ast/ScadFile";
import ASTMutator from "../ASTMutator";
import CodeFile from "../CodeFile";
import ParsingHelper from "../ParsingHelper";
import ASTScopePopulator from "./ASTScopePopulator";
import { ScadFileWithScope } from "./nodesWithScopes";
import { ResolvedLookupExpr } from "./resolvedNodes";
import Scope from "./Scope";
import SymbolResolver from "./SymbolResolver";

describe("SymbolResolver", () => {
  it("resolves local symbols in file top level", () => {
    let [ast, ec] = ParsingHelper.parseFile(
      new CodeFile(
        "<test>",
        `x = [10:20];
         cincoman = assert(1==1) x;
    `
      )
    );
    ec.throwIfAny();
    if(!ast) {
      throw new Error("ast is null");
    }
    const pop = new ASTScopePopulator(new Scope());
    ast = ast.accept(pop) as ScadFile;
    const resolver = new SymbolResolver(ec);
    ast = ast.accept(resolver) as ScadFile;
    ec.throwIfAny();
    class A extends ASTMutator {
      visitAssertExpr(n: AssertExpr) {
        expect(n.expr).toBeInstanceOf(ResolvedLookupExpr);
        return n;
      }
    }
    ast.accept(new A());
  });

  it("resolves local symbols in block statements, with correct shadowing", () => {
    let [ast, ec] = ParsingHelper.parseFile(
      new CodeFile(
        "<test>",
        `x = [10:20];
         {
           x = "correct";
           cincoman = assert(1==1) x;
         }
    `
      )
    );
    ec.throwIfAny();
    const pop = new ASTScopePopulator(new Scope());
    ast = ast!.accept(pop) as ScadFile;
    const resolver = new SymbolResolver(ec);
    ast = ast.accept(resolver) as ScadFile;
    ec.throwIfAny();

    const confirmFn = jest.fn();

    class A extends ASTMutator {
      visitAssertExpr(n: AssertExpr) {
        confirmFn();
        expect(n.expr).toBeInstanceOf(ResolvedLookupExpr);
        expect(
          (n.expr as ResolvedLookupExpr).resolvedDeclaration
        ).toBeInstanceOf(AssignmentNode);
        expect(
          ((n.expr as ResolvedLookupExpr).resolvedDeclaration as AssignmentNode).value
        ).toBeInstanceOf(LiteralExpr);
        expect(
          (
            ((n.expr as ResolvedLookupExpr).resolvedDeclaration as AssignmentNode)
              .value as LiteralExpr<string>
          ).value
        ).toEqual("correct");
        return n;
      }
    }
    ast.accept(new A());
    expect(confirmFn).toHaveBeenCalled(); // make sure we have called the method which verifies this test
  });
  it("resolves local symbols inside of module children", () => {
    let [ast, ec] = ParsingHelper.parseFile(
      new CodeFile(
        "<test>",
        `x = [10:20];
        module mod();
         mod() {
           x = "correct";
           cincoman = assert(1==1) x;
         };
    `
      )
    );
    ec.throwIfAny();
    const pop = new ASTScopePopulator(new Scope());
    ast = ast!.accept(pop) as ScadFile;
    const resolver = new SymbolResolver(ec);
    ast = ast.accept(resolver) as ScadFile;
    ec.throwIfAny();

    const confirmFn = jest.fn();

    class A extends ASTMutator {
      visitAssertExpr(n: AssertExpr) {
        confirmFn();
        expect(n.expr).toBeInstanceOf(ResolvedLookupExpr);
        expect(
          (n.expr as ResolvedLookupExpr).resolvedDeclaration
        ).toBeInstanceOf(AssignmentNode);
        expect(
          ((n.expr as ResolvedLookupExpr).resolvedDeclaration as AssignmentNode).value
        ).toBeInstanceOf(LiteralExpr);
        expect(
          (
          (  (n.expr as ResolvedLookupExpr).resolvedDeclaration as AssignmentNode)
              .value as LiteralExpr<string>
          ).value
        ).toEqual("correct");
        return n;
      }
    }
    ast.accept(new A());
    expect(confirmFn).toHaveBeenCalled(); // make sure we have called the method which verifies this test
  });
  it("preserves nodes with scopes in the returned AST so that code completion still works", () => {
    let [ast, ec] = ParsingHelper.parseFile(
      new CodeFile(
        "<test>",
        `x = [10:20];
         {
           x = "correct";
           cincoman = assert(1==1) x;
         }
    `
      )
    );
    ec.throwIfAny();
    const pop = new ASTScopePopulator(new Scope());
    ast = ast!.accept(pop) as ScadFile;
    expect(ast).toBeInstanceOf(ScadFileWithScope);
    const resolver = new SymbolResolver(ec);
    ast = ast.accept(resolver) as ScadFile;
    ec.throwIfAny();
    expect(ast).toBeInstanceOf(ScadFileWithScope);
  });
  it("resolves variables from for loops", () => {
    let [ast, ec] = ParsingHelper.parseFile(
      new CodeFile(
        "<test>",
        `
          for(x = [1 : 5]) {
            cincoman = assert(1==1) x;
          }
          intersection_for(x = [1 : 5]) {
            cincoman = assert(1==1) x;
          }
      `
      )
    );
    ec.throwIfAny();
    const pop = new ASTScopePopulator(new Scope());
    let astWithScope = ast!.accept(pop) as ScadFileWithScope;
    astWithScope.scope.siblingScopes = [PreludeUtil.preludeScope];
    const resolver = new SymbolResolver(ec);
    astWithScope = astWithScope.accept(resolver) as ScadFileWithScope;
    ec.throwIfAny();
    const confirmFn = jest.fn();

    class A extends ASTMutator {
      visitAssertExpr(n: AssertExpr) {
        expect(n.expr).toBeInstanceOf(ResolvedLookupExpr);
        confirmFn();
        return n;
      }
    }
    astWithScope.accept(new A());
    expect(confirmFn).toHaveBeenCalled();
  });
   it("resolves function calls to anonymous functions", () => {
    let [ast, ec] = ParsingHelper.parseFile(
      new CodeFile(
        "<test>",
        `
              
              func = function (x) x * x;
              a = func(5); // ECHO: 25
      `
      )
    );
    ec.throwIfAny();
    const pop = new ASTScopePopulator(new Scope());
    let astWithScope = ast!.accept(pop) as ScadFileWithScope;
    astWithScope.scope.siblingScopes = [PreludeUtil.preludeScope];
    const resolver = new SymbolResolver(ec);
    astWithScope = astWithScope.accept(resolver) as ScadFileWithScope;
    ec.throwIfAny();
  });

});
