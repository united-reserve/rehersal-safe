import { BigNumber } from 'ethers'
import { getAddress, Interface, parseBytes32String } from 'ethers/lib/utils'
import { AddressZero } from '@ethersproject/constants'
import semverSatisfies from 'semver/functions/satisfies'
import type { DataDecoded, InternalTransaction, Operation } from '@safe-global/safe-gateway-typescript-sdk'
import {
  _MULTI_SEND_CALL_ONLY_DEPLOYMENTS,
  _MULTI_SEND_DEPLOYMENTS,
} from '@safe-global/safe-deployments/dist/deployments'
import { sameAddress } from '@/utils/addresses'

// The calls this page names without an external decoding service
const knownCalls = new Interface([
  'function multiSend(bytes transactions)',
  'function set(bytes32 key, address addr)',
  'function setCodeSigner(address signer)',
])

const formatValue = (type: string, value: unknown): string => {
  if (type === 'bytes32') {
    try {
      return parseBytes32String(value as string)
    } catch {
      return value as string
    }
  }
  return String(value)
}

// `self` is the address a MultiSend batch reaches through a zero recipient, when it has one
const decodeCall = (data: string, self?: string): DataDecoded | undefined => {
  try {
    const { name, args, functionFragment } = knownCalls.parseTransaction({ data })
    if (name === 'multiSend') {
      return {
        method: name,
        parameters: [
          { name: 'transactions', type: 'bytes', value: args[0], valueDecoded: unpackMultiSend(args[0], self) },
        ],
      }
    }
    return {
      method: name,
      parameters: functionFragment.inputs.map((input, i) => ({
        name: input.name,
        type: input.type,
        value: formatValue(input.type, args[i]),
      })),
    }
  } catch {
    return undefined
  }
}

// MultiSend packs each call as operation (1 byte), to (20), value (32), data length (32), data
const unpackMultiSend = (packed: string, self?: string): InternalTransaction[] => {
  const txs: InternalTransaction[] = []
  let i = 2
  const take = (chars: number) => packed.slice(i, (i += chars))

  while (i < packed.length) {
    const operation = parseInt(take(2), 16) as Operation
    const recipient = getAddress(`0x${take(40)}`)
    const to = self && recipient === AddressZero ? getAddress(self) : recipient
    const value = BigNumber.from(`0x${take(64)}`).toString()
    const length = BigNumber.from(`0x${take(64)}`).toNumber() * 2
    const data = `0x${take(length)}`
    if (data.length !== length + 2) throw new Error('Truncated MultiSend data')
    txs.push({ operation, to, value, data, dataDecoded: decodeCall(data) })
  }

  return txs
}

const canonicalMultiSend = (chainId: string, to: string) => {
  return [..._MULTI_SEND_DEPLOYMENTS, ..._MULTI_SEND_CALL_ONLY_DEPLOYMENTS].find((deployment) =>
    [deployment.networkAddresses[chainId] ?? []]
      .flat()
      .some((type) => sameAddress(deployment.deployments[type]?.address, to)),
  )
}

type TxContext = { chainId: string; to: string; operation: Operation; safeAddress: string }

// From 1.5.0 MultiSend sends a call packed with a zero recipient to the executing contract instead:
// the Safe under a delegate call, the MultiSend contract itself under a plain call.
const zeroRecipient = ({ chainId, to, operation, safeAddress }: TxContext): string | undefined => {
  const deployment = canonicalMultiSend(chainId, to)
  if (!deployment || !semverSatisfies(deployment.version, '>=1.5.0')) return undefined
  return operation === 1 ? safeAddress : to
}

// Names the calls as they execute: with the transaction's context, a batch shows where each call really goes
export const decodeTxData = (data: string, tx?: TxContext): DataDecoded | undefined =>
  decodeCall(data, tx && zeroRecipient(tx))

const isCanonicalMultiSend = (chainId: string, to: string): boolean => !!canonicalMultiSend(chainId, to)

// MultiSend executes nested delegate calls, so only a decoded batch of plain calls is trusted
export const isTrustedDelegateCall = (chainId: string, to: string, dataDecoded?: DataDecoded): boolean => {
  const calls = dataDecoded?.method === 'multiSend' ? dataDecoded.parameters?.[0].valueDecoded : undefined
  return isCanonicalMultiSend(chainId, to) && !!calls && calls.every(({ operation }) => operation === 0)
}
