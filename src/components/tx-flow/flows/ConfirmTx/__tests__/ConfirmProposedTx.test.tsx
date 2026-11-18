import { useContext } from 'react'
import { _TypedDataEncoder } from 'ethers/lib/utils'
import type { SafeTransaction, SafeTransactionData } from '@safe-global/safe-core-sdk-types'
import type { SafeInfo, TransactionSummary } from '@safe-global/safe-gateway-typescript-sdk'
import { render, waitFor } from '@/tests/test-utils'
import SafeTxProvider, { SafeTxContext } from '@/components/tx-flow/SafeTxProvider'
import ConfirmProposedTx from '../ConfirmProposedTx'
import * as useSafeInfo from '@/hooks/useSafeInfo'
import type { TransactionDetails } from '@/utils/transaction-guards'
import { getEip712MessageTypes } from '@safe-global/protocol-kit/dist/src/utils'

const SAFE_ADDRESS = '0x87Ede19DAE5AD5829a8522a3c1CC1D9969bfeCD7'
const CHAIN_ID = 7311026
const SAFE_TX_HASH = '0x9ac920c0072fc073b8041bfd3ed30993a3cfe844f1ea95327dc5e9d7618af90a'
const ZERO = '0x0000000000000000000000000000000000000000'

// The queue already holds this nonce-0 transaction, so the next free nonce is 1
jest.mock('@/components/tx/SignOrExecuteForm/hooks', () => ({
  useRecommendedNonce: () => 1,
  useSafeTxGas: () => '50000',
}))

jest.mock('@/services/tx/tx-sender', () => {
  const create = (params: SafeTransactionData, nonce?: number) =>
    Promise.resolve({ data: nonce === undefined ? params : { ...params, nonce }, signatures: new Map() })
  return {
    createTx: jest.fn(create),
    createExistingTx: jest.fn((safeAddress: string, details: TransactionDetails) => {
      const { txParams } = jest.requireActual('@/services/tx/extractTxInfo').default(details, safeAddress)
      return create(txParams)
    }),
  }
})

jest.mock('@/components/tx/SignOrExecuteForm', () => ({ __esModule: true, default: () => null }))

const safeTxHash = (data: SafeTransactionData) =>
  _TypedDataEncoder.hash(
    { chainId: CHAIN_ID, verifyingContract: SAFE_ADDRESS },
    { SafeTx: getEip712MessageTypes('1.5.0').SafeTx },
    data,
  )

// An unsigned transaction loaded from a Smart Link
const txDetails = {
  safeAddress: SAFE_ADDRESS,
  txId: `multisig_${SAFE_ADDRESS}_${SAFE_TX_HASH}`,
  txStatus: 'AWAITING_CONFIRMATIONS',
  txInfo: { type: 'Custom', to: { value: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' }, value: '0', dataSize: '4' },
  txData: {
    hexData: '0xd0e30db0',
    to: { value: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
    value: '0',
    operation: 0,
    trustedDelegateCallTarget: false,
  },
  detailedExecutionInfo: {
    type: 'MULTISIG',
    submittedAt: 0,
    nonce: 0,
    safeTxGas: '0',
    baseGas: '0',
    gasPrice: '0',
    gasToken: ZERO,
    refundReceiver: { value: ZERO },
    safeTxHash: SAFE_TX_HASH,
    signers: [],
    confirmationsRequired: 3,
    confirmations: [],
    trusted: true,
  },
} as unknown as TransactionDetails

const txSummary = {
  id: txDetails.txId,
  txStatus: 'AWAITING_CONFIRMATIONS',
  txInfo: txDetails.txInfo,
  executionInfo: {
    type: 'MULTISIG',
    nonce: 0,
    confirmationsRequired: 3,
    confirmationsSubmitted: 0,
    missingSigners: [],
  },
} as unknown as TransactionSummary

let seen: SafeTransaction | undefined
const Probe = () => {
  seen = useContext(SafeTxContext).safeTx
  return null
}

describe('ConfirmProposedTx', () => {
  it('confirms an unsigned existing transaction with its own nonce and safeTxGas', async () => {
    jest.spyOn(useSafeInfo, 'default').mockImplementation(() => ({
      safeAddress: SAFE_ADDRESS,
      safe: { chainId: String(CHAIN_ID), nonce: 0, threshold: 3, owners: [], version: '1.5.0' } as unknown as SafeInfo,
      safeError: undefined,
      safeLoading: false,
      safeLoaded: true,
    }))

    render(
      <SafeTxProvider>
        <ConfirmProposedTx txSummary={txSummary} txDetails={txDetails} />
        <Probe />
      </SafeTxProvider>,
    )

    await waitFor(() => expect(seen).toBeDefined())
    // Let any re-derivation by the provider settle
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(seen?.data.nonce).toBe(0)
    expect(seen?.data.safeTxGas).toBe('0')
    expect(safeTxHash(seen!.data)).toBe(SAFE_TX_HASH)
  })
})
