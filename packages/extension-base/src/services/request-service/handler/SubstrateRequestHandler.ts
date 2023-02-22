// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import RequestExtrinsicSign from '@subwallet/extension-base/background/RequestExtrinsicSign';
import { AccountJson, RequestSign, Resolver, ResponseSigning } from '@subwallet/extension-base/background/types';
import RequestService from '@subwallet/extension-base/services/request-service';
import { EXTENSION_REQUEST_URL } from '@subwallet/extension-base/services/request-service/constants';
import { SigningRequest, SignRequest } from '@subwallet/extension-base/services/request-service/types';
import { getId } from '@subwallet/extension-base/utils/getId';
import keyring from '@subwallet/ui-keyring';
import { BehaviorSubject } from 'rxjs';

import { SignerPayloadJSON } from '@polkadot/types/types/extrinsic';
import { logger as createLogger } from '@polkadot/util/logger';
import { Logger } from '@polkadot/util/types';

export default class SubstrateRequestHandler {
  readonly #logger: Logger;
  readonly #requestService: RequestService;
  readonly #substrateRequests: Record<string, SignRequest> = {};
  public readonly signSubject: BehaviorSubject<SigningRequest[]> = new BehaviorSubject<SigningRequest[]>([]);

  constructor (requestService: RequestService) {
    this.#requestService = requestService;
    this.#logger = createLogger('SubstrateRequestHandler');
  }

  public getSignRequest (id: string): SignRequest | undefined {
    return this.#substrateRequests[id];
  }

  public get allSubstrateRequests (): SigningRequest[] {
    return Object
      .values(this.#substrateRequests)
      .map(({ account, id, request, url }): SigningRequest => ({ account, id, request, url }));
  }

  private updateIconSign (shouldClose?: boolean): void {
    this.signSubject.next(this.allSubstrateRequests);
    this.#requestService.updateIconV2(shouldClose);
  }

  private signComplete = (id: string, resolve: (result: ResponseSigning) => void, reject: (error: Error) => void): Resolver<ResponseSigning> => {
    const complete = (): void => {
      delete this.#substrateRequests[id];
      this.updateIconSign(true);
    };

    return {
      reject: (error: Error): void => {
        complete();
        this.#logger.log(error);
        reject(error);
      },
      resolve: (result: ResponseSigning): void => {
        complete();
        resolve(result);
      }
    };
  };

  public get numSubstrateRequests (): number {
    return Object.keys(this.#substrateRequests).length;
  }

  public sign (url: string, request: RequestSign, account: AccountJson): Promise<ResponseSigning> {
    const id = getId();

    return new Promise((resolve, reject): void => {
      this.#substrateRequests[id] = {
        ...this.signComplete(id, resolve, reject),
        account,
        id,
        request,
        url
      };

      this.updateIconSign();
      this.#requestService.popupOpen();
    });
  }

  public signInternalTransaction (id: string, address: string, payload: SignerPayloadJSON): Promise<ResponseSigning> {
    return new Promise((resolve, reject): void => {
      const pair = keyring.getPair(address);
      const account: AccountJson = { address: pair.address, ...pair.meta };

      this.#substrateRequests[id] = {
        ...this.signComplete(id, resolve, reject),
        account,
        id,
        request: new RequestExtrinsicSign(payload),
        url: EXTENSION_REQUEST_URL
      };

      this.updateIconSign();
      this.#requestService.popupOpen();
    });
  }
}
