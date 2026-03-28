import CodeFile from "./CodeFile";
import CodeLocation from "./CodeLocation";
import ErrorCollector from "./ErrorCollector";
import { UnexpectedCharacterLexingError } from "./errors/lexingErrors";

describe("ErrorCollector", () => {
  it("prints the errors to the console", () => {
    const ec = new ErrorCollector();
    ec.reportError(
      new UnexpectedCharacterLexingError(
        new CodeLocation(new CodeFile("/test.scad", "test"), 21, 37),
        "^"
      )
    );
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    ec.printErrors();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("^"));
  });
});
