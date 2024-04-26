import type { Buffer } from "safe-buffer";

declare module "encoding" {
	export function convert(
		buf: Buffer,
		toCharset: string,
		fromCharset: string,
	): Buffer;
}
