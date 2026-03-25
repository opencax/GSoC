[![Node.js CI](https://github.com/alufers/openscad-parser/workflows/Node.js%20CI/badge.svg)](https://github.com/alufers/openscad-parser/actions?query=workflow%3A%22Node.js+CI%22)
[![License](https://img.shields.io/github/license/alufers/openscad-parser)](https://github.com/alufers/openscad-parser/blob/master/LICENSE.md)
[![NPM package](https://badge.fury.io/js/openscad-parser.svg)](https://www.npmjs.com/package/openscad-parser)

# openscad-parser

This package facilitates parsing, formatting and validating the OpenSCAD language using TypeScript and JavaScript.

# Installation (formatter)

```sh
$ npm i -g openscad-parser
```

Usage:
```sh
$ scadfmt <file> # outputs the formatted OpenSCAD code to stdout
```

# Installation (as a node module)

```sh
npm install openscad-parser
```

# Features

- [x] Parsing and full error reporting (reports even better errors than the default OpenSCAD parser)
- [x] Symbol tree generation (VSCode "Outline" view)
- [x] Formatting (fully AST-aware, needs some more work with breaking up large vectors)
- [x] Semantic code completions (provides code completions for VSCode)
- [x] Jump to definition (provides a "Go to definition" context menu item)

I will soon release a vscode extension with full OpenSCAD support, it just needs some more work.

# Documentation

The API documentation is available [here](https://alufers.github.io/openscad-parser/).

# License

[MIT](https://github.com/alufers/openscad-parser/blob/master/LICENSE.md)
