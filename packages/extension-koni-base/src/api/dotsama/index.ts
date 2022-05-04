// Copyright 2019-2022 @polkadot/extension-koni-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ApiProps } from '@polkadot/extension-base/background/KoniTypes';
import { initApi } from '@polkadot/extension-koni-base/api/dotsama/api';
import { PREDEFINED_NETWORKS } from '@polkadot/extension-koni-base/api/predefinedNetworks';
import { getCurrentProvider } from '@polkadot/extension-koni-base/utils/utils';

export * from './api';

export function getGenesis (name: string): string {
  if (PREDEFINED_NETWORKS[name] &&
    PREDEFINED_NETWORKS[name].genesisHash &&
    PREDEFINED_NETWORKS[name].genesisHash.toLowerCase() !== 'unknown') {
    return PREDEFINED_NETWORKS[name].genesisHash;
  }

  console.log(`Genesis hash of ${name} is not available`);

  return `not_available_genesis_hash__${name}`;
}

export function connectDotSamaApis (networks = PREDEFINED_NETWORKS): Record<string, ApiProps> {
  const apisMap: Record<string, ApiProps> = {};

  Object.keys(networks).forEach((networkKey) => {
    const network = networks[networkKey];

    if (!network.genesisHash || network.genesisHash.toLowerCase() === 'unknown' || !network.currentProvider) {
      return;
    }

    apisMap[networkKey] = initApi(networkKey, getCurrentProvider(network));
  });

  return apisMap;
}

export default connectDotSamaApis;
