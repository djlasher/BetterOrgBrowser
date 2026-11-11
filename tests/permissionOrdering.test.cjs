const test=require('node:test');
const assert=require('node:assert/strict');
const {mergeFieldPermissionBlock,parseFieldPermissions}=require('../out/salesforce/permissionSetParser');
const {mergeXmlBlockByChildValue}=require('../out/salesforce/permissionSetMerge');
const field=(name,readable='true')=>`<fieldPermissions><editable>false</editable><field>${name}</field><readable>${readable}</readable></fieldPermissions>`;
const wrap=body=>`<PermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">\n${body}\n</PermissionSet>\n`;
for(const eol of ['\n','\r\n'])test(`resync repairs a moved field and the blank gap (${JSON.stringify(eol)})`,()=>{
    const override='Case.High_Risk_Override__c',reason='Case.High_Risk_Reason__c';
    const object='<objectPermissions><object>Case</object><allowRead>true</allowRead></objectPermissions>';
    const local=wrap(`    <label>Local</label>\n    ${field(reason,'false')}\n\n\n    ${object}\n    ${field(override)}\n\n`).replace(/\n/g,eol);
    const fixed=mergeFieldPermissionBlock(local,field(override),override);
    assert.ok(fixed.indexOf(override)<fixed.indexOf(reason));
    assert.ok(fixed.indexOf(reason)<fixed.indexOf('<objectPermissions>'));
    assert.ok(fixed.includes(object));
    assert.equal(parseFieldPermissions(fixed).find(f=>f.field===reason).readable,false,'untargeted local value preserved');
    assert.doesNotMatch(fixed,/\n[\t \r]*\n/);
    assert.equal(mergeFieldPermissionBlock(fixed,field(override),override),fixed);
    if(eol==='\r\n')assert.equal(fixed.replace(/\r\n/g,'').includes('\n'),false);
});
test('sync sorts all entries in an already disordered section, including insertions',()=>{
    const local=wrap(`    ${field('Case.Z__c')}\n    ${field('Case.A__c')}`);
    const fixed=mergeFieldPermissionBlock(local,field('Case.M__c'),'Case.M__c');
    assert.ok(fixed.indexOf('Case.A__c')<fixed.indexOf('Case.M__c'));
    assert.ok(fixed.indexOf('Case.M__c')<fixed.indexOf('Case.Z__c'));
});
test('repair preserves comments and intentional whitespace inside other XML values',()=>{
    const description='<description>First line\n\nSecond line</description>';
    const comment='<!-- Keep this\n\ncomment -->';
    const local=wrap(`    ${field('Case.Z__c')}\n    ${description}\n    ${comment}\n    ${field('Case.A__c')}`);
    const fixed=mergeFieldPermissionBlock(local,field('Case.A__c'),'Case.A__c');
    assert.ok(fixed.includes(description));assert.ok(fixed.includes(comment));
    assert.ok(fixed.indexOf('Case.A__c')<fixed.indexOf('Case.Z__c'));
});
test('object permission resync also repairs section order without importing remote siblings',()=>{
    const block=name=>`<objectPermissions><object>${name}</object><allowRead>true</allowRead></objectPermissions>`;
    const local=wrap(`    ${block('Contact')}\n\n    <tabSettings><tab>Case</tab><visibility>Visible</visibility></tabSettings>\n    ${block('Account')}`);
    const fixed=mergeXmlBlockByChildValue(local,block('Account'),'objectPermissions','object','Account');
    assert.ok(fixed.indexOf('<object>Account')<fixed.indexOf('<object>Contact'));
    assert.ok(fixed.indexOf('<object>Contact')<fixed.indexOf('<tabSettings>'));
});

for (const [indent, eol] of [['\t', '\r\n'], ['  ', '\n']]) test('large Permission Set keeps exact local indentation: '+JSON.stringify(indent),()=>{
    const name=i=>'Case.Field_'+String(i).padStart(5,'0')+'__c';
    const entry=(i, readable)=>[
        indent+'<fieldPermissions>',
        indent.repeat(2)+'<editable>false</editable>',
        indent.repeat(2)+'<field>'+name(i)+'</field>',
        indent.repeat(2)+'<readable>'+readable+'</readable>',
        indent+'</fieldPermissions>'
    ].join(eol);
    const names=Array.from({length:1850},(_,i)=>i);
    const build=entries=>['<PermissionSet>',indent+'<label>Local</label>',...entries,
        indent+'<description>First', '   intentional whitespace', '', 'Last</description>',
        indent+'<!-- untouched -->','</PermissionSet>',''].join(eol);
    const entries=names.map(i=>entry(i,false));
    const moved=entries.shift().replace(indent+'<fieldPermissions>','    <fieldPermissions>');
    const local=build([...entries,moved]);
    const expected=build(names.map(i=>entry(i,i===925)));
    assert.ok(local.split(eol).length>9000);
    const fixed=mergeFieldPermissionBlock(local,field(name(925)),name(925));
    assert.equal(fixed,expected);
    assert.equal(mergeFieldPermissionBlock(build(names.filter(i=>i!==925).map(i=>entry(i,false))),field(name(925)),name(925)),expected);
    assert.equal(mergeFieldPermissionBlock(fixed,field(name(925)),name(925)),expected);
});
