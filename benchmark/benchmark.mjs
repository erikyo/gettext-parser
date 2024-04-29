import fs from "node:fs";
import b from "benny";
import gettextParser from "gettext-parser";
import gtpn from "gettext-parser-next";
const { po } = gtpn;

const input = fs.readFileSync("example.pot");

const options = {
	minSamples: 10,
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
			po.parse(input);
		},
		options,
	),

	b.cycle(),
	b.complete(),
	b.save({ file: "gettextParser", version: "1.0.0" }),
	b.save({ file: "gettextParser", format: "chart.html" }),
);
