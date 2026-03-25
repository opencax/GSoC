import CodeFile from "../CodeFile";
import FilenameCompletionProvider from "./FilenameCompletionProvider";
import ParsingHelper from "../ParsingHelper";
import CodeLocation from "../CodeLocation";
import { off } from "process";
import * as mockFs from "mock-fs";

describe("FilenameCompletionProvider.test", () => {
  beforeEach(() => {
    mockFs({
      "/test/ddd": "blah"
    });
  });
  afterEach(() => {
    mockFs.restore();
  });
  describe("shouldActivate", () => {
    const isInFilename = (code: string, offset: number) => {
      const cf = new CodeFile("/test/ddd", code);
      const [ast, ec] = ParsingHelper.parseFile(cf);
      ec.throwIfAny();
      if(!ast) {
        throw new Error("no ast");
      }
      const fcp = new FilenameCompletionProvider();
      return fcp.shouldActivate(ast, new CodeLocation(cf, offset, 0, 0));
    };
    it("does not activate when not inside of a filename", () => {
      expect(isInFilename(`include <MCAD/hardware.scad>`, 8)).toBeFalsy();
      expect(isInFilename(`include <MCAD/hardware.scad>`, 28)).toBeFalsy();
    });
    it("does activate when inside of a filename", () => {
      for (let i = 9; i < 28; i++) {
        expect(isInFilename(`include <MCAD/hardware.scad>`, i)).toBeTruthy();
      }
      for (let i = 5; i < 23; i++) {
        expect(isInFilename(`use <MCAD/hardware.scad>`, i)).toBeTruthy();
      }
    });
  });

  it("does list files when provided an absolute path", async () => {
    const cf = new CodeFile("/test/ddd", "use </");
    const [ast, ec] = ParsingHelper.parseFile(cf);

    const fcp = new FilenameCompletionProvider();
    expect(
      await fcp.getSymbolsAtLocation(ast!, new CodeLocation(cf, 5, 0, 0))
    ).not.toHaveLength(0);
  });
  it("extracts the correct existing filename from the include statement", async () => {
    const cf = new CodeFile("/test/ddd", "include <MCAD/hardware.scad>");
    const [ast, ec] = ParsingHelper.parseFile(cf);

    const fcp = new FilenameCompletionProvider();
    expect(
      await fcp.getExistingPath(ast!, new CodeLocation(cf, 26, 0, 0))
    ).toEqual("MCAD/hardware.scad");
    expect(
      await fcp.getExistingPath(ast!, new CodeLocation(cf, 27, 0, 0))
    ).toEqual("MCAD/hardware.scad");
    expect(
      await fcp.getExistingPath(ast!, new CodeLocation(cf, 25, 0, 0))
    ).toEqual("MCAD/hardware.sca");
  });
});
