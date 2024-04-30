import { describe, expect, it } from 'vitest';

describe("esm module", () => {
	it("should allow named imports", async () => {
    const cjs = await import('../lib/index.js');
    const { po, mo } = cjs;
		expect(po.parse).to.be.a("function");
		expect(po.compile).to.be.a("function");
		expect(mo.parse).to.be.a("function");
		expect(mo.compile).to.be.a("function");
	});
});
