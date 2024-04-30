import PoParserTransform from "./PoParserTransform.js";
import type { PoParserTransformOptions, poParserOptions } from "./types.js";

/**
 * Parses a PO stream, emits translation table in object mode
 *
 * @param {poParserOptions} [options] Optional options with defaultCharset and validation
 * @param {TransformOptions} [transformOptions] Optional stream options
 */
export function streamPo(
	options: poParserOptions = {},
	transformOptions: PoParserTransformOptions = {},
) {
	return new PoParserTransform(options, transformOptions);
}
