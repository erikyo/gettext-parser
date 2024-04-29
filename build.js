#!/usr/bin/env node
const es = require("esbuild");
const dependencies = require("./package.json").dependencies;

const isDev = process?.env?.NODE_ENV === "development" ?? false;

const sharedConfig = {
	entryPoints: ["src/index.ts"],
	bundle: true,
	minify: true,
	keepNames: true,
	tsconfig: "tsconfig.json",
	globalName: "gettextParser",
	platform: "node",
	external: Object.keys(dependencies),
};

/**
 * This function builds the package.
 *
 * @return {Promise<void>}
 */
async function run() {
	/**
	 * Common JS (CJS)
	 */
	const cjs = es.build({
		...sharedConfig,
		format: "cjs",
		outdir: "lib/cjs",
		minify: !isDev,
		keepNames: true,
		mainFields: ["module", "main"],
		sourcemap: isDev,
	});

	const esm = es.build({
		...sharedConfig,
		format: "esm",
		outdir: "lib/esm",
		treeShaking: true,
		splitting: false,
		mainFields: ["module", "main"],
		external: ["iconv-lite", "content-type"],
	});

	await Promise.all([cjs, esm]);
}

/** Run the build */
run().catch((err) => {
	console.error(err);
});
