const test = require('node:test');
const assert = require('node:assert/strict');
const { PackageXmlBuilder } = require('../out/packageXml/packageXmlBuilder');
const { metadataPath, objectMember } = require('../out/metadata/metadataModel');
const { parseXml, array } = require('../out/metadata/parsers/xml');
const { parsePermissionSet, permissionSections } = require('../out/metadata/parsers/permissionSetParser');
const { parseCustomObject } = require('../out/metadata/parsers/customObjectParser');
const { parseFlow } = require('../out/metadata/parsers/flowParser');
const { parseFieldPermissions, parseObjectPermissions } = require('../out/salesforce/permissionSetParser');
const { findXmlBlockByChildValue: find, mergeXmlBlockByChildValue: merge } = require('../out/salesforce/permissionSetMerge');
const { SessionCache } = require('../out/cache/sessionCache');
const { TaskQueue } = require('../out/cache/taskQueue');
const { formatCliArgument } = require('../out/salesforce/cliArgument');
const { buildRetrieveSummary } = require('../out/salesforce/retrieveResultFormatter');
const wrap = value => `<PermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">\n${value}\n</PermissionSet>\n`;
const field = (name, readable='true') => `<fieldPermissions><editable>false</editable><field>${name}</field><readable>${readable}</readable></fieldPermissions>`;

test('package.xml escapes, sorts, deduplicates and persists valid selections', () => {
    const builder = new PackageXmlBuilder();
    builder.add('Flow', 'Z'); builder.add('ApexClass', 'A&B'); builder.add('Flow','Z');
    builder.add('CustomField', 'Account.X__c');
    assert.equal(builder.getCount(),3);
    const xml = builder.build();
    assert.match(xml, /A&amp;B/); assert.ok(xml.indexOf('ApexClass') < xml.indexOf('Flow'));
    const other = new PackageXmlBuilder(); other.replaceSelections(builder.getSelections());
    assert.equal(other.build(), xml); assert.equal(other.remove('Flow','Z'),true);
    other.clear(); assert.equal(other.getCount(),0);
});
test('full paths retain component and semantic ancestors but omit folders', () => {
    const root = {kind:'root', label:'Flows'};
    const flow = {kind:'Flow', name:'Automation', label:'Automation',parent:root};
    const section = {kind:'section',label:'Screens',parent:flow};
    const screen = {kind:'Screen',name:'Details',label:'Customer Details',parent:section};
    assert.equal(metadataPath({kind:'Component',name:'Email',label:'Email',parent:screen}), 'Flow: Automation > Screen: Details > Component: Email');
    assert.equal(metadataPath(section),'Flow: Automation > Screens');
    assert.deepEqual(objectMember('ValidationRule','Account','Required'),{type:'ValidationRule',member:'Account.Required'});
});
test('XML normalizes namespace, singleton, repeated, entities and empty values', () => {
    const data = parseXml('<m:Flow xmlns:m="urn:test"><m:variables><m:name>A&amp;B</m:name></m:variables><m:label/><m:status>001</m:status></m:Flow>', 'Flow');
    assert.equal(array(data.variables).length,1); assert.equal(data.variables.name,'A&B');
    assert.equal(data.label,''); assert.equal(data.status,'001'); assert.deepEqual(array(undefined),[]);
    assert.equal(array(parseXml('<Flow><variables/><variables/></Flow>','Flow').variables).length,2);
    assert.throws(()=>parseXml('<Flow><broken></Flow>','Flow'),/Invalid/);
    assert.throws(()=>parseXml('<!DOCTYPE Flow><Flow/>','Flow'),/DTD/);
    assert.throws(()=>parseXml('<Profile/>','Flow'),/Expected Flow/);
});
test('all supported permission sections have keyed sync entries and meaningful flags', () => {
    const xml = wrap(permissionSections.map(([section,,key])=>`<${section}><${key}>A&amp;B</${key}><enabled>false</enabled></${section}>`).join(''));
    const result = parsePermissionSet(xml);
    assert.equal(result.length,12);
    for (const section of result) {
        const entry = section.children[0];
        assert.equal(entry.name,'A&B'); assert.equal(entry.sync.name,'A&B');
        assert.equal(entry.children[0].description,'No'); assert.equal(entry.manifest,undefined);
    }
    assert.deepEqual(parsePermissionSet('<PermissionSet/>'),[]);
});
test('legacy field/object parser interfaces support namespace and false flags', () => {
    assert.deepEqual(parseFieldPermissions(wrap(field('Account.A__c'))),[{field:'Account.A__c',readable:true,editable:false}]);
    const result = parseObjectPermissions('<m:PermissionSet xmlns:m="urn:x"><m:objectPermissions><m:object>Account</m:object><m:allowRead>true</m:allowRead></m:objectPermissions></m:PermissionSet>');
    assert.equal(result[0].allowRead,true); assert.equal(result[0].allowEdit,false);
});
test('profile sections are browsable without Permission Set sync capability', () => {
    const parsed = parsePermissionSet('<Profile><classAccesses><apexClass>A</apexClass><enabled>true</enabled></classAccesses><tabVisibilities><tab>Account</tab><visibility>DefaultOn</visibility></tabVisibilities></Profile>','Profile');
    assert.equal(parsed.length,2); assert.equal(parsed[0].children[0].sync,undefined);
});
test('object parser derives independent members and inspectable search layouts', () => {
    const parsed = parseCustomObject('<CustomObject><validationRules><fullName>Required</fullName><active>true</active></validationRules><recordTypes><fullName>Business</fullName><label>Business Account</label></recordTypes><indexes><fullName>Index1</fullName></indexes><searchLayouts><searchResultsAdditionalFields>Name</searchResultsAdditionalFields></searchLayouts></CustomObject>','Account');
    assert.deepEqual(parsed.find(s=>s.label==='Validation Rules').children[0].manifest,{type:'ValidationRule',member:'Account.Required'});
    assert.equal(parsed.find(s=>s.label==='Record Types').children[0].label,'Business Account');
    assert.equal(parsed.find(s=>s.label==='Indexes').children[0].manifest,undefined);
    assert.ok(parsed.find(s=>s.kind==='SearchLayouts').details);
});
test('Flow screens, nested components, decision rules, actions and start are semantic only', () => {
    const flow = parseFlow('<Flow><screens><name>Details</name><label>Customer Details</label><fields><name>Section</name><fields><name>Email</name><fieldType>InputField</fieldType></fields></fields></screens><decisions><name>Check</name><rules><name>Valid</name></rules></decisions><actionCalls><name>Invoke</name><actionType>apex</actionType></actionCalls><actionCalls><name>Email</name><actionType>emailSimple</actionType></actionCalls><start><object>Account</object></start></Flow>');
    const screen = flow.find(s=>s.label==='Screens').children[0];
    assert.equal(screen.label,'Customer Details');
    assert.equal(screen.children[0].children[0].children[0].children[0].name,'Email');
    assert.equal(flow.find(s=>s.label==='Decisions').children[0].children[0].children[0].kind,'Rule');
    assert.ok(flow.find(s=>s.label==='Apex / Invocable Actions'));
    assert.ok(flow.find(s=>s.label==='Other Actions'));
    function visit(node) { assert.equal(node.manifest,undefined); for(const child of node.children??[])visit(child); }
    flow.forEach(visit);
});
test('single-entry merge is idempotent, stable and preserves unrelated XML', () => {
    const unrelated = '    <!-- Keep this comment -->\n    <label>Trimmed &amp; Safe</label>\n    <objectPermissions><object>Account</object><allowRead>true</allowRead></objectPermissions>';
    const local = wrap(`    ${field('Account.A__c')}\n    ${field('Account.Z__c')}\n${unrelated}`);
    const result = merge(local,field('Account.M__c'),'fieldPermissions','field','Account.M__c');
    assert.ok(result.includes(unrelated));
    assert.ok(result.indexOf('Account.A__c') < result.indexOf('Account.M__c'));
    assert.ok(result.indexOf('Account.M__c') < result.indexOf('Account.Z__c'));
    assert.equal(merge(result,field('Account.M__c'),'fieldPermissions','field','Account.M__c'),result);
    assert.equal(parseFieldPermissions(result).length,3);
    assert.equal(parseFieldPermissions(merge(result,field('Account.M__c','false'),'fieldPermissions','field','Account.M__c'))[1].readable,false);
});
test('merge supports namespaced entries, CRLF, escaped keys and ignores fake tags in comments', () => {
    const remote = '<p:PermissionSet xmlns:p="urn:x"><!-- <classAccesses><apexClass>Wrong</apexClass></classAccesses> --><p:classAccesses><p:apexClass>A&amp;B</p:apexClass><p:enabled>true</p:enabled></p:classAccesses></p:PermissionSet>';
    assert.equal(find(remote,'classAccesses','apexClass','Wrong'),undefined);
    const block = find(remote,'classAccesses','apexClass','A&B'); assert.ok(block);
    const local = '<p:PermissionSet xmlns:p="urn:x">\r\n    <p:label>Local</p:label>\r\n</p:PermissionSet>\r\n';
    const merged = merge(local,block,'classAccesses','apexClass','A&B');
    assert.ok(merged.includes('<p:classAccesses>')); assert.equal(merged.replace(/\r\n/g,'').includes('\n'),false);
    assert.equal(parsePermissionSet(merged)[0].children[0].name,'A&B');
    assert.equal(merge(merged,block,'classAccesses','apexClass','A&B'),merged);
});
test('merge refuses malformed, duplicate or mismatched permission input', () => {
    assert.throws(()=>merge(wrap(field('A')+field('A')),field('A'),'fieldPermissions','field','A'),/duplicate/);
    assert.throws(()=>merge(wrap(''),field('B'),'fieldPermissions','field','A'),/match/);
    assert.throws(()=>merge('<PermissionSet>',field('A'),'fieldPermissions','field','A'),/Invalid/);
});
test('cache coalesces concurrent requests and retries failures', async () => {
    let count=0; const cache=new SessionCache();
    const load=async()=>{count++;return 7;};
    assert.deepEqual(await Promise.all([cache.get('a',load),cache.get('a',load)]),[7,7]); assert.equal(count,1);
    cache.clear(); await cache.get('a',load); assert.equal(count,2);
    await assert.rejects(cache.get('b',async()=>{throw new Error('failed');}));
    assert.equal(await cache.get('b',load),7);
});
test('refresh cannot let an old failing promise evict new cache work', async () => {
    const cache=new SessionCache(); let reject;
    const old=cache.get('key',()=>new Promise((_,r)=>{reject=r;}));
    await Promise.resolve(); cache.clear();
    const fresh=cache.get('key',async()=>42); reject(new Error('old'));
    await assert.rejects(old); assert.equal(await fresh,42);
    assert.equal(await cache.get('key',async()=>99),42);
});
test('retrieve summary does not report explicit failures as success', () => {
    assert.equal(buildRetrieveSummary({status:0,result:{success:false,done:true}}).success,false);
    assert.equal(buildRetrieveSummary({status:0,result:{done:false}}).success,false);
});
test('CLI queue limits concurrent work and releases a slot after rejection', async () => {
    const queue = new TaskQueue(2); let active=0, peak=0;
    const results=await Promise.allSettled(Array.from({length:8},(_,i)=>queue.run(async()=>{
        active++; peak=Math.max(peak,active);
        await new Promise(resolve=>setImmediate(resolve)); active--;
        if(i===2)throw new Error('retryable'); return i;
    })));
    assert.equal(peak,2); assert.equal(results.filter(r=>r.status==='rejected').length,1);
    assert.equal(await queue.run(async()=>42),42);
});
test('CLI log formatting preserves encoded metadata names and rejects control characters',()=>{
    assert.equal(formatCliArgument('Layout:Account-Account %28Marketing%29 Layout'),'"Layout:Account-Account %28Marketing%29 Layout"');
    assert.equal(JSON.parse(formatCliArgument('Literal | < > ^ % ! characters')),'Literal | < > ^ % ! characters');
    for(const value of ['line\nbreak','line\rbreak','nul\0byte']) {
        assert.throws(()=>formatCliArgument(value),/not valid/);
    }
});
