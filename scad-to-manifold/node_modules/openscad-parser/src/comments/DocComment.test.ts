import ScadFile from "../ast/ScadFile";
import { ModuleDeclarationStmt } from "../ast/statements";
import CodeFile from "../CodeFile";
import ParsingHelper from "../ParsingHelper";
import { IntrinsicAnnotation } from "./annotations";
import DocComment from "./DocComment";

describe("DocComment", () => {
  function doParse(source: string):ScadFile {
    const [ast, errorCollector] = ParsingHelper.parseFile(
      new CodeFile("<test>", source)
    );
    errorCollector.throwIfAny();
    return ast!;
  }
  it("parses a simple documentation comment", () => {
    const ast = doParse(`
        /**
         * Hello 
         * I am a documentation comment.
         **/
        module asdf() {

        }
      `);
    const dc = DocComment.fromExtraTokens(
      (ast.statements[0] as ModuleDeclarationStmt).tokens.moduleKeyword
        .extraTokens
    );
    expect(dc.documentationContent).toEqual(
      "Hello\nI am a documentation comment."
    );
  });
  it("parses a simple documentation comment with an annotation", () => {
    const ast = doParse(`
        /**
         * Hello 
         * I am a documentation comment.
         * @intrinsic controlFlow
         **/
        module asdf() {

        }
      `);
    const dc = DocComment.fromExtraTokens(
      (ast.statements[0] as ModuleDeclarationStmt).tokens.moduleKeyword
        .extraTokens
    );
    expect(dc.documentationContent).toEqual(
      "Hello\nI am a documentation comment."
    );
    expect(dc.annotations).toHaveLength(1);
    expect(dc.annotations[0]).toBeInstanceOf(IntrinsicAnnotation);
    expect((dc.annotations[0] as IntrinsicAnnotation).intrinsicType).toEqual(
      "controlFlow"
    );
  });
  it("does not leave param annotations in the doc description", () => {
    const ast = doParse(`
        /**
         * Hello 
         * I am a documentation comment.
         * @param d [named] [conflictsWith=r] [type=number] the diameter of the circle
         **/
        module asdf() {

        }
      `);
    const dc = DocComment.fromExtraTokens(
      (ast.statements[0] as ModuleDeclarationStmt).tokens.moduleKeyword
        .extraTokens
    );
    expect(dc.documentationContent).not.toContain("@param");
  });
});
