import * as path from "path";
import ASTNode from "../ast/ASTNode";
import { ModuleInstantiationStmt } from "../ast/statements";
import ASTAssembler from "../ASTAssembler";
import CodeFile from "../CodeFile";
import ParsingHelper from "../ParsingHelper";
import Token from "../Token";
import ASTScopePopulator from "./ASTScopePopulator";
import { LcForExprWithScope } from "./nodesWithScopes";
import Scope from "./Scope";

describe("ASTScopePopulator", () => {
  it("does not crash when populating code containing range expressions", () => {
    const [ast, ec] = ParsingHelper.parseFile(
      new CodeFile("<test>", "x = [10:20];")
    );
    ec.throwIfAny();
    const pop = new ASTScopePopulator(new Scope());
    ast!.accept(pop);
  });
  it("populates the scope with prelude functions", async () => {
    const [ast, ec] = ParsingHelper.parseFile(
      await CodeFile.load(path.join(__dirname, "../prelude/prelude.scad"))
    );
    ec.throwIfAny();
    const scope = new Scope();
    const pop = new ASTScopePopulator(scope);
    ast!.accept(pop);
  });
  function checkIfExistsInTree<T>(
    source: string,
    Ctor: { new (...args: any[]): T },
    chkFunc?: (elem: T) => void
  ) {
    const [ast, ec] = ParsingHelper.parseFile(new CodeFile("<test>", source));
    ec.throwIfAny();
    const pop = new ASTScopePopulator(new Scope());
    const populated = ast!.accept(pop);
    const ok = jest.fn();
    class Tmp extends ASTAssembler<void> {
      protected processAssembledNode(
        t: (Token | (() => void))[],
        self: ASTNode
      ): void {
        if (self instanceof Ctor) {
          if (chkFunc) {
            chkFunc(self);
          }
          ok();
        }
        for (const a of t) {
          if (typeof a === "function") {
            a();
          }
        }
      }
    }

    populated.accept(new Tmp());
    expect(ok).toHaveBeenCalled();
  }

  it("creates LcForExprWithScope nodes", () => {
    checkIfExistsInTree(`x = [for(xD = [2,5]) xD];`, LcForExprWithScope);
  });
  it("creates LcForExprWithScope nodes for LcFor's without variable names", () => {
    checkIfExistsInTree(`x = [for([2,5]) 1];`, LcForExprWithScope);
  });
  it("preserves tags in module instantations", () => {
    checkIfExistsInTree(`% * theMod();`, ModuleInstantiationStmt, (mod) => {
      expect(mod.tagBackground).toBeTruthy();
      expect(mod.tagDisabled).toBeTruthy();
      expect(mod.tagRoot).toBeFalsy();
      expect(mod.tagHighlight).toBeFalsy();
    });
  });
});
