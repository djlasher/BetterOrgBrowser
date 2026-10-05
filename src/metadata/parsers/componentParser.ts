import { SemanticNode } from '../metadataModel';
import { array, object, parseXml, text } from './xml';
export function parsePermissionSetGroup(xml: string): SemanticNode[] {
    const data = parseXml(xml, 'PermissionSetGroup');
    return array(data.permissionSets).map(text).filter(Boolean).sort().map(name => ({
        label: name, name, kind: 'PermissionSet', manifest: { type: 'PermissionSet', member: name }
    }));
}
export function parseCustomLabels(xml: string): SemanticNode[] {
    return array(parseXml(xml, 'CustomLabels').labels).map(object).filter(e => text(e.fullName)).map(e => ({
        label: text(e.fullName), name: text(e.fullName), kind: 'CustomLabel', description: text(e.language), details: e,
        manifest: { type: 'CustomLabel', member: text(e.fullName) }
    })).sort((a, b) => a.name.localeCompare(b.name));
}
export function parseCustomMetadata(xml: string): SemanticNode[] {
    return array(parseXml(xml, 'CustomMetadata').values).map(object).filter(e => text(e.field)).map(e => ({
        label: text(e.field), name: text(e.field), kind: 'FieldValue', details: e,
        description: text(e.value) || undefined
    }));
}
export function parseLayout(xml: string): SemanticNode[] {
    const data = parseXml(xml, 'Layout');
    const sections: SemanticNode[] = array(data.layoutSections).map(object).map((section, index) => ({
        label: text(section.label) || `Section ${index + 1}`, name: text(section.label) || `Section ${index + 1}`,
        kind: 'LayoutSection', details: section,
        children: array(section.layoutColumns).map(object).map((column, i) => ({
            label: `Column ${i + 1}`, kind: 'section', children: array(column.layoutItems).map(object).map((item, j) => ({
                label: text(item.field) || text(item.customLink) || `Layout item ${j + 1}`,
                name: text(item.field) || text(item.customLink) || `Item ${j + 1}`, kind: 'LayoutItem',
                description: text(item.behavior), details: item
            }))
        }))
    }));
    const lists = array(data.relatedLists).map(object).map(e => ({ label: text(e.relatedList) || 'Related List', name: text(e.relatedList), kind: 'RelatedList', details: e }));
    if (lists.length) { sections.push({ label: 'Related Lists', kind: 'section', children: lists }); }
    return sections;
}
export function parseFlexiPage(xml: string): SemanticNode[] {
    return array(parseXml(xml, 'FlexiPage').flexiPageRegions).map(object).map((region, index) => ({
        label: text(region.name) || `Region ${index + 1}`, name: text(region.name) || `Region ${index + 1}`, kind: 'Region',
        description: text(region.type), details: region,
        children: array(region.itemInstances).map(object).map((item, i) => {
            const component = object(item.componentInstance ?? item.fieldInstance);
            const name = text(component.identifier) || text(component.componentName) || text(component.fieldItem) || `Component ${i + 1}`;
            return { label: text(component.componentName) || text(component.fieldItem) || name, name, kind: 'Component', details: component };
        })
    }));
}
export function parseApplication(xml: string): SemanticNode[] {
    const data = parseXml(xml, 'CustomApplication');
    return array(data.tabs).map(text).filter(Boolean).map(name => ({ label: name, name, kind: 'Tab' }));
}
