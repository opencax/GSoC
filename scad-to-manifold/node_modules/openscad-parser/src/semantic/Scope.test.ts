import AssignmentNode, { AssignmentNodeRole } from "../ast/AssignmentNode";
import { LiteralExpr } from "../ast/expressions";
import Scope from "./Scope";

describe("Scope", () => {
  it("resolves local variables", () => {
    const ass = new AssignmentNode(
      "testVar",
      new LiteralExpr(20, { literalToken: null as unknown as any }),
      AssignmentNodeRole.VARIABLE_DECLARATION,
      null as unknown as any
    );
    const scope = new Scope();
    scope.variables.set("testVar", ass);
    expect(scope.lookupVariable("testVar")).toEqual(ass);
  });
  it("resolves variables in parent scopes", () => {
    const ass = new AssignmentNode(
      "testVar",
      new LiteralExpr(20, { literalToken: null as unknown as any }),
      AssignmentNodeRole.VARIABLE_DECLARATION,
      null as unknown as any
    );
    const scope = new Scope();
    scope.variables.set("testVar", ass);
    const childScope = new Scope();
    childScope.parent = scope;
    expect(childScope.lookupVariable("testVar")).toEqual(ass);
  });
  it("returns null when no variable was found", () => {
    expect(new Scope().lookupVariable("notFound")).toBeNull();
  });
});
