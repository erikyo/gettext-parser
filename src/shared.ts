// see https://www.gnu.org/software/gettext/manual/html_node/Header-Entry.html

/** @type {string} The name of the plural form header key */
const PLURAL_FORMS = "Plural-Forms";

/**
 * The header keys and their corresponding values
 * @type {Map<string, string>}
 */
export const HEADERS: Map<string, string> = new Map([
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
 *
 * @type {RegExp} regex for parsing 'nplurals" value
 */
const PLURAL_FORM_HEADER_NPLURALS_REGEX = /nplurals\s*=\s*(?<nplurals>\d+)/;

/** @typedef {Record<string, string>} Headers Header keys and their corresponding values */

/**
 * Parses a header string into an object of key-value pairs
 *
 * @param {String} str Header string
 * @return {{[headerName: string]: string}} An object of key-value pairs
 */
export function parseHeader(str = "") {
	return str.split("\n").reduce(
		/**
		 * @param {Headers} headers Array of headers
		 * @param {string} line Current line
		 */
		(headers, line) => {
			const parts = line.split(":");
			let key = (parts.shift() || "").trim();

			if (key) {
				const value = parts.join(":").trim();

				key = HEADERS.get(key.toLowerCase()) || key;

				headers[key] = value;
			}

			return headers;
		},
		{},
	);
}

/**
 * Attempts to safely parse 'nplurals" value from "Plural-Forms" header
 *
 * @param {Headers} headers An object with parsed headers
 * @param fallback {Number} Fallback value
 * @returns {number} Parsed result
 */
export function parseNPluralFromHeadersSafely(headers, fallback = 1) {
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
export function generateHeader(header = {}) {
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
 * @param {String} charset Charset name
 * @param {String} defaultCharset Default charset (default: 'iso-8859-1')
 * @return {String} Normalized charset name
 */
export function formatCharset(
	charset = "iso-8859-1",
	defaultCharset = "iso-8859-1",
) {
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
 * @param {String} str PO formatted string to be folded
 * @param {Number} [maxLen=76] Maximum allowed length for folded lines
 * @return {string[]} An array of lines
 */
export function foldLine(str, maxLen = 76) {
	const lines = [];
	const len = str.length;
	let curLine = "";
	let pos = 0;
	let match: RegExpMatchArray | null;

	while (pos < len) {
		curLine = str.substring(pos, maxLen);

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
			match = /.*\s+/.exec(curLine);
			if (match && /[^\s]/.test(match[0])) {
				// use everything before and including the last white space character (if anything)
				curLine = match[0];
			} else if (
				(match = /.*[\x21-\x2f0-9\x5b-\x60\x7b-\x7e]+/.exec(curLine)) &&
				/[^\x21-\x2f0-9\x5b-\x60\x7b-\x7e]/.test(match[0])
			) {
				// use everything before and including the last "special" character (if anything)
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
 * @param {{msgid: string}} left with msgid prev
 * @param {{msgid: string}} right with msgid next
 * @returns {number} comparator index
 */
export function compareMsgid({ msgid: left }, { msgid: right }) {
	if (left < right) {
		return -1;
	}

	if (left > right) {
		return 1;
	}

	return 0;
}
