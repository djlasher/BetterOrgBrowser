import { PackageXmlMember } from '../packageXml/packageXmlBuilder';

export interface PermissionEntry {
    section: string;
    key: string;
    name: string;
}
export interface SemanticNode {
    label: string;
    kind: string;
    name?: string;
    description?: string;
    details?: Record<string, unknown>;
    children?: SemanticNode[];
    manifest?: PackageXmlMember;
    sync?: PermissionEntry;
}
export interface PathNode {
    label: string;
    kind: string;
    name?: string;
    parent?: PathNode;
}
export function metadataPath(node: PathNode): string {
    const parts: string[] = [];
    let current: PathNode | undefined = node;
    while (current) {
        if (current.kind !== 'root' && (current.name || current === node)) {
            parts.unshift(current.name ? `${current.kind}: ${current.name}` : current.label);
        }
        current = current.parent;
    }
    return parts.join(' > ');
}
export function objectMember(type: string, object: string, name: string): PackageXmlMember {
    return { type, member: `${object}.${name}` };
}
