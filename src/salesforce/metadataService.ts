import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { SessionCache } from '../cache/sessionCache';
import { MetadataDefinition } from '../metadata/metadataRegistry';
import { OrgService, MetadataListItem, SObjectField } from './orgService';
import { projectRoot } from '../workspace/project';
export interface RemoteFile { path: string; content: string }
export class MetadataService implements vscode.Disposable {
    private readonly output = vscode.window.createOutputChannel('Better Org Browser Cache');
    private readonly lists = new SessionCache<MetadataListItem[]>(message => this.output.appendLine(message));
    private readonly describes = new SessionCache<SObjectField[]>(message => this.output.appendLine(message));
    private readonly files = new SessionCache<RemoteFile[]>(message => this.output.appendLine(message));
    constructor(readonly cli: OrgService) {}
    clear(): void { this.lists.clear(); this.describes.clear(); this.files.clear(); }
    dispose(): void { this.clear(); this.output.dispose(); }
    list(org: string, type: string, folder?: string): Promise<MetadataListItem[]> {
        return this.lists.get(JSON.stringify([org, type, folder]), () => this.cli.listMetadata(org, type, folder));
    }
    describe(org: string, name: string): Promise<SObjectField[]> {
        return this.describes.get(JSON.stringify([org, name]), () => this.cli.describeSObject(org, name));
    }
    remoteFiles(org: string, type: string, name: string): Promise<RemoteFile[]> {
        return this.files.get(JSON.stringify([org, type, name]), async () => {
            const root = await projectRoot();
            const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'better-org-browser-'));
            try {
                await this.cli.retrieveMetadataFormat(org, type, name, root.fsPath, temp);
                const result: RemoteFile[] = [];
                const walk = async (directory: string, depth: number): Promise<void> => {
                    if (depth > 24) { throw new Error('Retrieved metadata directory nesting exceeds safety limit.'); }
                    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
                        const file = path.join(directory, entry.name);
                        if (entry.isDirectory()) { await walk(file, depth + 1); }
                        else if (entry.isFile() && !entry.name.endsWith('.zip') && entry.name !== 'package.xml') {
                            result.push({ path: path.relative(temp, file).replace(/\\/g, '/'), content: await fs.readFile(file, 'utf8') });
                        }
                    }
                };
                await walk(temp, 0);
                return result.sort((a, b) => a.path.localeCompare(b.path));
            } finally { await fs.rm(temp, { recursive: true, force: true }); }
        });
    }
    async xml(org: string, definition: MetadataDefinition, name: string): Promise<string> {
        const files = await this.remoteFiles(org, definition.type, definition.singleton ? '*' : name);
        const file = files.find(f => f.path.endsWith(`/${name}${definition.suffix}`) || f.path.endsWith(`/${name}${definition.suffix}-meta.xml`));
        if (!file) { throw new Error(`No ${definition.type} XML returned for ${name}. Check CLI output and org access.`); }
        return file.content;
    }
}
