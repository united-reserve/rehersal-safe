import { useEffect } from 'react'
import { isEqual } from 'lodash'
import { useAppDispatch, useAppSelector } from '@/store'
import { addOrUpdateTx, EternalSafeTransaction, selectAddedTxs } from '@/store/addedTxsSlice'
import {
  fetchSharedSignatures,
  isOwnerSignature,
  publishSignature,
  SIGNATURES_URL,
} from '@/services/tx/sharedSignatures'
import { sameAddress } from '@/utils/addresses'
import useIntervalCounter from './useIntervalCounter'
import useSafeInfo from './useSafeInfo'

const POLLING_INTERVAL = 15_000

// Keeps each pending transaction's owner signatures in step with the shared store, in both directions:
// signatures made here are published, and other owners' signatures are added to the transaction.
// Only signatures that verify against a current Safe owner are taken or sent.
export const useSharedSignatures = () => {
  const dispatch = useAppDispatch()
  const { safe, safeAddress } = useSafeInfo()
  const { chainId, nonce, owners } = safe
  const transactions = useAppSelector((state) => selectAddedTxs(state, chainId, safeAddress), isEqual)
  const [pollCount] = useIntervalCounter(POLLING_INTERVAL)

  useEffect(() => {
    if (!SIGNATURES_URL || !transactions || !safeAddress || document.visibilityState === 'hidden') return

    let stale = false
    const isOwner = (address: string) => owners.some((owner) => sameAddress(owner.value, address))

    for (const [safeTxHash, tx] of Object.entries(transactions)) {
      if (tx.data.nonce < nonce) continue

      fetchSharedSignatures(safeTxHash)
        .then((shared) => {
          if (stale) return

          for (const [signer, { data }] of tx.signatures) {
            const isShared = shared.some(({ owner, signature }) => sameAddress(owner, signer) && signature === data)
            if (!isShared && isOwner(signer) && isOwnerSignature(safeTxHash, signer, data)) {
              publishSignature(safeTxHash, signer, data).catch(() => undefined)
            }
          }

          const incoming: Record<string, string> = {}
          for (const { owner, signature } of shared) {
            if (
              !tx.signatures.has(owner.toLowerCase()) &&
              isOwner(owner) &&
              isOwnerSignature(safeTxHash, owner, signature)
            ) {
              incoming[owner] = signature
            }
          }
          if (Object.keys(incoming).length > 0) {
            const update = new EternalSafeTransaction(tx.data, incoming, tx.timestamp)
            dispatch(addOrUpdateTx({ chainId, safeAddress, tx: update, txKey: safeTxHash }))
          }
        })
        // The store is a convenience: without it signatures still travel in Smart Links
        .catch(() => undefined)
    }

    return () => {
      stale = true
    }
  }, [transactions, pollCount, chainId, safeAddress, nonce, owners, dispatch])
}

export default useSharedSignatures
