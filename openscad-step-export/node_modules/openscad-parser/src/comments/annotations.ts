/**
 * Adds special flags for built in constructs in the language.
 * Only for use in the prelude.
 * Used to mark the `for` and `intersection_for` modules as loops, and their arguments are in fact variable declarations.
 */
export class IntrinsicAnnotation {
  static annotationTag = "intrinsic";
  intrinsicType: string;
  constructor(contents: string[]) {
    this.intrinsicType = contents[0] || "";
  }
}

/**
 * Renames this symbol to a diffrent name (which for example is a reserved keyword).
 * Used by the prelude to define `for` and `intersection_for` so that they can be resolved without errors.
 */
export class IntrinsicRenameAnnotation {
  static annotationTag = "intrinsicRename";
  newName: string;
  constructor(contents: string[]) {
    this.newName = contents[0] || "";
  }
}

/**
 * An annotation with a link to online documentation.
 * @todo Add links to other source-code locations
 */
export class SeeAnnotation {
  static annotationTag = "see";
  link: string;
  constructor(contents: string[]) {
    this.link = contents[0] || "";
  }
}

/**
 * Describes a module or function parameter annotation.
 * It has the form of `@param name [... optional tags] description`
 * The tags either contain a name (`[positional]`) for binary tags or a name and a value (`[conflictsWith=abc,cba]`)
 */
export class ParamAnnotation {
  static annotationTag = "param";
  link: string;
  description: string;
  tags: {
    [x: string]: any;
    positional: boolean;
    named: boolean;
    required: boolean;
    type: string[];
    conflictsWith: string[];
    possibleValues: string[];
  } = {
    positional: false,
    named: false,
    required: false,
    type: [],
    conflictsWith: [],
    possibleValues: [],
  };
  constructor(contents: string[]) {
    this.link = contents[0] || "";
    this.description = contents
      .slice(1)
      .filter((c) => {
        let m = c.match(/^\[(.*?)(=(.*))?\]$/);
        if (!m) return true;
        if (!m[3]) {
          // boolean tag, no value
          this.tags[m[1]] = true;
        } else {
          this.tags[m[1]] = m[3].split(",");
        }
        return false;
      })
      .join(" ");
  }
}
