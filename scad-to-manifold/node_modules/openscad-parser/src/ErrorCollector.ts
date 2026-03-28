import CodeError from "./errors/CodeError";

export default class ErrorCollector {
  errors: CodeError[] = [];
  reportError<ET extends CodeError>(err: ET): ET {
    this.errors.push(err);
    return err;
  }
  printErrors() {
    const msgs = this.errors.reduce((prev, e) => {
      return (
        prev +
        e.codeLocation.formatWithContext() +
        Object.getPrototypeOf(e).constructor.name +
        ": " +
        e.message +
        "\n"
      );
    }, "");
    console.log(msgs);
  }
  hasErrors() {
    return this.errors.length > 0;
  }
  /**
   * Throws the first error on the list. Used to simplify testing.
   */
  throwIfAny() {
    if (this.errors.length > 0) {
      throw this.errors[0];
    }
  }
}
