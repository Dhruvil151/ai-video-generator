import fs from 'node:fs';
import crypto from 'node:crypto';
const icons=['redis','docker','react','javascript','typescript','nodedotjs'];
const registry={source:'Simple Icons',licenseReference:'https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md',
  note:'Third-party icon distribution. Trademark rights and brand guidelines remain separate. Other legacy TechLogos components are project approximations, not verified official assets.',
  icons:icons.map(name=>({name,file:'public/tech/'+name+'.svg',source:'https://github.com/simple-icons/simple-icons/blob/develop/icons/'+name+'.svg',
    sha256:crypto.createHash('sha256').update(fs.readFileSync('public/tech/'+name+'.svg')).digest('hex')}))};
fs.writeFileSync('assets/asset-registry.json',JSON.stringify(registry,null,2));
