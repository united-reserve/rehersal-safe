import { BigNumber } from 'ethers'
import { getAddress, Interface, parseBytes32String } from 'ethers/lib/utils'
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

const decodeCall = (data: string): DataDecoded | undefined => {
  try {
    const { name, args, functionFragment } = knownCalls.parseTransaction({ data })
    if (name === 'multiSend') {
      return {
        method: name,
        parameters: [{ name: 'transactions', type: 'bytes', value: args[0], valueDecoded: unpackMultiSend(args[0]) }],
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
const unpackMultiSend = (packed: string): InternalTransaction[] => {
  const txs: InternalTransaction[] = []
  let i = 2
  const take = (chars: number) => packed.slice(i, (i += chars))

  while (i < packed.length) {
    const operation = parseInt(take(2), 16) as Operation
    const to = getAddress(`0x${take(40)}`)
    const value = BigNumber.from(`0x${take(64)}`).toString()
    const length = BigNumber.from(`0x${take(64)}`).toNumber() * 2
    const data = `0x${take(length)}`
    if (data.length !== length + 2) throw new Error('Truncated MultiSend data')
    txs.push({ operation, to, value, data, dataDecoded: decodeCall(data) })
  }

  return txs
}

export const decodeTxData = (data: string): DataDecoded | undefined => decodeCall(data)

export const isTrustedDelegateCallTarget = (chainId: string, to: string): boolean => {
  return [..._MULTI_SEND_DEPLOYMENTS, ..._MULTI_SEND_CALL_ONLY_DEPLOYMENTS].some((deployment) =>
    [deployment.networkAddresses[chainId] ?? []]
      .flat()
      .some((type) => sameAddress(deployment.deployments[type]?.address, to)),
  )
}
