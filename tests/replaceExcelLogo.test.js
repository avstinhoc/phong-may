import test from 'node:test';
import assert from 'node:assert/strict';
import {detectTopLeftLogoTarget} from '../src/lib/replaceExcelLogo.js';
const rel='<Relationships><Relationship Id="rId7" Type="image" Target="../media/image1.png"/></Relationships>';
test('finds existing A1 image relationship while keeping Excel XML untouched',()=>{
 const drawing='<xdr:wsDr><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:row>0</xdr:row></xdr:from><xdr:pic><a:blip r:embed="rId7"/></xdr:pic></xdr:oneCellAnchor></xdr:wsDr>';
 assert.equal(detectTopLeftLogoTarget(drawing,rel),'xl/media/image1.png');
});
test('refuses images not anchored at A1',()=>{
 const drawing='<xdr:wsDr><xdr:oneCellAnchor><xdr:from><xdr:col>4</xdr:col><xdr:row>3</xdr:row></xdr:from><xdr:pic><a:blip r:embed="rId7"/></xdr:pic></xdr:oneCellAnchor></xdr:wsDr>';
 assert.equal(detectTopLeftLogoTarget(drawing,rel),null);
});
test('does not guess unsafe external media paths',()=>{
 const drawing='<xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:row>0</xdr:row></xdr:from><xdr:pic><a:blip r:embed="rId7"/></xdr:pic></xdr:oneCellAnchor>';
 assert.equal(detectTopLeftLogoTarget(drawing,'<Relationship Id="rId7" Target="https://example.com/file.png"/>'),null);
});
