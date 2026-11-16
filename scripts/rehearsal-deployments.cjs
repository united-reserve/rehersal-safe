// Alias only deployment lookup metadata; transaction/signature chain ID stays 7311026.
const fs = require('fs'); const path = require('path');
const root = path.dirname(require.resolve('@safe-global/safe-deployments/package.json'));
let count = 0;
function visit(dir) { for (const name of fs.readdirSync(dir)) { const file = path.join(dir, name);
if (fs.statSync(file).isDirectory()) visit(file);
else if (name.endsWith('.json')) { const data = JSON.parse(fs.readFileSync(file, 'utf8'));
if (data.networkAddresses?.['1']) { data.networkAddresses['7311026'] = data.networkAddresses['1']; fs.writeFileSync(file, JSON.stringify(data)); count++; }
}}}
visit(path.join(root, 'dist/assets'));
if (!count) throw Error('Mainnet Safe deployment records missing');
console.log(`Registered ${count} mainnet deployment records for rehearsal`);
