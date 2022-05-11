// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { OnChangeCb } from '../types';

import { isFunction, isObservable } from '@polkadot/util';

export default function triggerChange (value?: unknown, ...callOnResult: (OnChangeCb | undefined)[]): void {
  if (!callOnResult || !callOnResult.length) {
    return;
  }

  callOnResult.forEach((callOnResult): void => {
    if (isObservable(callOnResult)) {
      callOnResult.next(value);
    } else if (isFunction(callOnResult)) {
      callOnResult(value);
    }
  });
}
