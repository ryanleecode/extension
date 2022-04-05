// Copyright 2019-2022 @polkadot/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from 'ethereumjs-tx';

import { SubmittableExtrinsic } from '@polkadot/api/types';
import { RMRK_VER } from '@polkadot/extension-base/background/KoniTypes';
import { RuntimeDispatchInfo } from '@polkadot/types/interfaces';

// For rendering purposes only
export interface _NftItem {
  id?: string;
  name?: string;
  image?: string;
  external_url?: string;
  rarity?: string;
  collectionId?: string;
  description?: string;
  properties?: Record<any, any> | null;
  chain?: string;
  rmrk_ver?: RMRK_VER;
}

export interface _NftCollection {
  collectionId: string;
  collectionName?: string;
  image?: string;
  chain?: string;
  nftItems: _NftItem[];
}

export interface _NftJson {
  ready?: boolean;
  total: number;
  nftList: Array<_NftCollection>;
}

export interface Web3TransferParams {
  tx: Transaction;
  estimatedGas: number;
}

export interface SubstrateTransferParams {
  extrinsic: SubmittableExtrinsic<'promise'>;
  txInfo?: RuntimeDispatchInfo;
}

export interface TransferResponse {
  info?: RuntimeDispatchInfo;
  extrinsic?: SubmittableExtrinsic<'promise'>;
  web3Tx?: Transaction;
  estimatedGas?: number
}

export enum SUPPORTED_TRANSFER_CHAIN_NAME {
  statemine = 'statemine',
  acala = 'acala',
  karura = 'karura',
  kusama = 'kusama',
  uniqueNft = 'uniqueNft',
  quartz = 'quartz',
  opal = 'opal',
  statemint = 'statemint',
  moonbeam = 'moonbeam',
  moonbase = 'moonbase',
  moonriver = 'moonriver',
  astar = 'astar',
  shiden = 'shiden',
  shibuya = 'shibuya',
  bitcountry = 'bitcountry'
}

export const SUPPORTED_TRANSFER_SUBSTRATE_CHAIN = [
  SUPPORTED_TRANSFER_CHAIN_NAME.statemine as string,
  SUPPORTED_TRANSFER_CHAIN_NAME.acala as string,
  SUPPORTED_TRANSFER_CHAIN_NAME.karura as string,
  SUPPORTED_TRANSFER_CHAIN_NAME.kusama as string,
  SUPPORTED_TRANSFER_CHAIN_NAME.uniqueNft as string,
  SUPPORTED_TRANSFER_CHAIN_NAME.quartz as string,
  SUPPORTED_TRANSFER_CHAIN_NAME.opal as string,
  SUPPORTED_TRANSFER_CHAIN_NAME.statemint as string,
  SUPPORTED_TRANSFER_CHAIN_NAME.bitcountry as string
];

export const SUPPORTED_TRANSFER_EVM_CHAIN = [
  SUPPORTED_TRANSFER_CHAIN_NAME.moonbase as string,
  SUPPORTED_TRANSFER_CHAIN_NAME.moonbeam as string,
  SUPPORTED_TRANSFER_CHAIN_NAME.moonriver as string,
  SUPPORTED_TRANSFER_CHAIN_NAME.astar as string,
  SUPPORTED_TRANSFER_CHAIN_NAME.shiden as string,
  SUPPORTED_TRANSFER_CHAIN_NAME.shibuya as string
];

export const TRANSFER_CHAIN_ID = {
  [SUPPORTED_TRANSFER_CHAIN_NAME.moonbase as string]: 1287,
  [SUPPORTED_TRANSFER_CHAIN_NAME.moonbeam as string]: 1284,
  [SUPPORTED_TRANSFER_CHAIN_NAME.moonriver as string]: 1285,
  [SUPPORTED_TRANSFER_CHAIN_NAME.astar as string]: 592,
  [SUPPORTED_TRANSFER_CHAIN_NAME.shiden as string]: 336,
  [SUPPORTED_TRANSFER_CHAIN_NAME.shibuya as string]: 81
};