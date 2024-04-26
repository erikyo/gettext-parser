import contentType from "content-type";
import { Buffer } from "safe-buffer";
import encoding from "./encoding.js";
import {
	HEADERS,
	compareMsgid,
	foldLine,
	formatCharset,
	generateHeader,
} from "./shared.js";
import type {
	GetTextTranslation,
	GetTextTranslations,
	parserOptions,
} from "./types";

/**
 * Exposes general compiler function. Takes a translation
 * object as a parameter and returns PO object
 *
 * @param {GetTextTranslations} table Translation object
 * @param {parserOptions} options Compiler options
 * @return {Buffer} Compiled PO object
 */
export default function (table: GetTextTranslations, options: parserOptions) {
	/** @type {Compiler} */
	const compiler = new Compiler(table, options);

	return compiler.compile();
}

/** @type {import('../index.d.ts').Compiler} Compiler */
class Compiler {
	private _table: GetTextTranslations;
	private _options: parserOptions;
	/**
	 * @param {GetTextTranslations} table
	 * @param {parserOptions} options
	 */
	constructor(table: GetTextTranslations, options: parserOptions) {
		this._table = table;
		this._options = options;

		this._table.translations = this._table.translations || {};

		let { headers = {} } = this._table;

		headers = Object.keys(headers).reduce(
			/**
			 * @this {import('../index.d.ts').GetTextTranslation}
			 * @param {{ [headerName: string]: string }} result
			 * @param {string} key
			 */
			(result, key) => {
				const lowerKey = key.toLowerCase();

				if (HEADERS.has(lowerKey)) {
					result[HEADERS.get(lowerKey)] = headers[key];
				} else {
					result[key] = headers[key];
				}

				return result;
			},
			{},
		);

		this._table.headers = headers;

		if (!("foldLength" in this._options)) {
			this._options.foldLength = 76;
		}

		if (!("escapeCharacters" in this._options)) {
			this._options.escapeCharacters = true;
		}

		if (!("sort" in this._options)) {
			this._options.sort = false;
		}

		if (!("eol" in this._options)) {
			this._options.eol = "\n";
		}

		this._translations = [];

		this._handleCharset();
	}

	/**
	 * Converts a comments object to a comment string. The comment object is
	 * in the form of {translator:'', reference: '', extracted: '', flag: '', previous:''}
	 *
	 * @param {import('../index.d.ts').GetTextComment} comments A comments object
	 * @return {String} A comment string for the PO file
	 */
	_drawComments(comments) {
		/** @type {String[]} lines */
		const lines = [];
		const types = [
			{
				key: "translator",
				prefix: "# ",
			},
			{
				key: "reference",
				prefix: "#: ",
			},
			{
				key: "extracted",
				prefix: "#. ",
			},
			{
				key: "flag",
				prefix: "#, ",
			},
			{
				key: "previous",
				prefix: "#| ",
			},
		];

		for (const type of types) {
			if (!comments[type.key]) {
				return;
			}

			for (const line of comments[type.key].split(/\r?\n|\r/)) {
				lines.push(`${type.prefix}${line}`);
			}
		}

		return lines.join(this._options.eol);
	}

	/**
	 * Builds a PO string for a single translation object
	 *
	 * @param {GetTextTranslation} block Translation object
	 * @param {GetTextTranslation} override Properties of this object will override `block` properties
	 * @param {boolean} [obsolete] Block is obsolete and must be commented out
	 * @return {String} Translation string for a single object
	 */
	_drawBlock(
		block: GetTextTranslation,
		override: GetTextTranslation,
		obsolete = false,
	) {
		const response = [];
		const msgctxt = override.msgctxt || block.msgctxt;
		const msgid = override.msgid || block.msgid;
		const msgidPlural = override.msgid_plural || block.msgid_plural;
		/** @var {string[]} msgstr - Array of translation strings */
		const msgstr = [].concat(override.msgstr || block.msgstr);
		let comments = override.comments || block.comments;

		// add comments
		if (comments && (comments = this._drawComments(comments))) {
			response.push(comments);
		}

		if (msgctxt) {
			response.push(this._addPOString("msgctxt", msgctxt, obsolete));
		}

		response.push(this._addPOString("msgid", msgid || "", obsolete));

		if (msgidPlural) {
			response.push(this._addPOString("msgid_plural", msgidPlural, obsolete));

			msgstr.forEach((msgstr, i) => {
				response.push(
					this._addPOString(`msgstr[${i}]`, msgstr || "", obsolete),
				);
			});
		} else {
			response.push(this._addPOString("msgstr", msgstr[0] || "", obsolete));
		}

		return response.join(this._options.eol);
	}

	/**
	 * Escapes and joins a key and a value for the PO string
	 *
	 * @param {String} key Key name
	 * @param {String} value Key value
	 * @param {boolean} [obsolete] PO string is obsolete and must be commented out
	 * @return {String} Joined and escaped key-value pair
	 */
	_addPOString(key = "", value = "", obsolete = false) {
		key = key.toString();
		if (obsolete) {
			key = "#~ " + key;
		}

		let { foldLength, eol, escapeCharacters } = this._options;

		// escape newlines and quotes
		if (escapeCharacters) {
			value = value
				.toString()
				.replace(/\\/g, "\\\\")
				.replace(/"/g, '\\"')
				.replace(/\t/g, "\\t")
				.replace(/\r/g, "\\r");
		}

		value = value.replace(/\n/g, "\\n"); // need to escape new line characters regardless

		let lines = [value];

		if (obsolete) {
			eol = eol + "#~ ";
		}

		if (foldLength > 0) {
			lines = foldLine(value, foldLength);
		} else {
			// split only on new lines
			if (escapeCharacters) {
				lines = value.split(/\\n/g);
				for (let i = 0; i < lines.length - 1; i++) {
					lines[i] = `${lines[i]}\\n`;
				}
				if (lines.length && lines[lines.length - 1] === "") {
					lines.splice(-1, 1);
				}
			}
		}

		if (lines.length < 2) {
			return `${key} "${lines.shift() || ""}"`;
		}

		return `${key} ""${eol}"${lines.join(`"${eol}"`)}"`;
	}

	/**
	 * Handles header values, replaces or adds (if needed) a charset property
	 */
	_handleCharset() {
		const ct = contentType.parse(
			this._table.headers["Content-Type"] || "text/plain",
		);

		const charset = formatCharset(
			this._table.charset || ct.parameters.charset || "utf-8",
		);

		// clean up content-type charset independently using fallback if missing
		if (ct.parameters.charset) {
			ct.parameters.charset = formatCharset(ct.parameters.charset);
		}

		this._table.charset = charset;

		this._table.headers["Content-Type"] = contentType.format(ct);
	}

	/**
	 * Flatten and sort translations object
	 *
	 * @param {{[msgctxt: string]: { [msgid: string]: import('../index.d.ts').GetTextTranslation }}} section Object to be prepared (translations or obsolete)
	 * @returns {import('../index.d.ts').GetTextTranslation[]} Prepared array
	 */
	_prepareSection(section) {
		/** @type {import('../index.d.ts').GetTextTranslation[]} response - Array of prepared objects */
		let response = [];

		Object.keys(section).forEach((msgctxt) => {
			if (typeof section[msgctxt] !== "object") {
				return;
			}

			Object.keys(section[msgctxt]).forEach((msgid) => {
				if (typeof section[msgctxt][msgid] !== "object") {
					return;
				}

				if (msgctxt === "" && msgid === "") {
					return;
				}

				response.push(section[msgctxt][msgid]);
			});
		});

		const { sort } = this._options;

		if (sort !== false) {
			if (typeof sort === "function") {
				response = response.sort(sort);
			} else {
				response = response.sort(compareMsgid);
			}
		}

		return response;
	}

	/**
	 * Compiles translation object into a PO object
	 *
	 * @return {Buffer} Compiled PO object
	 */
	compile() {
		const headerBlock =
			(this._table.translations[""] && this._table.translations[""][""]) || {};
		let response = [];

		const translations = this._prepareSection(this._table.translations);
		response = translations.map((r) => this._drawBlock(r));

		if (typeof this._table.obsolete === "object") {
			const obsolete = this._prepareSection(this._table.obsolete);
			if (obsolete.length) {
				response = response.concat(
					obsolete.map((r) => this._drawBlock(r, {}, true)),
				);
			}
		}

		const { eol } = this._options;

		response.unshift(
			this._drawBlock(headerBlock, {
				msgstr: generateHeader(this._table.headers),
			}),
		);

		if (this._table.charset === "utf-8" || this._table.charset === "ascii") {
			return Buffer.from(response.join(eol + eol) + eol, "utf-8");
		}

		return encoding.convert(
			response.join(eol + eol) + eol,
			this._table.charset,
		);
	}
}
