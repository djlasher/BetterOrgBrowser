import spawn from 'cross-spawn';
import * as vscode from 'vscode';
import { TaskQueue } from '../cache/taskQueue';
import { formatCliArgument } from './cliArgument';

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
    custom?: boolean;
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
    private readonly queue = new TaskQueue(3);
    private readonly cliOutputChannel = vscode.window.createOutputChannel('Better Org Browser Salesforce CLI');
    dispose(): void { this.cliOutputChannel.dispose(); }

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

    public async listMetadata(targetOrg: string, metadataType: string, folder?: string): Promise<MetadataListItem[]> {
        const output = await this.runSfCommand([
            'org',
            'list',
            'metadata',
            '--metadata-type',
            metadataType,
            '--target-org',
            targetOrg,
            '--json',
            ...(folder ? ['--folder', folder] : [])
        ]);

        const parsed = JSON.parse(output) as SfMetadataListResult;

        return [...new Map((parsed.result ?? []).map(item => [item.fullName, item])).values()]
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
        return this.retrieveMetadataFormat(targetOrg, 'PermissionSet', permissionSetName, cwd, targetMetadataDir);
    }

    public async retrieveMetadataFormat(targetOrg: string, type: string, name: string, cwd: string, targetMetadataDir: string): Promise<string> {
        return this.runSfCommand([
            'project',
            'retrieve',
            'start',
            '--metadata',
            `${type}:${name}`,
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

        return this.queue.run(() => this.runProcess(executable, args, cwd));
    }

    private runProcess(executable: string, args: string[], cwd?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const child = spawn(executable, args, { cwd, timeout: 10 * 60 * 1000, windowsHide: true });
            let stdout = '', stderr = '', bytes = 0;
            const collect = (chunk: string, error: boolean): void => {
                bytes += Buffer.byteLength(chunk);
                if (bytes > 64 * 1024 * 1024) {
                    child.kill(); reject(new Error('Salesforce CLI output exceeded 64 MB.')); return;
                }
                if (error) { stderr += chunk; } else { stdout += chunk; }
            };
            child.stdout?.setEncoding('utf8').on('data', (chunk: string) => collect(chunk, false));
            child.stderr?.setEncoding('utf8').on('data', (chunk: string) => collect(chunk, true));
            child.once('error', error => { this.logCommandError(error.message); reject(error); });
            child.once('close', (code, signal) => {
                this.logCommandResult(stdout, stderr);
                if (code !== 0) {
                    const message = [stderr, stdout].filter(Boolean).join('\n') || `Salesforce CLI exited ${code ?? signal}`;
                    this.logCommandError(message); reject(new Error(message));
                } else { this.logCommandSuccess(); resolve(stdout); }
            });
        });
    }

    private logCommandResult(stdout: string, stderr: string): void {
        if (stdout) {
            this.cliOutputChannel.appendLine('--- stdout ---');
            this.cliOutputChannel.appendLine(stdout);
        }

        if (stderr) {
            this.cliOutputChannel.appendLine('--- stderr ---');
            this.cliOutputChannel.appendLine(stderr);
        }
    }

    private logCommandError(message: string): void {
        this.cliOutputChannel.appendLine('--- error ---');
        this.cliOutputChannel.appendLine(message);
        this.cliOutputChannel.show(true);
    }

    private logCommandSuccess(): void {
        this.cliOutputChannel.appendLine('--- success ---');
        this.cliOutputChannel.appendLine('');
    }

    private formatArg(arg: string): string {
        return formatCliArgument(arg);
    }

    private getSfExecutableName(): string {
        return process.platform === 'win32' ? 'sf.cmd' : 'sf';
    }
}
