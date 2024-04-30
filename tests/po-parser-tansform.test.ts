import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import gettextParser from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the module containing createParseStream function
const { createParseStream } = gettextParser.po;

describe("createParseStream", () => {
	it("should parse a PO file from a readable stream", async () => {
		const readableStream = fs.createReadStream(
			path.join(__dirname, "fixtures/utf8.po"),
			{
				highWaterMark: 1024,
			},
		);

		const json = fs.readFileSync(
			path.join(__dirname, "fixtures/utf8-po.json"),
			"utf8",
		);

		let parsed;

		const stream = readableStream.pipe(
			createParseStream(undefined, {
				initialTreshold: 20,
			}),
		);

		stream.on("data", (data) => {
			parsed = data;
		});

		stream.on("end", () => {
			expect(parsed).to.deep.equal(JSON.parse(json));
		});
	});

	it("should parse a PO file from a readable stream then flush the cache", async () => {
		const readableStream = fs.createReadStream(
			path.join(__dirname, "fixtures/utf8.po"),
			{
				highWaterMark: 20,
			},
		);

		const st = createParseStream(undefined, {
			initialTreshold: 20,
		});

		let parsed = "";

		readableStream.pipe(st, { end: false });
		st.pipe(st, { end: true });

		const promise = await new Promise((resolve, reject) => {
			readableStream.on("data", (data) => {
				parsed += data;
			});

			readableStream.on("end", () => {
				resolve(parsed);
			});
			readableStream.on("error", reject);
		});

		expect(promise).toBeTruthy();
	});
});
