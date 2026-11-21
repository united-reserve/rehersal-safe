// Shared store for the Safe owners' off-chain signatures, so each signer sees the others' without passing links.
// A signature is accepted only if it recovers to one of the configured owners; the Safe still verifies every
// signature itself at execution, so this store cannot authorise anything.
const { put, list } = require('@vercel/blob')
const { recoverAddress } = require('@ethersproject/transactions')
const { verifyMessage } = require('@ethersproject/wallet')
const { arrayify } = require('@ethersproject/bytes')

const HASH = /^0x[0-9a-f]{64}$/
const ADDRESS = /^0x[0-9a-f]{40}$/
const SIGNATURE = /^0x[0-9a-f]{130}$/
const owners = () =>
  (process.env.SIGNERS || '')
    .toLowerCase()
    .split(',')
    .filter((a) => ADDRESS.test(a))

// A Safe owner signs either the hash itself (v 27/28) or its personal-message form (v 31/32)
const signerOf = (safeTxHash, signature) => {
  const v = parseInt(signature.slice(-2), 16)
  if (v === 27 || v === 28) return recoverAddress(safeTxHash, signature)
  if (v === 31 || v === 32) return verifyMessage(arrayify(safeTxHash), signature.slice(0, -2) + (v - 4).toString(16))
  return ''
}

const text = (value) => (typeof value === 'string' ? value.toLowerCase() : '')

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') {
    const safeTxHash = text(req.query.safeTxHash)
    if (!HASH.test(safeTxHash)) return res.status(400).json({ error: 'safeTxHash' })

    const { blobs } = await list({ prefix: `signatures/${safeTxHash}/`, limit: 50 })
    const signatures = blobs
      .map(({ pathname }) => pathname.split('/')[2].replace('.json', '').split('-'))
      .filter(([owner, signature]) => ADDRESS.test(owner) && SIGNATURE.test(signature))
      .map(([owner, signature]) => ({ owner, signature }))
    return res.status(200).json({ signatures })
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'object' && req.body ? req.body : {}
    const safeTxHash = text(body.safeTxHash)
    const owner = text(body.owner)
    const signature = text(body.signature)
    if (!HASH.test(safeTxHash) || !ADDRESS.test(owner) || !SIGNATURE.test(signature)) {
      return res.status(400).json({ error: 'format' })
    }
    if (!owners().includes(owner)) return res.status(403).json({ error: 'owner' })

    let signer = ''
    try {
      signer = signerOf(safeTxHash, signature).toLowerCase()
    } catch {}
    if (signer !== owner) return res.status(400).json({ error: 'signature' })

    // The record is the path, so reading the store is one listing
    await put(`signatures/${safeTxHash}/${owner}-${signature}.json`, '{}', {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    })
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'method' })
}
