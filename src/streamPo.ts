import type { TransformOptions } from "node:stream";
import PoParserTransform from "./PoParserTransform.js";
import type { poParserOptions } from "./types.js";

/**
 * Parses a PO stream, emits translation table in object mode
 *
 * @param {poParserOptions} [options] Optional options with defaultCharset and validation
 * @param {TransformOptions} [transformOptions] Optional stream options
 */
export default function StreamPo(
	options: poParserOptions = {},
	transformOptions: TransformOptions = {},
) {
	return new PoParserTransform(options, transformOptions);
}
