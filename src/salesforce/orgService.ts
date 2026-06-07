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

export interface SObjectField {
    name: string;
    label?: string;
    type?: string;
    nillable?: boolean;
    createable?: boolean;
    updateable?: boolean;
    calculated?: boolean;
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

interface SfSObjectDescribeResult {
    result?: {
        fields?: SObjectField[];
    };
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

    public async listMetadata(targetOrg: string, metadataType: string): Promise<MetadataListItem[]> {
        const output = await this.runSfCommand([
            'org',
            'list',
            'metadata',
            '--metadata-type',
            metadataType,
            '--target-org',
            targetOrg,
            '--json'
        ]);

        const parsed = JSON.parse(output) as SfMetadataListResult;

        return (parsed.result ?? [])
            .filter((item) => Boolean(item.fullName))
            .sort((a, b) => a.fullName.localeCompare(b.fullName));
    }

    public async listApexClasses(targetOrg: string): Promise<MetadataListItem[]> {
        return this.listMetadata(targetOrg, 'ApexClass');
    }

    public async listCustomObjects(targetOrg: string): Promise<MetadataListItem[]> {
        return this.listMetadata(targetOrg, 'CustomObject');
    }

    public async listFlows(targetOrg: string): Promise<MetadataListItem[]> {
        return this.listMetadata(targetOrg, 'Flow');
    }

    public async listPermissionSets(targetOrg: string): Promise<MetadataListItem[]> {
        return this.listMetadata(targetOrg, 'PermissionSet');
    }

    public async describeSObject(targetOrg: string, objectApiName: string): Promise<SObjectField[]> {
        const output = await this.runSfCommand([
            'sobject',
            'describe',
            '--sobject',
            objectApiName,
            '--target-org',
            targetOrg,
            '--json'
        ]);

        const parsed = JSON.parse(output) as SfSObjectDescribeResult;

        return (parsed.result?.fields ?? [])
            .filter((field) => Boolean(field.name))
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    public async retrieveManifest(targetOrg: string, manifestPath: string, cwd: string): Promise<string> {
        return this.runSfCommand([
            'project',
            'retrieve',
            'start',
            '--manifest',
            manifestPath,
            '--target-org',
            targetOrg,
            '--json'
        ], cwd);
    }

    public getOrgDisplayName(org: SalesforceOrg): string {
        return org.alias ? `${org.alias} (${org.username})` : org.username;
    }

    public getOrgTargetName(org: SalesforceOrg): string {
        return org.alias ?? org.username;
    }

    private runSfCommand(args: string[], cwd?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            execFile(this.getSfExecutableName(), args, { shell: process.platform === 'win32', cwd }, (error, stdout, stderr) => {
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
