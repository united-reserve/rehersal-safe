import { renderHook, waitFor } from '@/tests/test-utils'
import { useLoadTxHistory } from '../useLoadTxHistory'
import { HISTORY_FROM_BLOCK } from '@/config/constants'
import * as safeVersions from '@/utils/safe-versions'
import * as web3 from '@/hooks/wallets/web3'

const SAFE_ADDRESS = '0xad32ed6f41232970DEdeff94A99481EDEEde877c'

jest.mock('@/hooks/useSafeInfo', () =>
  jest.fn(() => ({ safe: { chainId: '7311026', version: '1.5.0' }, safeAddress: SAFE_ADDRESS })),
)

describe('useLoadTxHistory', () => {
  it('queries execution logs from the configured block', async () => {
    const queryFilter = jest.fn().mockResolvedValue([])
    jest.spyOn(web3, 'useMultiWeb3ReadOnly').mockReturnValue({} as ReturnType<typeof web3.useMultiWeb3ReadOnly>)
    jest.spyOn(safeVersions, 'getSafeContract').mockReturnValue({
      queryFilter,
      filters: { ExecutionSuccess: () => 'ExecutionSuccess' },
    } as unknown as ReturnType<typeof safeVersions.getSafeContract>)

    const { result } = renderHook(() => useLoadTxHistory())

    await waitFor(() => expect(result.current[0]).toEqual({}))
    expect(HISTORY_FROM_BLOCK).toBe(26441533)
    expect(queryFilter).toHaveBeenCalledWith('ExecutionSuccess', HISTORY_FROM_BLOCK, 'latest')
    expect(result.current[1]).toBeUndefined()
  })
})
