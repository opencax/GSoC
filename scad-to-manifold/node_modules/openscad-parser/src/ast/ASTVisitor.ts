import AssignmentNode from "./AssignmentNode";
import ErrorNode from "./ErrorNode";
import {
  AnonymousFunctionExpr,
  ArrayLookupExpr,
  AssertExpr,
  BinaryOpExpr,
  EchoExpr,
  FunctionCallExpr,
  GroupingExpr,
  LcEachExpr,
  LcForCExpr,
  LcForExpr,
  LcIfExpr,
  LcLetExpr,
  LetExpr,
  LiteralExpr,
  LookupExpr,
  MemberLookupExpr,
  RangeExpr,
  TernaryExpr,
  UnaryOpExpr,
  VectorExpr,
} from "./expressions";
import ScadFile from "./ScadFile";
import {
  BlockStmt,
  FunctionDeclarationStmt,
  IfElseStatement,
  IncludeStmt,
  ModuleDeclarationStmt,
  ModuleInstantiationStmt,
  NoopStmt,
  UseStmt,
} from "./statements";

export default interface ASTVisitor<R = void> {
  visitScadFile(n: ScadFile): R;
  visitAssignmentNode(n: AssignmentNode): R;
  visitUnaryOpExpr(n: UnaryOpExpr): R;
  visitBinaryOpExpr(n: BinaryOpExpr): R;
  visitTernaryExpr(n: TernaryExpr): R;
  visitArrayLookupExpr(n: ArrayLookupExpr): R;
  visitLiteralExpr(n: LiteralExpr<any>): R;
  visitRangeExpr(n: RangeExpr): R;
  visitVectorExpr(n: VectorExpr): R;
  visitLookupExpr(n: LookupExpr): R;
  visitMemberLookupExpr(n: MemberLookupExpr): R;
  visitFunctionCallExpr(n: FunctionCallExpr): R;
  visitLetExpr(n: LetExpr): R;
  visitAssertExpr(n: AssertExpr): R;
  visitEchoExpr(n: EchoExpr): R;
  visitLcIfExpr(n: LcIfExpr): R;
  visitLcEachExpr(n: LcEachExpr): R;
  visitLcForExpr(n: LcForExpr): R;
  visitLcForCExpr(n: LcForCExpr): R;
  visitLcLetExpr(n: LcLetExpr): R;
  visitGroupingExpr(n: GroupingExpr): R;
  visitAnonymousFunctionExpr(n: AnonymousFunctionExpr): R;
  visitUseStmt(n: UseStmt): R;
  visitIncludeStmt(n: IncludeStmt): R;
  visitModuleInstantiationStmt(n: ModuleInstantiationStmt): R;
  visitModuleDeclarationStmt(n: ModuleDeclarationStmt): R;
  visitFunctionDeclarationStmt(n: FunctionDeclarationStmt): R;
  visitBlockStmt(n: BlockStmt): R;
  visitNoopStmt(n: NoopStmt): R;
  visitIfElseStatement(n: IfElseStatement): R;
  visitErrorNode(n: ErrorNode): R;
}
