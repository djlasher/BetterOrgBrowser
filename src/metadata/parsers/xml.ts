import { XMLParser, XMLValidator } from 'fast-xml-parser';
export type XmlObject = Record<string, unknown>;
export function object(value: unknown): XmlObject {
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as XmlObject : {};
}
export function array(value: unknown): unknown[] { return value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]; }
export function text(value: unknown): string { return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : ''; }
export function parseXml(xml: string, root: string): XmlObject {
    if (/<!DOCTYPE|<!ENTITY/i.test(xml)) { throw new Error('DTD and custom entities are not supported.'); }
    const valid = XMLValidator.validate(xml);
    if (valid !== true) { throw new Error(`Invalid metadata XML: ${valid.err.msg}`); }
    const parsed: unknown = new XMLParser({ removeNSPrefix: true, parseTagValue: false, ignoreAttributes: true }).parse(xml);
    const document = object(parsed);
    if (!(root in document)) { throw new Error(`Expected ${root} metadata XML.`); }
    return object(document[root]);
}
export function humanize(value: string): string {
    return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
}
