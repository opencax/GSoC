export default interface DocAnnotationClass {
  new (contents: string[]): Object;
  annotationTag: string;
}
