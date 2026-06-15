const PERMISSION_SET_ENTRY_INDENT = '    ';
const PERMISSION_SET_CHILD_INDENT = '        ';

const PERMISSION_SET_SECTION_ORDER = [
    'applicationVisibilities',
    'classAccesses',
    'customMetadataTypeAccesses',
    'customPermissions',
    'externalDataSourceAccesses',
    'fieldPermissions',
    'flowAccesses',
    'objectPermissions',
    'pageAccesses',
    'recordTypeVisibilities',
    'tabSettings',
    'userPermissions'
];

export function findXmlBlockByChildValue(xml: string, blockTagName: string, childTagName: string, childValue: string): string | undefined {
    return getXmlBlockMatches(xml, blockTagName, childTagName).find((match) => match.childValue === childValue)?.block;
}

export function mergeXmlBlockByChildValue(localXml: string, remoteBlock: string, blockTagName: string, childTagName: string, childValue: string): string {
    const normalizedRemoteBlock = normalizePermissionSetBlock(remoteBlock);
    const existingBlocks = getXmlBlockMatches(localXml, blockTagName, childTagName);
    const blocksToKeep = existingBlocks
        .filter((match) => match.childValue !== childValue)
        .map((match) => normalizePermissionSetBlock(match.block));
    const sortedBlocks = [...blocksToKeep, normalizedRemoteBlock]
        .sort((a, b) => (readXmlTagValue(a, childTagName) ?? '').localeCompare(readXmlTagValue(b, childTagName) ?? ''));
    const xmlWithoutExistingBlocks = removeBlocks(localXml, existingBlocks.map((match) => match.block));
    const normalizedXml = normalizePermissionSetWhitespace(xmlWithoutExistingBlocks);

    return insertSection(normalizedXml, sortedBlocks.join('\n'), blockTagName);
}

interface XmlBlockMatch {
    block: string;
    childValue: string | undefined;
    index: number;
}

function getXmlBlockMatches(xml: string, blockTagName: string, childTagName: string): XmlBlockMatch[] {
    const pattern = new RegExp(`<${blockTagName}>[\\s\\S]*?<\\/${blockTagName}>`, 'g');
    const matches: XmlBlockMatch[] = [];
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(xml)) !== null) {
        matches.push({
            block: match[0],
            childValue: readXmlTagValue(match[0], childTagName),
            index: match.index
        });
    }

    return matches;
}

function removeBlocks(xml: string, blocks: string[]): string {
    return blocks.reduce((currentXml, block) => currentXml.replace(new RegExp(`\\s*${escapeRegExp(block)}`, 'g'), ''), xml);
}

function insertSection(xml: string, sectionXml: string, blockTagName: string): string {
    const anchorPattern = getInsertAnchorPattern(blockTagName);
    const anchorMatch = anchorPattern ? xml.match(anchorPattern) : undefined;

    if (anchorMatch?.index !== undefined) {
        return `${xml.slice(0, anchorMatch.index)}\n${sectionXml}${xml.slice(anchorMatch.index)}`;
    }

    return xml.replace(/\s*<\/PermissionSet>\s*$/, `\n${sectionXml}\n</PermissionSet>\n`);
}

function getInsertAnchorPattern(blockTagName: string): RegExp | undefined {
    const blockIndex = PERMISSION_SET_SECTION_ORDER.indexOf(blockTagName);

    if (blockIndex < 0) {
        return undefined;
    }

    const laterSections = PERMISSION_SET_SECTION_ORDER.slice(blockIndex + 1);
    return new RegExp(`\\n[ \\t]*<(${laterSections.join('|')})>`);
}

function readXmlTagValue(block: string, tagName: string): string | undefined {
    const pattern = new RegExp(`<${tagName}>([\\s\\S]*?)<\/${tagName}>`);
    const match = block.match(pattern);

    return match?.[1]?.trim();
}

function normalizePermissionSetBlock(block: string): string {
    const lines = block.trim().split(/\r?\n/).map((line) => line.trim());

    return lines
        .map((line, index) => `${index === 0 || index === lines.length - 1 ? PERMISSION_SET_ENTRY_INDENT : PERMISSION_SET_CHILD_INDENT}${line}`)
        .join('\n');
}

function normalizePermissionSetWhitespace(xml: string): string {
    return xml
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\n\s*<\/PermissionSet>\s*$/, '\n</PermissionSet>\n');
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
