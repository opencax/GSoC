import {
  ExtraToken,
  MultiLineComment,
  NewLineExtraToken,
  SingleLineComment,
} from "../extraTokens";
import {
  IntrinsicAnnotation,
  IntrinsicRenameAnnotation,
  ParamAnnotation,
  SeeAnnotation,
} from "./annotations";
import DocAnnotationClass from "./DocAnnotationClass";

export default class DocComment {
  static possibleAnnotations: DocAnnotationClass[] = [
    IntrinsicAnnotation,
    IntrinsicRenameAnnotation,
    ParamAnnotation,
    SeeAnnotation,
  ];
  constructor(
    public documentationContent: string,
    public annotations: Object[]
  ) {}
  static fromExtraTokens(extraTokens: ExtraToken[]): DocComment {
    const docComments: (MultiLineComment | SingleLineComment)[] = [];
    let beginningNewlinesLimit = 5;
    // iterate through the extra tokens backwards, looking from the annotated element
    for (let i = extraTokens.length - 1; i >= 0; i--) {
      if (extraTokens[i] instanceof NewLineExtraToken) {
        beginningNewlinesLimit--;
      }
      if (
        extraTokens[i] instanceof MultiLineComment ||
        extraTokens[i] instanceof SingleLineComment
      ) {
        beginningNewlinesLimit = 2;
        docComments.unshift(
          extraTokens[i] as MultiLineComment | SingleLineComment
        );
      }
      if (beginningNewlinesLimit <= 0) {
        break;
      }
    }
    // we assemble the comments into one string, and remove the preceding stars
    const lines = docComments
      .map((c) => c.contents)
      .flatMap((c) => c.split("\n"))
      .map((l) => l.trim().replace(/^\*/, "").trim());
    let contents = "";
    let annotations: Object[] = [];
    // we loop over every line of the preceeding comment to find the documentation contents and the annotations
    // for each line we check if it stats with a @ (annotation)
    for (const line of lines) {
      if (line.startsWith("@")) {
        // this is an annotation
        const segments = line.substring(1).split(" ");
        let foundAnnotation = false;
        for (const possible of this.possibleAnnotations) {
          if (possible.annotationTag === segments[0]) {
            annotations.push(new possible(segments.slice(1)));
            foundAnnotation = true;
            break;
          }
        }
        if (foundAnnotation) {
          continue;
        }
      }

      contents += line + "\n";
    }
    contents = contents.trim();
    return new DocComment(contents, annotations);
  }
}
