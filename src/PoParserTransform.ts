import { Transform, type TransformCallback } from "node:stream";
import PoParser from "./PoParser.js";
import type {
	GetTextTranslations,
	PoParserTransformOptions,
	poParserOptions,
} from "./types.js";

class PoParserTransform extends Transform {
	_cache: Buffer[];
	private _cacheSize: number;
	_parser: PoParser | false;
	options: poParserOptions;
	initialTreshold: number;
	_tokens: Partial<GetTextTranslations>;
	private _writableState: { objectMode?: boolean } = {};
	private _readableState: { objectMode?: boolean } = {};

	constructor(
		options: poParserOptions,
		transformOptions: PoParserTransformOptions,
	) {
		super();
		this.options = options;
		this._parser = false;
		this._tokens = {};

		this._cache = [];
		this._cacheSize = 0;

		this.initialTreshold = transformOptions.initialTreshold || 2 * 1024;

		Transform.call(this as Transform, transformOptions);
		this._writableState.objectMode = false;
		this._readableState.objectMode = true;
	}

	_transform(
		chunkRaw: Buffer,
		encoding: BufferEncoding,
		done: TransformCallback,
	) {
		let i: number;
		let len = 0;

		let chunk = chunkRaw;

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
			this._cache = [chunk.slice(chunk.length - len)];
			this._cacheSize = this._cache[0].length;
			chunk = chunk.slice(0, chunk.length - len);
		}

		// chunk might be empty if it only continued of 8bit bytes and these were all cached
		if (chunk.length) {
			try {
				this._parser._lexer(this._parser._toString(chunk));
			} catch (error) {
				setImmediate(() => {
					done(error as Error);
				});

				return;
			}
		}

		setImmediate(done);
	}

	_flush(done: TransformCallback) {
		if (this._cacheSize) {
			const chunk: Buffer = Buffer.concat(this._cache, this._cacheSize);

			if (!this._parser) {
				this._parser = new PoParser(chunk, this.options);
			}

			if (chunk) {
				try {
					this._parser._lexer(this._parser._toString(chunk));
				} catch (error) {
					setImmediate(() => {
						done(error as Error);
					});

					return;
				}
			}
		}

		if (this._parser) {
			this.push(this._parser._finalize(this._parser._lex));
		}

		setImmediate(done);
	}
}

export default PoParserTransform;
