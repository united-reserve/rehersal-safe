import { getChainsConfig } from './supportedChains'
import { getProxyFactoryDeployment, getSafeSingletonDeployment } from '@safe-global/safe-deployments'
describe('rehearsal network configuration', () => {
  it('only exposes the mainnet fork and its RPC', () => {
    const chains = getChainsConfig()
    expect(chains).toHaveLength(1)
    expect(chains[0].chainId).toBe('7311026')
    expect(chains[0].publicRpcUri.value).toBe('https://2-31-103-209.sslip.io')
    expect(chains[0].transactionService).toBe('')
    expect(chains[0].l2).toBe(false)
  })
  it('resolves canonical mainnet contracts using the actual fork ID', () => {
    for (const get of [getProxyFactoryDeployment, getSafeSingletonDeployment]) {
      expect(get({ network: '7311026', version: '1.4.1' })?.defaultAddress).toBe(
        get({ network: '1', version: '1.4.1' })?.defaultAddress,
      )
      expect(get({ network: '7311026', version: '1.4.1' })).toBeDefined()
    }
  })
})
