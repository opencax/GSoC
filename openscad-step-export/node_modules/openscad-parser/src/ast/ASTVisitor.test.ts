import CodeFile from "../CodeFile";
import ErrorCollector from "../ErrorCollector";
import Lexer from "../Lexer";
import Parser from "../Parser";
import AssignmentNode from "./AssignmentNode";
import ASTVisitor from "./ASTVisitor";
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

describe("ASTVisitor", () => {
  function doParse(source: string) {
    const ec = new ErrorCollector();
    const l = new Lexer(new CodeFile("<test>", source), ec);
    const parser = new Parser(l.codeFile, l.scan(), ec);
    ec.throwIfAny();
    const ast = parser.parse();
    ec.throwIfAny();
    return ast;
  }
  it("all the methods are being called", () => {
    const visitScadFile = jest.fn();
    const visitAssignmentNode = jest.fn();
    const visitUnaryOpExpr = jest.fn();
    const visitBinaryOpExpr = jest.fn();
    const visitTernaryExpr = jest.fn();
    const visitArrayLookupExpr = jest.fn();
    const visitLiteralExpr = jest.fn();
    const visitRangeExpr = jest.fn();
    const visitVectorExpr = jest.fn();
    const visitLookupExpr = jest.fn();
    const visitMemberLookupExpr = jest.fn();
    const visitFunctionCallExpr = jest.fn();
    const visitLetExpr = jest.fn();
    const visitAssertExpr = jest.fn();
    const visitEchoExpr = jest.fn();
    const visitLcIfExpr = jest.fn();
    const visitLcEachExpr = jest.fn();
    const visitLcForExpr = jest.fn();
    const visitLcForCExpr = jest.fn();
    const visitLcLetExpr = jest.fn();
    const visitGroupingExpr = jest.fn();
    const visitUseStmt = jest.fn();
    const visitModuleInstantiationStmt = jest.fn();
    const visitModuleDeclarationStmt = jest.fn();
    const visitFunctionDeclarationStmt = jest.fn();
    const visitBlockStmt = jest.fn();
    const visitNoopStmt = jest.fn();
    const visitIfElseStatement = jest.fn();
    const visitIncludeStmt = jest.fn();
    const visitAnonymousFunctionExpr = jest.fn();

    class SampleVisitor implements ASTVisitor<void> {
      visitErrorNode(n: import("./ErrorNode").default): void {
        throw new Error("Method not implemented.");
      }
      visitScadFile(n: ScadFile) {
        visitScadFile(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(ScadFile);
        for (const stmt of n.statements) {
          stmt.accept(this);
        }
      }
      visitAssignmentNode(n: AssignmentNode) {
        visitAssignmentNode(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(AssignmentNode);
        n.value && n.value.accept(this);
      }
      visitUnaryOpExpr(n: UnaryOpExpr) {
        visitUnaryOpExpr(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(UnaryOpExpr);
        n.right.accept(this);
      }
      visitBinaryOpExpr(n: BinaryOpExpr) {
        visitBinaryOpExpr(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(BinaryOpExpr);
        n.left.accept(this);
        n.left.accept(this);
      }
      visitTernaryExpr(n: TernaryExpr) {
        visitTernaryExpr(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(TernaryExpr);
        n.cond.accept(this);
        n.ifExpr.accept(this);
        n.elseExpr.accept(this);
      }
      visitArrayLookupExpr(n: ArrayLookupExpr) {
        visitArrayLookupExpr(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(ArrayLookupExpr);
        n.array.accept(this);
        n.index.accept(this);
      }
      visitLiteralExpr(n: LiteralExpr<any>) {
        visitLiteralExpr(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(LiteralExpr);
      }
      visitRangeExpr(n: RangeExpr) {
        visitRangeExpr(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(RangeExpr);
        if (n.begin) {
          n.begin.accept(this);
        }
        if (n.end) {
          n.end.accept(this);
        }
        if (n.step) {
          n.step.accept(this);
        }
      }
      visitVectorExpr(n: VectorExpr) {
        visitVectorExpr(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(VectorExpr);
        n.children.forEach((c) => c.accept(this));
      }
      visitLookupExpr(n: LookupExpr) {
        visitLookupExpr(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(LookupExpr);
      }
      visitMemberLookupExpr(n: MemberLookupExpr) {
        visitMemberLookupExpr(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(MemberLookupExpr);
        n.expr.accept(this);
      }
      visitFunctionCallExpr(n: FunctionCallExpr) {
        visitFunctionCallExpr(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(FunctionCallExpr);
        n.args.forEach((a) => a.accept(this));
      }

      visitLetExpr(n: LetExpr) {
        visitLetExpr(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(LetExpr);
        n.args.forEach((a) => a.accept(this));
        n.expr.accept(this);
      }
      visitAssertExpr(n: AssertExpr) {
        visitAssertExpr(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(AssertExpr);
        n.args.forEach((a) => a.accept(this));
        n.expr.accept(this);
      }
      visitEchoExpr(n: EchoExpr) {
        visitEchoExpr(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(EchoExpr);
        n.args.forEach((a) => a.accept(this));
        n.expr.accept(this);
      }
      visitLcIfExpr(n: LcIfExpr) {
        visitLcIfExpr(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(LcIfExpr);
        n.cond.accept(this);
        n.ifExpr.accept(this);
        if (n.elseExpr) {
          n.elseExpr.accept(this);
        }
      }
      visitLcEachExpr(n: LcEachExpr) {
        visitLcEachExpr(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(LcEachExpr);
        n.expr.accept(this);
      }
      visitLcForExpr(n: LcForExpr) {
        visitLcForExpr(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(LcForExpr);
        n.args.forEach((a) => a.accept(this));
        n.expr.accept(this);
      }
      visitLcForCExpr(n: LcForCExpr) {
        visitLcForCExpr(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(LcForCExpr);
        n.args.forEach((a) => a.accept(this));
        n.incrArgs.forEach((a) => a.accept(this));
        n.cond.accept(this);
        n.expr.accept(this);
      }
      visitLcLetExpr(n: LcLetExpr) {
        visitLcLetExpr(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(LcLetExpr);
        n.args.forEach((a) => a.accept(this));
        n.expr.accept(this);
      }
      visitGroupingExpr(n: GroupingExpr) {
        visitGroupingExpr(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(GroupingExpr);
        n.inner.accept(this);
      }
      visitUseStmt(n: UseStmt) {
        visitUseStmt(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(UseStmt);
      }
      visitIncludeStmt(n: IncludeStmt) {
        visitUseStmt(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(IncludeStmt);
      }
      visitModuleInstantiationStmt(n: ModuleInstantiationStmt) {
        visitModuleInstantiationStmt(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(ModuleInstantiationStmt);
        n.args.forEach((a) => a.accept(this));
        n.child?.accept(this);
      }
      visitModuleDeclarationStmt(n: ModuleDeclarationStmt) {
        visitModuleDeclarationStmt(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(ModuleDeclarationStmt);
        n.definitionArgs.forEach((a) => a.accept(this));
        n.stmt.accept(this);
      }
      visitFunctionDeclarationStmt(n: FunctionDeclarationStmt) {
        visitFunctionDeclarationStmt(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(FunctionDeclarationStmt);
        n.expr.accept(this);
        n.definitionArgs.forEach((a) => a.accept(this));
      }
      visitBlockStmt(n: BlockStmt) {
        visitBlockStmt(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(BlockStmt);
        n.children.forEach((c) => c.accept(this));
      }
      visitNoopStmt(n: NoopStmt) {
        visitNoopStmt(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(NoopStmt);
      }
      visitIfElseStatement(n: IfElseStatement) {
        visitIfElseStatement(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(IfElseStatement);
        n.cond.accept(this);
        n.thenBranch.accept(this);
        if (n.elseBranch) {
          n.elseBranch.accept(this);
        }
      }
      visitAnonymousFunctionExpr(n: AnonymousFunctionExpr) {
        visitAnonymousFunctionExpr(); // call the mocked function so that jest knows it has been called
        expect(n).toBeInstanceOf(AnonymousFunctionExpr);
        n.definitionArgs.forEach((a) => a.accept(this));
        n.expr.accept(this);
      }

    }

    const v = new SampleVisitor();
    const file = doParse(`
        use <ddd>
        include <xD>
        function ddd(argv = 10, second = !true) = (10 + 20) * 10;
        ybyby = x > 10 ? let(v = 200) doSomething() : assert(x = 20) echo("nothing") 5;
        arr = [20, if(true) each [20:50:30] else [808][0].x];
        compre = [for(a = [rang1, 2, 3]) let(x = a + 1) [sin(a)],];
        anon = function(x) x * x;
        module the_mod() {
            echo( [for (a = 0, b = 1;a < 5;a = a + 1, b = b + 2) [ a, b * b ] ] );
            if(yeah == true) {
                ;
            } else {

            }
        }
    `);
    file.accept(v);

    expect(visitScadFile).toHaveBeenCalled();
    expect(visitAssignmentNode).toHaveBeenCalled();
    expect(visitUnaryOpExpr).toHaveBeenCalled();
    expect(visitBinaryOpExpr).toHaveBeenCalled();
    expect(visitTernaryExpr).toHaveBeenCalled();
    expect(visitArrayLookupExpr).toHaveBeenCalled();
    expect(visitLiteralExpr).toHaveBeenCalled();
    expect(visitRangeExpr).toHaveBeenCalled();
    expect(visitVectorExpr).toHaveBeenCalled();
    expect(visitLookupExpr).toHaveBeenCalled();
    expect(visitMemberLookupExpr).toHaveBeenCalled();
    expect(visitFunctionCallExpr).toHaveBeenCalled();
    expect(visitLetExpr).toHaveBeenCalled();
    expect(visitAssertExpr).toHaveBeenCalled();
    expect(visitEchoExpr).toHaveBeenCalled();
    expect(visitLcIfExpr).toHaveBeenCalled();
    expect(visitLcEachExpr).toHaveBeenCalled();
    expect(visitLcForExpr).toHaveBeenCalled();
    expect(visitLcForCExpr).toHaveBeenCalled();
    expect(visitLcLetExpr).toHaveBeenCalled();
    expect(visitGroupingExpr).toHaveBeenCalled();
    expect(visitUseStmt).toHaveBeenCalled();
    expect(visitModuleInstantiationStmt).toHaveBeenCalled();
    expect(visitModuleDeclarationStmt).toHaveBeenCalled();
    expect(visitFunctionDeclarationStmt).toHaveBeenCalled();
    expect(visitBlockStmt).toHaveBeenCalled();
    expect(visitNoopStmt).toHaveBeenCalled();
    expect(visitIfElseStatement).toHaveBeenCalled();
    expect(visitAnonymousFunctionExpr).toHaveBeenCalled();
  });
});
