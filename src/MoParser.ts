import convert from "./encoding.js";
import { formatCharset, parseHeader } from "./shared.js";
import type {
	BufferReadFunc,
	BufferWriteFunc,
	GetTextTranslations,
	TranslationEntry,
} from "./types.js";

/**
 * Creates a MO parser object.
 *
 * @constructor
 * @param {Buffer} fileContents Binary MO object
 * @param {String} [defaultCharset] Default charset to use
 */
export class MoParser {
	private _fileContents: Buffer;

	/**
	 * Method name for writing int32 values, default littleendian
	 */
	private _writeFunc: BufferWriteFunc = "writeUInt32LE";

	/**
	 * Method name for reading int32 values, default littleendian
	 */
	private _readFunc: BufferReadFunc = "readUInt32LE";
	private _charset: string;
	private _table: GetTextTranslations;
	/**
	 * Magic constant to check the endianness of the input file
	 */
	MAGIC = 0x950412de;
	_offsetOriginals?: number;
	_offsetTranslations?: number;
	private _revision?: number = 0;
	private _total = 0;
	constructor(fileContents: Buffer, defaultCharset = "iso-8859-1") {
		this._fileContents = fileContents;

		this._charset = defaultCharset;

		this._table = {
			charset: this._charset,
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
		}
		if (this._fileContents.readUInt32BE(0) === this.MAGIC) {
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
		// Convert Buffer to string if necessary
		const msgidString =
			msgidRaw instanceof Buffer ? msgidRaw.toString() : msgidRaw;

		// Initialize the translation object
		const translation: TranslationEntry = {
			msgid: "",
			msgstr: [],
		};

		const contextSplit = msgidString.split("\u0004");
		if (contextSplit.length > 1) {
			translation.msgctxt = contextSplit[0];
		}
		// Use the last part of the contextSplit as msgid, which avoids unnecessary join operations
		const parts = contextSplit[contextSplit.length - 1].split("\u0000");
		translation.msgid = parts[0];

		// Add msgid_plural only if it exists
		if (parts.length > 1) {
			translation.msgid_plural = parts[1];
		}

		// Directly assign msgstr array if it's not empty
		translation.msgstr = msgstr ? msgstr.split("\u0000") : [];

		const context = translation.msgctxt || "";
		if (!this._table.translations[context]) {
			this._table.translations[context] = {};
		}

		this._table.translations[context][translation.msgid] = translation;
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
