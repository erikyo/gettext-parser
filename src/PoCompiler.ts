import contentType from "content-type";
import convert from "./encoding.js";
import {
	HEADERS,
	compareMsgid,
	foldLine,
	formatCharset,
	generateHeader,
} from "./shared.js";
import type {
	GetTextComment,
	GetTextTranslations,
	TranslationEntry,
	parserOptions,
} from "./types.js";

function parseOptions(optionsRaw?: parserOptions): parserOptions {
	const options: Partial<parserOptions> = { ...optionsRaw };
	if (!("foldLength" in options)) {
		options.foldLength = 76;
	}

	if (!("escapeCharacters" in options)) {
		options.escapeCharacters = true;
	}

	if (!("sort" in options)) {
		options.sort = false;
	}

	if (!("eol" in options)) {
		options.eol = "\n";
	}

	return options as parserOptions;
}

class PoCompiler {
	_table: GetTextTranslations;
	_options: parserOptions;

	constructor(table: GetTextTranslations, options?: parserOptions) {
		this._table = table;

		this._options = parseOptions(options);

		this._table.translations = this._table.translations || {};

		let { headers = {} } = this._table;

		headers = Object.keys(headers).reduce(
			(result: { [headerName: string]: string }, key: string) => {
				const lowerKey = key.toLowerCase();

				if (HEADERS.has(lowerKey)) {
					result[HEADERS.get(lowerKey) as string] = headers[key];
				} else {
					result[key] = headers[key];
				}

				return result;
			},
			{},
		);

		this._table.headers = headers;

		this._handleCharset();
	}

	/**
	 * Converts a comment object to a comment string. The comment object is
	 * in the form of {translator:'', reference: '', extracted: '', flag: '', previous:''}
	 *
	 * @param comments A comments object
	 * @return A comment string for the PO file
	 */
	_drawComments(comments: GetTextComment): string {
		const lines: string[] = [];
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
			const itemComments = type.key as keyof GetTextComment;
			if (
				itemComments in comments &&
				typeof comments[itemComments] === "string"
			) {
				const commentsList = comments[itemComments]?.split(/\r?\n|\r/);
				if (commentsList)
					for (const line of commentsList) {
						lines.push(`${type.prefix}${line}`);
					}
			}
		}

		return lines.join(this._options.eol);
	}

	/**
	 * Builds a PO string for a single translation object
	 *
	 * @param {TranslationEntry} block Translation object
	 * @param {TranslationEntry} override Properties of this object will override `block` properties
	 * @param {boolean} [obsolete] Block is obsolete and must be commented out
	 * @return {String} Translation string for a single object
	 */
	_drawBlock(
		block: TranslationEntry,
		override: Partial<TranslationEntry> = {},
		obsolete = false,
	): string {
		const response = [];
		const msgctxt = override.msgctxt || block.msgctxt;
		const msgid = override.msgid || block.msgid;
		const msgidPlural = override.msgid_plural || block.msgid_plural;
		const realMsgstr: string[] = override.msgstr || block.msgstr;
		const msgstr = [].concat(realMsgstr as never[]);
		const comments = override.comments || block.comments;

		// add comments
		if (comments) {
			const commentsRender = this._drawComments(comments);
			if (commentsRender) {
				response.push(commentsRender);
			}
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
	 * @param keyRaw Key name
	 * @param value Key value
	 * @param  obsolete PO string is obsolete and must be commented out
	 * @return {string} Joined and escaped key-value pair
	 */
	_addPOString(keyRaw = "", valueRaw = "", obsolete = false): string {
		let key = keyRaw.toString();
		if (obsolete) {
			key = `#~ ${key}`;
		}

		let value = valueRaw;

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
			eol = `${eol}#~ `;
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
		if (!this._table.headers) {
			this._table.headers = {};
		}
		const ct = contentType.parse(
			this._table.headers["Content-Type"] || "text/plain",
		);

		if (!ct) {
			return;
		}

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
	 * @param {{[msgctxt: string]: { [msgid: string]: TranslationEntry }}} section Object to be prepared (translations or obsolete)
	 * @returns {TranslationEntry[]} Prepared array
	 */
	_prepareSection(section: {
		[msgctxt: string]: { [msgid: string]: TranslationEntry };
	}): TranslationEntry[] | undefined {
		let response: TranslationEntry[] = [];

		for (const msgctxt in section) {
			if (typeof section[msgctxt] !== "object") {
				return;
			}

			for (const msgid of Object.keys(section[msgctxt])) {
				if (typeof section[msgctxt][msgid] !== "object") {
					continue;
				}

				if (msgctxt === "" && msgid === "") {
					continue;
				}

				response.push(section[msgctxt][msgid]);
			}
		}

		const { sort } = this._options;

		if (sort) {
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
	compile(): Buffer | string {
		const headerBlock = this._table.translations[""]?.[""] || {};
		let response = [];

		const translations = this._prepareSection(this._table.translations);
		response = translations?.map((r) => this._drawBlock(r)) || [];

		if (typeof this._table.obsolete === "object") {
			const obsolete = this._prepareSection(this._table.obsolete);
			if (obsolete?.length) {
				response = response.concat(
					obsolete.map((r) => this._drawBlock(r, {}, true)),
				);
			}
		}

		const { eol } = this._options;

		// TODO SOME GLITCHES HERE
		response.unshift(
			this._drawBlock(headerBlock, {
				msgstr: [generateHeader(this._table.headers)],
			}),
		);

		if (this._table.charset === "utf-8" || this._table.charset === "ascii") {
			return Buffer.from(response.join(eol + eol) + eol, "utf-8");
		}

		return convert(
			response.join(eol + eol) + eol,
			this._table.charset as string,
		);
	}
}

export default PoCompiler;
