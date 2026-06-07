export interface RetrieveSummary {
    status: string;
    success: boolean;
    done: boolean;
    deployedSourceCount: number;
    retrievedFileCount: number;
    id?: string;
}

interface RetrievedFile {
    fullName?: string;
    type?: string;
    state?: string;
    filePath?: string;
}

interface RetrieveJsonResult {
    status?: number;
    result?: {
        done?: boolean;
        success?: boolean;
        status?: string;
        id?: string;
        deployedSource?: unknown[];
        files?: RetrievedFile[];
        fileResponses?: RetrievedFile[];
        fileProperties?: unknown[];
        messages?: string[];
    };
    message?: string;
    name?: string;
    warnings?: string[];
}

export function formatRetrieveResult(output: string): string {
    const parsed = parseRetrieveJson(output);

    if (!parsed) {
        return [
            '# Retrieve Result',
            '',
            'Salesforce CLI returned non-JSON output.',
            '',
            '```text',
            output.trim(),
            '```',
            ''
        ].join('\n');
    }

    const summary = buildRetrieveSummary(parsed);
    const retrievedFiles = getRetrievedFiles(parsed);
    const lines = [
        '# Retrieve Result',
        '',
        `Status: ${summary.status}`,
        `Success: ${summary.success ? 'Yes' : 'No'}`,
        `Done: ${summary.done ? 'Yes' : 'No'}`,
        `Deployed source items: ${summary.deployedSourceCount}`,
        `Retrieved files: ${summary.retrievedFileCount}`
    ];

    if (summary.id) {
        lines.push(`Retrieve ID: ${summary.id}`);
    }

    if (retrievedFiles.length) {
        lines.push('', '## Retrieved Files', '');
        lines.push(...retrievedFiles.map(formatRetrievedFile));
    }

    if (parsed.result?.messages?.length) {
        lines.push('', '## Messages', '', ...parsed.result.messages.map((message) => `- ${message}`));
    }

    if (parsed.message) {
        lines.push('', '## Message', '', parsed.message);
    }

    if (parsed.warnings?.length) {
        lines.push('', '## Warnings', '', ...parsed.warnings.map((warning) => `- ${warning}`));
    }

    lines.push('', '## Raw CLI JSON', '', '```json', JSON.stringify(parsed, null, 2), '```', '');

    return lines.join('\n');
}

export function buildRetrieveSummary(parsed: RetrieveJsonResult): RetrieveSummary {
    const result = parsed.result;
    const deployedSource = Array.isArray(result?.deployedSource) ? result.deployedSource : [];
    const retrievedFiles = getRetrievedFiles(parsed);

    return {
        status: result?.status ?? parsed.name ?? String(parsed.status ?? 'Unknown'),
        success: result?.success === true || parsed.status === 0,
        done: result?.done === true,
        deployedSourceCount: deployedSource.length,
        retrievedFileCount: retrievedFiles.length,
        id: result?.id
    };
}

function getRetrievedFiles(parsed: RetrieveJsonResult): RetrievedFile[] {
    const result = parsed.result;

    if (Array.isArray(result?.files)) {
        return result.files;
    }

    if (Array.isArray(result?.fileResponses)) {
        return result.fileResponses;
    }

    return [];
}

function formatRetrievedFile(file: RetrievedFile): string {
    const name = file.fullName ?? 'Unknown metadata';
    const type = file.type ?? 'Unknown type';
    const state = file.state ? ` — ${file.state}` : '';
    const filePath = file.filePath ? `\n  - ${file.filePath}` : '';

    return `- ${type}: ${name}${state}${filePath}`;
}

function parseRetrieveJson(output: string): RetrieveJsonResult | undefined {
    try {
        return JSON.parse(output) as RetrieveJsonResult;
    } catch {
        return undefined;
    }
}
