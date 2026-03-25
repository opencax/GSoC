# scad-to-manifold

This prototype now supports two output paths:

- `js`: existing OpenSCAD-to-Manifold JavaScript code generation
- `step`: direct STEP export using an in-repo faceted BREP evaluator

## STEP Export

The STEP path parses OpenSCAD, evaluates a supported geometry subset, and writes a `CONFIG_CONTROL_DESIGN` STEP file with `FACETED_BREP_SHAPE_REPRESENTATION`.

### Supported OpenSCAD subset

- Primitives: `cube()`, `sphere()`, `cylinder()`
- Transforms: `translate()`, `scale()`, `rotate()`, `mirror()`, `multmatrix()`
- Structure: `union()`, `group()`, `color()`, `render()`
- Control flow: variable assignments, `if`, `for`
- Reuse: user-defined `module` and `function`
- Child forwarding: `children()`

### Current limitations

- Boolean CSG like `difference()` and `intersection()` is not implemented in the STEP path yet
- Advanced modeling features like `linear_extrude()` and `rotate_extrude()` are not implemented yet
- Export is faceted, so curved surfaces are tessellated using `$fn` or the default resolution

## Usage

Build:

```bash
node ./node_modules/typescript/bin/tsc
```

Export JavaScript:

```bash
node cli.js --input model.scad --format js --output model.js
```

Export STEP:

```bash
node cli.js --input model.scad --format step --output model.step
```

Run tests:

```bash
npm.cmd test
```
