import { arrayify, joinSignature, splitSignature } from '@ethersproject/bytes'
import { Wallet } from '@ethersproject/wallet'
import { isOwnerSignature } from './sharedSignatures'

const safeTxHash = '0x92dafe622418a1ccec31726b06df41f12fd7cb63e0f77ec7811ea655ac2c34ed'
const owner = new Wallet('0x' + '11'.repeat(32))
const stranger = new Wallet('0x' + '22'.repeat(32))

// What a wallet returns for typed-data signing: a signature over the hash itself
const typedDataSignature = (wallet: Wallet) => joinSignature(wallet._signingKey().signDigest(safeTxHash))

// What the Safe expects for eth_sign: the personal-message signature with v raised by 4
const ethSignSignature = async (wallet: Wallet) => {
  const { r, s, v } = splitSignature(await wallet.signMessage(arrayify(safeTxHash)))
  return r + s.slice(2) + (v + 4).toString(16)
}

describe('isOwnerSignature', () => {
  it('accepts an owner signature over the hash', () => {
    expect(isOwnerSignature(safeTxHash, owner.address, typedDataSignature(owner))).toBe(true)
    expect(isOwnerSignature(safeTxHash, owner.address.toLowerCase(), typedDataSignature(owner))).toBe(true)
  })

  it('accepts an owner eth_sign signature', async () => {
    expect(isOwnerSignature(safeTxHash, owner.address, await ethSignSignature(owner))).toBe(true)
  })

  it('rejects a signature made by someone else', async () => {
    expect(isOwnerSignature(safeTxHash, owner.address, typedDataSignature(stranger))).toBe(false)
    expect(isOwnerSignature(safeTxHash, owner.address, await ethSignSignature(stranger))).toBe(false)
  })

  it('rejects a signature over another transaction', () => {
    const other = '0x820fc77e9a56ce28f711a08d4a03757dc311d9af4ee0f3aa6b4610ead1c0a5d9'
    expect(isOwnerSignature(other, owner.address, typedDataSignature(owner))).toBe(false)
  })

  it('rejects the 64-byte compact form of a valid signature', () => {
    const { compact } = splitSignature(typedDataSignature(owner))
    expect(compact).toHaveLength(130)
    expect(isOwnerSignature(safeTxHash, owner.address, compact)).toBe(false)
  })

  it('rejects approved-hash, contract and malformed signatures', () => {
    const approved = '0x' + '00'.repeat(12) + owner.address.slice(2).toLowerCase() + '00'.repeat(32) + '01'
    expect(isOwnerSignature(safeTxHash, owner.address, approved)).toBe(false)
    expect(isOwnerSignature(safeTxHash, owner.address, '0x1234')).toBe(false)
    expect(isOwnerSignature(safeTxHash, owner.address, '')).toBe(false)
  })
})
