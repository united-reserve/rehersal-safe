import { getMultiWeb3ReadOnly } from '@/hooks/wallets/web3'
import { _SAFE_DEPLOYMENTS } from '@safe-global/safe-deployments/dist/deployments'
import ExternalStore from '@/services/ExternalStore'
import { Gnosis_safe__factory } from '@/types/contracts'
import { invariant } from '@/utils/helpers'
import type { Web3Provider } from '@ethersproject/providers'
import Safe, { EthersAdapter as ProtocolKitEthersAdapter } from '@safe-global/protocol-kit'
import { safeDeploymentsVersions } from '@safe-global/protocol-kit/dist/src/contracts/config'
import type { GetContractProps } from '@safe-global/safe-core-sdk-types'
import type { SafeInfo } from '@safe-global/safe-gateway-typescript-sdk'
import type { Provider } from '@ethersproject/providers'
import { ethers } from 'ethers'
import semverSatisfies from 'semver/functions/satisfies'
import { getContractNetworksForOverrides } from './safeCoreSDK.utils'

export const isLegacyVersion = (safeVersion: string): boolean => {
  const LEGACY_VERSION = '<1.3.0'
  return semverSatisfies(safeVersion, LEGACY_VERSION)
}

export type ModernSafeVersion = '1.1.1' | '1.2.0' | '1.3.0' | '1.4.1' | '1.5.0'

export const isValidSafeVersion = (safeVersion?: SafeInfo['version']): safeVersion is ModernSafeVersion => {
  const SAFE_VERSIONS: ModernSafeVersion[] = ['1.5.0', '1.4.1', '1.3.0', '1.2.0', '1.1.1']
  return !!safeVersion && SAFE_VERSIONS.some((version) => semverSatisfies(safeVersion, version))
}

// `assert` does not work with arrow functions
export function assertValidSafeVersion<T extends SafeInfo['version']>(safeVersion?: T): asserts safeVersion {
  return invariant(isValidSafeVersion(safeVersion), `${safeVersion} is not a valid Safe Account version`)
}

// The pinned protocol-kit knows Safe versions up to 1.4.1. Safe 1.5.0 keeps the 1.4.1 signature of every
// function and event the SDK and this app call (1.5.0 only removed encodeTransactionData and getChainId),
// so 1.5.x contracts are resolved from the 1.5.0 deployments and driven through the 1.4.1 wrappers.
safeDeploymentsVersions['1.5.0'] ??= {
  safeMasterCopyVersion: '1.5.0',
  safeMasterCopyL2Version: '1.5.0',
  safeProxyFactoryVersion: '1.5.0',
  compatibilityFallbackHandler: '1.5.0',
  multiSendVersion: '1.5.0',
  multiSendCallOnlyVersion: '1.5.0',
  signMessageLibVersion: '1.5.0',
  createCallVersion: '1.5.0',
}

const withWrapperVersion = (props: GetContractProps): GetContractProps => ({
  ...props,
  safeVersion: semverSatisfies(props.safeVersion, '1.5.x') ? '1.4.1' : props.safeVersion,
})

export class EthersAdapter extends ProtocolKitEthersAdapter {
  getSafeContract(props: GetContractProps) {
    return super.getSafeContract(withWrapperVersion(props))
  }
  getSafeProxyFactoryContract(props: GetContractProps) {
    return super.getSafeProxyFactoryContract(withWrapperVersion(props))
  }
  getMultiSendContract(props: GetContractProps) {
    return super.getMultiSendContract(withWrapperVersion(props))
  }
  getMultiSendCallOnlyContract(props: GetContractProps) {
    return super.getMultiSendCallOnlyContract(withWrapperVersion(props))
  }
  getCompatibilityFallbackHandlerContract(props: GetContractProps) {
    return super.getCompatibilityFallbackHandlerContract(withWrapperVersion(props))
  }
  getSignMessageLibContract(props: GetContractProps) {
    return super.getSignMessageLibContract(withWrapperVersion(props))
  }
  getCreateCallContract(props: GetContractProps) {
    return super.getCreateCallContract(withWrapperVersion(props))
  }
  getSimulateTxAccessorContract(props: GetContractProps) {
    return super.getSimulateTxAccessorContract(withWrapperVersion(props))
  }
}

export const createEthersAdapter = (provider: Web3Provider) => {
  const signer = provider.getSigner(0)
  return new EthersAdapter({
    ethers,
    signerOrProvider: signer,
  })
}

export const createReadOnlyEthersAdapter = (provider: Provider | undefined = getMultiWeb3ReadOnly()) => {
  if (!provider) {
    throw new Error('Unable to create `EthersAdapter` without a provider')
  }

  return new EthersAdapter({
    ethers,
    signerOrProvider: provider,
  })
}

type SafeCoreSDKProps = {
  provider: Provider
  chainId: SafeInfo['chainId']
  address: SafeInfo['address']['value']
  implementation: SafeInfo['implementation']['value']
  multisendAddress?: string
  multisendCallOnlyAddress?: string
}

export type { MultiSendContractOverrides } from './safeCoreSDK.utils'
export { getContractNetworksForOverrides } from './safeCoreSDK.utils'

// Safe Core SDK
export const initSafeSDK = async ({
  provider,
  chainId,
  address,
  implementation,
  multisendAddress,
  multisendCallOnlyAddress,
}: SafeCoreSDKProps): Promise<Safe> => {
  const safeVersion = await Gnosis_safe__factory.connect(address, provider).VERSION()

  // find out if the implementation is any of the possible L1Safe singletons
  let isL1SafeMasterCopy = _SAFE_DEPLOYMENTS.some((safeDeployments) =>
    (Object.values(safeDeployments.deployments) ?? []).some((deployment) => deployment.address === implementation),
  )

  // Legacy Safe contracts
  if (isLegacyVersion(safeVersion)) {
    isL1SafeMasterCopy = true
  }

  const contractNetworks = getContractNetworksForOverrides(chainId, safeVersion, isL1SafeMasterCopy, {
    multisendAddress,
    multisendCallOnlyAddress,
  })

  return Safe.create({
    ethAdapter: createReadOnlyEthersAdapter(provider),
    safeAddress: address,
    isL1SafeMasterCopy,
    contractNetworks,
  })
}

export const {
  getStore: getSafeSDK,
  setStore: setSafeSDK,
  useStore: useSafeSDK,
} = new ExternalStore<Safe | undefined>()

export const {
  getStore: getSafeImplementation,
  setStore: setSafeImplementation,
  useStore: useSafeImplementation,
} = new ExternalStore<string | undefined>()
