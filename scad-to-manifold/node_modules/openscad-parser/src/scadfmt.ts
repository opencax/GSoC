#!/bin/env node

import ASTPrinter from "./ASTPrinter";
import CodeFile from "./CodeFile";
import FormattingConfiguration from "./FormattingConfiguration";
import ParsingHelper from "./ParsingHelper";
import * as fs from "fs/promises";

class CliFlag {
  constructor(
    public name: string,
    public aliases: string[],
    public description: string,
    public hasValue: boolean = false
  ) {}
}

const cliFlags: CliFlag[] = [
  new CliFlag("--help", ["-h"], "Prints this help message"),
  new CliFlag("--version", ["-v"], "Prints the version"),
  new CliFlag("--write", ["-w"], "Formats the file in-place"),
];

async function run() {
  const flags: { [key: string]: string | boolean } = {};
  const rest: string[] = [];
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    const flag = cliFlags.find(
      (f) => f.name === arg || f.aliases.includes(arg)
    );
    if (flag) {
      flags[flag.name] = flag.hasValue ? process.argv[i + 1] : true;
      if (flag.hasValue) {
        i++;
      }
    } else {
      rest.push(arg);
    }
  }
  let shouldPrintHelp = rest.length === 0 || flags["--help"];
  if (shouldPrintHelp) {
    let helpMsg = `Usage: scadfmt [options] [files...]
By default, scadfmt will format the provided files and output them to stdout. Use -w to overwrite them in-place.

  Options:`;
    for (const flag of cliFlags) {
      helpMsg += `\n    ${flag.name}${
        flag.hasValue ? " <value>" : ""
      }, ${flag.aliases.join(", ")}${flag.hasValue ? " <value>" : ""} - ${
        flag.description
      }`;
    }
    helpMsg += `
    
scadfmt is a part of openscad-parser. https://github.com/alufers/openscad-parser`;
    console.error(helpMsg);
    process.exit(0);
  }
  let formattedOutputs: { [key: string]: string } = {};
  for (let filename of rest) {
    const file = await CodeFile.load(filename);
    const [ast, errorCollector] = ParsingHelper.parseFile(file);
    if (errorCollector.hasErrors()) {
      errorCollector.printErrors();
      process.exit(1);
    }
    if (!ast) {
      throw new Error("No AST");
    }
    if (flags["--write"]) {
      formattedOutputs[filename] = new ASTPrinter(
        new FormattingConfiguration()
      ).visitScadFile(ast);
    } else {
      console.log(
        new ASTPrinter(new FormattingConfiguration()).visitScadFile(ast)
      );
    }
  }

  if (flags["--write"]) {
    for (let filename in formattedOutputs) {
      await fs.writeFile(filename, formattedOutputs[filename]);
    }
  }
}
run().catch(console.error);
