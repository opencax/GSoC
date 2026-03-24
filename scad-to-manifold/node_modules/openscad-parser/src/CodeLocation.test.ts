import CodeFile from "./CodeFile";
import CodeLocation from "./CodeLocation";

describe("CodeLocation", () => {
  it("stringifies itself and matches snapshot", () => {
    const str = new CodeLocation(new CodeFile("s", "d"), 34, 4, 8).toString();
    expect(str).toMatchSnapshot();
  });
  it("constructs", () => {
    new CodeLocation();
  });
});
