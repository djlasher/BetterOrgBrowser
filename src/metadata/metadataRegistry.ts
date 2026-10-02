import { SemanticNode } from './metadataModel';
import { parseCustomObject } from './parsers/customObjectParser';
import { parseFlow } from './parsers/flowParser';
import { parsePermissionSet } from './parsers/permissionSetParser';
import { parseApplication, parseCustomLabels, parseCustomMetadata, parseFlexiPage, parseLayout, parsePermissionSetGroup } from './parsers/componentParser';
export interface MetadataDefinition {
    type: string;
    label: string;
    icon: string;
    suffix?: string;
    parse?: (xml: string, name: string) => SemanticNode[];
    bundle?: string;
    folderType?: string;
    singleton?: string;
}
export const metadataRegistry: MetadataDefinition[] = [
    { type: 'CustomObject', label: 'Custom Objects', icon: 'symbol-class', suffix: '.object', parse: parseCustomObject },
    { type: 'Flow', label: 'Flows', icon: 'git-merge', suffix: '.flow', parse: parseFlow },
    { type: 'PermissionSet', label: 'Permission Sets', icon: 'shield', suffix: '.permissionset', parse: xml => parsePermissionSet(xml) },
    { type: 'Profile', label: 'Profiles', icon: 'shield', suffix: '.profile', parse: xml => parsePermissionSet(xml, 'Profile') },
    { type: 'LightningComponentBundle', label: 'Lightning Web Components', icon: 'files', bundle: 'lwc' },
    { type: 'AuraDefinitionBundle', label: 'Aura Components', icon: 'files', bundle: 'aura' },
    { type: 'PermissionSetGroup', label: 'Permission Set Groups', icon: 'shield', suffix: '.permissionsetgroup', parse: parsePermissionSetGroup },
    { type: 'Layout', label: 'Page Layouts', icon: 'layout', suffix: '.layout', parse: parseLayout },
    { type: 'FlexiPage', label: 'Lightning Pages', icon: 'layout', suffix: '.flexipage', parse: parseFlexiPage },
    { type: 'CustomApplication', label: 'Applications', icon: 'window', suffix: '.app', parse: parseApplication },
    { type: 'CustomLabels', label: 'Custom Labels', icon: 'symbol-string', suffix: '.labels', singleton: 'CustomLabels', parse: parseCustomLabels },
    { type: 'CustomMetadata', label: 'Custom Metadata Records', icon: 'database', suffix: '.md', parse: parseCustomMetadata },
    ...[
        ['ApexClass', 'Apex Classes'], ['ApexTrigger', 'Apex Triggers'], ['CustomTab', 'Tabs'], ['StaticResource', 'Static Resources'],
        ['Queue', 'Queues'], ['Group', 'Groups'], ['NamedCredential', 'Named Credentials'], ['ExternalCredential', 'External Credentials'],
        ['AuthProvider', 'Auth Providers'], ['ConnectedApp', 'Connected Apps'], ['RemoteSiteSetting', 'Remote Site Settings'],
        ['CustomPermission', 'Custom Permissions']
    ].map(([type, label]) => ({ type, label, icon: 'file-code' })),
    { type: 'EmailTemplate', label: 'Email Templates', icon: 'mail', folderType: 'EmailFolder' },
    { type: 'Report', label: 'Reports', icon: 'graph', folderType: 'ReportFolder' },
    { type: 'Dashboard', label: 'Dashboards', icon: 'graph', folderType: 'DashboardFolder' }
];
