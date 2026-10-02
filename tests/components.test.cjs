const test = require('node:test');
const assert = require('node:assert/strict');
const {parseLayout,parseFlexiPage,parsePermissionSetGroup,parseCustomLabels,parseCustomMetadata} = require('../out/metadata/parsers/componentParser');
test('Layout sections expand through columns into fields and related lists',()=>{
    const result=parseLayout('<Layout><layoutSections><label>Details</label><layoutColumns><layoutItems><field>Name</field><behavior>Required</behavior></layoutItems></layoutColumns></layoutSections><relatedLists><relatedList>Contacts</relatedList></relatedLists></Layout>');
    assert.equal(result[0].children[0].children[0].name,'Name'); assert.equal(result[0].children[0].children[0].manifest,undefined);
    assert.equal(result[1].children[0].name,'Contacts');
});
test('FlexiPage components use identifiers when component names repeat',()=>{
    const result=parseFlexiPage('<FlexiPage><flexiPageRegions><name>main</name><itemInstances><componentInstance><componentName>c:panel</componentName><identifier>panel1</identifier></componentInstance></itemInstances><itemInstances><componentInstance><componentName>c:panel</componentName><identifier>panel2</identifier></componentInstance></itemInstances></flexiPageRegions></FlexiPage>');
    assert.deepEqual(result[0].children.map(n=>n.name),['panel1','panel2']);
});
test('group references and labels use real metadata types; record values are browse-only',()=>{
    assert.deepEqual(parsePermissionSetGroup('<PermissionSetGroup><permissionSets>Sales</permissionSets></PermissionSetGroup>')[0].manifest,{type:'PermissionSet',member:'Sales'});
    assert.equal(parseCustomLabels('<CustomLabels><labels><fullName>One</fullName><value>1</value></labels></CustomLabels>')[0].details.value,'1');
    const value=parseCustomMetadata('<CustomMetadata><values><field>Code__c</field><value>001</value></values></CustomMetadata>')[0];
    assert.equal(value.description,'001'); assert.equal(value.manifest,undefined);
});
