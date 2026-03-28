import { resolve } from "url";
import CodeFile from "./CodeFile";

describe("CodeFile", () => {
  it("loads files from disk", async () => {
    const path = resolve(__dirname, "src/testdata/file1.scad");
    const file = await CodeFile.load(path);
    expect(file.code).toEqual("cube([2, 3, 8]);");
    expect(file.filename).toEqual("file1.scad");
  });
  it("rejects on error when loading", () => {
    return expect(CodeFile.load("/i/dont/exist")).rejects.toBeTruthy();
  });
});
