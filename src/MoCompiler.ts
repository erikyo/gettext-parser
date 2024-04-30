import * as contentType from "content-type";
import convert from "./encoding.js";
import {
	HEADERS,
	compareMsgid,
	formatCharset,
	generateHeader,
} from "./shared.js";
import type {
	BufferWriteFunc,
	GetTextTranslations,
	TranslationEntry,
} from "./types.js";

class MoCompiler {
	_table: GetTextTranslations;
	_translations: GetTextTranslations["translations"][];
	_writeFunc: BufferWriteFunc;
	MAGIC: number;
	/**
	 * Creates a MO compiler object.
	 *
	 * @constructor
	 * @this {MoCompiler}
	 *
	 * @param {GetTextTranslations} table Translation table as defined in the README
	 */
	constructor(table: GetTextTranslations) {
		this._table = table;

		let { headers = {}, translations = {} } = this._table;

		headers = Object.keys(headers).reduce(
			(result: { [headerName: string]: string }, key: string) => {
				const lowerKey = key.toLowerCase();

				if (lowerKey && HEADERS.has(lowerKey)) {
					// POT-Creation-Date is removed in MO (see https://savannah.gnu.org/bugs/?49654)
					if (lowerKey !== "pot-creation-date") {
						const newKey = HEADERS.get(lowerKey);
						if (newKey) result[newKey] = headers[key];
					}
				} else {
					result[key] = headers[key];
				}

				return result;
			},
			{},
		);

		// filter out empty translations
		translations = Object.keys(translations).reduce(
			(result: GetTextTranslations["translations"], msgctxt: string) => {
				const context = translations[msgctxt];
				const msgs = Object.keys(context).reduce(
					(result: { [msgid: string]: TranslationEntry }, msgid: string) => {
						const hasTranslation = context[msgid].msgstr.some(
							(item) => !!item.length,
						);

						if (hasTranslation) {
							result[msgid] = context[msgid];
						}

						return result;
					},
					{},
				);

				if (Object.keys(msgs).length) {
					result[msgctxt] = msgs;
				}

				return result;
			},
			{},
		);

		this._table.translations = translations;
		this._table.headers = headers;

		this._translations = [];
		this._writeFunc = "writeUInt32LE";

		this._handleCharset();
		/**
		 * Magic bytes for the generated binary data
		 */
		this.MAGIC = 0x950412de;
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
	 * Generates an array of translation strings
	 * in the form of [{msgid:... , msgstr:...}]
	 *
	 * @return {GetTextTranslations} Translation strings array
	 */
	_generateList(): { msgid: Buffer; msgstr: Buffer }[] {
		const list: { msgid: Buffer; msgstr: Buffer }[] = [];

		list.push({
			msgid: Buffer.alloc(0),
			msgstr: convert(
				generateHeader(this._table.headers),
				this._table.charset,
			) as Buffer,
		});

		const result = [];

		for (const msgctxt in this._table.translations) {
			for (const msgid of Object.keys(this._table.translations[msgctxt])) {
				const entry = this._table.translations[msgctxt][msgid];
				// Ignore empty object translations
				if (typeof entry !== "object") {
					continue;
				}

				// skip empty translations
				if (msgctxt === "" && msgid === "") {
					continue;
				}

				const msgidPlural = entry.msgid_plural;
				let key = msgid;

				if (msgctxt) {
					key = `${msgctxt}\u0004${key}`;
				}

				if (msgidPlural) {
					key += `\u0000${msgidPlural}`;
				}

				const value = entry.msgstr?.join("\u0000") || "";

				list.push({
					msgid: convert(key, this._table.charset) as Buffer,
					msgstr: convert(value, this._table.charset) as Buffer,
				});
			}
		}

		return list;
	}

	/**
	 * Calculate buffer size for the final binary object
	 *
	 * @param {any[]} list An array of translation strings from _generateList
	 * @return {Object} Size data of {msgid, msgstr, total}
	 */
	_calculateSize(list: { msgid: Buffer; msgstr: Buffer }[]): {
		msgid: number;
		msgstr: number;
		total: number;
	} {
		let msgidLength = 0;
		let msgstrLength = 0;
		let totalLength = 0;

		for (const translation of list) {
			msgidLength += translation.msgid.length + 1; // + extra 0x00
			msgstrLength += translation.msgstr.length + 1; // + extra 0x00
		}

		totalLength =
			4 + // magic number
			4 + // revision
			4 + // string count
			4 + // original string table offset
			4 + // translation string table offset
			4 + // hash table size
			4 + // hash table offset
			(4 + 4) * list.length + // original string table
			(4 + 4) * list.length + // translations string table
			msgidLength + // originals
			msgstrLength; // translations

		return {
			msgid: msgidLength,
			msgstr: msgstrLength,
			total: totalLength,
		};
	}

	/**
	 * Generates the binary MO object from the translation list
	 *
	 * @param list translation list
	 * @param size Byte size information
	 * @return {Buffer} Compiled MO object
	 */
	_build(
		list: { msgid: Buffer; msgstr: Buffer }[],
		size: { msgid: number; msgstr: number; total: number },
	): Buffer {
		const returnBuffer: Buffer = Buffer.alloc(size.total);
		let curPosition = 0;

		const { MAGIC, _writeFunc } = this;

		// Write the headers
		returnBuffer[_writeFunc](MAGIC, 0);
		returnBuffer[_writeFunc](0, 4);
		returnBuffer[_writeFunc](list.length, 8);
		returnBuffer[_writeFunc](28, 12);
		returnBuffer[_writeFunc](28 + (4 + 4) * list.length, 16);
		returnBuffer[_writeFunc](0, 20);
		returnBuffer[_writeFunc](28 + (4 + 4) * list.length * 2, 24);

		// Calculate the position for the msgid and msgstr tables
		const tableStart = 28;
		const keyTableStart = tableStart + list.length * 8;
		const valueTableStart = keyTableStart + list.length * 8;
		curPosition = valueTableStart;

		for (let i = 0; i < list.length; i++) {
			const item = list[i];
			// Write table entries for msgid
			returnBuffer[_writeFunc](item.msgid.length, tableStart + i * 8);
			returnBuffer[_writeFunc](curPosition, tableStart + i * 8 + 4);
			item.msgid.copy(returnBuffer, curPosition);
			curPosition += item.msgid.length + 1; // +1 for the null terminator
			returnBuffer[curPosition - 1] = 0x00;
		}

		for (let i = 0; i < list.length; i++) {
			const item = list[i];
			// Write table entries for msgstr
			returnBuffer[_writeFunc](item.msgstr.length, keyTableStart + i * 8);
			returnBuffer[_writeFunc](curPosition, keyTableStart + i * 8 + 4);
			item.msgstr.copy(returnBuffer, curPosition);
			curPosition += item.msgstr.length + 1; // +1 for the null terminator
			returnBuffer[curPosition - 1] = 0x00;
		}

		return returnBuffer;
	}

	/**
	 * Compiles translation object into a binary MO object
	 *
	 * @return {Buffer} Compiled MO object
	 */
	compile(): Buffer {
		const list = this._generateList();
		const size = this._calculateSize(list);

		list.sort(compareMsgid as (a: unknown, b: unknown) => number);

		return this._build(list, size);
	}
}

export default MoCompiler;
