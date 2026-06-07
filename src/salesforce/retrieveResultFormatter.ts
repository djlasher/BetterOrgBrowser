export interface RetrieveSummary {
    status: string;
    success: boolean;
    done: boolean;
    deployedSourceCount: number;
    fileResponsesCount: number;
    id?: string;
}

interface RetrieveJsonResult {
    status?: number;
    result?: {
        done?: boolean;
        success?: boolean;
        status?: string;
        id?: string;
        deployedSource?: unknown[];
        files?: unknown[];
        fileResponses?: unknown[];
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
    const lines = [
        '# Retrieve Result',
        '',
        `Status: ${summary.status}`,
        `Success: ${summary.success ? 'Yes' : 'No'}`,
        `Done: ${summary.done ? 'Yes' : 'No'}`,
        `Deployed source items: ${summary.deployedSourceCount}`,
        `File responses: ${summary.fileResponsesCount}`
    ];

    if (summary.id) {
        lines.push(`Retrieve ID: ${summary.id}`);
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
    const fileResponses = Array.isArray(result?.fileResponses)
        ? result.fileResponses
        : Array.isArray(result?.files)
            ? result.files
            : [];

    return {
        status: result?.status ?? parsed.name ?? String(parsed.status ?? 'Unknown'),
        success: result?.success === true || parsed.status === 0,
        done: result?.done === true,
        deployedSourceCount: deployedSource.length,
        fileResponsesCount: fileResponses.length,
        id: result?.id
    };
}

function parseRetrieveJson(output: string): RetrieveJsonResult | undefined {
    try {
        return JSON.parse(output) as RetrieveJsonResult;
    } catch {
        return undefined;
    }
}
