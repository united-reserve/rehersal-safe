const { ethers } = require('ethers');
const d = require('@safe-global/safe-deployments');
(async () => {
const provider = new ethers.providers.JsonRpcProvider('https://2-31-103-209.sslip.io');
if ((await provider.getNetwork()).chainId !== 7311026) throw Error('Wrong chain');
const names = ['getSafeSingletonDeployment','getProxyFactoryDeployment','getCompatibilityFallbackHandlerDeployment','getMultiSendDeployment','getMultiSendCallOnlyDeployment'];
const records=[];
for(const name of names){const main=d[name]({network:'1',version:'1.4.1'}); const fork=d[name]({network:'7311026',version:'1.4.1'});
if(!main || !fork || main.defaultAddress!==fork.defaultAddress)throw Error('Deployment mismatch '+name);
const code=await provider.getCode(fork.defaultAddress); if(code==='0x')throw Error('Missing code '+name);
const hash=ethers.utils.keccak256(code); const expected=Object.values(main.deployments||{}).find(x=>x.address.toLowerCase()===main.defaultAddress.toLowerCase())?.codeHash;
if(expected && hash!==expected)throw Error('Code hash mismatch '+name);
records.push({name,address:fork.defaultAddress,codeHash:hash,registryHashMatched:!!expected});}
const safe=d.getSafeSingletonDeployment({network:'7311026',version:'1.4.1'});
const factory=d.getProxyFactoryDeployment({network:'7311026',version:'1.4.1'});
const fallback=d.getCompatibilityFallbackHandlerDeployment({network:'7311026',version:'1.4.1'});
const owner='0x9868e745B21D1976Cc8531fa48bEEB2416707A13';
const setup=new ethers.utils.Interface(safe.abi).encodeFunctionData('setup',[[owner],1,ethers.constants.AddressZero,'0x',fallback.defaultAddress,ethers.constants.AddressZero,0,ethers.constants.AddressZero]);
const data=new ethers.utils.Interface(factory.abi).encodeFunctionData('createProxyWithNonce',[safe.defaultAddress,setup,Date.now()]);
const result=await provider.call({to:factory.defaultAddress,data,from:owner});
console.log(JSON.stringify({chainId:7311026,records,creationSimulation:result},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
