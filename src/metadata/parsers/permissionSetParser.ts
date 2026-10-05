import { SemanticNode } from '../metadataModel';
import { array, humanize, object, parseXml, text } from './xml';
export const permissionSections = [
    ['objectPermissions', 'Object Permissions', 'object', 'ObjectPermission'],
    ['fieldPermissions', 'Field Permissions', 'field', 'FieldPermission'],
    ['classAccesses', 'Apex Class Access', 'apexClass', 'ApexClassAccess'],
    ['flowAccesses', 'Flow Access', 'flow', 'FlowAccess'],
    ['customPermissions', 'Custom Permissions', 'name', 'CustomPermission'],
    ['tabSettings', 'Tab Settings', 'tab', 'TabSetting'],
    ['userPermissions', 'User Permissions', 'name', 'UserPermission'],
    ['recordTypeVisibilities', 'Record Type Visibilities', 'recordType', 'RecordTypeVisibility'],
    ['pageAccesses', 'Page Accesses', 'apexPage', 'PageAccess'],
    ['applicationVisibilities', 'Application Visibilities', 'application', 'ApplicationVisibility'],
    ['customMetadataTypeAccesses', 'Custom Metadata Type Accesses', 'name', 'CustomMetadataTypeAccess'],
    ['externalDataSourceAccesses', 'External Data Source Accesses', 'externalDataSource', 'ExternalDataSourceAccess']
] as const;
export function parsePermissionSet(xml: string, root = 'PermissionSet'): SemanticNode[] {
    const data = parseXml(xml, root);
    const sections: ReadonlyArray<readonly [string, string, string, string]> = root === 'Profile'
        ? [...permissionSections.filter(s => s[0] !== 'tabSettings'), ['tabVisibilities', 'Tab Visibilities', 'tab', 'TabVisibility']]
        : permissionSections;
    return sections.flatMap(([section, label, key, kind]) => {
        const entries = array(data[section]).map(object).filter(entry => text(entry[key])).map(entry => ({
            label: text(entry[key]), name: text(entry[key]), kind, details: entry,
            sync: root === 'PermissionSet' ? { section, key, name: text(entry[key]) } : undefined,
            children: Object.entries(entry).filter(([k, v]) => k !== key && typeof v !== 'object').map(([k, v]) => ({
                label: humanize(k), kind: 'Value', description: text(v) === 'true' ? 'Yes' : text(v) === 'false' ? 'No' : text(v),
                details: { [k]: v }
            }))
        })).sort((a, b) => a.name.localeCompare(b.name));
        return entries.length ? [{ label, kind: 'section', children: entries }] : [];
    });
}
