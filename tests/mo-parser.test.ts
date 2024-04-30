import { readFile as fsReadFile } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import gettextParser from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readFile = promisify(fsReadFile);

describe("MO Parser", () => {
	describe("UTF-8", () => {
		it("should parse", async () => {
			const [moData, json] = await Promise.all([
				readFile(path.join(__dirname, "fixtures/utf8.mo")),
				readFile(path.join(__dirname, "fixtures/utf8-mo.json"), "utf8"),
			]);

			const parsed = gettextParser.mo.parse(moData);

			expect(parsed).to.deep.equal(JSON.parse(json));
		});
	});

	describe("Latin-13", () => {
		it("should parse", async () => {
			const [moData, json] = await Promise.all([
				readFile(path.join(__dirname, "fixtures/latin13.mo")),
				readFile(path.join(__dirname, "fixtures/latin13-mo.json"), "utf8"),
			]);

			const parsed = gettextParser.mo.parse(moData);

			expect(parsed).to.deep.equal(JSON.parse(json));
		});
	});
});
