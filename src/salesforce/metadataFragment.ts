import { XmlSelector } from '../metadata/metadataModel';
import { parseXml, object, text } from '../metadata/parsers/xml';

interface Element { tag: string; start: number; openEnd: number; end: number; close: number; children: Element[] }
function keyValue(xml: string, tag: string, key: string): string {
    if (key === '$text') { return text(parseXml(`<container>${xml}</container>`, 'container')[tag]); }
    let value: unknown = parseXml(xml, tag);
    for (const part of key.split('.')) { value = object(value)[part]; }
    return text(value);
}
function document(xml: string, root: string): Element {
    parseXml(xml, root);
    const stack: Element[] = [];
    let result: Element | undefined;
    const tokens = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<\/?[\w:.-]+(?:\s+(?:[^>"']|"[^"]*"|'[^']*')*)?\s*\/?\s*>/g;
    for (const match of xml.matchAll(tokens)) {
        const token = match[0], start = match.index!;
        if (token.startsWith('<!') || token.startsWith('<?')) { continue; }
        if (token.startsWith('</')) {
            const element = stack.pop()!;
            element.close = start; element.end = start + token.length;
        } else {
            const tag = /^<([^\s/>]+)/.exec(token)![1].split(':').pop()!;
            const element: Element = { tag, start, openEnd: start + token.length, end: start + token.length, close: start, children: [] };
            if (stack.length) { stack[stack.length - 1].children.push(element); } else { result = element; }
            if (!/\/\s*>$/.test(token)) { stack.push(element); }
        }
    }
    if (!result || result.tag !== root) { throw new Error(`Expected ${root} metadata.`); }
    return result;
}
function select(xml: string, parent: Element, selector: XmlSelector): Element | undefined {
    const candidates = parent.children.filter(child => child.tag === selector.tag);
    if (selector.index !== undefined) { return candidates[selector.index]; }
    const matches = candidates.filter(child => {
        if (!selector.key) { return true; }
        return keyValue(xml.slice(child.start, child.end), child.tag, selector.key) === selector.name;
    });
    if (matches.length > 1) { throw new Error(`Ambiguous ${selector.tag} metadata; duplicate keys must be resolved first.`); }
    return matches[0];
}
export function extractFragment(xml: string, root: string, selectors: XmlSelector[]): string {
    let element = document(xml, root);
    for (const selector of selectors) {
        const next = select(xml, element, selector);
        if (!next) { throw new Error(`Salesforce did not return retrievable ${selector.tag} metadata for ${selector.name ?? 'this entry'}.`); }
        element = next;
    }
    return xml.slice(element.start, element.end);
}
/** Replace only a matched XML element; untouched siblings and editor comments stay verbatim. */
export function mergeFragment(local: string, remote: string, root: string, selectors: XmlSelector[]): string {
    if (!selectors.length) { throw new Error('A child metadata path is required.'); }
    let parent = document(local, root);
    for (const selector of selectors.slice(0, -1)) {
        const next = select(local, parent, selector);
        if (!next) { throw new Error('The containing local metadata entry is missing. Retrieve its parent first.'); }
        parent = next;
    }
    const selector = selectors[selectors.length - 1];
    const incoming = document(remote, selector.tag);
    if (selector.key && keyValue(remote, selector.tag, selector.key) !== selector.name) {
        throw new Error('Remote metadata does not match the selected entry.');
    }
    const existing = select(local, parent, selector);
    const eol = local.includes('\r\n') ? '\r\n' : '\n';
    // Namespace prefixes are document scoped; do not silently import unbound prefixes.
    if (/<\/?\w+:/.test(remote) || /<\/?\w+:/.test(local)) { throw new Error('Prefixed XML requires retrieving the containing component.'); }
    const block = remote.slice(incoming.start, incoming.end).replace(/\r?\n/g, eol);
    if (existing) { return local.slice(0, existing.start) + block + local.slice(existing.end); }
    if (selector.index !== undefined || parent.close === parent.start) { throw new Error('The containing local metadata entry is missing. Retrieve its parent first.'); }
    const after = parent.children.find(child => child.tag.localeCompare(selector.tag) > 0);
    const insertion = after?.start ?? parent.close;
    return local.slice(0, insertion) + block + eol + '    ' + local.slice(insertion);
}

export function fieldDocument(block: string): string {
    const field = parseXml(block, 'fields');
    if (!text(field.fullName)) { throw new Error('Retrieved field has no fullName.'); }
    if (/<\/?\w+:/.test(block)) { throw new Error('Prefixed field XML is not supported.'); }
    const eol = block.includes('\r\n') ? '\r\n' : '\n';
    // Extraction starts at <fields>, so only later lines retain the parent's
    // indentation. Remove that margin from structural whitespace, never values.
    const margin = /\n([\t ]+)<\/fields>$/.exec(block)?.[1];
    if (margin) {
        const edits: { start: number; end: number; value: string }[] = [];
        const walk = (element: Element): void => {
            if (!element.children.length) { return; }
            let start = element.openEnd;
            for (const child of [...element.children, { start: element.close, end: element.close }]) {
                const gap = block.slice(start, child.start);
                if (/^\s*$/.test(gap)) {
                    edits.push({ start, end: child.start, value: gap.replace(/(\r?\n)([\t ]*)/g,
                        (_, newline: string, indent: string) => newline + (indent.startsWith(margin) ? indent.slice(margin.length) : indent)) });
                }
                start = child.end;
            }
            element.children.forEach(walk);
        };
        walk(document(block, 'fields'));
        for (const edit of edits.sort((a, b) => b.start - a.start)) { block = block.slice(0, edit.start) + edit.value + block.slice(edit.end); }
    }
    return '<?xml version="1.0" encoding="UTF-8"?>' + eol + block.replace(/^<fields(?:\s[^>]*)?>/, '<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">').replace(/<\/fields>$/, '</CustomField>') + eol;
}

/** A dependency descriptor must not import the object's other child definitions. */
export function objectShell(xml: string): string {
    const children = new Set(['fields', 'recordTypes', 'validationRules', 'fieldSets', 'listViews', 'compactLayouts', 'webLinks', 'businessProcesses', 'sharingReasons', 'indexes']);
    for (const child of document(xml, 'CustomObject').children.reverse()) {
        if (children.has(child.tag)) { xml = xml.slice(0, child.start) + xml.slice(child.end); }
    }
    return xml;
}
