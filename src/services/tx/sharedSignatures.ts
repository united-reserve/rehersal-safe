import { arrayify } from '@ethersproject/bytes'
import { recoverAddress } from '@ethersproject/transactions'
import { verifyMessage } from '@ethersproject/wallet'
import { sameAddress } from '@/utils/addresses'

// Where signers' off-chain signatures are shared. Empty turns sharing off: signatures then travel in Smart Links only.
export const SIGNATURES_URL = process.env.NEXT_PUBLIC_SIGNATURES_URL || ''

export type SharedSignature = { owner: string; signature: string }

// True when the signature over this Safe transaction hash was made by this owner.
// An owner signs either the hash itself (v 27/28) or its personal-message form (v 31/32).
export const isOwnerSignature = (safeTxHash: string, owner: string, signature: string): boolean => {
  try {
    const v = parseInt(signature.slice(-2), 16)
    if (v === 27 || v === 28) return sameAddress(recoverAddress(safeTxHash, signature), owner)
    if (v === 31 || v === 32) {
      return sameAddress(verifyMessage(arrayify(safeTxHash), signature.slice(0, -2) + (v - 4).toString(16)), owner)
    }
  } catch {}
  return false
}

export const fetchSharedSignatures = async (safeTxHash: string): Promise<SharedSignature[]> => {
  const response = await fetch(`${SIGNATURES_URL}?safeTxHash=${safeTxHash}`)
  if (!response.ok) throw new Error(`Signature store answered ${response.status}`)
  const { signatures } = await response.json()
  return Array.isArray(signatures) ? signatures : []
}

export const publishSignature = async (safeTxHash: string, owner: string, signature: string): Promise<void> => {
  await fetch(SIGNATURES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ safeTxHash, owner, signature }),
  })
}
