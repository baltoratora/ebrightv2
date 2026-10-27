import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
const bytes=readFileSync(new URL('../public/aether/shino-base.glb',import.meta.url));
const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
describe('bundled anime avatar',()=>{
 it('is a self-contained glTF 2 asset with a complete binary payload',()=>{expect(bytes.subarray(0,4).toString()).toBe('glTF');expect(bytes.readUInt32LE(4)).toBe(2);expect(bytes.readUInt32LE(8)).toBe(bytes.length);expect(json.buffers).toHaveLength(1);expect(json.buffers[0].uri).toBeUndefined();for(const image of json.images)expect(image.bufferView).toBeTypeOf('number');});
 it('retains the animated humanoid skeleton and fully clothed base',()=>{const names=json.nodes.map((n:{name?:string})=>n.name);for(const name of ['J_Bip_C_Head','J_Bip_L_UpperArm','J_Bip_R_UpperArm','J_Bip_L_UpperLeg','J_Bip_R_UpperLeg','J_Bip_R_Hand'])expect(names).toContain(name);expect(json.skins.length).toBeGreaterThan(0);const materials=json.materials.map((m:{name:string})=>m.name).join(' ');expect(materials).toContain('Tops');expect(materials).toContain('Bottoms');expect(materials).toContain('EyeIris');});
 it('keeps every mesh skinned and bounds-checks its buffers',()=>{for(const mesh of json.meshes)for(const p of mesh.primitives){expect(p.attributes.JOINTS_0).toBeTypeOf('number');expect(p.attributes.WEIGHTS_0).toBeTypeOf('number');expect(p.material).toBeLessThan(json.materials.length);}for(const v of json.bufferViews)expect((v.byteOffset??0)+v.byteLength).toBeLessThanOrEqual(json.buffers[0].byteLength);});
});
