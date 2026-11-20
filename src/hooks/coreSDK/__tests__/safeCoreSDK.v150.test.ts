import { ethers } from 'ethers'
import {
  getMultiSendCallOnlyContractDeployment,
  getSafeContractDeployment,
} from '@safe-global/protocol-kit/dist/src/contracts/safeDeploymentContracts'
import type { SafeVersion } from '@safe-global/safe-core-sdk-types'
import { EthersAdapter, isValidSafeVersion } from '../safeCoreSDK'
import { getSafeContract as getAppSafeContract } from '@/utils/safe-versions'

const CHAIN_ID = 1
const SAFE_ADDRESS = '0xad32ed6f41232970DEdeff94A99481EDEEde877c'

const provider = new ethers.providers.StaticJsonRpcProvider('http://127.0.0.1:1', {
  chainId: CHAIN_ID,
  name: 'homestead',
})

describe('Safe 1.5.0 support', () => {
  it('accepts 1.5.0 as a supported version', () => {
    expect(isValidSafeVersion('1.5.0')).toBe(true)
    expect(isValidSafeVersion('1.5.0+L2')).toBe(true)
  })

  it('resolves 1.5.0 deployments from the 1.5.0 release', () => {
    expect(getSafeContractDeployment('1.5.0' as SafeVersion, CHAIN_ID, true)?.networkAddresses[CHAIN_ID]).toBe(
      '0xFf51A5898e281Db6DfC7855790607438dF2ca44b',
    )
    expect(getMultiSendCallOnlyContractDeployment('1.5.0' as SafeVersion, CHAIN_ID)?.networkAddresses[CHAIN_ID]).toBe(
      '0xA83c336B20401Af773B6219BA5027174338D1836',
    )
  })

  it('drives 1.5.0 contracts through the 1.4.1 wrappers', async () => {
    const adapter = new EthersAdapter({ ethers, signerOrProvider: provider })
    const safe = await adapter.getSafeContract({
      safeVersion: '1.5.0' as SafeVersion,
      customContractAddress: SAFE_ADDRESS,
    })

    expect(safe.getAddress()).toBe(SAFE_ADDRESS)
    expect(safe.encode('approveHash', [ethers.constants.HashZero])).toMatch(/^0xd4d9bdcd/)

    const multiSendCallOnly = await adapter.getMultiSendCallOnlyContract({
      safeVersion: '1.5.0' as SafeVersion,
      customContractAddress: '0xA83c336B20401Af773B6219BA5027174338D1836',
    })
    expect(multiSendCallOnly.encode('multiSend', ['0x'])).toMatch(/^0x8d80ff0a/)
  })

  it('reads 1.5.0 history with the 1.5.0 ABI', () => {
    const safe = getAppSafeContract(SAFE_ADDRESS, '1.5.0', provider)
    expect(safe?.interface.getEvent('ExecutionSuccess').format()).toBe('ExecutionSuccess(bytes32,uint256)')
    expect(safe?.interface.getFunction('execTransaction').format()).toBe(
      'execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)',
    )
  })
})
