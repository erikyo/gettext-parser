import * as fs from "node:fs";
import { EOL } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import gettextParser from "../src/index.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readFile = promisify(fs.readFile);

describe("Obsolete", async () => {
	const [po, mo, jsonString] = await Promise.all([
		readFile(path.join(__dirname, "fixtures/obsolete.po")),
		readFile(path.join(__dirname, "fixtures/obsolete.mo")),
		readFile(path.join(__dirname, "fixtures/obsolete.json"), "utf8"),
	]);

	const json = JSON.parse(jsonString);
	const poString = po.toString("utf8");
	const moString = mo.toString("utf8");

	describe("PO Parser", () => {
		it("should parse obsolete messages", async () => {
			const parsed = gettextParser.po.parse(po);

			expect(parsed).to.deep.equal(json);
		});
	});
	describe("PO Compiler", () => {
		it("should compile obsolete messages", async () => {
			const compiled = gettextParser.po
				.compile(json, { eol: EOL })
				.toString("utf8");

			expect(compiled).to.be.equal(poString);
		});
	});
	describe("MO Compiler", () => {
		it("should ignore obsolete messages", async () => {
			const compiled = gettextParser.mo.compile(json).toString("utf8");

			expect(compiled).to.be.equal(moString);
		});
	});
});
