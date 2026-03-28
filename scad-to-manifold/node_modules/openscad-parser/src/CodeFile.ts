import * as fs from "fs";
import * as path from "path";

export default class CodeFile {
  constructor(public path: string, public code: string) {}

  get filename() {
    return path.basename(this.path);
  }

  /**
   * Loads an openscad file from the filesystem.
   */
  static async load(pathToLoad: string): Promise<CodeFile> {
    pathToLoad = path.resolve(pathToLoad); // normalize the path
    const contents = await new Promise<string>((res, rej) => {
      fs.readFile(
        pathToLoad,
        {
          encoding: "utf8",
        },
        (err, data) => {
          if (err) {
            rej(err);
            return;
          }
          res(data);
        }
      );
    });
    return new CodeFile(pathToLoad, contents);
  }
}
