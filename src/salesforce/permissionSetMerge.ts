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
    const same = layout.entries.filter(entry => entry.tag === section);
    const keyed = same.map(entry => ({ name: value(entry.xml, section, key), block: entry.xml }));
    if (new Set(keyed.map(entry => entry.name)).size !== keyed.length) {
        throw new Error('Local Permission Set contains duplicate entry keys; resolve duplicates before syncing.');
    }
    if (keyed.some(entry => !entry.name)) { throw new Error(`Local ${section} entry is missing its ${key}.`); }
    const sorted = [...keyed.filter(entry => entry.name !== name), { name, block }]
        .sort((a, b) => a.name.localeCompare(b.name));
    const next = layout.entries.find(entry => entry.tag !== section && entry.tag.localeCompare(section) > 0
        && !['label', 'description', 'hasActivationRequired', 'license'].includes(entry.tag));
    // Keep the original section location unless an entry was moved below a later
    // section. Regroup every local entry; only the selected entry gets remote data.
    const anchor = Math.min(same[0]?.start ?? layout.close, next?.start ?? layout.close);
    const removals = same.map(entry => {
        let start = entry.start;
        while (start > 0 && /\s/.test(local[start - 1])) { start--; }
        return { start, end: entry.end };
    });
    let remaining = '', cursor = 0, insertion = anchor;
    for (const removal of removals) {
        remaining += local.slice(cursor, removal.start);
        insertion -= Math.max(0, Math.min(anchor, removal.end) - removal.start);
        cursor = removal.end;
    }
    remaining += local.slice(cursor);
    const before = remaining.slice(0, insertion).replace(/\s*$/, '');
    const after = remaining.slice(insertion).replace(/^\s*/, '');
    const closeTag = after.startsWith(`</${layout.prefix}PermissionSet`);
    const result = before + eol + '    ' + sorted.map(entry => entry.block).join(eol + '    ')
        + eol + (closeTag ? '' : '    ') + after;
    return compactTopLevelGaps(result, eol);
}

/** Remove leftover blank lines between entries, never whitespace inside XML
 * values/CDATA or comments. Preserve other sections' blocks verbatim. */
function compactTopLevelGaps(xml: string, eol: string): string {
    const layout = spans(xml);
    let result = xml;
    for (let i = layout.entries.length - 1; i >= 0; i--) {
        const start = layout.entries[i].end;
        const end = layout.entries[i + 1]?.start ?? layout.close;
        const gap = xml.slice(start, end);
        if (/^\s*$/.test(gap) && /\n[ \t\r]*\n/.test(gap)) {
            result = result.slice(0, start) + eol + (i + 1 < layout.entries.length ? '    ' : '') + result.slice(end);
        }
    }
    return result;
}
