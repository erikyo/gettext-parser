import { describe, expect, it } from "vitest";
import cjs from "../lib/cjs/index.js";
import esm from "../lib/esm/index.js";

describe("esm module", () => {
	it("should allow named imports", () => {
		expect(esm.po.parse).to.be.a("function");
		expect(esm.po.compile).to.be.a("function");
		expect(esm.mo.parse).to.be.a("function");
		expect(esm.mo.compile).to.be.a("function");
	});
});
describe("cjs module", () => {
	it("should allow named imports", () => {
		expect(cjs.po.parse).to.be.a("function");
		expect(cjs.po.compile).to.be.a("function");
		expect(cjs.mo.parse).to.be.a("function");
		expect(cjs.mo.compile).to.be.a("function");
	});
});
