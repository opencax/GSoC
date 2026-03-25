import Scope from "./Scope";
export interface WithExportedScopes {
  getExportedScopes(): Scope[];
}

export default interface ScadFileProvider<T extends WithExportedScopes> {
  provideScadFile(filePath: string): Promise<T>;
}
