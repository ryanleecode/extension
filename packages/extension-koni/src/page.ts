// Copyright 2019-2022 @polkadot/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import type { Unstable } from '@substrate/connect-discovery';
import type { SmoldotExtensionProviderDetail } from '@substrate/smoldot-discovery/types';
import type { RequestSignatures, TransportRequestMessage } from '@subwallet/extension-base/background/types';
import type { Message } from '@subwallet/extension-base/types';

import { createTx } from '@substrate/light-client-extension-helpers/tx-helper';
import { getLightClientProvider } from '@substrate/light-client-extension-helpers/web-page';
import { connector } from '@substrate/smoldot-discovery';
import { MESSAGE_ORIGIN_CONTENT } from '@subwallet/extension-base/defaults';
import { enable, handleResponse, initEvmProvider } from '@subwallet/extension-base/page';
import { injectEvmExtension, injectExtension } from '@subwallet/extension-inject';

import { connectInjectedExtension } from '@polkadot-api/pjs-signer';
import { fromHex, toHex } from '@polkadot-api/utils';

import { CHANNEL_ID } from './constants';

const PROVIDER_INFO = {
  icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
  name: 'Subwallet JS Extension',
  rdns: 'io.github.paritytech.SubWalletJsExtension',
  uuid: crypto.randomUUID()
};

const lightClientProviderPromise = getLightClientProvider(CHANNEL_ID);

// #region Smoldot Discovery Provider
{
  const provider = lightClientProviderPromise
    .then((provider) => connector.make({ lightClientProvider: provider }));

  const detail: SmoldotExtensionProviderDetail = Object.freeze({
    info: PROVIDER_INFO,
    kind: 'smoldot-v1',
    provider
  });

  window.addEventListener(
    'substrateDiscovery:requestProvider',
    ({ detail: { onProvider } }) => onProvider(detail)
  );

  window.dispatchEvent(
    new CustomEvent('substrateDiscovery:announceProvider', {
      detail
    })
  );
}
// #endregion

// #region Connect Discovery Provider
{
  const provider = lightClientProviderPromise.then((lightClientProvider): Unstable.Provider => ({
    ...lightClientProvider,
    async createTx (chainId: string, from: string, callData: string) {
      const chains = Object.values(lightClientProvider.getChains());
      const chain = chains.find(({ genesisHash }) => genesisHash === chainId);

      if (!chain) {
        throw new Error('unknown chain');
      }

      const injectedExt = await connectInjectedExtension('subwallet-js');

      const account = injectedExt.getAccounts()
        .find((account) => toHex(account.polkadotSigner.publicKey) === from);

      if (!account) {
        throw new Error('no account');
      }

      const signer = account.polkadotSigner;

      const tx = await createTx(chain.connect)({ callData: fromHex(callData), signer });

      return toHex(tx);
    },
    async getAccounts (_chainId: string) {
      const injectedExt = await connectInjectedExtension('subwallet-js');
      const accounts = injectedExt.getAccounts();

      return accounts;
    }
  }));

  const detail: Unstable.SubstrateConnectProviderDetail = Object.freeze({
    info: PROVIDER_INFO,
    kind: 'substrate-connect-unstable',
    provider
  });

  window.addEventListener(
    'substrateDiscovery:requestProvider',
    ({ detail: { onProvider } }) => onProvider(detail)
  );

  window.dispatchEvent(
    new CustomEvent('substrateDiscovery:announceProvider', {
      detail
    })
  );
}
// #endregion

const version = process.env.PKG_VERSION as string;

function inject () {
  injectExtension(enable, {
    name: 'subwallet-js',
    version: version
  });
  injectEvmExtension(initEvmProvider(version));
}

// setup a response listener (events created by the loader for extension responses)
window.addEventListener('message', ({ data, source }: Message): void => {
  // only allow messages from our window, by the loader
  if (source !== window || data.origin !== MESSAGE_ORIGIN_CONTENT) {
    return;
  }

  if (data.id) {
    handleResponse(data as TransportRequestMessage<keyof RequestSignatures>);
  } else {
    console.error('Missing id for response.');
  }
});

inject();
