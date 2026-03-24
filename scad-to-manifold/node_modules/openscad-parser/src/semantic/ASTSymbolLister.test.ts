import CodeFile from "../CodeFile";
import ParsingHelper from "../ParsingHelper";
import ASTSymbolLister, { SymbolKind } from "./ASTSymbolLister";

describe("ASTSymbolLister", () => {
  it("returns module symbols", () => {
    const [ast, e] = ParsingHelper.parseFile(
      new CodeFile(
        "<test>",
        `
            module testMod() {}
        `
      )
    );
    e.throwIfAny();
    const symCb = jest.fn();
    const symbols = new ASTSymbolLister(
      (name, kind, fullRange, nameRange, children: void[]) => {
        symCb();
        expect(kind).toEqual(SymbolKind.MODULE);
      }
    ).doList(ast!);
    expect(symCb).toHaveBeenCalled();
  });
  it("returns variable symbols", () => {
    const [ast, e] = ParsingHelper.parseFile(
      new CodeFile(
        "<test>",
        `
           abrakadabra = 10;
        `
      )
    );
    e.throwIfAny();
    const symCb = jest.fn();
    const symbols = new ASTSymbolLister(
      (name, kind, fullRange, nameRange, children: void[]) => {
        symCb();
        expect(kind).toEqual(SymbolKind.VARIABLE);
        expect(name).toEqual("abrakadabra");
      }
    ).doList(ast!);
    expect(symCb).toHaveBeenCalled();
  });
});
