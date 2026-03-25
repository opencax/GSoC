import CodeLocation from "./CodeLocation";

/**
 * An extra tolen is a parto of the source file that doesn't directly influence the AST, but it should be preserved when foromatting the code.
 */
export abstract class ExtraToken {
  constructor(public pos: CodeLocation) {}
}

/**
 * A new line between two other tokens.
 */
export class NewLineExtraToken extends ExtraToken {}

export class SingleLineComment extends ExtraToken {
  constructor(pos: CodeLocation, public contents: string) {
    super(pos);
  }
}

export class MultiLineComment extends ExtraToken {
  constructor(pos: CodeLocation, public contents: string) {
    super(pos);
  }
}
