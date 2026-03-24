import ScadFileProvider, { WithExportedScopes } from "./ScadFileProvider";
import ScadFile from "../ast/ScadFile";
import { UseStmt, IncludeStmt } from "../ast/statements";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import ErrorCollector from "../ErrorCollector";
import CodeError from "../errors/CodeError";
import CodeLocation from "../CodeLocation";

export class IncludedFileNotFoundError extends CodeError {
  constructor(pos: CodeLocation, filename: string) {
    super(pos, `Included file '${filename} not found.'`);
  }
}

export class UsedFileNotFoundError extends CodeError {
  constructor(pos: CodeLocation, filename: string) {
    super(pos, `Used file '${filename} not found.'`);
  }
}

export default class IncludeResolver<T extends WithExportedScopes> {
  constructor(private provider: ScadFileProvider<T>) {}
  /**
   * Finds all file includes and returns paths to them
   * @param f
   */
  async resolveIncludes(f: ScadFile, ec: ErrorCollector) {
    if (!f.span.start.file) {
      throw new Error("file in pos is null");
    }
    const includes: string[] = [];
    for (const stmt of f.statements) {
      if (stmt instanceof IncludeStmt) {
        const filePath = await this.locateScadFile(
          f.span.start.file.path,
          stmt.filename
        );
        if (!filePath) {
          ec.reportError(
            new IncludedFileNotFoundError(
              stmt.tokens.filename.span.start,
              stmt.filename
            )
          );
          continue;
        }
        includes.push(filePath);
      }
    }
    return Promise.all(
      includes.map((incl) => this.provider.provideScadFile(incl))
    );
  }

  /**
   * Finds all file uses and returns paths to them.
   * Uses do not export to parent scopes and do not execute statements inside of the used files.
   * @param f
   */
  async resolveUses(f: ScadFile, ec: ErrorCollector) {
    if(!f.span.start.file) {
      throw new Error("file in pos is null");
    }
    const uses: string[] = [];
    for (const stmt of f.statements) {
      if (stmt instanceof UseStmt) {
        const filePath = await this.locateScadFile(
          f.span.start.file.path,
          stmt.filename
        );
        if (!filePath) {
          ec.reportError(
            new UsedFileNotFoundError(stmt.tokens.filename.span.start, stmt.filename)
          );
          continue;
        }
        uses.push(filePath);
      }
    }
    return Promise.all(uses.map((incl) => this.provider.provideScadFile(incl)));
  }

  async locateScadFile(parent: string, relativePath: string) {
    const searchDirs = [path.dirname(parent), ...IncludeResolver.includeDirs];
    for (const dir of searchDirs) {
      const resultingPath = path.resolve(dir, relativePath);
      try {
        if ((await fs.stat(resultingPath)).isFile()) {
          return resultingPath;
        }
      } catch (e) {}
    }
    return null;
  }

  private static _includeDirsCache: string[] | null = null;

  static get includeDirs() {
    if (!this._includeDirsCache) {
      this._includeDirsCache = [];
      const ENV_SEP = os.platform() === "win32" ? ";" : ":";
      this._includeDirsCache.push(
        ...(process.env.OPENSCADPATH || "").split(ENV_SEP)
      );
      if (os.platform() === "win32") {
        // TODO: add my documents path
        // TODO: add installation directory
      }
      if (os.platform() === "linux") {
        this._includeDirsCache.push(
          path.join(os.homedir(), ".local/share/OpenSCAD/libraries")
        );
        this._includeDirsCache.push("/usr/share/openscad/libraries");
      }
      if (os.platform() === "darwin") {
        this._includeDirsCache.push(
          path.join(os.homedir(), "Documents/OpenSCAD/libraries")
        );
        //TODO: add installation directory
      }
    }
    return this._includeDirsCache;
  }
}
