import type { ChainInfo } from '@safe-global/safe-gateway-typescript-sdk'
export const REHEARSAL_CHAIN_ID = '7311026'
const rpc = { authentication: 'NO_AUTHENTICATION', value: 'https://2-31-103-209.sslip.io' }
export const getChainsConfig = (): ChainInfo[] => [
  {
    chainId: REHEARSAL_CHAIN_ID,
    chainName: 'United Reserve Rehearsal',
    description: 'Mainnet fork · test ETH only',
    chainLogoUri: null,
    l2: false,
    isTestnet: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18, logoUri: '/images/chains/1.png' },
    transactionService: '',
    blockExplorerUriTemplate: { address: '', txHash: '', api: '' },
    disabledWallets: [],
    ensRegistryAddress: undefined,
    features: ['CONTRACT_INTERACTION', 'EIP1271', 'EIP1559', 'ERC721', 'SAFE_TX_GAS_OPTIONAL'],
    gasPrice: [],
    publicRpcUri: rpc,
    rpcUri: rpc,
    safeAppsRpcUri: rpc,
    shortName: 'rehersal',
    theme: { textColor: '#242820', backgroundColor: '#f4f2eb' },
  } as ChainInfo,
]
export default getChainsConfig
