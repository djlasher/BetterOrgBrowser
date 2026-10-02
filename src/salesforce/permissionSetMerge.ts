import { XMLBuilder } from 'fast-xml-parser';
import { object, parseXml, text } from '../metadata/parsers/xml';
interface Span { tag: string; start: number; end: number; xml: string }
// Locate direct-child byte spans solely for surgical edits. Values and validity
// are handled by the XML parser, not regular-expression value extraction.
function spans(xml: string): { entries: Span[]; close: number; prefix: string } {
    parseXml(xml, 'PermissionSet');
    const tokens = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<\/?[\w:.-]+(?:\s+(?:[^>"']|"[^"]*"|'[^']*')*)?\s*\/?\s*>/g;
    const entries: Span[] = [];
    let depth = 0, start = 0, tag = '', close = -1, prefix = '';
    for (const match of xml.matchAll(tokens)) {
        const token = match[0], index = match.index!;
        if (token.startsWith('<!') || token.startsWith('<?')) { continue; }
        if (token.startsWith('</')) {
            depth--;
            if (depth === 1) { entries.push({ tag, start, end: index + token.length, xml: xml.slice(start, index + token.length) }); }
            if (depth === 0) { close = index; }
        } else {
            const qualified = /^<([^\s/>]+)/.exec(token)![1];
            if (depth === 0) { prefix = qualified.includes(':') ? qualified.split(':')[0] + ':' : ''; }
            if (depth === 1) { start = index; tag = qualified.split(':').pop()!; }
            if (/\/\s*>$/.test(token)) {
                if (depth === 1) { entries.push({ tag, start, end: index + token.length, xml: token }); }
            } else { depth++; }
        }
    }
    if (close < 0) { throw new Error('Permission Set requires an explicit closing element.'); }
    return { entries, close, prefix };
}
function value(block: string, section: string, key: string): string {
    return text(object(parseXml(`<PermissionSet>${block}</PermissionSet>`, 'PermissionSet')[section])[key]);
}
export function findXmlBlockByChildValue(xml: string, section: string, key: string, name: string): string | undefined {
    return spans(xml).entries.find(entry => entry.tag === section && value(entry.xml, section, key) === name)?.xml;
}
export function mergeXmlBlockByChildValue(local: string, remote: string, section: string, key: string, name: string): string {
    const parsed = parseXml(`<PermissionSet>${remote}</PermissionSet>`, 'PermissionSet');
    if (Object.keys(parsed).length !== 1 || value(remote, section, key) !== name) { throw new Error('Remote permission entry does not match the requested key.'); }
    const layout = spans(local);
    const eol = local.includes('\r\n') ? '\r\n' : '\n';
    let block = new XMLBuilder({ format: true, indentBy: '    ' }).build({ [section]: parsed[section] }).trim() as string;
    if (layout.prefix) { block = block.replace(/<(\/?)([\w.-]+)/g, `<$1${layout.prefix}$2`); }
    block = block.replace(/\n/g, `${eol}    `);
    const matches = layout.entries.filter(entry => entry.tag === section && value(entry.xml, section, key) === name);
    if (matches.length > 1) { throw new Error('Local Permission Set contains duplicate entry keys; resolve duplicates before syncing.'); }
    if (matches.length) {
        const existing = matches[0];
        return local.slice(0, existing.start) + block + local.slice(existing.end);
    }
    const same = layout.entries.filter(entry => entry.tag === section);
    const next = same.find(entry => value(entry.xml, section, key).localeCompare(name) > 0)
        ?? layout.entries.find(entry => entry.tag.localeCompare(section) > 0 && !['label', 'description', 'hasActivationRequired', 'license'].includes(entry.tag));
    if (next) { return local.slice(0, next.start) + block + eol + '    ' + local.slice(next.start); }
    if (same.length) {
        const end = same[same.length - 1].end;
        return local.slice(0, end) + eol + '    ' + block + local.slice(end);
    }
    return local.slice(0, layout.close) + '    ' + block + eol + local.slice(layout.close);
}
