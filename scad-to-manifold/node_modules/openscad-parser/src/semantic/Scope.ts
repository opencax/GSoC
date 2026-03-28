import AssignmentNode from "../ast/AssignmentNode";
import {
  FunctionDeclarationStmt,
  ModuleDeclarationStmt,
} from "../ast/statements";

export type KeysOfType<T, TProp> = {
  [P in keyof T]: T[P] extends TProp ? P : never;
}[keyof T];

/**
 * Represents a lexical scope, where variables, modules, and functions are resolved.
 * It links symbol names with their declarations.
 */
export default class Scope {
  /**
   * References to other, 'include'd or 'use'd file scopes, filled by the solution manager.
   * We can use those scopes to resolve types from those files.
   */
  siblingScopes: Scope[] = [];
  parent: Scope | null = null;
  functions = new Map<string, FunctionDeclarationStmt>();
  variables = new Map<string, AssignmentNode>();
  modules = new Map<string, ModuleDeclarationStmt>();

  copy(): Scope {
    const s = new Scope();
    s.siblingScopes = [...this.siblingScopes];
    s.functions = this.functions;
    s.variables = this.variables;
    s.modules = this.modules;
    return s;
  }

  lookupVariable(name: string) {
    return this.lookup("variables", name) as AssignmentNode;
  }

  lookupModule(name: string) {
    return this.lookup("modules", name) as ModuleDeclarationStmt;
  }

  lookupFunction(name: string) {
    return this.lookup("functions", name) as FunctionDeclarationStmt;
  }

  private lookup(
    x: KeysOfType<Scope, Map<any, any>>,
    name: string,
    visited: WeakMap<Scope, boolean> = new WeakMap()
  ): FunctionDeclarationStmt | AssignmentNode | ModuleDeclarationStmt | null {
    if (visited.has(this)) {
      return null;
    }
    visited.set(this, true);
    if (this[x].has(name)) {
      return this[x].get(name) || null;
    }
    if (this.parent) {
      const val = this.parent.lookup(x, name, visited);
      if (val) {
        return val;
      }
    }
    for (const ss of this.siblingScopes) {
      const val = ss.lookup(x, name, visited);
      if (val) {
        return val;
      }
    }
    return null;
  }
}
