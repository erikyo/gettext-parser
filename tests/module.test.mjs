import { describe, expect, it } from "vitest";
import esm from "../";
const { mo, po } = esm;

describe("esm module", () => {
	it("should allow named imports", async () => {
		expect(po.parse).to.be.a("function");
		expect(po.compile).to.be.a("function");
		expect(mo.parse).to.be.a("function");
		expect(mo.compile).to.be.a("function");
	});
});
