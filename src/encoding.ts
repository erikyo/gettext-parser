import { decode, encode } from "iconv-lite";

/**
 * Convert encoding of an UTF-8 string or a buffer
 *
 * @param {String|Buffer} strRaw String to be converted
 * @param {String} toRaw Encoding to be converted to
 * @param {String} [fromRaw='UTF-8'] Encoding to be converted from
 * @return {Buffer} Encoded string
 */
export default function convert(
	strRaw: string | Buffer,
	toRaw: string,
	fromRaw?: string,
): Buffer {
	const from = checkEncoding(fromRaw || "UTF-8");
	const to = checkEncoding(toRaw || "UTF-8");
	let str = strRaw || "";

	let result: Buffer | string;

	if (from !== "UTF-8" && typeof str === "string") {
		str = Buffer.from(str, "binary");
	}

	if (from === to) {
		if (typeof str === "string") {
			result = Buffer.from(str);
		} else {
			result = str;
		}
	} else {
		try {
			result = convertIconvLite(str, to, from);
		} catch (E) {
			console.error(E);
			result = str;
		}
	}

	if (typeof result === "string") {
		result = Buffer.from(result, "utf-8");
	}

	return result;
}

/**
 * Convert encoding of astring with iconv-lite
 *
 * @param {String|Buffer} str String to be converted
 * @param {String} to Encoding to be converted to
 * @param {String} [from='UTF-8'] Encoding to be converted from
 * @return {Buffer} Encoded string
 */
export function convertIconvLite(
	str: Buffer | string,
	to: string,
	from: string,
): string | Buffer {
	if (to === "UTF-8") {
		return decode(str as Buffer, from);
	}
	if (from === "UTF-8" && typeof str === "string") {
		return encode(str, to);
	}
	return encode(decode(str as Buffer, from), to);
}

/**
 * Converts charset name if needed
 *
 * @param {String} name Character set
 * @return {String} Character set name
 */
export function checkEncoding(name: string) {
	return (name || "")
		.toString()
		.trim()
		.replace(/^latin[\-_]?(\d+)$/i, "ISO-8859-$1")
		.replace(/^win(?:dows)?[\-_]?(\d+)$/i, "WINDOWS-$1")
		.replace(/^utf[\-_]?(\d+)$/i, "UTF-$1")
		.replace(/^ks_c_5601\-1987$/i, "CP949")
		.replace(/^us[\-_]?ascii$/i, "ASCII")
		.toUpperCase();
}
