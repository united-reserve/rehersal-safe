import { act, fireEvent, render } from '@/tests/test-utils'
import SingleTx from '@/pages/transactions/tx'
import * as extractTxInfo from '@/services/tx/extractTxInfo'
import * as useSafeInfo from '@/hooks/useSafeInfo'
import * as addedTxsSlice from '@/store/addedTxsSlice'
import type { SafeInfo } from '@safe-global/safe-gateway-typescript-sdk'
import { OperationType, type SafeTransaction } from '@safe-global/safe-core-sdk-types'
import EthSafeTransaction from '@safe-global/protocol-kit/dist/src/utils/transactions/SafeTransaction'
import type { EternalSafeTransaction } from '@/store/addedTxsSlice'
import type { TransactionDetails } from '@/utils/transaction-guards'

const SAFE_ADDRESS = '0x87a57cBf742CC1Fc702D0E9BF595b1E056693e2f'

// Minimum mock to render <SingleTx />
const txDetails = {
  txId: 'multisig_0x87a57cBf742CC1Fc702D0E9BF595b1E056693e2f_0x236da79434c398bf98b204e6f3d93d',
  safeAddress: SAFE_ADDRESS,
  txInfo: {
    type: 'Custom',
    to: {
      value: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
    },
  },
} as unknown as TransactionDetails

jest.mock('next/router', () => ({
  useRouter() {
    return {
      pathname: '/transactions/tx',
      query: {
        safe: `gor:${SAFE_ADDRESS}`,
        id: 'multisig_0x87a57cBf742CC1Fc702D0E9BF595b1E056693e2f_0x236da79434c398bf98b204e6f3d93d',
      },
    }
  },
}))

jest
  .spyOn(addedTxsSlice, 'selectAddedTx')
  .mockImplementation((state: any, chainId: string, safeAddress: string, txKey: string) => {
    return new EthSafeTransaction({
      data: '0x',
      baseGas: '21000',
      gasPrice: '10000000000',
      safeTxGas: '11000',
      gasToken: '0x0000000000000000000000000000000000000000',
      nonce: 0,
      refundReceiver: '0x1234567890123456789012345678901234567890',
      value: '1000000000000000000',
      to: '0x1234567890123456789012345678901234567890',
      operation: OperationType.Call,
    }) as unknown as EternalSafeTransaction
  })

jest
  .spyOn(extractTxInfo, 'extractTxDetails')
  .mockImplementation((safeAddress: string, safeTx: SafeTransaction, safe: SafeInfo, txId?: string) => {
    return Promise.resolve(txDetails)
  })

jest.spyOn(useSafeInfo, 'default').mockImplementation(() => ({
  safeAddress: SAFE_ADDRESS,
  safe: {
    chainId: '5',
  } as SafeInfo,
  safeError: undefined,
  safeLoading: false,
  safeLoaded: true,
}))

describe('SingleTx', () => {
  it('renders <SingleTx />', async () => {
    const screen = render(<SingleTx />)

    const button = screen.queryByText('Details')
    expect(button).not.toBeInTheDocument()

    expect(await screen.findByText('Contract interaction')).toBeInTheDocument()
  })

  it('shows an error when the transaction has failed to load', async () => {
    jest
      .spyOn(extractTxInfo, 'extractTxDetails')
      .mockImplementation((safeAddress: string, safeTx: SafeTransaction, safe: SafeInfo, txId?: string) => {
        return Promise.reject(new Error('Extract error'))
      })

    const screen = render(<SingleTx />)

    expect(await screen.findByText('Failed to load transaction')).toBeInTheDocument()

    const button = screen.getByText('Details')
    fireEvent.click(button!)

    expect(screen.getByText('Extract error')).toBeInTheDocument()
  })

  it('keeps the latest transaction details when an earlier load resolves last', async () => {
    let resolveStale: (details: TransactionDetails) => void = () => {}
    const signedDetails = {
      ...txDetails,
      txInfo: { ...txDetails.txInfo, methodName: 'signedVersion' },
    } as unknown as TransactionDetails
    const staleDetails = {
      ...txDetails,
      txInfo: { ...txDetails.txInfo, methodName: 'staleVersion' },
    } as unknown as TransactionDetails

    jest
      .spyOn(extractTxInfo, 'extractTxDetails')
      .mockImplementation(() => Promise.resolve(signedDetails))
      .mockImplementationOnce(() => new Promise((resolve) => (resolveStale = resolve)))

    const storedTx = addedTxsSlice.selectAddedTx({} as any, '5', SAFE_ADDRESS, '')
    jest.spyOn(addedTxsSlice, 'selectAddedTx').mockReturnValue(storedTx)

    // A Safe info poll hands the effect a new object, starting a second load
    const polls = [{ chainId: '5' } as SafeInfo, { chainId: '5' } as SafeInfo]
    let poll = 0
    jest.spyOn(useSafeInfo, 'default').mockImplementation(() => ({
      safeAddress: SAFE_ADDRESS,
      safe: polls[poll],
      safeError: undefined,
      safeLoading: false,
      safeLoaded: true,
    }))

    const screen = render(<SingleTx />)
    poll = 1
    screen.rerender(<SingleTx />)

    expect(await screen.findByText('signedVersion')).toBeInTheDocument()

    await act(async () => resolveStale(staleDetails))

    expect(screen.queryByText('staleVersion')).not.toBeInTheDocument()
    expect(screen.getByText('signedVersion')).toBeInTheDocument()
  })
})
