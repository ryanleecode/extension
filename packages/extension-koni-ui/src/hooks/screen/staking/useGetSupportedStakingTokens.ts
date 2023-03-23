// Copyright 2019-2022 @polkadot/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset, _ChainInfo } from '@subwallet/chain-list/types';
import { StakingType } from '@subwallet/extension-base/background/KoniTypes';
import { _STAKING_CHAIN_GROUP } from '@subwallet/extension-base/services/chain-service/constants';
import { _getChainNativeTokenSlug, _isChainEvmCompatible, _isChainSupportSubstrateStaking } from '@subwallet/extension-base/services/chain-service/utils';
import { ALL_KEY } from '@subwallet/extension-koni-ui/constants/commont';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { AccountAddressType } from '@subwallet/extension-koni-ui/types/account';
import { getAccountAddressType } from '@subwallet/extension-koni-ui/util';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

const isChainTypeValid = (chainInfo: _ChainInfo, address?: string): boolean => {
  const addressType = getAccountAddressType(address);
  const isEvmChain = _isChainEvmCompatible(chainInfo);

  switch (addressType) {
    case AccountAddressType.ALL:
      return true;
    case AccountAddressType.ETHEREUM:
      return isEvmChain;
    case AccountAddressType.SUBSTRATE:
      return !isEvmChain;
    default:
      return false;
  }
};

export default function useGetSupportedStakingTokens (type: StakingType, address?: string, chain?: string): _ChainAsset[] {
  const chainInfoMap = useSelector((state: RootState) => state.chainStore.chainInfoMap);
  const assetRegistryMap = useSelector((state: RootState) => state.assetRegistry.assetRegistry);

  return useMemo(() => {
    const result: _ChainAsset[] = [];

    if (type === StakingType.NOMINATED) {
      Object.values(chainInfoMap).forEach((chainInfo) => {
        if (_isChainSupportSubstrateStaking(chainInfo)) {
          const nativeTokenSlug = _getChainNativeTokenSlug(chainInfo);

          if (assetRegistryMap[nativeTokenSlug] &&
            isChainTypeValid(chainInfo, address) &&
            (!chain || chain === ALL_KEY || chain === chainInfo.slug)
          ) {
            result.push(assetRegistryMap[nativeTokenSlug]);
          }
        }
      });
    } else {
      Object.values(chainInfoMap).forEach((chainInfo) => {
        if (_isChainSupportSubstrateStaking(chainInfo) && _STAKING_CHAIN_GROUP.nominationPool.includes(chainInfo.slug)) {
          const nativeTokenSlug = _getChainNativeTokenSlug(chainInfo);

          if (assetRegistryMap[nativeTokenSlug] &&
            isChainTypeValid(chainInfo, address) &&
            (!chain || chain === ALL_KEY || chain === chainInfo.slug)
          ) {
            result.push(assetRegistryMap[nativeTokenSlug]);
          }
        }
      });
    }

    return result;
  }, [type, chainInfoMap, assetRegistryMap, address, chain]);
}
