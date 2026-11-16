import { createOnboard } from './onboard'
import getChainsConfig from '@/config/supportedChains'
import Onboard from '@web3-onboard/core'
jest.mock('@web3-onboard/core', () => ({ __esModule: true, default: jest.fn(() => ({})) }))
jest.mock('@/hooks/wallets/wallets', () => ({ getAllWallets: () => [], getRecommendedInjectedWallets: () => [] }))
it('initializes wallet connection without an explorer on the rehearsal fork', () => {
  const configs = getChainsConfig()
  expect(() => createOnboard(configs, configs[0], { '7311026': configs[0].publicRpcUri.value })).not.toThrow()
  expect(Onboard).toHaveBeenCalledWith(
    expect.objectContaining({
      chains: [expect.objectContaining({ publicRpcUrl: 'https://2-31-103-209.sslip.io', blockExplorerUrl: undefined })],
    }),
  )
})
