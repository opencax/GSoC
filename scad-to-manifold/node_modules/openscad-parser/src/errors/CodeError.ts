import CodeLocation from "../CodeLocation";

/**
 * A root class for all the errors generated during parsing and lexing.
 * @category Error
 */
export default abstract class CodeError extends Error {
  constructor(public codeLocation: CodeLocation, message: string) {
    super(message);
  }
}
