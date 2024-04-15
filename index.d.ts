import { Transform } from "readable-stream";

import {Buffer} from "safe-buffer";

export declare module 'encoding' {
    export function convert(buf: Buffer, toCharset: string, fromCharset: string): Buffer;
}

export interface Compiler {
    _table: GetTextTranslations;
    compile(): Buffer | string | undefined | null;
}

export interface GetTextComment {
    translator?: string;
    reference?: string;
    extracted?: string;
    flag?: string;
    previous?: string;
}

export interface GetTextTranslation {
    msgctxt?: string;
    msgid: string;
    msgid_plural?: string;
    msgstr: string[];
    comments?: GetTextComment;
}

export interface GetTextTranslationRaw extends GetTextTranslation {
    value: string;
    type: number;
    key: string;
    obsolete?: boolean;
    lastNode?: boolean;
}

export interface GetTextTranslations {
    obsolete?: boolean | { [msgctxt: string]: { [msgId: string]: GetTextTranslation } };
    charset?: string;
    headers?: { [headerName: string]: string };
    translations: gettextTranslation;
}

export type gettextTranslation = { [msgctxt: string]: { [msgId: string]: GetTextTranslation } }

export interface parserOptions {
    eol?: string;
    defaultCharset?: string;
    validation?: boolean;
    foldLength?: string;
    escapeCharacters?: string;
    sort?: boolean;
}

export interface po {
    parse: (buffer: Buffer | string, defaultCharset?: string) => GetTextTranslations;
    compile: (table: GetTextTranslations, options?: parserOptions) => Buffer;
    createParseStream: (options?: parserOptions, transformOptions?: import('readable-stream').TransformOptions) => Transform;
}

export interface mo {
    parse: (buffer: Buffer | string, defaultCharset?: string) => GetTextTranslations;
    compile: (table: GetTextTranslations, options?: parserOptions) => Buffer;
}

export * from "./@types";

export default { po, mo } as { po: po, mo: mo };
