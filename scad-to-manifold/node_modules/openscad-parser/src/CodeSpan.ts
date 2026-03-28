import CodeLocation from "./CodeLocation";

export default class CodeSpan {
  constructor(public start: CodeLocation, public end: CodeLocation) {}

  toString() {
    return `${this.start.toString()} - ${this.end.toString()}`;
  }

  static combine(...rawSpans: (CodeSpan | null | undefined)[]) {
    let spans = rawSpans.filter((s) => s != null) as CodeSpan[];
    if (spans.length === 0) {
      throw new Error("Cannot combine zero spans");
    }
    if (spans.length === 1) {
      return spans[0];
    }
    let min: CodeSpan = spans[0];
    let max: CodeSpan = spans[0];
    for (let span of spans) {
      if (span.start.char < min.start.char) {
        min = span;
      }
      if (span.end.char > max.end.char) {
        max = span;
      }
    }
    return new CodeSpan(min.start, max.end);
  }

  static combineObject(spans: { [key: string]: CodeSpan }) {
    return CodeSpan.combine(...Object.values(spans));
  }
}
