import { array, object, parseXml, text } from '../metadata/parsers/xml';
import { findXmlBlockByChildValue, mergeXmlBlockByChildValue } from './permissionSetMerge';
export interface ObjectPermission {
    object: string; allowCreate: boolean; allowRead: boolean; allowEdit: boolean;
    allowDelete: boolean; viewAllRecords: boolean; modifyAllRecords: boolean;
}
export interface FieldPermission { field: string; readable: boolean; editable: boolean }
export function parseObjectPermissions(xml: string): ObjectPermission[] {
    return array(parseXml(xml, 'PermissionSet').objectPermissions).map(object).map(e => ({
        object: text(e.object), allowCreate: e.allowCreate === 'true', allowRead: e.allowRead === 'true',
        allowEdit: e.allowEdit === 'true', allowDelete: e.allowDelete === 'true',
        viewAllRecords: e.viewAllRecords === 'true', modifyAllRecords: e.modifyAllRecords === 'true'
    })).filter(e => e.object).sort((a, b) => a.object.localeCompare(b.object));
}
export function parseFieldPermissions(xml: string): FieldPermission[] {
    return array(parseXml(xml, 'PermissionSet').fieldPermissions).map(object).map(e => ({
        field: text(e.field), readable: e.readable === 'true', editable: e.editable === 'true'
    })).filter(e => e.field).sort((a, b) => a.field.localeCompare(b.field));
}
export const findObjectPermissionBlock = (xml: string, name: string): string | undefined => findXmlBlockByChildValue(xml, 'objectPermissions', 'object', name);
export const findFieldPermissionBlock = (xml: string, name: string): string | undefined => findXmlBlockByChildValue(xml, 'fieldPermissions', 'field', name);
export const mergeObjectPermissionBlock = (xml: string, block: string, name: string): string => mergeXmlBlockByChildValue(xml, block, 'objectPermissions', 'object', name);
export const mergeFieldPermissionBlock = (xml: string, block: string, name: string): string => mergeXmlBlockByChildValue(xml, block, 'fieldPermissions', 'field', name);
