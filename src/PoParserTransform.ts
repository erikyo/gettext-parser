import { Transform } from "node:stream";
import PoParser from "./PoParser.js";
import type { PoParserTransformOptions, poParserOptions } from "./types.js";

class PoParserTransform extends Transform {
	_cache: Buffer[];
	private _cacheSize: number;
	_parser: PoParser | false;
	options: poParserOptions;
	initialTreshold: number;

	constructor(
		options: poParserOptions,
		transformOptions: PoParserTransformOptions,
	) {
		super();
		this.options = options || {};
		this._parser = false;
		this._cache = [];
		this._cacheSize = 0;
		this.initialTreshold = transformOptions.initialTreshold || 2 * 1024;
	}

	_transform(
		chunkRaw: string | Buffer,
		encoding: string | undefined,
		done: (error?: Error | null) => void,
	) {
		let chunk = chunkRaw as Buffer;

		if (!chunk || !chunk.length) {
			return done();
		}

		if (!this._parser) {
			this._cache.push(chunk);
			this._cacheSize += chunk.length;

			if (this._cacheSize < this.initialTreshold) {
				return setImmediate(done);
			}

			// Concatenate cached chunks for parsing
			chunk = Buffer.concat(this._cache, this._cacheSize);
			this._cacheSize = 0;
			this._cache = [];

			this._parser = new PoParser(chunk, this.options);
		} else if (this._cacheSize) {
			// Concatenate new chunk with cached data
			this._cache.push(chunk);
			this._cacheSize += chunk.length;
			chunk = Buffer.concat(this._cache, this._cacheSize);
			this._cacheSize = 0;
			this._cache = [];
		}

		try {
			this._parser._lexer(this._parser._toString(chunk));
		} catch (error) {
			setImmediate(() => {
				done(error as Error);
			});
			return;
		}

		setImmediate(done);
	}

	_flush(done: () => void) {
		// Handle any remaining cached data during flushing
		if (this._cacheSize) {
			const chunk = Buffer.concat(this._cache, this._cacheSize);
			this._cacheSize = 0;
			this._cache = [];

			if (!this._parser) {
				this._parser = new PoParser(chunk, this.options);
			} else {
				this._parser._lexer(this._parser._toString(chunk));
			}
		}

		if (this._parser) {
			this.push(this._parser._finalize(this._parser._lex));
		}

		setImmediate(done);
	}
}

export default PoParserTransform;
