const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const spawn=require('cross-spawn');
const {formatCliArgument}=require('../out/salesforce/cliArgument');
test('Windows cmd wrapper preserves encoded names and treats shell characters as literal arguments',{skip:process.platform!=='win32'},async()=>{
    const temp=await fs.mkdtemp(path.join(os.tmpdir(),'better-org-args-'));
    try {
        await fs.writeFile(path.join(temp,'echo.cjs'),'process.stdout.write(JSON.stringify(process.argv.slice(2)));');
        await fs.writeFile(path.join(temp,'sf.cmd'),`@echo off\r\n"${process.execPath}" "%~dp0echo.cjs" %*\r\n`);
        assert.throws(()=>formatCliArgument('quote" & echo INJECTED & rem "'),/Double quotes/);
        const args=['Layout:Account-Account %28Marketing%29 Layout','Sales & Support','%PATH%','!PATH!','pipe | < > ^'];
        const result=spawn.sync(path.join(temp,'sf.cmd'),args,{encoding:'utf8',windowsHide:true});
        assert.equal(result.status,0,result.stderr); assert.deepEqual(JSON.parse(result.stdout),args);
    } finally { await fs.rm(temp,{recursive:true,force:true}); }
});
