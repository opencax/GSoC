import { readFileSync } from "fs";
import { join } from "path";
import ScadFile from "../ast/ScadFile";
import CodeFile from "../CodeFile";
import ParsingHelper from "../ParsingHelper";
import ASTScopePopulator from "../semantic/ASTScopePopulator";
import Scope from "../semantic/Scope";

export default class PreludeUtil {
  private static _cachedPreludeScope: Scope | null = null;
  public static get preludeScope() {
    if (!this._cachedPreludeScope) {
      const preludeLocation = join(__dirname, "prelude.scad");
      let [ast, ec] = ParsingHelper.parseFile(
        new CodeFile(preludeLocation, readFileSync(preludeLocation, "utf8"))
      );
      ec.throwIfAny();
      this._cachedPreludeScope = new Scope();
      const pop = new ASTScopePopulator(this._cachedPreludeScope);
      if(!ast) {
        throw new Error("prelude ast is null");
      }
      ast = ast.accept(pop) as ScadFile;
    }

    return this._cachedPreludeScope;
  }
}
