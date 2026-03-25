# OpenSCAD STEP Export

This project implements a robust STEP file exporter for OpenSCAD, developed as part of the GSoC 3D-CAD initiative. It allows exporting OpenSCAD models directly to the industry-standard STEP format (ISO-10303-21 AP214) as faceted BREP geometry.

## Features

- **Standard Primitives**: Full support for `cube`, `sphere`, and `cylinder`.
- **Transformations**: `translate`, `rotate`, `scale`, `mirror`, and `multmatrix`.
- **CSG Operations**: Robust (faceted) implementations of `union`, `difference`, `intersection`, and `hull`.
- **Extrusions**: Support for `linear_extrude` including `twist` and `scale`.
- **OpenSCAD Language**: Evaluation of modules, functions, for-loops, if/else, and all standard expression types.
- **STEP Validation**: Integrated validator ensuring high-integrity output with no dangling entity references.
- **Standalone CLI**: Simple command-line interface for batch processing or integration into other tools.

## Installation

```bash
# Clone the repository and navigate to the project folder
cd openscad-step-export

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Command Line Interface (CLI)

Use the CLI to convert any `.scad` file to `.step`:

```bash
# Basic export
node dist/cli.js -i my_model.scad -o my_model.step

# Export with structural validation
node dist/cli.js -i my_model.scad --validate

# Customizing $fn resolution
node dist/cli.js -i my_model.scad --fn 32
```

### Scripting API

You can also use the library programmatically in your own TypeScript/Node.js projects:

```typescript
import { OpenScadStepEvaluator, exportSolidsToStep } from './dist/index.js';
import { Parser, Lexer, CodeFile, ErrorCollector } from 'openscad-parser';

// 1. Parse your SCAD code
const code = 'cube(10);';
const file = new CodeFile('test.scad', code);
// ... parse to AST using openscad-parser ...

// 2. Evaluate to Solid geometry
const evaluator = new OpenScadStepEvaluator();
const solids = evaluator.evaluate(ast);

// 3. Export to STEP string
const stepString = exportSolidsToStep(solids, {
    author: "Your Name",
    modelName: "My Part"
});
```

## Development and Testing

The project includes a comprehensive suite of over 30 tests covering geometry math, AST evaluation, and the STEP exporter itself.

```bash
npm test
```

## Project Structure

- `src/geometry.ts`: Core 3D math and CSG mesh engine.
- `src/step-evaluator.ts`: OpenSCAD AST interpreter (evaluation logic).
- `src/step-exporter.ts`: ISO-10303-21 (STEP) file formatter.
- `src/step-validator.ts`: Structural integrity checker for STEP output.
- `src/cli.ts`: Command-line interface logic.
- `src/tests/`: Comprehensive regression test suite.

## License

MIT - See the `package.json` for details.
