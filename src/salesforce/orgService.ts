import { execFile } from 'child_process';

export interface SalesforceOrg {
    alias?: string;
    username: string;
    orgId?: string;
    instanceUrl?: string;
    isDefaultUsername?: boolean;
}

interface SfOrgListResult {
    result?: {
        nonScratchOrgs?: SalesforceOrg[];
        scratchOrgs?: SalesforceOrg[];
    };
}

export class OrgService {
    public async listAuthorizedOrgs(): Promise<SalesforceOrg[]> {
        const output = await this.runSfCommand(['org', 'list', '--json']);
        const parsed = JSON.parse(output) as SfOrgListResult;

        const nonScratchOrgs = parsed.result?.nonScratchOrgs ?? [];
        const scratchOrgs = parsed.result?.scratchOrgs ?? [];

        return [...nonScratchOrgs, ...scratchOrgs]
            .filter((org) => Boolean(org.username))
            .sort((a, b) => this.getOrgDisplayName(a).localeCompare(this.getOrgDisplayName(b)));
    }

    public getOrgDisplayName(org: SalesforceOrg): string {
        return org.alias ? `${org.alias} (${org.username})` : org.username;
    }

    private runSfCommand(args: string[]): Promise<string> {
        return new Promise((resolve, reject) => {
            execFile('sf', args, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(stderr || error.message));
                    return;
                }

                resolve(stdout);
            });
        });
    }
}
