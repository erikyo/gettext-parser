import { decode, encode } from "iconv-lite";

/**
 * Convert encoding of a UTF-8 string or a buffer
 *
 * @param strRaw String to be converted
 * @param toRaw Encoding to be converted to
 * @param [fromRaw='UTF-8'] Encoding to be converted from
 * @return Encoded string
 */
export default function convert(
	strRaw: string | Buffer,
	toRaw: string,
	fromRaw = "UTF-8",
): Buffer | string {
	const from = checkEncoding(fromRaw);
	const to = checkEncoding(toRaw);
	let str = strRaw || "";

	if (from === "UTF-8" && typeof str === "string") {
		str = Buffer.from(str, "utf-8");
	}

	if (from === to) {
		return Buffer.from(str);
	}

	try {
		return convertIconvLite(str, to, from);
	} catch (E) {
		console.error(E);
		return strRaw as Buffer;
	}
}

/**
 * Convert encoding of astring with iconv-lite
 *
 * @param str String to be converted
 * @param to Encoding to be converted to
 * @param [from='UTF-8'] Encoding to be converted from
 * @return Encoded string
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
 * @param name Character set
 * @return Character set name
 */
export function checkEncoding(name: string): string {
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
