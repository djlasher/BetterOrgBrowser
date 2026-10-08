import { objectMember, SemanticNode } from '../metadataModel';
import { array, object, parseXml, text } from './xml';
export const objectSections = [
    ['fields', 'Fields', 'CustomField'], ['recordTypes', 'Record Types', 'RecordType'],
    ['validationRules', 'Validation Rules', 'ValidationRule'], ['fieldSets', 'Field Sets', 'FieldSet'],
    ['listViews', 'List Views', 'ListView'], ['compactLayouts', 'Compact Layouts', 'CompactLayout'],
    ['webLinks', 'Web Links', 'WebLink'], ['businessProcesses', 'Business Processes', 'BusinessProcess'],
    ['sharingReasons', 'Sharing Reasons', 'SharingReason'], ['indexes', 'Indexes', 'Index']
] as const;
export function parseCustomObject(xml: string, objectName: string): SemanticNode[] {
    const data = parseXml(xml, 'CustomObject');
    const sections: SemanticNode[] = objectSections.flatMap(([key, label, kind]) => {
        const children = array(data[key]).map(object).filter(e => text(e.fullName)).map(e => ({
            label: text(e.label) || text(e.fullName), name: text(e.fullName), kind, details: e,
            description: text(e.type) || undefined,
            // Index is browse-only: its availability as an independent member varies.
            manifest: kind === 'Index' ? undefined : objectMember(kind, objectName, text(e.fullName)),
            fragment: kind === 'Index' ? [{ tag: key, key: 'fullName', name: text(e.fullName) }] : undefined
        })).sort((a, b) => a.name.localeCompare(b.name));
        return children.length ? [{ label, kind: 'section', children }] : [];
    });
    if (data.searchLayouts !== undefined) {
        const details = object(data.searchLayouts);
        sections.push({ label: 'Search Layouts', kind: 'SearchLayouts', details, fragment: [{ tag: 'searchLayouts' }] });
    }
    return sections;
}
