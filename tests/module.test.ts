import { describe, expect, it } from "vitest";
import { mo, po } from "../src/index.js";

describe("esm module", () => {
	it("should allow named imports", () => {
		expect(po.parse).to.be.a("function");
		expect(po.compile).to.be.a("function");
		expect(mo.parse).to.be.a("function");
		expect(mo.compile).to.be.a("function");
	});
});
