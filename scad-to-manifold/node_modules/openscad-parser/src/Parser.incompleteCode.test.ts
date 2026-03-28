import AssignmentNode from "./ast/AssignmentNode";
import ScadFile from "./ast/ScadFile";
import CodeFile from "./CodeFile";
import ParsingHelper from "./ParsingHelper";

describe("parser - tests when the code is incomplete", () => {
  function doParse(source: string): ScadFile {
    const [ast, errorCollector] = ParsingHelper.parseFile(
      new CodeFile("<test>", source)
    );
    return ast!;
  }
  it("manages to extract variable declarations when there is a semicolon missing", () => {
    const ast = doParse(`
            x = 8;
            foo = 
        `);
    expect(ast.statements[0]).toBeInstanceOf(AssignmentNode);
    expect(ast.statements[1]).not.toBeUndefined();
  });
});
