import { execFile } from 'child_process';
import * as vscode from 'vscode';

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
    private readonly cliOutputChannel = vscode.window.createOutputChannel('Better Org Browser Salesforce CLI');

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

    public async retrievePermissionSet(targetOrg: string, permissionSetName: string, cwd: string, outputDir?: string): Promise<string> {
        const args = [
            'project',
            'retrieve',
            'start',
            '--metadata',
            `PermissionSet:${permissionSetName}`,
            '--target-org',
            targetOrg,
            '--json'
        ];

        if (outputDir) {
            args.push('--output-dir', outputDir);
        }

        return this.runSfCommand(args, cwd);
    }

    public async retrievePermissionSetMetadataFormat(targetOrg: string, permissionSetName: string, cwd: string, targetMetadataDir: string): Promise<string> {
        return this.runSfCommand([
            'project',
            'retrieve',
            'start',
            '--metadata',
            `PermissionSet:${permissionSetName}`,
            '--target-org',
            targetOrg,
            '--single-package',
            '--target-metadata-dir',
            targetMetadataDir,
            '--unzip'
        ], cwd);
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
        const executable = this.getSfExecutableName();
        const commandText = `${executable} ${args.map((arg) => this.formatArg(arg)).join(' ')}`;

        this.cliOutputChannel.appendLine(`[${new Date().toISOString()}] cwd: ${cwd ?? process.cwd()}`);
        this.cliOutputChannel.appendLine(`[${new Date().toISOString()}] command: ${commandText}`);

        return new Promise((resolve, reject) => {
            execFile(executable, args, { cwd }, (error, stdout, stderr) => {
                if (stdout) {
                    this.cliOutputChannel.appendLine('--- stdout ---');
                    this.cliOutputChannel.appendLine(stdout);
                }

                if (stderr) {
                    this.cliOutputChannel.appendLine('--- stderr ---');
                    this.cliOutputChannel.appendLine(stderr);
                }

                if (error) {
                    this.cliOutputChannel.appendLine('--- error ---');
                    this.cliOutputChannel.appendLine(error.message);
                    this.cliOutputChannel.show(true);
                    reject(new Error(stderr || stdout || error.message));
                    return;
                }

                this.cliOutputChannel.appendLine('--- success ---');
                this.cliOutputChannel.appendLine('');
                resolve(stdout);
            });
        });
    }

    private formatArg(arg: string): string {
        return /\s/.test(arg) ? `"${arg}"` : arg;
    }

    private getSfExecutableName(): string {
        return process.platform === 'win32' ? 'sf.cmd' : 'sf';
    }
}
