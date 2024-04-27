import { type Readable, TransformOptions } from "node:stream";
import util from "util";
import encoding from "encoding";
import type { Options } from "iconv-lite";
import { Transform, type TransformOptions } from "readable-stream";
import {
	formatCharset,
	parseHeader,
	parseNPluralFromHeadersSafely,
} from "./shared.js";
import type {
	GetTextComment,
	GetTextTranslation,
	GetTextTranslationRaw,
	GetTextTranslations,
	gettextTranslation,
	parserOptions,
} from "./types.js";

interface State {
	none?: number;
	comments: number;
	key: number;
	string: number;
	obsolete: number;
}

interface LexerError extends SyntaxError {
	lineNumber: number;
}

/**
 * The PO parser options
 */
interface Options {
	defaultCharset?: string;
	validation?: boolean;
}

/**
 * Parses a PO object into translation table
 *
 * @param {string | Buffer} input PO object
 * @param {Options} [options] Optional options with defaultCharset and validation
 */
export function parse(input: string | Buffer | undefined, options = {}) {
	const parser = new PoParser(input, options);

	return parser.parse();
}

/**
 * Parses a PO stream, emits translation table in object mode
 *
 * @param {Options} [options] Optional options with defaultCharset and validation
 * @param {TransformOptions} [transformOptions] Optional stream options
 */
export function stream(
	options: Options = {},
	transformOptions: TransformOptions = {},
) {
	return new PoParserTransform(options, transformOptions);
}

class PoParser {
	private _charset: string;
	private _escaped: boolean;
	private _node: Partial<GetTextTranslationRaw>;
	private _state: number | undefined;
	_validation: boolean;
	states: State;
	types: State;
	symbols: {
		quotes: RegExp;
		comments: RegExp;
		whitespace: RegExp;
		key: RegExp;
		keyNames: RegExp;
	};
	_lex: GetTextTranslationRaw[];
	_lineNumber: number;
	_fileContents: string;

	constructor(
		fileContents: string | Buffer | undefined,
		{ defaultCharset = "iso-8859-1", validation = false }: parserOptions = {},
	) {
		this._validation = validation;
		this._charset = defaultCharset;

		/**
		 * State constants for parsing FSM
		 */
		this.states = {
			none: 0x01,
			comments: 0x02,
			key: 0x03,
			string: 0x04,
			obsolete: 0x05,
		};
		/**
		 * Value types for lexer
		 */
		this.types = {
			comments: 0x01,
			key: 0x02,
			string: 0x03,
			obsolete: 0x04,
		};
		/**
		 * String matches for lexer
		 */
		this.symbols = {
			quotes: /["']/,
			comments: /#/,
			whitespace: /\s/,
			key: /[\w\-[\]]/,
			keyNames: /^(?:msgctxt|msgid(?:_plural)?|msgstr(?:\[\d+])?)$/,
		};

		this._lex = [];
		this._escaped = false;
		/** @property {PoNode} node The lexer node */
		this._node = {};
		this._state = this.states.none;
		this._lineNumber = 1;

		if (typeof fileContents === "string") {
			this._charset = "utf-8";
			this._fileContents = fileContents;
		} else {
			this._fileContents = this._handleCharset(fileContents);
		}
	}

	/**
	 * Parses the PO object and returns translation table
	 *
	 * @return {Object} Translation table
	 */
	parse() {
		this._lexer(this._fileContents);

		return this._finalize(this._lex);
	}

	/**
	 * Detects charset for PO strings from the header
	 *
	 * @param buf PO string buffer to be parsed
	 */
	_handleCharset(buf?: undefined | Buffer) {
		const str = buf.toString();
		let pos;
		let headers = "";
		let match;

		if ((pos = str.search(/^\s*msgid/im)) >= 0) {
			pos = pos + str.substring(pos + 5).search(/^\s*(msgid|msgctxt)/im);
			headers = str.substring(0, pos >= 0 ? pos + 5 : str.length);
		}

		if (
			(match = headers.match(/[; ]charset\s*=\s*([\w-]+)(?:[\s;]|\\n)*"\s*$/im))
		) {
			this._charset = formatCharset(match[1], this._charset);
		}

		if (this._charset === "utf-8") {
			return str;
		}

		return this._toString(buf);
	}

	/**
	 * Converts a buffer to a string
	 * @param {Buffer} buf Buffer
	 * @return {string} the string res
	 */
	_toString(buf: Buffer) {
		return encoding.convert(buf, "utf-8", this._charset).toString("utf-8");
	}

	/**
	 * Token parser. Parsed state can be found from this._lex
	 *
	 * @param {String} chunk String
	 */
	_lexer(chunk: string) {
		let chr: string;

		for (let i = 0, len = chunk.length; i < len; i++) {
			chr = chunk.charAt(i);

			if (chr === "\n") {
				this._lineNumber += 1;
			}

			switch (this._state) {
				case this.states.none:
				case this.states.obsolete:
					if (chr.match(this.symbols.quotes)) {
						this._node = {
							type: this.types.string,
							value: "",
							quote: chr,
						};
						this._lex.push(this._node as GetTextTranslationRaw);
						this._state = this.states.string;
					} else if (chr.match(this.symbols.comments)) {
						this._node = {
							type: this.types.comments,
							value: "",
						};
						this._lex.push(this._node as GetTextTranslationRaw);
						this._state = this.states.comments;
					} else if (!chr.match(this.symbols.whitespace)) {
						this._node = {
							type: this.types.key,
							value: chr,
						};
						if (this._state === this.states.obsolete) {
							this._node.obsolete = true;
						}
						this._lex.push(this._node as GetTextTranslationRaw);
						this._state = this.states.key;
					}
					break;
				case this.states.comments:
					if (chr === "\n") {
						this._state = this.states.none;
					} else if (chr === "~" && this._node.value === "") {
						this._node.value += chr;
						this._state = this.states.obsolete;
					} else if (chr !== "\r") {
						this._node.value += chr;
					}
					break;
				case this.states.string:
					if (this._escaped) {
						switch (chr) {
							case "t":
								this._node.value += "\t";
								break;
							case "n":
								this._node.value += "\n";
								break;
							case "r":
								this._node.value += "\r";
								break;
							default:
								this._node.value += chr;
						}
						this._escaped = false;
					} else {
						if (chr === this._node.quote) {
							this._state = this.states.none;
						} else if (chr === "\\") {
							this._escaped = true;
							break;
						} else {
							this._node.value += chr;
						}
						this._escaped = false;
					}
					break;
				case this.states.key:
					if (!chr.match(this.symbols.key) && this !== null) {
						if (!this._node.value.match(this.symbols.keyNames)) {
							const err: Partial<LexerError> = new SyntaxError(
								`Error parsing PO data: Invalid key name "${this._node.value}" at line ${this._lineNumber}. This can be caused by an unescaped quote character in a msgid or msgstr value.`,
							);

							err.lineNumber = this._lineNumber;

							throw err as LexerError;
						}
						this._state = this.states.none;
						i--;
					} else {
						this._node.value += chr;
					}
					break;
			}
		}
	}

	/**
	 * Join multi line strings
	 *
	 * @param {GetTextTranslationRaw[]} tokens Parsed tokens
	 * @return {GetTextTranslationRaw[]} Parsed tokens, with multi line strings joined into one
	 */
	_joinStringValues(tokens: GetTextTranslationRaw[]): GetTextTranslationRaw[] {
		const response = [];
		let lastNode: GetTextTranslationRaw | null = null;

		for (let i = 0, len = tokens.length; i < len; i++) {
			if (
				lastNode &&
				tokens[i].type === this.types.string &&
				lastNode.type === this.types.string
			) {
				lastNode.value += tokens[i].value;
			} else if (
				lastNode &&
				tokens[i].type === this.types.comments &&
				lastNode.type === this.types.comments
			) {
				lastNode.value += `\n${tokens[i].value}`;
			} else {
				response.push(tokens[i]);
				lastNode = tokens[i];
			}
		}

		return response;
	}

	/**
	 * Parse comments into separate comment blocks
	 *
	 * @param {GetTextTranslationRaw[]} tokens Parsed tokens
	 */
	_parseComments(tokens: GetTextTranslationRaw[]) {
		// parse comments
		for (const node of tokens) {
			if (!node || node.type !== this.types.comments) {
				continue;
			}

			const comment: {
				[key: string]: string[];
			} = {
				translator: [],
				extracted: [],
				reference: [],
				flag: [],
				previous: [],
			};

			const lines: string[] = (node.value || "").split(/\n/);

			for (const line of lines) {
				switch (line.charAt(0) || "") {
					case ":":
						comment.reference.push(line.substring(1).trim());
						break;
					case ".":
						comment.extracted.push(line.substring(1).replace(/^\s+/, ""));
						break;
					case ",":
						comment.flag.push(line.substring(1).replace(/^\s+/, ""));
						break;
					case "|":
						comment.previous.push(line.substring(1).replace(/^\s+/, ""));
						break;
					case "~":
						break;
					default:
						comment.translator.push(line.replace(/^\s+/, ""));
				}
			}

			node.value = {};

			for (const key of Object.keys(comment)) {
				if (comment[key]?.length) {
					node.value[key] = comment[key].join("\n");
				}
			}
		}
	}

	/**
	 * Join gettext keys with values
	 *
	 * @param tokens Parsed tokens
	 * @return Tokens
	 */
	_handleKeys(tokens: GetTextTranslationRaw[]): GetTextTranslationRaw[] {
		const response = [];
		let lastNode: {
			key: string;
			value?: string;
			obsolete?: boolean;
			comments?: string;
		} | null = null;

		for (let i = 0, len = tokens.length; i < len; i++) {
			if (tokens[i].type === this.types.key) {
				lastNode = {
					key: tokens[i].value,
				};
				if (tokens[i].obsolete) {
					lastNode.obsolete = true;
				}
				if (i && tokens[i - 1].type === this.types.comments) {
					lastNode.comments = tokens[i - 1].value;
				}
				lastNode.value = "";
				response.push(lastNode);
			} else if (tokens[i].type === this.types.string && lastNode) {
				lastNode.value += tokens[i].value;
			}
		}

		return response;
	}

	/**
	 * Separate different values into individual translation objects
	 *
	 * @param {GetTextTranslationRaw[]} tokens Parsed tokens
	 * @return {Object} Tokens
	 */
	_handleValues(tokens: GetTextTranslationRaw[]) {
		const response = [];
		let lastNode: Partial<GetTextTranslationRaw> | null = null;
		let curContext: string | false = false;
		let curComments: GetTextComment | false = false;

		for (let i = 0, len = tokens.length; i < len; i++) {
			if (tokens[i].key.toLowerCase() === "msgctxt") {
				curContext = tokens[i].value;
				curComments = tokens[i].comments || false;
			} else if (tokens[i].key.toLowerCase() === "msgid") {
				lastNode = {
					msgid: tokens[i].value,
				};

				if (tokens[i].obsolete) {
					lastNode.obsolete = true;
				}

				if (curContext) {
					// TODO: Check if this is the right way to do it
					lastNode.msgctxt = curContext;
				}

				if (curComments) {
					lastNode.comments = curComments;
				}

				if (tokens[i].comments && !lastNode.comments) {
					lastNode.comments = tokens[i].comments;
				}

				curContext = false;
				curComments = false;
				response.push(lastNode);
			} else if (tokens[i].key.toLowerCase() === "msgid_plural") {
				if (lastNode) {
					if (this._validation && "msgid_plural" in lastNode) {
						throw new SyntaxError(
							`Multiple msgid_plural error: entry "${lastNode.msgid}" in "${
								lastNode.msgctxt || ""
							}" context has multiple msgid_plural declarations.`,
						);
					}

					lastNode.msgid_plural = tokens[i].value;
				}

				if (tokens[i].comments && !lastNode.comments) {
					lastNode.comments = tokens[i].comments;
				}

				curContext = false;
				curComments = false;
			} else if (tokens[i].key.substr(0, 6).toLowerCase() === "msgstr") {
				if (lastNode) {
					lastNode.msgstr = (lastNode.msgstr || []).concat(tokens[i].value);
				}

				if (tokens[i].comments && !lastNode.comments) {
					lastNode.comments = tokens[i].comments;
				}

				curContext = false;
				curComments = false;
			}
		}

		return response;
	}

	/**
	 * Validate token
	 *
	 * @param {GetTextTranslationRaw} token Parsed token
	 * @param {GetTextTranslation} translations Translation table
	 * @param {string} msgctxt Message entry context
	 * @param {number} nplurals Number of epected plural forms
	 * @throws Error Will throw an error if token validation fails
	 */
	_validateToken(
		{
			msgid = "",
			msgid_plural = "", // eslint-disable-line camelcase
			msgstr = [],
		}: GetTextTranslationRaw,
		translations: gettextTranslation,
		msgctxt: string,
		nplurals: number,
	) {
		if (!this._validation) {
			return;
		}

		if (msgid in translations[msgctxt]) {
			throw new SyntaxError(
				`Duplicate msgid error: entry "${msgid}" in "${msgctxt}" context has already been declared.`,
			);
			// eslint-disable-next-line camelcase
		}
		if (msgid_plural && msgstr.length !== nplurals) {
			// eslint-disable-next-line camelcase
			throw new RangeError(
				`Plural forms range error: Expected to find ${nplurals} forms but got ${msgstr.length} for entry "${msgid_plural}" in "${msgctxt}" context.`,
			);
		}
		if (!msgid_plural && msgstr.length !== 1) {
			throw new RangeError(
				`Translation string range error: Extected 1 msgstr definitions associated with "${msgid}" in "${msgctxt}" context, found ${msgstr.length}.`,
			);
		}
	}

	/**
	 * Compose a translation table from tokens object
	 *
	 * @param {GetTextTranslationRaw[]} tokens Parsed tokens
	 * @return {GetTextTranslations} Translation table
	 */
	_normalize(tokens: GetTextTranslationRaw[]): GetTextTranslations {
		const table: GetTextTranslations = {
			charset: this._charset,
			headers: undefined,
			translations: {},
		};
		let nplurals = 1;
		let msgctxt: string | undefined;

		for (let i = 0, len = tokens.length; i < len; i++) {
			msgctxt = tokens[i].msgctxt || "";

			if (tokens[i].obsolete) {
				if (!table.obsolete) {
					table.obsolete = {};
				}

				if (!table.obsolete[msgctxt]) {
					table.obsolete[msgctxt] = {};
				}

				delete tokens[i].obsolete;

				table.obsolete[msgctxt][tokens[i].msgid] = tokens[i];

				continue;
			}

			if (!table.translations[msgctxt]) {
				table.translations[msgctxt] = {};
			}

			if (!table.headers && !msgctxt && !tokens[i].msgid) {
				table.headers = parseHeader(tokens[i].msgstr[0]);
				nplurals = parseNPluralFromHeadersSafely(table.headers, nplurals);
			}

			this._validateToken(tokens[i], table.translations, msgctxt, nplurals);

			table.translations[msgctxt][tokens[i].msgid] = tokens[i];
		}

		return table;
	}

	/**
	 * Converts parsed tokens to a translation table
	 *
	 * @param {GetTextTranslationRaw[]} tokens Parsed tokens
	 * @returns {GetTextTranslationRaw[]} Translation table
	 */
	_finalize(tokens: GetTextTranslationRaw[]): GetTextTranslationRaw[] {
		let data: GetTextTranslationRaw[] = this._joinStringValues(tokens);

		this._parseComments(data);

		data = this._handleKeys(data);
		data = this._handleValues(data);

		return this._normalize(data);
	}
}

class PoParserTransform extends Transform {
	private _cacheSize: number;
	private _parser: PoParser | false;
	options: parserOptions | undefined;
	initialTreshold: number;
	_tokens: Partial<GetTextTranslationRaw>;

	constructor(
		options: Options | undefined,
		transformOptions: TransformOptions,
	) {
		super(transformOptions);
		this.options = options;
		this._parser = false;
		this._tokens = {};

		this._cache = [];
		this._cacheSize = 0;

		this.initialTreshold = transformOptions.initialTreshold || 2 * 1024;

		Transform.call(this, transformOptions);
		this._writableState.objectMode = false;
		this._readableState.objectMode = true;
	}

	/**
	 * Processes a chunk of the input stream
	 * @param {string} chunk
	 * @param {string=} encoding
	 * @param {() => void=} done
	 */
	_transform(
		chunk: string,
		encoding: string | undefined,
		done: (() => void) | undefined,
	) {
		let i: number;
		let len = 0;

		if (!chunk || !chunk.length) {
			return done();
		}

		if (!this._parser) {
			this._cache.push(chunk);
			this._cacheSize += chunk.length;

			// wait until the first 1kb before parsing headers for charset
			if (this._cacheSize < this.initialTreshold) {
				return setImmediate(done);
			}
			if (this._cacheSize) {
				chunk = Buffer.concat(this._cache, this._cacheSize);
				this._cacheSize = 0;
				this._cache = [];
			}

			this._parser = new PoParser(chunk, this.options);
		} else if (this._cacheSize) {
			// this only happens if we had an uncompleted 8bit sequence from the last iteration
			this._cache.push(chunk);
			this._cacheSize += chunk.length;
			chunk = Buffer.concat(this._cache, this._cacheSize);
			this._cacheSize = 0;
			this._cache = [];
		}

		// cache 8bit bytes from the end of the chunk
		// helps if the chunk ends in the middle of an utf-8 sequence
		for (i = chunk.length - 1; i >= 0; i--) {
			if (chunk[i] >= 0x80) {
				len++;
				continue;
			}
			break;
		}
		// it seems we found some 8bit bytes from the end of the string, so let's cache these
		if (len) {
			this._cache = [chunk.prototype.slice(chunk.length - len)];
			this._cacheSize = this._cache[0].length;
			chunk = chunk.prototype.slice(0, chunk.length - len);
		}

		// chunk might be empty if it only continued of 8bit bytes and these were all cached
		if (chunk.length) {
			try {
				this._parser._lexer(this._parser._toString(chunk));
			} catch (error) {
				setImmediate(() => {
					done(error);
				});

				return;
			}
		}

		setImmediate(done);
	}

	// TODO: check if this is really needed or if it can be removed
	/**
	 * Once all input has been processed emit the parsed translation table as an object
	 * @param {() => void} done The callback
	 */
	_flush(done: () => void) {
		let chunk;

		if (this._cacheSize) {
			chunk = Buffer.concat(this._cache, this._cacheSize);
		}

		if (!this._parser && chunk) {
			this._parser = new PoParser(chunk, this.options);
		}

		if (chunk) {
			try {
				this._parser._lexer(this._parser._toString(chunk));
			} catch (error) {
				setImmediate(() => {
					done(error);
				});

				return;
			}
		}

		if (this._parser) {
			this.push(this._parser._finalize(this._parser._lex));
		}

		setImmediate(done);
	}

	private _cache(_cache: string, _cacheSize: number): any {
		throw new Error("Method not implemented.");
	}
}
