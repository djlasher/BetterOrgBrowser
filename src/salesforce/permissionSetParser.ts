export interface ObjectPermission {
    object: string;
    allowCreate: boolean;
    allowRead: boolean;
    allowEdit: boolean;
    allowDelete: boolean;
    viewAllRecords: boolean;
    modifyAllRecords: boolean;
}

export function parseObjectPermissions(xml: string): ObjectPermission[] {
    const blocks = xml.match(/<objectPermissions>[\s\S]*?<\/objectPermissions>/g) ?? [];

    return blocks
        .map(parseObjectPermissionBlock)
        .filter((permission): permission is ObjectPermission => Boolean(permission))
        .sort((a, b) => a.object.localeCompare(b.object));
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

function readBooleanTagValue(block: string, tagName: string): boolean {
    return readTagValue(block, tagName) === 'true';
}

function readTagValue(block: string, tagName: string): string | undefined {
    const pattern = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`);
    const match = block.match(pattern);

    return match?.[1]?.trim();
}
