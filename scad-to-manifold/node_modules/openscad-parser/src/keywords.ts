import TokenType from "./TokenType";

/**
 * A dictionary which maps keyword string values to their TokenType.
 */
const keywords: { [x: string]: TokenType } = {
  true: TokenType.True,
  false: TokenType.False,
  undef: TokenType.Undef,
  module: TokenType.Module,
  function: TokenType.Function,
  if: TokenType.If,
  else: TokenType.Else,
  for: TokenType.For,
  assert: TokenType.Assert,
  each: TokenType.Each,
  echo: TokenType.Echo,
  use: TokenType.Use,
  let: TokenType.Let,
  include: TokenType.Include,
};

export const keywordDocumentation: { [x: keyof typeof keywords]: string } = {
  true: "Represents the boolean value true.",
  false: "Represents the boolean value false.",
  undef: `Represents the undefined value. 

It's the initial value of a variable that hasn't been assigned a value, and it is often returned as a result by functions or operations that are passed illegal arguments. `,
  module: `Starts a module declaration.

Usage:

${"```scad"}
module my_module(arg = "default") {
  // module code
}
${"```"}
`,
  function: `Starts a function declaration.

Usage:

${"```scad"}
function my_function (x) = x * x;

// or for anonymous functions
square = function (x) x * x;

${"```"}
`,
  if: `Starts an if statement or expression.

Usage:

${"```scad"}
if (x > 0) {
  // do something
}
${"```"}
`,
  else: `Marks the beginning of an else block in an if statement.

Usage:
${"```scad"}
if (x > 0) {
  // if x is positive
} else {
  // if x is zero or negative
}
${"```"}
`,
  for: `Starts a for loop.

Usage:

${"```scad"}
for ( i = [0 : 5] ){
  rotate( i * 60, [1, 0, 0])
  translate([0, 10, 0])
  sphere(r = 10);
}
${"```"}
`,
  assert: `Starts an assert statement.

Usage:

${"```scad"}
assert(x > 0, "x is not positive");

${"```"}
`,
};

export default keywords;
