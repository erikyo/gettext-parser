import * as fs from "node:fs";
import b from "benny";
import * as gettextParser from "gettext-parser";
import * as gettextParserNext from "gettext-parser-next";

const input = fs.readFileSync("example.pot");

const options = {
	minSamples: 50,
	maxTime: 2,
};

b.suite(
	"Example",

	b.add(
		"gettextParser",
		() => {
			gettextParser.po.parse(input);
		},
		options,
	),

	b.add(
		"gettextParserNext",
		() => {
			gettextParserNext.po.parse(input);
		},
		options,
	),

	b.cycle(),
	b.complete(),
);
