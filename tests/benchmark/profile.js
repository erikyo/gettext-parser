const fs = require("node:fs");
const gettextParser = require("gettext-parser-next/lib/cjs");
const { join } = require("node:path");

/**
 * CPU Profiling - Memory Profiling - Heap Profiling
 * https://www.jetbrains.com/help/webstorm/v8-cpu-and-memory-profiling.html
 */
const input = fs.readFileSync(join(__dirname, "example.pot"));

gettextParser.po.parse(input);
