// Copyright 2019-2022 @subwallet/extension-koni-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _DEFAULT_CHAINS } from '@subwallet/chain-list';
import { _SubstrateChainType } from '@subwallet/chain-list/types';
import { SingleModeJson, ThemeNames } from '@subwallet/extension-base/background/KoniTypes';

export const API_AUTO_CONNECT_MS = 3000;
export const API_MAX_RETRY = 2;

export const _API_OPTIONS_CHAIN_GROUP = {
  acala: ['acala', 'karura', 'origintrail', 'kintsugi'],
  turing: ['turingStaging', 'turing']
};

export const _PREDEFINED_SINGLE_MODES: Record<string, SingleModeJson> = {
  subspace: {
    networkKeys: ['subspace_gemini_2a', 'subspace_test', 'subspace_gemini_3a'],
    theme: ThemeNames.SUBSPACE,
    autoTriggerDomain: 'subspace.network'
  }
};

export const _PURE_EVM_CHAINS = ['binance', 'binance_test', 'ethereum', 'ethereum_goerli', 'astarEvm', 'shidenEvm', 'shibuyaEvm', 'crabEvm', 'pangolinEvm', 'cloverEvm', 'boba_rinkeby', 'boba', 'bobabase', 'bobabeam', 'watr_network_evm'];

// Get balance----------------------------------------------------------------------------------------------------------

export const _BALANCE_CHAIN_GROUP = {
  kintsugi: ['kintsugi', 'interlay', 'kintsugi_test'],
  crab: ['crab', 'pangolin'],
  genshiro: ['genshiro_testnet', 'genshiro'],
  equilibrium_parachain: ['equilibrium_parachain'],
  bifrost: ['bifrost', 'acala', 'karura', 'acala_testnet', 'pioneer', 'bitcountry'],
  statemine: ['statemine', 'astar', 'shiden', 'statemint'],
  kusama: ['kusama', 'kintsugi', 'kintsugi_test', 'interlay', 'acala', 'statemint', 'karura', 'bifrost'] // perhaps there are some runtime updates
};

export const _BALANCE_TOKEN_GROUP = {
  crab: ['CKTON', 'PKTON'],
  bitcountry: ['BIT']
};

export const _NFT_CHAIN_GROUP = {
  acala: ['acala'],
  karura: ['karura'], // TODO: karura and acala should be the same
  rmrk: ['kusama'],
  statemine: ['statemine', 'statemint'],
  unique_network: ['unique_network'],
  bitcountry: ['bitcountry', 'pioneer']
};

// Staking--------------------------------------------------------------------------------------------------------------

export const _STAKING_CHAIN_GROUP = {
  relay: ['polkadot', 'kusama', 'aleph', 'polkadex', 'ternoa', 'ternoa_alphanet', 'alephTest', 'polkadexTest', 'westend'],
  para: ['moonbeam', 'moonriver', 'moonbase', 'turing', 'turingStaging', 'bifrost', 'bifrost_testnet', 'calamari_test', 'calamari'],
  astar: ['astar', 'shiden', 'shibuya'],
  amplitude: ['amplitude', 'amplitude_test', 'kilt', 'kilt_peregrine'], // amplitude and kilt only share some common logic
  kilt: ['kilt', 'kilt_peregrine'],
  nominationPool: ['polkadot', 'kusama', 'westend', 'alephTest', 'aleph'],
  bifrost: ['bifrost', 'bifrost_testnet'],
  aleph: ['aleph, alephTest'] // A0 has distinct tokenomics
};

export const _STAKING_ERA_LENGTH_MAP: Record<string, number> = { // in hours
  alephTest: 24,
  aleph: 24,
  polkadot: 24,
  kusama: 6,
  westend: 24,
  hydradx: 24,
  default: 24,
  moonbeam: 6,
  moonriver: 2,
  moonbase: 2,
  turing: 2,
  turingStaging: 2,
  astar: 24,
  shiden: 24,
  shibuya: 24,
  bifrost_testnet: 0.5,
  bifrost: 2,
  ternoa: 24,
  calamari: 6,
  calamari_test: 6,
  amplitude: 2,
  amplitude_test: 2,
  kilt: 2,
  kilt_peregrine: 2
};

export const _PARACHAIN_INFLATION_DISTRIBUTION: Record<string, Record<string, number>> = {
  moonbeam: { // https://docs.moonbeam.network/learn/features/staking/#annual-inflation
    reward: 0.5,
    collatorCommission: 0.2,
    bondReserve: 0.3
  },
  moonriver: {
    reward: 0.5,
    collatorCommission: 0.2,
    bondReserve: 0.3
  },
  moonbase: {
    reward: 0.5,
    collatorCommission: 0.2,
    bondReserve: 0.3
  },
  turing: { // https://docs.oak.tech/docs/delegators/
    reward: 0.5
  },
  turingStaging: { // https://docs.oak.tech/docs/delegators/
    reward: 0.5
  },
  bifrost: {
    reward: 0
  },
  bifrost_testnet: {
    reward: 0
  },
  calamari_test: {
    reward: 0.9
  },
  calamari: {
    reward: 0.9
  },
  default: {
    reward: 0
  }
};

export interface _SubstrateInflationParams {
  auctionAdjust: number;
  auctionMax: number;
  falloff: number;
  maxInflation: number;
  minInflation: number;
  stakeTarget: number;
  yearlyInflationInTokens?: number;
}

export interface _SubstrateUniformEraPayoutInflationParams extends _SubstrateInflationParams {
  yearlyInflationInTokens: number;
}

export const _SUBSTRATE_DEFAULT_INFLATION_PARAMS: _SubstrateInflationParams = {
  auctionAdjust: 0,
  auctionMax: 0,
  // 5% for falloff, as per the defaults, see
  // https://github.com/paritytech/polkadot/blob/816cb64ea16102c6c79f6be2a917d832d98df757/runtime/kusama/src/lib.rs#L534
  falloff: 0.05,
  // 10% max, 0.25% min, see
  // https://github.com/paritytech/polkadot/blob/816cb64ea16102c6c79f6be2a917d832d98df757/runtime/kusama/src/lib.rs#L523
  maxInflation: 0.1,
  minInflation: 0.025,
  stakeTarget: 0.5
};

const _ALEPH_DEFAULT_UNIFORM_ERA_PAYOUT_PARAMS: _SubstrateUniformEraPayoutInflationParams = {
  ..._SUBSTRATE_DEFAULT_INFLATION_PARAMS,
  yearlyInflationInTokens: 30000000
};

export const _KNOWN_CHAIN_INFLATION_PARAMS: Record<string, _SubstrateInflationParams> = {
  aleph: _ALEPH_DEFAULT_UNIFORM_ERA_PAYOUT_PARAMS,
  alephTest: _ALEPH_DEFAULT_UNIFORM_ERA_PAYOUT_PARAMS,
  dock_pos: { ..._SUBSTRATE_DEFAULT_INFLATION_PARAMS, stakeTarget: 0.75 },
  kusama: { ..._SUBSTRATE_DEFAULT_INFLATION_PARAMS, auctionAdjust: (0.3 / 60), auctionMax: 60, stakeTarget: 0.75 },
  neatcoin: { ..._SUBSTRATE_DEFAULT_INFLATION_PARAMS, stakeTarget: 0.75 },
  nft_mart: { ..._SUBSTRATE_DEFAULT_INFLATION_PARAMS, falloff: 0.04, stakeTarget: 0.60 },
  polkadot: { ..._SUBSTRATE_DEFAULT_INFLATION_PARAMS, stakeTarget: 0.75 }
};

// Send fund------------------------------------------------------------------------------------------------------------

export const _TRANSFER_NOT_SUPPORTED_CHAINS = ['subspace_gemini_3a', 'kulupu', 'joystream', 'equilibrium_parachain', 'genshiro_testnet', 'genshiro'];

export const _TRANSFER_CHAIN_GROUP = {
  acala: ['karura', 'acala', 'acala_testnet'],
  kintsugi: ['kintsugi', 'kintsugi_test', 'interlay'],
  genshiro: ['genshiro_testnet', 'genshiro', 'equilibrium_parachain'],
  crab: ['crab', 'pangolin'],
  bitcountry: ['pioneer', 'bitcountry'],
  statemine: ['statemint', 'statemine']
};

export const _BALANCE_PARSING_CHAIN_GROUP = {
  bobabeam: ['bobabeam', 'bobabase']
};

// XCM------------------------------------------------------------------------------------------------------------------

export const _XCM_CHAIN_GROUP = {
  moonbeam: ['moonbeam', 'moonriver', 'moonbase'],
  astar: ['astar', 'shiden'],
  statemine: ['statemint', 'statemine'],
  bifrost: ['bifrost'],
  genshiro: ['genshiro_testnet', 'genshiro', 'equilibrium_parachain'],
  kintsugi: ['kintsugi', 'kintsugi_test', 'interlay'],
  acala: ['karura', 'acala', 'acala_testnet'],
  astarEvm: ['astarEvm', 'shidenEvm']
};

export const _XCM_CHAIN_USE_LIMITED_WIGHT = ['acala', 'karura', 'statemint'];

export const _XCM_TYPE = {
  RP: `${_SubstrateChainType.RELAYCHAIN}-${_SubstrateChainType.PARACHAIN}`,
  PP: `${_SubstrateChainType.PARACHAIN}-${_SubstrateChainType.PARACHAIN}`,
  PR: `${_SubstrateChainType.PARACHAIN}-${_SubstrateChainType.RELAYCHAIN}`
};

export const _DEFAULT_ACTIVE_CHAINS = [
  ..._DEFAULT_CHAINS,
  'ethereum',
  'acala',
  'moonbeam'
];