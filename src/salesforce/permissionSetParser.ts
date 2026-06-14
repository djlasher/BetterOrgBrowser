import { findXmlBlockByChildValue, mergeXmlBlockByChildValue } from './permissionSetMerge';

export interface ObjectPermission {
    object: string;
    allowCreate: boolean;
    allowRead: boolean;
    allowEdit: boolean;
    allowDelete: boolean;
    viewAllRecords: boolean;
    modifyAllRecords: boolean;
}

export interface FieldPermission {
    field: string;
    readable: boolean;
    editable: boolean;
}

export function parseObjectPermissions(xml: string): ObjectPermission[] {
    const blocks = xml.match(/<objectPermissions>[\s\S]*?<\/objectPermissions>/g) ?? [];

    return blocks
        .map(parseObjectPermissionBlock)
        .filter((permission): permission is ObjectPermission => Boolean(permission))
        .sort((a, b) => a.object.localeCompare(b.object));
}

export function parseFieldPermissions(xml: string): FieldPermission[] {
    const blocks = xml.match(/<fieldPermissions>[\s\S]*?<\/fieldPermissions>/g) ?? [];

    return blocks
        .map(parseFieldPermissionBlock)
        .filter((permission): permission is FieldPermission => Boolean(permission))
        .sort((a, b) => a.field.localeCompare(b.field));
}

export function findObjectPermissionBlock(xml: string, objectName: string): string | undefined {
    return findXmlBlockByChildValue(xml, 'objectPermissions', 'object', objectName);
}

export function findFieldPermissionBlock(xml: string, fieldName: string): string | undefined {
    return findXmlBlockByChildValue(xml, 'fieldPermissions', 'field', fieldName);
}

export function mergeObjectPermissionBlock(localXml: string, remoteBlock: string, objectName: string): string {
    return mergeXmlBlockByChildValue(localXml, remoteBlock, 'objectPermissions', 'object', objectName);
}

export function mergeFieldPermissionBlock(localXml: string, remoteBlock: string, fieldName: string): string {
    return mergeXmlBlockByChildValue(localXml, remoteBlock, 'fieldPermissions', 'field', fieldName);
}

function parseObjectPermissionBlock(block: string): ObjectPermission | undefined {
    const object = readTagValue(block, 'object');

    if (!object) {
        return undefined;
    }

    return {
        object,
        allowCreate: readBooleanTagValue(block, 'allowCreate'),
        allowRead: readBooleanTagValue(block, 'allowRead'),
        allowEdit: readBooleanTagValue(block, 'allowEdit'),
        allowDelete: readBooleanTagValue(block, 'allowDelete'),
        viewAllRecords: readBooleanTagValue(block, 'viewAllRecords'),
        modifyAllRecords: readBooleanTagValue(block, 'modifyAllRecords')
    };
}

function parseFieldPermissionBlock(block: string): FieldPermission | undefined {
    const field = readTagValue(block, 'field');

    if (!field) {
        return undefined;
    }

    return {
        field,
        readable: readBooleanTagValue(block, 'readable'),
        editable: readBooleanTagValue(block, 'editable')
    };
}

function readBooleanTagValue(block: string, tagName: string): boolean {
    return readTagValue(block, tagName) === 'true';
}

function readTagValue(block: string, tagName: string): string | undefined {
    const pattern = new RegExp(`<${tagName}>([\\s\\S]*?)<\/${tagName}>`);
    const match = block.match(pattern);

    return match?.[1]?.trim();
}
