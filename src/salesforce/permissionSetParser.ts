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

export function findFieldPermissionBlock(xml: string, fieldName: string): string | undefined {
    const blocks = xml.match(/<fieldPermissions>[\s\S]*?<\/fieldPermissions>/g) ?? [];

    return blocks.find((block) => readTagValue(block, 'field') === fieldName);
}

export function mergeFieldPermissionBlock(localXml: string, remoteBlock: string, fieldName: string): string {
    const blocks = localXml.match(/<fieldPermissions>[\s\S]*?<\/fieldPermissions>/g) ?? [];
    const existingBlock = blocks.find((block) => readTagValue(block, 'field') === fieldName);
    const normalizedRemoteBlock = normalizeBlockIndent(remoteBlock, detectPermissionEntryIndent(localXml));

    if (existingBlock) {
        return localXml.replace(existingBlock, normalizedRemoteBlock);
    }

    return localXml.replace(/\s*<\/PermissionSet>\s*$/, `\n${normalizedRemoteBlock}\n</PermissionSet>\n`);
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
    const pattern = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`);
    const match = block.match(pattern);

    return match?.[1]?.trim();
}

function detectPermissionEntryIndent(xml: string): string {
    const match = xml.match(/\n([ \t]*)<fieldPermissions>/) ?? xml.match(/\n([ \t]*)<objectPermissions>/);

    return match?.[1] ?? '    ';
}

function normalizeBlockIndent(block: string, targetIndent: string): string {
    const lines = block.trim().split(/\r?\n/);
    const sourceIndent = getLeadingWhitespace(lines[0] ?? '');

    return lines
        .map((line) => `${targetIndent}${line.startsWith(sourceIndent) ? line.slice(sourceIndent.length) : line.trimStart()}`)
        .join('\n');
}

function getLeadingWhitespace(value: string): string {
    return value.match(/^[ \t]*/)?.[0] ?? '';
}
