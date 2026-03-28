export default class FormattingConfiguration {
  indentChar = " ";
  indentCount = 4;
  moduleInstantiationBreakLength = 40;

  /**
   * When sets to true the printer does not print bodies of functions and modules.
   * Used for generating focumentation stubs.
   */
  definitionsOnly = false;

  /**
   * When set to true the formatter adds a comment to each newline describing its purpose.
   */
  debugNewlines = false;

}
