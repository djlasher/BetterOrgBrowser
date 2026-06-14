export function findXmlBlockByChildValue(xml: string, blockTagName: string, childTagName: string, childValue: string): string | undefined {
    return getXmlBlockMatches(xml, blockTagName, childTagName).find((match) => match.childValue === childValue)?.block;
}

export function mergeXmlBlockByChildValue(localXml: string, remoteBlock: string, blockTagName: string, childTagName: string, childValue: string): string {
    const localBlocks = getXmlBlockMatches(localXml, blockTagName, childTagName);
    const normalizedRemoteBlock = normalizeBlockIndent(remoteBlock, detectEntryIndent(localXml));
    const existingBlock = localBlocks.find((match) => match.childValue === childValue);

    if (existingBlock) {
        return localXml.replace(existingBlock.block, normalizedRemoteBlock);
    }

    if (!localBlocks.length) {
        return localXml.replace(/\s*<\/PermissionSet>\s*$/, `\n${normalizedRemoteBlock}\n</PermissionSet>\n`);
    }

    const sortedBlocks = [...localBlocks.map((match) => match.block), normalizedRemoteBlock]
        .sort((a, b) => (readXmlTagValue(a, childTagName) ?? '').localeCompare(readXmlTagValue(b, childTagName) ?? ''));
    const firstBlock = localBlocks[0];
    const lastBlock = localBlocks[localBlocks.length - 1];

    return `${localXml.slice(0, firstBlock.index)}${sortedBlocks.join('\n')}${localXml.slice(lastBlock.index + lastBlock.block.length)}`;
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
