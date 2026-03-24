import { Lexer, Parser, ErrorCollector, CodeFile } from 'openscad-parser';
const codeStr = `
cube([10, 20, 30]);
`;
try {
    const codeFile = new CodeFile("test.scad", codeStr);
    const errorCollector = new ErrorCollector();
    const lexer = new Lexer(codeFile, errorCollector);
    const tokens = lexer.scan();
    const parser = new Parser(codeFile, tokens, errorCollector);
    const ast = parser.parse();
    if (errorCollector.hasErrors()) {
        console.error("Errors encountered:");
        errorCollector.errors.forEach(err => console.error(err.message));
    }
    console.log(JSON.stringify(ast, null, 2));
}
catch (e) {
    console.error("Execution failed:", e);
}
//# sourceMappingURL=test-parser.js.map