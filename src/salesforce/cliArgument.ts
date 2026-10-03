/** Display only. cross-spawn receives the original argument array and owns
 * platform escaping; this representation must never be executed as a shell. */
export function formatCliArgument(arg: string): string {
    if (/[\0\r\n]/.test(arg)) { throw new Error('Line breaks and NUL are not valid Salesforce CLI arguments.'); }
    if (process.platform === 'win32' && /"/.test(arg)) { throw new Error('Double quotes are not supported in Windows Salesforce CLI arguments.'); }
    return JSON.stringify(arg);
}
