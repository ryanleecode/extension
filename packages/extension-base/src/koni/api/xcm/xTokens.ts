// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset, _ChainInfo } from '@subwallet/chain-list/types';
import { FOUR_INSTRUCTIONS_WEIGHT, getDestMultilocation, getDestWeight } from '@subwallet/extension-base/koni/api/xcm/utils';
import { _getTokenOnChainInfo, _getXcmAssetId, _getXcmAssetMultilocation, _getXcmAssetType, _isNativeToken } from '@subwallet/extension-base/services/chain-service/utils';

import { ApiPromise } from '@polkadot/api';

function getCurrencyId (tokenInfo: _ChainAsset): Record<string, string> {
  if (['acala', 'karura'].includes(tokenInfo.originChain) && _isNativeToken(tokenInfo)) {
    return _getXcmAssetMultilocation(tokenInfo) as Record<string, string>;
  } else if (['moonbeam', 'moonbase', 'moonriver'].includes(tokenInfo.originChain)) {
    const tokenType = _getXcmAssetType(tokenInfo);
    const assetId = _getXcmAssetId(tokenInfo);

    return { [tokenType]: assetId };
  } else if (['pioneer'].includes(tokenInfo.originChain)) {
    return _getXcmAssetMultilocation(tokenInfo) as Record<string, string>;
  }

  return _getTokenOnChainInfo(tokenInfo) as Record<string, string>;
}

export function getExtrinsicByXtokensPallet (tokenInfo: _ChainAsset, originChainInfo: _ChainInfo, destinationChainInfo: _ChainInfo, recipientAddress: string, value: string, api: ApiPromise) {
  const weightParam = ['pioneer'].includes(originChainInfo.slug) ? FOUR_INSTRUCTIONS_WEIGHT : getDestWeight();

  return api.tx.xTokens.transfer(
    getCurrencyId(tokenInfo),
    value,
    getDestMultilocation(destinationChainInfo, recipientAddress),
    weightParam
  );
}
