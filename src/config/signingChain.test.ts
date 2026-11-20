import { initialState } from '@/store/settingsSlice'
import { getChainsConfig } from './supportedChains'
describe('signing network configuration', () => {
  it('only exposes Ethereum mainnet and its public RPC', () => {
    const chains = getChainsConfig()
    expect(initialState.env.rpc['1']).toBe('https://ethereum-rpc.publicnode.com')
    expect(chains).toHaveLength(1)
    expect(chains[0].chainId).toBe('1')
    expect(chains[0].shortName).toBe('eth')
    expect(chains[0].publicRpcUri.value).toBe('https://ethereum-rpc.publicnode.com')
    expect(chains[0].transactionService).toBe('')
    expect(chains[0].l2).toBe(false)
  })
})
