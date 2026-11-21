import type { ChainInfo } from '@safe-global/safe-gateway-typescript-sdk'
// The only network this page serves: Ethereum mainnet
export const SIGNING_CHAIN_ID = '1'
// The RPC the page reads the chain through. A build can supply its own; the public one is the fallback.
export const PUBLIC_RPC_URL = 'https://ethereum-rpc.publicnode.com'
export const SIGNING_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || PUBLIC_RPC_URL
const rpc = { authentication: 'NO_AUTHENTICATION', value: SIGNING_RPC_URL }
export const getChainsConfig = (): ChainInfo[] => [
  {
    chainId: SIGNING_CHAIN_ID,
    chainName: 'Ethereum',
    description: 'The main Ethereum network',
    chainLogoUri: null,
    l2: false,
    isTestnet: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18, logoUri: '/images/chains/1.png' },
    transactionService: '',
    blockExplorerUriTemplate: {
      address: 'https://etherscan.io/address/{{address}}',
      txHash: 'https://etherscan.io/tx/{{txHash}}',
      api: 'https://api.etherscan.io/api?module={{module}}&action={{action}}&address={{address}}&apiKey={{apiKey}}',
    },
    disabledWallets: [],
    ensRegistryAddress: undefined,
    features: ['CONTRACT_INTERACTION', 'EIP1271', 'EIP1559', 'ERC721', 'SAFE_TX_GAS_OPTIONAL'],
    gasPrice: [],
    publicRpcUri: rpc,
    rpcUri: rpc,
    safeAppsRpcUri: rpc,
    shortName: 'eth',
    theme: { textColor: '#242820', backgroundColor: '#f4f2eb' },
  } as ChainInfo,
]
export default getChainsConfig
