import convert from "./encoding.js";
import { formatCharset, parseHeader } from "./shared.js";
import type {
	BufferReadFunc,
	BufferWriteFunc,
	GetTextTranslations,
} from "./types.js";

/**
 * Creates a MO parser object.
 *
 * @constructor
 * @param {Buffer} fileContents Binary MO object
 * @param {String} [defaultCharset] Default charset to use
 */
export class MoParser {
	private _fileContents: Buffer | string;
	private _writeFunc: BufferWriteFunc;
	private _readFunc: BufferReadFunc;
	private _charset: string;
	private _table: GetTextTranslations;
	MAGIC: number;
	_offsetOriginals?: number;
	_offsetTranslations?: number;
	private _revision: any;
	private _total: any;
	constructor(fileContents: string | Buffer, defaultCharset = "iso-8859-1") {
		this._fileContents = fileContents;

		/**
		 * Method name for writing int32 values, default littleendian
		 */
		this._writeFunc = "writeUInt32LE";

		/**
		 * Method name for reading int32 values, default littleendian
		 */
		this._readFunc = "readUInt32LE";

		this._charset = defaultCharset;

		this._table = {
			charset: this._charset,
			headers: undefined,
			translations: {},
		};
		/**
		 * Magic constant to check the endianness of the input file
		 */
		this.MAGIC = 0x950412de;
	}

	/**
	 * Checks if number values in the input file are in big- or littleendian format.
	 *
	 * @return {Boolean} Return true if magic was detected
	 */
	_checkMagick() {
		if (
			typeof this._fileContents !== "string" &&
			this._fileContents.readUInt32LE(0) === this.MAGIC
		) {
			this._readFunc = "readUInt32LE";
			this._writeFunc = "writeUInt32LE";

			return true;
		}
		if (
			typeof this._fileContents !== "string" &&
			this._fileContents.readUInt32BE(0) === this.MAGIC
		) {
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
		let offsetOriginals = this._offsetOriginals as number;
		let offsetTranslations = this._offsetTranslations as number;
		let position: number;
		let length: number;

		for (let i = 0; i < this._total; i++) {
			// msgid string
			length = this._fileContents[this._readFunc](offsetOriginals);
			offsetOriginals += 4;
			position = this._fileContents[this._readFunc](offsetOriginals);
			offsetOriginals += 4;
			const msgidBuffer = this._fileContents.subarray(
				position,
				position + length,
			);
			const msgid = convert(msgidBuffer, "utf-8", this._charset).toString(
				"utf8",
			);

			// matching msgstr
			length = this._fileContents[this._readFunc](offsetTranslations);
			offsetTranslations += 4;
			position = this._fileContents[this._readFunc](offsetTranslations);
			offsetTranslations += 4;
			const msgstrBuffer = this._fileContents.subarray(
				position,
				position + length,
			);
			const msgstr = convert(msgstrBuffer, "utf-8", this._charset).toString(
				"utf8",
			);

			if (!i && !msgid) {
				this._handleCharset(msgstrBuffer); // Assuming _handleCharset can take a Buffer
			}

			this._addString(msgid, msgstr);
		}
	}
	/**
	 * Detects charset for MO strings from the header
	 *
	 * @param {Buffer} headersRaw Header value
	 */
	_handleCharset(headersRaw: Buffer) {
		const headersStr = headersRaw.toString();

		const match = headersStr.match(/[; ]charset\s*=\s*([\w-]+)/i);
		if (match) {
			this._charset = this._table.charset = formatCharset(
				match[1],
				this._charset,
			);
		}

		const headers = convert(headersRaw, "utf-8", this._charset).toString(
			"utf8",
		);

		this._table.headers = parseHeader(headers);
	}

	/**
	 * Adds a translation to the translation object
	 *
	 * @param {String} msgidRaw Original string
	 * @param {String} msgstr Translation for the original string
	 */
	_addString(msgidRaw: string | Buffer, msgstr: string) {
		const translation = {};
		let msgctxt;
		let msgidPlural;
		let msgid = msgidRaw;

		msgid = msgid.split("\u0004");
		if (msgid.length > 1) {
			msgctxt = msgid.shift();
			translation.msgctxt = msgctxt;
		} else {
			msgctxt = "";
		}
		msgid = msgid.join("\u0004");

		const parts = msgid.split("\u0000");
		msgid = parts.shift();

		translation.msgid = msgid;

		if ((msgidPlural = parts.join("\u0000"))) {
			translation.msgid_plural = msgidPlural;
		}

		msgstr = msgstr.split("\u0000");
		translation.msgstr = [].concat(msgstr || []);

		if (!this._table.translations[msgctxt]) {
			this._table.translations[msgctxt] = {};
		}

		this._table.translations[msgctxt][msgid] = translation;
	}

	/**
	 * Parses the MO object and returns translation table
	 *
	 * @return {GetTextTranslations} Translation table
	 */
	parse(): GetTextTranslations | false {
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
