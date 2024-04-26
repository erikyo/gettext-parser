import encoding from "encoding";
import type { Buffer } from "safe-buffer";
import { formatCharset, parseHeader } from "./shared.js";

/**
 * Parses a binary MO object into translation table
 *
 * @param {Buffer} buffer Binary MO object
 * @param {String} [defaultCharset] Default charset to use
 * @return {Object} Translation object
 */
export default function (buffer: Buffer, defaultCharset = "iso-8859-1") {
	const parser = new Parser(buffer, defaultCharset);

	return parser.parse();
}

/**
 * Translation table
 * The translation table is an object with the following structure:
 *
 * - charset: (string|String|*)
 * - headers?: {[headerName: string]: string}
 * - translations: {
 *   [msgctxt: string]: { [msgId: string]: GetTextTranslation }
 *   }
 *
 * @typedef {{charset: (string|String|*), headers?: {[headerName: string]: string}, translations: import('../index.d.ts').GetTextTranslations | {}}} Table
 */

/**
 * Creates a MO parser object.
 * @constructor
 * @this {Parser}
 *
 * @param {Buffer} fileContents Binary MO object
 * @param {String} [defaultCharset] Default charset to use
 */
class Parser {
	private _fileContents: any;
	private _writeFunc: string;
	private _readFunc: string;
	private _charset: string;
	private _table: { charset: string; headers: {}; translations: {} };
	/**
	 * @param {Buffer} fileContents
	 * @param {string} defaultCharset
	 */
	constructor(fileContents, defaultCharset = "iso-8859-1") {
		/** @var {Buffer} _fileContents Binary MO object*/
		this._fileContents = fileContents;

		this._writeFunc = "writeUInt32LE";

		this._readFunc = "readUInt32LE";

		this._charset = defaultCharset;

		this._table = {
			charset: this._charset,
			headers: {},
			translations: {},
		};
	}

	/**
	 * Checks if number values in the input file are in big- or littleendian format.
	 *
	 * @return {Boolean} Return true if magic was detected
	 */
	_checkMagick() {
		if (this._fileContents.readUInt32LE(0) === this.MAGIC) {
			this._readFunc = "readUInt32LE";
			this._writeFunc = "writeUInt32LE";

			return true;
		} else if (this._fileContents.readUInt32BE(0) === this.MAGIC) {
			this._readFunc = "readUInt32BE";
			this._writeFunc = "writeUInt32BE";

			return true;
		}

		return false;
	}

	/**
	 * Read the original strings and translations from the input MO file. Use the
	 * first translation string in the file as the header.
	 */
	_loadTranslationTable() {
		let offsetOriginals = this._offsetOriginals;
		let offsetTranslations = this._offsetTranslations;
		let position;
		let length;
		let msgid;
		let msgstr;

		for (let i = 0; i < this._total; i++) {
			// msgid string
			length = this._fileContents[this._readFunc](offsetOriginals);
			offsetOriginals += 4;
			position = this._fileContents[this._readFunc](offsetOriginals);
			offsetOriginals += 4;
			msgid = this._fileContents.slice(position, position + length);

			// matching msgstr
			length = this._fileContents[this._readFunc](offsetTranslations);
			offsetTranslations += 4;
			position = this._fileContents[this._readFunc](offsetTranslations);
			offsetTranslations += 4;
			msgstr = this._fileContents.slice(position, position + length);

			if (!i && !msgid.toString()) {
				this._handleCharset(msgstr);
			}

			msgid = encoding.convert(msgid, "utf-8", this._charset).toString("utf8");
			msgstr = encoding
				.convert(msgstr, "utf-8", this._charset)
				.toString("utf8");

			this._addString(msgid, msgstr);
		}

		// dump the file contents object
		this._fileContents = null;
	}

	/**
	 * Detects charset for MO strings from the header
	 *
	 * @param {Buffer} headers Header value
	 */
	_handleCharset(headers) {
		const headersStr = headers.toString();
		let match;

		if ((match = headersStr.match(/[; ]charset\s*=\s*([\w-]+)/i))) {
			this._charset = this._table.charset = formatCharset(
				match[1],
				this._charset,
			);
		}

		headers = encoding
			.convert(headers, "utf-8", this._charset)
			.toString("utf8");

		this._table.headers = parseHeader(headers.toString());
	}

	/**
	 * Adds a translation to the translation object
	 *
	 * @param {string} msgid Original string
	 * @param {String} msgstr Translation for the original string
	 */
	_addString(msgid, msgstr) {
		/**
		 * @type {import('../index.d.ts').GetTextTranslation} translation Translation
		 */
		const translation = {};
		/** @var {string} msgctxt Context string */
		let msgctxt;
		/** @var {string} msgidPlural Plural translation string */
		let msgidPlural;

		const msgidSplit = msgid.split("\u0004");
		if (msgidSplit.length > 1) {
			msgctxt = msgidSplit.shift();
			translation.msgctxt = msgctxt;
		} else {
			msgctxt = "";
		}
		msgid = msgidSplit.join("\u0004");

		const parts = msgid.split("\u0000");
		msgid = parts.shift() || "";

		translation.msgid = msgid;

		// Plural forms
		msgidPlural = parts.join("\u0000");

		if (msgidPlural) {
			translation.msgid_plural = msgidPlural;
		}

		/** @var {string[]} msgstr Translated string */
		const msgstrSplit = msgstr.split("\u0000");
		translation.msgstr = [].concat(msgstrSplit);

		if (!this._table.translations[msgctxt]) {
			this._table.translations[msgctxt] = {};
		}

		this._table.translations[msgctxt][msgid] = translation;
	}

	/**
	 * Parses the MO object and returns translation table
	 *
	 * @return {import('../index.d.ts').GetTextTranslations | false} Translation table
	 */
	parse() {
		if (!this._checkMagick()) {
			return false;
		}

		/**
		 * GetText revision nr, usually 0
		 */
		this._revision = this._fileContents[this._readFunc](4);

		/**
		 * Total count of translated strings
		 */
		this._total = this._fileContents[this._readFunc](8);

		/**
		 * Offset position for original strings table
		 */
		this._offsetOriginals = this._fileContents[this._readFunc](12);

		/**
		 * Offset position for translation strings table
		 */
		this._offsetTranslations = this._fileContents[this._readFunc](16);

		// Load translations into this._translationTable
		this._loadTranslationTable();

		return this._table;
	}
}

/**
 * Magic constant to check the endianness of the input file
 */
Parser.prototype.MAGIC = 0x950412de;
