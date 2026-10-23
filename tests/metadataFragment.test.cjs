const test=require('node:test');
const assert=require('node:assert/strict');
const {extractFragment,mergeFragment,fieldDocument}=require('../out/salesforce/metadataFragment');
for(const [indent,eol] of [['    ','\n'],['\t','\r\n']]){
    test(`field extraction removes parent indentation and preserves value whitespace (${JSON.stringify(indent)}, ${JSON.stringify(eol)})`,()=>{
        const lines=['<CustomObject>',`${indent}<fields>`,`${indent.repeat(2)}<fullName>Risk__c</fullName>`,
            `${indent.repeat(2)}<description>First line`,`${indent.repeat(3)}keep these spaces &amp; entity`,`${indent.repeat(2)}</description>`,
            `${indent.repeat(2)}<formula><![CDATA[IF(true,`,`${indent.repeat(3)}1, 0)]]></formula>`,
            `${indent.repeat(2)}<valueSet>`,`${indent.repeat(3)}<restricted>true</restricted>`,`${indent.repeat(2)}</valueSet>`,`${indent}</fields>`,'</CustomObject>'];
        const block=extractFragment(lines.join(eol),'CustomObject',[{tag:'fields',key:'fullName',name:'Risk__c'}]);
        const result=fieldDocument(block);
        assert.ok(result.includes(`${eol}${indent}<fullName>Risk__c</fullName>`));
        assert.ok(result.includes(`${eol}${indent}<valueSet>${eol}${indent.repeat(2)}<restricted>true</restricted>${eol}${indent}</valueSet>`));
        assert.ok(result.includes(`<description>First line${eol}${indent.repeat(3)}keep these spaces &amp; entity${eol}${indent.repeat(2)}</description>`));
        assert.ok(result.includes(`<![CDATA[IF(true,${eol}${indent.repeat(3)}1, 0)]]>`));
        assert.ok(result.endsWith(`${eol}</CustomField>${eol}`));
        if(eol==='\r\n')assert.doesNotMatch(result,/(?<!\r)\n/);
    });
}
test('individual field extraction produces one deployable CustomField without sibling or object data',()=>{
    const xml='<CustomObject><label>Whole object</label><fields><fullName>Industry</fullName><label>Industry &amp; Sector</label></fields><fields><fullName>Other__c</fullName></fields></CustomObject>';
    const block=extractFragment(xml,'CustomObject',[{tag:'fields',key:'fullName',name:'Industry'}]);
    const result=fieldDocument(block);
    assert.match(result,/<CustomField xmlns=/);assert.match(result,/<fullName>Industry<\/fullName>/);
    assert.doesNotMatch(result,/Other__c|Whole object|<fields>/);
    assert.match(result,/Industry &amp; Sector/);
    assert.throws(()=>extractFragment(xml,'CustomObject',[{tag:'fields',key:'fullName',name:'Id'}]),/did not return/);
});
test('nested child merge preserves unrelated XML, comments, CRLF, and local sibling values',()=>{
    const local='<Flow>\r\n<!-- untouched -->\r\n<screens><name>Main</name><fields><name>A</name><fieldText>old</fieldText></fields><fields><name>B</name><fieldText>local</fieldText></fields></screens>\r\n<label>Keep</label>\r\n</Flow>';
    const remote='<fields><name>A</name><fieldText>new</fieldText></fields>';
    const path=[{tag:'screens',key:'name',name:'Main'},{tag:'fields',key:'name',name:'A'}];
    const result=mergeFragment(local,remote,'Flow',path);
    assert.equal(result,local.replace('<fieldText>old</fieldText>','<fieldText>new</fieldText>'));
    assert.equal(mergeFragment(result,remote,'Flow',path),result);
});
test('fragment merge inserts only chosen missing keyed entry and refuses ambiguous or missing parents',()=>{
    const local='<Profile><fieldPermissions><field>Account.Name</field><readable>false</readable></fieldPermissions></Profile>';
    const block='<fieldPermissions><field>Account.Industry</field><readable>true</readable></fieldPermissions>';
    assert.match(mergeFragment(local,block,'Profile',[{tag:'fieldPermissions',key:'field',name:'Account.Industry'}]),/<readable>false/);
    assert.throws(()=>mergeFragment(local,block,'Profile',[{tag:'fieldPermissions',key:'field',name:'Wrong'}]),/does not match/);
    assert.throws(()=>extractFragment('<Flow><screens><name>A</name></screens><screens><name>A</name></screens></Flow>','Flow',[{tag:'screens',key:'name',name:'A'}]),/Ambiguous/);
    assert.throws(()=>mergeFragment('<Flow></Flow>','<fields><name>A</name></fields>','Flow',[{tag:'screens',key:'name',name:'Missing'},{tag:'fields',key:'name',name:'A'}]),/parent first/);
});
test('parsed component child selectors resolve and only replace the matching local entry',()=>{
    const {parseLayout,parseFlexiPage,parseCustomMetadata,parseApplication}=require('../out/metadata/parsers/componentParser');
    const cases=[
        ['Layout',parseLayout,'<Layout><layoutSections><label>Details</label><layoutColumns><layoutItems><field>Name</field><behavior>Required</behavior></layoutItems></layoutColumns></layoutSections><relatedLists><relatedList>Contacts</relatedList></relatedLists></Layout>'],
        ['FlexiPage',parseFlexiPage,'<FlexiPage><flexiPageRegions><name>main</name><itemInstances><componentInstance><componentName>c:panel</componentName><identifier>one</identifier></componentInstance></itemInstances><itemInstances><componentInstance><componentName>c:panel</componentName><identifier>two</identifier></componentInstance></itemInstances></flexiPageRegions></FlexiPage>'],
        ['CustomMetadata',parseCustomMetadata,'<CustomMetadata><values><field>Code__c</field><value>001</value></values></CustomMetadata>'],
        ['CustomApplication',parseApplication,'<CustomApplication><tabs>standard-Account</tabs></CustomApplication>']
    ];
    let count=0;
    for(const [root,parse,xml] of cases){
        const walk=nodes=>{for(const node of nodes){
            if(node.fragment){const block=extractFragment(xml,root,node.fragment);assert.equal(mergeFragment(xml,block,root,node.fragment),xml);count++;}
            if(node.children)walk(node.children);
        }};
        walk(parse(xml));
    }
    assert.equal(count,8);
});
test('Lightning Page component selection follows identifier after local reordering',()=>{
    const {parseFlexiPage}=require('../out/metadata/parsers/componentParser');
    const item=(id,name)=>`<itemInstances><componentInstance><identifier>${id}</identifier><componentName>${name}</componentName></componentInstance></itemInstances>`;
    const wrap=content=>`<FlexiPage><flexiPageRegions><name>main</name>${content}</flexiPageRegions></FlexiPage>`;
    const remote=wrap(item('one','remote')+item('two','remote sibling'));
    const local=wrap(item('two','local sibling')+item('one','old'));
    const selector=parseFlexiPage(remote)[0].children[0].fragment;
    assert.equal(mergeFragment(local,extractFragment(remote,'FlexiPage',selector),'FlexiPage',selector),local.replace('<componentName>old</componentName>','<componentName>remote</componentName>'));
});
