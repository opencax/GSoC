import { type ASTVisitor, type ScadFile, type ModuleInstantiationStmt, type LiteralExpr, type VectorExpr, type BinaryOpExpr, type UnaryOpExpr, type AssignmentNode, type GroupingExpr, type TernaryExpr, type FunctionCallExpr, LookupExpr, type IfElseStatement, type BlockStmt, type ErrorNode, type NoopStmt, type RangeExpr, type ArrayLookupExpr, type ModuleDeclarationStmt, type FunctionDeclarationStmt, type MemberLookupExpr, type LetExpr, type AssertExpr, type EchoExpr, type LcIfExpr, type LcEachExpr, type LcForExpr, type LcForCExpr, type LcLetExpr, type AnonymousFunctionExpr, type UseStmt, type IncludeStmt } from 'openscad-parser';
export declare enum AssignmentNodeRole {
    VARIABLE_DECLARATION = 0,
    ARGUMENT_DECLARATION = 1,
    ARGUMENT_ASSIGNMENT = 2
}
export declare class OpenScadCompiler implements ASTVisitor<string> {
    private indentLevel;
    private resultsStack;
    private declarations;
    constructor();
    private indent;
    private get currentResults();
    compile(ast: ScadFile): string;
    private getRuntimeHelpers;
    visitScadFile(n: ScadFile): string;
    visitModuleInstantiationStmt(n: ModuleInstantiationStmt): string;
    visitAssignmentNode(n: AssignmentNode): string;
    visitLiteralExpr(n: LiteralExpr<any>): string;
    visitVectorExpr(n: VectorExpr): string;
    visitLookupExpr(n: LookupExpr): string;
    visitBinaryOpExpr(n: BinaryOpExpr): string;
    visitUnaryOpExpr(n: UnaryOpExpr): string;
    visitBlockStmt(n: BlockStmt): string;
    visitIfElseStatement(n: IfElseStatement): string;
    visitGroupingExpr(n: GroupingExpr): string;
    visitFunctionCallExpr(n: FunctionCallExpr): string;
    visitRangeExpr(n: RangeExpr): string;
    visitArrayLookupExpr(n: ArrayLookupExpr): string;
    visitModuleDeclarationStmt(n: ModuleDeclarationStmt): string;
    visitFunctionDeclarationStmt(n: FunctionDeclarationStmt): string;
    visitTernaryExpr(n: TernaryExpr): string;
    visitMemberLookupExpr(n: MemberLookupExpr): string;
    visitLetExpr(n: LetExpr): string;
    visitAssertExpr(n: AssertExpr): string;
    visitEchoExpr(n: EchoExpr): string;
    visitLcIfExpr(n: LcIfExpr): string;
    visitLcEachExpr(n: LcEachExpr): string;
    visitLcForExpr(n: LcForExpr): string;
    visitLcForCExpr(n: LcForCExpr): string;
    visitLcLetExpr(n: LcLetExpr): string;
    visitAnonymousFunctionExpr(n: AnonymousFunctionExpr): string;
    visitUseStmt(n: UseStmt): string;
    visitIncludeStmt(n: IncludeStmt): string;
    visitNoopStmt(n: NoopStmt): string;
    visitErrorNode(n: ErrorNode): string;
}
//# sourceMappingURL=compiler.d.ts.map