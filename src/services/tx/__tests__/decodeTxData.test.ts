import { decodeTxData, isTrustedDelegateCall } from '../decodeTxData'

// MultiSendCallOnly batch of two AddressRegistry set(bytes32,address) calls
const WIRING_BATCH =
  '0x8d80ff0a00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000132006f45eAD07B69211d4BE9ae43e1574bb5a5f71d9600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044ba44593c475541524449414e00000000000000000000000000000000000000000000000000000000000000000000000068609e6bc12b349adc19eb67c0903340715d90ed006f45eAD07B69211d4BE9ae43e1574bb5a5f71d9600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044ba44593c47454e455349535f4d494e5445520000000000000000000000000000000000000000000000000000000000000e44644106a3bb83d7872f8511d90a4479fe751d0000000000000000000000000000'
const SET_CODE_SIGNER = '0xae5e424f0000000000000000000000000dde4a51f2e4448cdcce639baf3534d2cbeef5c8'
const CHAIN_ID = '7311026'

describe('decodeTxData', () => {
  it('splits a MultiSend batch into its calls and decodes each', () => {
    const decoded = decodeTxData(WIRING_BATCH)
    expect(decoded?.method).toBe('multiSend')

    const calls = decoded?.parameters?.[0].valueDecoded
    expect(calls).toHaveLength(2)
    expect(calls?.map(({ operation, to, value }) => ({ operation, to, value }))).toEqual([
      { operation: 0, to: '0x6f45eAD07B69211d4BE9ae43e1574bb5a5f71d96', value: '0' },
      { operation: 0, to: '0x6f45eAD07B69211d4BE9ae43e1574bb5a5f71d96', value: '0' },
    ])
    expect(calls?.[0].data).toMatch(/^0xba44593c/)
    expect(calls?.map((call) => call.dataDecoded)).toEqual([
      {
        method: 'set',
        parameters: [
          { name: 'key', type: 'bytes32', value: 'GUARDIAN' },
          { name: 'addr', type: 'address', value: '0x68609E6bc12B349aDC19EB67c0903340715D90eD' },
        ],
      },
      {
        method: 'set',
        parameters: [
          { name: 'key', type: 'bytes32', value: 'GENESIS_MINTER' },
          { name: 'addr', type: 'address', value: '0x0E44644106A3bB83D7872F8511d90a4479fE751d' },
        ],
      },
    ])
  })

  it('decodes setCodeSigner', () => {
    expect(decodeTxData(SET_CODE_SIGNER)).toEqual({
      method: 'setCodeSigner',
      parameters: [{ name: 'signer', type: 'address', value: '0x0dDE4A51f2E4448CDcCe639BAF3534d2CBEEf5C8' }],
    })
  })

  it('leaves unknown calls and malformed batches undecoded', () => {
    expect(decodeTxData('0xa9059cbb' + '00'.repeat(64))).toBeUndefined()
    expect(decodeTxData('0x')).toBeUndefined()
    expect(decodeTxData(WIRING_BATCH.slice(0, 200))).toBeUndefined()
  })

  it('shows a call inside a batch with its selector and raw data when it is not a known call', () => {
    const inner = '0xa9059cbb' + '00'.repeat(64)
    const packed = '00' + '11'.repeat(20) + '00'.repeat(32) + (68).toString(16).padStart(64, '0') + inner.slice(2)
    const batch =
      '0x8d80ff0a' +
      (32).toString(16).padStart(64, '0') +
      (packed.length / 2).toString(16).padStart(64, '0') +
      packed.padEnd(Math.ceil(packed.length / 64) * 64, '0')
    const [call] = decodeTxData(batch)?.parameters?.[0].valueDecoded ?? []
    expect(call.data).toBe(inner)
    expect(call.dataDecoded).toBeUndefined()
  })
})

// Packs calls as MultiSend expects and wraps them in multiSend(bytes)
const encodeBatch = (calls: Array<{ operation: number; to: string; data: string }>) => {
  const packed = calls
    .map(
      ({ operation, to, data }) =>
        operation.toString(16).padStart(2, '0') +
        to.slice(2).toLowerCase() +
        '00'.repeat(32) +
        ((data.length - 2) / 2).toString(16).padStart(64, '0') +
        data.slice(2),
    )
    .join('')
  const length = packed.length / 2
  return (
    '0x8d80ff0a' +
    (32).toString(16).padStart(64, '0') +
    length.toString(16).padStart(64, '0') +
    packed.padEnd(Math.ceil(packed.length / 64) * 64, '0')
  )
}

describe('isTrustedDelegateCall', () => {
  const MULTI_SEND_CALL_ONLY_141 = '0x9641d764fc13c8B624c04430C7356C1C7C8102e2'
  const MULTI_SEND_141 = '0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526'
  const MULTI_SEND_CALL_ONLY_150 = '0xA83c336B20401Af773B6219BA5027174338D1836'
  const MULTI_SEND_150 = '0x218543288004CD07832472D464648173c77D7eB7'
  const REGISTRY = '0x6f45eAD07B69211d4BE9ae43e1574bb5a5f71d96'

  it('trusts a batch of plain calls to any canonical 1.4.1 or 1.5.0 MultiSend', () => {
    const batch = decodeTxData(WIRING_BATCH)
    for (const target of [MULTI_SEND_CALL_ONLY_141, MULTI_SEND_141, MULTI_SEND_CALL_ONLY_150, MULTI_SEND_150]) {
      expect(isTrustedDelegateCall(CHAIN_ID, target, batch)).toBe(true)
    }
    expect(isTrustedDelegateCall(CHAIN_ID, MULTI_SEND_CALL_ONLY_141.toLowerCase(), batch)).toBe(true)
  })

  it('does not trust a MultiSend batch with an inner delegate call', () => {
    const batch = decodeTxData(
      encodeBatch([
        { operation: 0, to: REGISTRY, data: SET_CODE_SIGNER },
        { operation: 1, to: REGISTRY, data: SET_CODE_SIGNER },
      ]),
    )
    expect(batch?.parameters?.[0].valueDecoded).toHaveLength(2)
    expect(isTrustedDelegateCall(CHAIN_ID, MULTI_SEND_141, batch)).toBe(false)
  })

  it('does not trust undecodable data to a canonical MultiSend', () => {
    expect(isTrustedDelegateCall(CHAIN_ID, MULTI_SEND_CALL_ONLY_141, decodeTxData('0xdeadbeef'))).toBe(false)
    expect(isTrustedDelegateCall(CHAIN_ID, MULTI_SEND_CALL_ONLY_141, decodeTxData(SET_CODE_SIGNER))).toBe(false)
  })

  it('does not trust a batch sent to any other target', () => {
    const batch = decodeTxData(WIRING_BATCH)
    expect(isTrustedDelegateCall(CHAIN_ID, '0x0E44644106A3bB83D7872F8511d90a4479fE751d', batch)).toBe(false)
    expect(isTrustedDelegateCall(CHAIN_ID, '0xad32ed6f41232970DEdeff94A99481EDEEde877c', batch)).toBe(false)
  })
})
