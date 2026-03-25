import ASTNode from "./ast/ASTNode";
import ASTVisitor from "./ast/ASTVisitor";
import ASTAssembler from "./ASTAssembler";
import CodeLocation from "./CodeLocation";
import Token from "./Token";

export const BinAfter = Symbol("BinAfter");
export const BinBefore = Symbol("BinBefore");

export type PinpointerRet = ASTNode | typeof BinAfter | typeof BinBefore;

export type DispatchTokenMix = (Token | (() => PinpointerRet))[];

/**
 * This class searches through the AST to find a node based on its position.
 * It may return BinAfter or BinBefore if the node cannot be found.
 */
export default class ASTPinpointer
  extends ASTAssembler<PinpointerRet>
  implements ASTVisitor<PinpointerRet>
{
  /**
   * Contains all the ancestors of the pinpointed nodes. The pinpointed node is always first.
   */
  public bottomUpHierarchy: ASTNode[] = [];

  constructor(public pinpointLocation: CodeLocation) {
    super();
  }

  /**
   * Returns the node at pinpointLocation and populates bottomUpHierarchy.
   * @param n The AST (or AST fragment) to search through.
   */
  doPinpoint(n: ASTNode): PinpointerRet {
    this.bottomUpHierarchy = [];
    return n.accept(this);
  }
  protected processAssembledNode(
    t: DispatchTokenMix,
    self: ASTNode
  ): PinpointerRet {
    let l = 0,
      r = t.length - 1;
    // perform a binary search on the tokens
    while (l <= r) {
      let pivot = Math.floor((r + l) / 2);
      if (t[pivot] instanceof Token) {
        const tokenAtPiviot = t[pivot] as Token;
        if (tokenAtPiviot.span.end.char <= this.pinpointLocation.char) {
          l = pivot + 1;
          continue;
        }
        if (
          tokenAtPiviot.startWithWhitespace.char > this.pinpointLocation.char
        ) {
          r = pivot - 1;
          continue;
        }
        this.bottomUpHierarchy.push(self);
        return self; // yay this is us
      } else if (typeof t[pivot] === "function") {
        const astFunc = t[pivot] as () => PinpointerRet;
        const result = astFunc.call(this) as PinpointerRet;

        if (result === BinBefore) {
          r = pivot - 1;
          continue;
        }
        if (result === BinAfter) {
          l = pivot + 1;
          continue;
        }
        if (result instanceof ASTNode) {
          this.bottomUpHierarchy.push(self);
          return result;
        }
      } else {
        throw new Error(
          `Bad element in token mix: ${typeof t[pivot]} at index ${pivot}.`
        );
      }
    }
    const firstThing = t[0];
    if (firstThing instanceof Token) {
      if (firstThing.span.end.char <= this.pinpointLocation.char) {
        return BinAfter;
      }
      return BinBefore;
    }
    if (typeof firstThing === "function") {
      return firstThing.call(this);
    }
    throw new Error(
      `Bad element in first token mix element. Recieved ${firstThing}, expected a function or a Token.`
    );
  }
}
