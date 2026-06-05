export interface PackageXmlMember {
    type: string;
    member: string;
}

export class PackageXmlBuilder {
    private readonly selections = new Map<string, Set<string>>();

    add(type: string, member: string): void {
        if (!this.selections.has(type)) {
            this.selections.set(type, new Set<string>());
        }

        this.selections.get(type)?.add(member);
    }

    clear(): void {
        this.selections.clear();
    }

    getCount(): number {
        return [...this.selections.values()]
            .reduce((count, members) => count + members.size, 0);
    }

    build(apiVersion = '66.0'): string {
        const typeBlocks = [...this.selections.entries()]
            .sort(([typeA], [typeB]) => typeA.localeCompare(typeB))
            .map(([type, members]) => {
                const memberLines = [...members]
                    .sort((a, b) => a.localeCompare(b))
                    .map((member) => `        <members>${this.escapeXml(member)}</members>`)
                    .join('\n');

                return [
                    '    <types>',
                    memberLines,
                    `        <name>${this.escapeXml(type)}</name>`,
                    '    </types>'
                ].join('\n');
            })
            .join('\n');

        return [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<Package xmlns="http://soap.sforce.com/2006/04/metadata">',
            typeBlocks,
            `    <version>${apiVersion}</version>`,
            '</Package>'
        ].filter(Boolean).join('\n');
    }

    private escapeXml(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}
