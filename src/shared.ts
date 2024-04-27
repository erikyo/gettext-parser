const PLURAL_FORMS: string = "Plural-Forms";

type Headers = Map<string, string>;
type Header = { [key: string]: string };
/**
 * The header keys and their corresponding values
 */
export const HEADERS: Headers = new Map([
	["project-id-version", "Project-Id-Version"],
	["report-msgid-bugs-to", "Report-Msgid-Bugs-To"],
	["pot-creation-date", "POT-Creation-Date"],
	["po-revision-date", "PO-Revision-Date"],
	["last-translator", "Last-Translator"],
	["language-team", "Language-Team"],
	["language", "Language"],
	["content-type", "Content-Type"],
	["content-transfer-encoding", "Content-Transfer-Encoding"],
	["plural-forms", PLURAL_FORMS],
]);

/**
 * The regex for parsing 'nplurals" value from "Plural-Forms" header
 */
const PLURAL_FORM_HEADER_NPLURALS_REGEX: RegExp =
	/nplurals\s*=\s*(?<nplurals>\d+)/;

/**
 * Parses a header string into an object of key-value pairs
 *
 * @param {String} str Header string
 * @return {{[headerName: string]: string}} An object of key-value pairs
 */
export function parseHeader(str = ""): Header {
	return str.split("\n").reduce((headers: Header, line: string) => {
		const parts = line.split(":");
		let key = (parts.shift() || "").trim();

		if (key) {
			const value = parts.join(":").trim();

			key = HEADERS.get(key.toLowerCase()) || key;

			headers[key] = value;
		}

		return headers;
	}, {});
}

/**
 * Attempts to safely parse 'nplurals" value from "Plural-Forms" header
 *
 * @param headers An object with parsed headers
 * @param fallback the fallback value
 * @returns {number} Parsed result
 */
export function parseNPluralFromHeadersSafely(
	headers: Header,
	fallback = 1,
): number {
	const pluralForms = headers ? headers[PLURAL_FORMS] : false;

	if (!pluralForms) {
		return fallback;
	}

	const {
		groups: { nplurals } = { nplurals: `${fallback}` },
	} = pluralForms.match(PLURAL_FORM_HEADER_NPLURALS_REGEX) || {};

	return Number.parseInt(nplurals, 10) || fallback;
}

/**
 * Joins a header object of key value pairs into a header string
 *
 * @param {Headers} header Object of key value pairs
 * @return {String} Header string
 */
export function generateHeader(header: Header = {}): string {
	const keys = Object.keys(header).filter((key) => !!key);

	if (!keys.length) {
		return "";
	}

	return `${keys
		.map((key) => `${key}: ${(header[key] || "").trim()}`)
		.join("\n")}\n`;
}

/**
 * Normalizes charset name. Converts utf8 to utf-8, WIN1257 to windows-1257 etc.
 *
 * @param charset Charset name
 * @param defaultCharset Default charset (default: 'iso-8859-1')
 * @return {String} Normalized charset name
 */
export function formatCharset(
	charset = "iso-8859-1",
	defaultCharset = "iso-8859-1",
): string {
	return charset
		.toString()
		.toLowerCase()
		.replace(/^utf[-_]?(\d+)$/, "utf-$1")
		.replace(/^win(?:dows)?[-_]?(\d+)$/, "windows-$1")
		.replace(/^latin[-_]?(\d+)$/, "iso-8859-$1")
		.replace(/^(us[-_]?)?ascii$/, "ascii")
		.replace(/^charset$/, defaultCharset)
		.trim();
}

/**
 * Folds long lines according to PO format
 *
 * @param str PO formatted string to be folded
 * @param [maxLen=76] Maximum allowed length for folded lines
 * @return {string[]} An array of lines
 */
export function foldLine(str: string, maxLen = 76): string[] {
	const lines = [];
	const len = str.length;
	let curLine = "";
	let pos = 0;
	let match: RegExpExecArray | null;

	while (pos < len) {
		curLine = str.substring(pos, pos + maxLen);

		// ensure that the line never ends with a partial escaping
		// make longer lines if needed
		while (curLine.substring(-1) === "\\" && pos + curLine.length < len) {
			curLine += str.charAt(pos + curLine.length);
		}

		// ensure that if possible, line breaks are done at reasonable places
		match = /.*?\\n/.exec(curLine);
		if (match) {
			// use everything before and including the first line break
			curLine = match[0];
		} else if (pos + curLine.length < len) {
			// if we're not at the end
			match =
				/.*\s+/.exec(curLine) ||
				/.*[\x21-\x2f0-9\x5b-\x60\x7b-\x7e]+/.exec(curLine);
			if (match && /[^\s\x21-\x2f0-9\x5b-\x60\x7b-\x7e]/.test(match[0])) {
				// use everything before and including the last white space character or special character (if anything)
				curLine = match[0];
			}
		}

		lines.push(curLine);
		pos += curLine.length;
	}

	return lines;
}

/**
 * Comparator function for comparing msgid
 *
 * @param left with msgid prev
 * @param right with msgid next
 * @returns {number} comparator index
 */
export function compareMsgid(
	{ msgid: left }: { msgid: string },
	{ msgid: right }: { msgid: string },
): number {
	if (left < right) {
		return -1;
	}

	if (left > right) {
		return 1;
	}

	return 0;
}
