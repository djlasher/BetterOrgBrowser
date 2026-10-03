// Opt-in live checks. Reads the selected org; all source writes stay in a new
// temporary SFDX project. Never deploys or changes existing user workspaces.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
async function main() {
    if (!process.env.BOB_TEST_ORG) throw new Error('Set BOB_TEST_ORG to an authenticated test org alias.');
    let executable=process.env.CODE_EXECUTABLE;
    if(!executable && process.platform==='win32') {
        const cli=execFileSync('where.exe',['code.cmd'],{encoding:'utf8'}).trim().split(/\r?\n/)[0];
        executable=path.join(path.dirname(cli),'..','Code.exe');
    }
    if(!executable)throw new Error('Set CODE_EXECUTABLE to the VS Code desktop executable.');
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'better-org-host-test-'));
    const project=path.join(temporary,'qa project with spaces');
    const report=process.env.BOB_TEST_REPORT || path.join(temporary,'report.json');
    try {
        await fs.mkdir(path.join(project,'force-app','main','default','permissionsets'),{recursive:true});
        await fs.writeFile(path.join(project,'sfdx-project.json'),JSON.stringify({packageDirectories:[{path:'force-app',default:true}],namespace:'',sourceApiVersion:process.env.BOB_TEST_API_VERSION||'66.0'}));
        const profile=path.join(temporary,'profile');
        await fs.mkdir(path.join(profile,'User'),{recursive:true});
        await fs.writeFile(path.join(profile,'User','settings.json'),JSON.stringify({'update.mode':'none','extensions.autoUpdate':false,'git.enabled':false,'telemetry.telemetryLevel':'off'}));
        const env={...process.env,SF_DISABLE_LOG_FILE:'true',BOB_TEST_REPORT:report};
        delete env.ELECTRON_RUN_AS_NODE;
        const child=spawn(executable,[`--extensionDevelopmentPath=${path.resolve(__dirname,'..')}`,`--extensionTestsPath=${path.join(__dirname,'host','index.cjs')}`,
            `--user-data-dir=${profile}`,`--extensions-dir=${path.join(temporary,'extensions')}`,'--disable-extensions','--disable-workspace-trust','--skip-welcome','--skip-release-notes','--new-window',project],
            {env,stdio:'inherit',windowsHide:true});
        const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});
        let result;
        try { result=JSON.parse(await fs.readFile(report,'utf8')); console.log(JSON.stringify(result,null,2)); }
        catch { throw new Error(`No host test report was produced (VS Code exit ${code}).`); }
        if(code!==0 || result.errors.length)throw new Error(`Extension host tests failed (${result.errors.length} checks).`);
    } finally { await fs.rm(temporary,{recursive:true,force:true}); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
