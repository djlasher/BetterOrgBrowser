export function findXmlBlockByChildValue(xml: string, blockTagName: string, childTagName: string, childValue: string): string | undefined {
    return getXmlBlockMatches(xml, blockTagName, childTagName).find((match) => match.childValue === childValue)?.block;
}

export function mergeXmlBlockByChildValue(localXml: string, remoteBlock: string, blockTagName: string, childTagName: string, childValue: string): string {
    const normalizedRemoteBlock = normalizeBlockIndent(remoteBlock, detectEntryIndent(localXml));
    const existingBlocks = getXmlBlockMatches(localXml, blockTagName, childTagName);
    const blocksToKeep = existingBlocks
        .filter((match) => match.childValue !== childValue)
        .map((match) => normalizeBlockIndent(match.block, detectEntryIndent(localXml)));
    const sortedBlocks = [...blocksToKeep, normalizedRemoteBlock]
        .sort((a, b) => (readXmlTagValue(a, childTagName) ?? '').localeCompare(readXmlTagValue(b, childTagName) ?? ''));
    const xmlWithoutExistingBlocks = removeBlocks(localXml, existingBlocks.map((match) => match.block));

    return insertSection(xmlWithoutExistingBlocks, sortedBlocks.join('\n'), blockTagName);
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
        return `${xml.slice(0, anchorMatch.index)}${sectionXml}\n${xml.slice(anchorMatch.index)}`;
    }

    return xml.replace(/\s*<\/PermissionSet>\s*$/, `\n${sectionXml}\n</PermissionSet>\n`);
}

function getInsertAnchorPattern(blockTagName: string): RegExp | undefined {
    if (blockTagName === 'fieldPermissions') {
        return /\n[ \t]*<(objectPermissions|pageAccesses|recordTypeVisibilities|tabSettings|userPermissions)>/;
    }

    if (blockTagName === 'objectPermissions') {
        return /\n[ \t]*<(pageAccesses|recordTypeVisibilities|tabSettings|userPermissions)>/;
    }

    return undefined;
}

function readXmlTagValue(block: string, tagName: string): string | undefined {
    const pattern = new RegExp(`<${tagName}>([\\s\\S]*?)<\/${tagName}>`);
    const match = block.match(pattern);

    return match?.[1]?.trim();
}

function detectEntryIndent(xml: string): string {
    const match = xml.match(/\n([ \t]*)<fieldPermissions>/) ?? xml.match(/\n([ \t]*)<objectPermissions>/);

    return match?.[1] ?? '    ';
}

function normalizeBlockIndent(block: string, targetIndent: string): string {
    const lines = block.trim().split(/\r?\n/);
    const sourceIndent = lines[0]?.match(/^[ \t]*/)?.[0] ?? '';

    return lines
        .map((line) => `${targetIndent}${line.startsWith(sourceIndent) ? line.slice(sourceIndent.length) : line.trimStart()}`)
        .join('\n');
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
