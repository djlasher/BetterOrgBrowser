import { SemanticNode, XmlSelector } from '../metadataModel';
import { array, object, parseXml, text, XmlObject } from './xml';
const sections = [
    ['variables', 'Variables', 'Variable'], ['constants', 'Constants', 'Constant'], ['formulas', 'Formulas', 'Formula'],
    ['screens', 'Screens', 'Screen'], ['decisions', 'Decisions', 'Decision'], ['assignments', 'Assignments', 'Assignment'],
    ['loops', 'Loops', 'Loop'], ['recordLookups', 'Record Lookups', 'RecordLookup'], ['recordCreates', 'Record Creates', 'RecordCreate'],
    ['recordUpdates', 'Record Updates', 'RecordUpdate'], ['recordDeletes', 'Record Deletes', 'RecordDelete'],
    ['subflows', 'Subflows', 'Subflow'], ['waits', 'Waits / Pauses', 'Wait'],
    ['collectionProcessors', 'Collection Processors', 'CollectionProcessor'], ['transforms', 'Transforms', 'Transform']
] as const;
function entries(value: unknown, kind: string, section: string, parent: XmlSelector[] = [], depth = 0): SemanticNode[] {
    return array(value).map(object).map((entry, index) => {
        const name = text(entry.name) || text(entry.targetReference) || `${kind} ${index + 1}`;
        const node: SemanticNode = { label: text(entry.label) || name, name, kind, details: entry,
            fragment: [...parent, { tag: section, key: 'name', name: text(entry.name) }],
            description: text(entry.dataType) || text(entry.fieldType) || text(entry.object) || undefined };
        const children: SemanticNode[] = [];
        // Explicit semantic relationships only; never recurse through the XML DOM.
        const relationships = kind === 'Screen' || kind === 'Component' ? [['fields', 'Components', 'Component']]
            : kind === 'Decision' ? [['rules', 'Rules', 'Rule']]
            : kind === 'Wait' ? [['waitEvents', 'Events', 'WaitEvent']] : [];
        if (depth < 16) {
            for (const [key, label, childKind] of relationships) {
                const nested = entries(entry[key], childKind, key, node.fragment, depth + 1);
                if (nested.length) { children.push({ label, kind: 'section', children: nested }); }
            }
        }
        if (children.length) { node.children = children; }
        return node;
    }).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
}
export function parseFlow(xml: string): SemanticNode[] {
    const data: XmlObject = parseXml(xml, 'Flow');
    const result: SemanticNode[] = sections.flatMap(([key, label, kind]) => {
        const children = entries(data[key], kind, key);
        return children.length ? [{ label, kind: 'section', children }] : [];
    });
    for (const apex of [true, false]) {
        const actions = array(data.actionCalls).filter(v => (text(object(v).actionType) === 'apex') === apex);
        if (actions.length) { result.push({ label: apex ? 'Apex / Invocable Actions' : 'Other Actions', kind: 'section', children: entries(actions, 'Action', 'actionCalls') }); }
    }
    if (data.start !== undefined) { result.push({ label: 'Start Configuration', kind: 'Start', details: object(data.start), fragment: [{ tag: 'start' }] }); }
    return result;
}
