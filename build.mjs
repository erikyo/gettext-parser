#!/usr/bin/env node
import * as es from "esbuild";

const isDev = process?.env?.NODE_ENV === "development" ?? false;

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
		format: "cjs",
		entryPoints: ["src/**/*.ts"],
		outdir: "lib/cjs",
		tsconfig: "tsconfig.json",
		minify: isDev,
		platform: "node",
		bundle: true,
		target: "es2015",
		sourcemap: !isDev,
	});

	const esm = es.build({
		tsconfig: "tsconfig.json",
		format: "esm",
		platform: "node",
		entryPoints: ["src/**/*.ts"],
		outdir: "lib/esm",
		target: "es2022",
		treeShaking: true,
		splitting: true,
		minify: true,
		keepNames: true,
		mainFields: ["module", "main"],
	});

	await Promise.all([cjs, esm]);
}

/** Run the build */
await run().catch((err) => {
	console.error(err);
});
