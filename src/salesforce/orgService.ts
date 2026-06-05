import { execFile } from 'child_process';

export interface SalesforceOrg {
    alias?: string;
    username: string;
    orgId?: string;
    instanceUrl?: string;
    isDefaultUsername?: boolean;
}

export interface MetadataListItem {
    fullName: string;
    fileName?: string;
    type?: string;
    manageableState?: string;
    namespacePrefix?: string | null;
    lastModifiedDate?: string;
}

interface SfOrgListResult {
    result?: {
        other?: SalesforceOrg[];
        nonScratchOrgs?: SalesforceOrg[];
        scratchOrgs?: SalesforceOrg[];
        sandboxes?: SalesforceOrg[];
    };
}

interface SfMetadataListResult {
    result?: MetadataListItem[];
}

export class OrgService {
    public async listAuthorizedOrgs(): Promise<SalesforceOrg[]> {
        const output = await this.runSfCommand(['org', 'list', '--json']);
        const parsed = JSON.parse(output) as SfOrgListResult;

        const other = parsed.result?.other ?? [];
        const nonScratchOrgs = parsed.result?.nonScratchOrgs ?? [];
        const scratchOrgs = parsed.result?.scratchOrgs ?? [];
        const sandboxes = parsed.result?.sandboxes ?? [];

        const orgMap = new Map<string, SalesforceOrg>();

        [...other, ...nonScratchOrgs, ...scratchOrgs, ...sandboxes]
            .filter((org) => Boolean(org.username))
            .forEach((org) => orgMap.set(org.username, org));

        return [...orgMap.values()]
            .sort((a, b) => this.getOrgDisplayName(a).localeCompare(this.getOrgDisplayName(b)));
    }

    public async listApexClasses(targetOrg: string): Promise<MetadataListItem[]> {
        const output = await this.runSfCommand([
            'org',
            'list',
            'metadata',
            '--metadata-type',
            'ApexClass',
            '--target-org',
            targetOrg,
            '--json'
        ]);

        const parsed = JSON.parse(output) as SfMetadataListResult;

        return (parsed.result ?? [])
            .filter((item) => Boolean(item.fullName))
            .sort((a, b) => a.fullName.localeCompare(b.fullName));
    }

    public getOrgDisplayName(org: SalesforceOrg): string {
        return org.alias ? `${org.alias} (${org.username})` : org.username;
    }

    public getOrgTargetName(org: SalesforceOrg): string {
        return org.alias ?? org.username;
    }

    private runSfCommand(args: string[]): Promise<string> {
        return new Promise((resolve, reject) => {
            execFile(this.getSfExecutableName(), args, { shell: process.platform === 'win32' }, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(stderr || error.message));
                    return;
                }

                resolve(stdout);
            });
        });
    }

    private getSfExecutableName(): string {
        return process.platform === 'win32' ? 'sf.cmd' : 'sf';
    }
}
