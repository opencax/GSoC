import ScadFile from "../ast/ScadFile";
import CodeFile from "../CodeFile";
import CodeLocation from "../CodeLocation";
import ParsingHelper from "../ParsingHelper";
import ASTScopePopulator from "./ASTScopePopulator";
import CompletionUtil from "./CompletionUtil";
import Scope from "./Scope";

describe("CompletionUtil", () => {
  async function doComplete(source: string, charOffset: number) {
    let [ast, errorCollector] = ParsingHelper.parseFile(
      new CodeFile("<test>", source)
    );
    errorCollector.throwIfAny();
    ast = new ASTScopePopulator(new Scope()).populate(ast!) as ScadFile; // populating the scopes should not change anything
    return await CompletionUtil.getSymbolsAtLocation(
      ast,
      new CodeLocation(ast.span.start.file, charOffset)
    );
  }
  it("provides completions in the global scope, at the end of the file", async () => {
    const s = `
      the_var = 10;

    `;
    const results = await doComplete(s, s.length - 1);
    expect(results.length).toBeGreaterThan(0);
    expect(results.find((r) => r.name === "the_var")).toBeTruthy();
  });

  it("does not crash when completing inside an incomplete module instantation", async () => {
    let [ast, errorCollector] = ParsingHelper.parseFile(
      new CodeFile("<test>", `circle(d )`)
    );
    ast = new ASTScopePopulator(new Scope()).populate(ast!) as ScadFile; // populating the scopes should not change anything
    expect(async () => {
      await CompletionUtil.getSymbolsAtLocation(
        ast!,
        new CodeLocation(ast!.span.start.file, 9)
      );
    }).not.toThrow();
  });
});
