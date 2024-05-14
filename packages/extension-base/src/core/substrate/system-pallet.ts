// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import BigN from 'bignumber.js';

// https://crates.parity.io/frame_system/struct.AccountInfo.html
// https://wiki.polkadot.network/docs/learn-account-balances
export type FrameSystemAccountInfoV2 = Omit<FrameSystemAccountInfoV1, 'data'> & {
  data: {
    free: number,
    reserved: number,
    frozen: number,
    flags: number
  }
}

export type FrameSystemAccountInfoV1 = {
  nonce: number,
  consumers: number,
  providers: number,
  sufficients: number,
  data: {
    free: number | string,
    reserved: number,
    miscFrozen: number,
    feeFrozen: number
  }
}

export type FrameSystemAccountInfo = FrameSystemAccountInfoV1 | FrameSystemAccountInfoV2;

function isV1 (accountInfo: FrameSystemAccountInfo): accountInfo is FrameSystemAccountInfoV1 {
  return (accountInfo as FrameSystemAccountInfoV1).data.miscFrozen !== undefined && (accountInfo as FrameSystemAccountInfoV1).data.feeFrozen !== undefined;
}

export function _getSystemPalletTransferable (accountInfo: FrameSystemAccountInfo, existentialDeposit: string, strictMode?: boolean): string {
  if (isV1(accountInfo)) {
    return _getSystemPalletTransferableV1(accountInfo, existentialDeposit, strictMode);
  } else {
    return _getSystemPalletTransferableV2(accountInfo, existentialDeposit, strictMode);
  }
}

export function _canAccountBeReaped (accountInfo: FrameSystemAccountInfo): boolean {
  return accountInfo.consumers === 0; // might need to check refCount
}

export function _isAccountActive (accountInfo: FrameSystemAccountInfo): boolean {
  return accountInfo.providers === 0 && accountInfo.consumers === 0;
}

export function _getSystemPalletTotalBalance (accountInfo: FrameSystemAccountInfo): string {
  if (isV1(accountInfo)) {
    return _getSystemPalletTotalBalanceV1(accountInfo);
  } else {
    return _getSystemPalletTotalBalanceV2(accountInfo);
  }
}

// ----------------------------------------------------------------------

function _getSystemPalletTransferableV2 (accountInfo: FrameSystemAccountInfoV2, existentialDeposit: string, strictMode?: boolean): string {
  const bnFree = new BigN(accountInfo.data.free);
  const bnLocked = new BigN(accountInfo.data.frozen).minus(accountInfo.data.reserved); // locked can go below 0 but this shouldn't matter
  const bnAppliedExistentialDeposit = new BigN(_getAppliedExistentialDeposit(accountInfo, existentialDeposit, strictMode));

  return bnFree.minus(BigN.max(bnLocked, bnAppliedExistentialDeposit)).toString();
}

function _getSystemPalletTotalBalanceV2 (accountInfo: FrameSystemAccountInfoV2): string {
  return new BigN(accountInfo.data.free).plus(accountInfo.data.reserved).toString();
}

function _getSystemPalletTransferableV1 (accountInfo: FrameSystemAccountInfoV1, existentialDeposit: string, strictMode?: boolean): string {
  const bnAppliedExistentialDeposit = new BigN(_getAppliedExistentialDeposit(accountInfo, existentialDeposit, strictMode));
  const bnAppliedFrozen = BigN.max(accountInfo.data.feeFrozen, accountInfo.data.miscFrozen);
  const bnTotalBalance = new BigN(_getSystemPalletTotalBalanceV1(accountInfo));

  return bnTotalBalance.minus(BigN.max(bnAppliedFrozen, accountInfo.data.reserved, bnAppliedExistentialDeposit)).toString();
}

function _getSystemPalletTotalBalanceV1 (accountInfo: FrameSystemAccountInfoV1): string {
  return new BigN(accountInfo.data.free).toString();
}

function _getAppliedExistentialDeposit (accountInfo: FrameSystemAccountInfo, existentialDeposit: string, strictMode?: boolean): string {
  // strict mode will always apply existential deposit to keep account alive
  if (strictMode) {
    return existentialDeposit;
  }

  return _canAccountBeReaped(accountInfo) ? '0' : existentialDeposit; // account for ED here will go better with max transfer logic
}
