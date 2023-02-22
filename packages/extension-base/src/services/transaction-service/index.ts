// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ChainService } from '@subwallet/extension-base/services/chain-service';
import RequestService from '@subwallet/extension-base/services/request-service';
import DatabaseService from '@subwallet/extension-base/services/storage-service/DatabaseService';
import { KoniTransactionStatus, SendTransactionEvents, SWTransaction, SWTransactionInput, TransactionEventResponse } from '@subwallet/extension-base/services/transaction-service/types';
import EventEmitter from 'eventemitter3';
import { BehaviorSubject } from 'rxjs';
import { TransactionConfig } from 'web3-core';

import { SubmittableExtrinsic } from '@polkadot/api/promise/types';
import {Signer, SignerResult} from '@polkadot/api/types';
import { SignerPayloadJSON } from '@polkadot/types/types/extrinsic';
import { logger as createLogger } from '@polkadot/util/logger';
import { Logger } from '@polkadot/util/types';

export default class TransactionService {
  private readonly chainService: ChainService;
  private readonly dbService: DatabaseService;
  private readonly requestService: RequestService;
  private readonly logger: Logger;

  public readonly transactionSubject: BehaviorSubject<Record<string, SWTransaction>> = new BehaviorSubject<Record<string, SWTransaction>>({});

  private get transactions (): Record<string, SWTransaction> {
    return this.transactionSubject.getValue();
  }

  constructor (chainService: ChainService, dbService: DatabaseService, requestService: RequestService) {
    this.chainService = chainService;
    this.dbService = dbService;
    this.requestService = requestService;

    this.logger = createLogger('TransactionService');
  }

  private get allTransactions (): SWTransaction[] {
    return Object.values(this.transactions);
  }

  private get pendingTransactions (): SWTransaction[] {
    return this.allTransactions.filter((t) => t.status === 'PENDING');
  }

  private validateTransaction (transaction: SWTransaction): boolean {
    // Check duplicated transaction
    const existed = this.pendingTransactions
      .filter((item) => item.address === transaction.address && item.chain === transaction.chain);

    return !(existed.length > 0);
  }

  public notice (message: string): void {
    this.logger.log(message);
  }

  fillTransactionDefaultInfo (transaction: SWTransactionInput): SWTransaction {
    return {
      ...transaction,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: KoniTransactionStatus.PENDING,
      id: '0x' + Math.random().toString(36).substr(2, 9),
      extrinsicHash: ''
    } as SWTransaction;
  }

  public addTransaction (inputTransaction: SWTransactionInput): string {
    // Fill transaction default info
    const transaction = this.fillTransactionDefaultInfo(inputTransaction);

    // Validate Transaction
    const idValid = this.validateTransaction(transaction);

    if (!idValid) {
      this.logger.log('Invalid transaction');
      throw new Error('Invalid transaction');
    }

    // Add Transaction
    this.transactions[transaction.id] = transaction;
    this.transactionSubject.next({ ...this.transactions });

    this.sendTransaction(transaction).catch(console.error);

    return transaction.id;
  }

  public async sendTransaction (transaction: SWTransaction): Promise<void> {
    // Send Transaction
    const emitter = transaction.chainType === 'substrate' ? this.signAndSendSubstrateTransaction(transaction) : this.signAndSendEvmTransaction(transaction);

    emitter.on('extrinsicHash', (data: TransactionEventResponse) => {
      this.onHasTransactionHash(data);
      // Todo: Create transaction history
    });

    emitter.on('success', (data: TransactionEventResponse) => {
      // Todo: Write success transaction history
      this.onSuccess(data);
    });

    emitter.on('error', (data: TransactionEventResponse) => {
      this.onFailed(data.error || new Error('Unknown error'));
      // Todo: Write failed transaction history
    });

    // setTimeout(() => {
    //   emitter.emit('error', { id: transaction.id, error: new Error('Timeout') });
    // }, 120000);

    await Promise.resolve();
  }

  public removeTransaction (id: string): void {
    if (this.transactions[id]) {
      delete this.transactions[id];
      this.transactionSubject.next({ ...this.transactions });
    }
  }

  private onHasTransactionHash ({ extrinsicHash, id }: TransactionEventResponse) {
    console.log(id, extrinsicHash);
  }

  private onSuccess ({ extrinsicHash, id }: TransactionEventResponse) {
    console.log(id, extrinsicHash);
  }

  private onFailed (error: Error) {
    console.log(error);
  }

  private signAndSendEvmTransaction ({ chain, id, transaction }: SWTransaction): EventEmitter<SendTransactionEvents, TransactionEventResponse> {
    const payload = (transaction as TransactionConfig);
    // Todo: Write interface for requestService
    const signedTransaction = '0x';

    const emitter = new EventEmitter<SendTransactionEvents, TransactionEventResponse>();

    this.chainService.getEvmApi(chain).api.eth.sendSignedTransaction(signedTransaction)
      .once('transactionHash', (hash) => {
        emitter.emit('extrinsicHash', { id, extrinsicHash: hash });
      })
      .once('receipt', (rs) => {
        // Todo: Set success and handler more info to save transaction history
        emitter.emit('success', { id, transactionHash: rs.transactionHash });
      })
      .once('error', (e) => {
        emitter.emit('error', { id, error: e });
      }).catch((e) => {
        emitter.emit('error', { id, error: e as Error });
      });

    return emitter;
  }

  private signAndSendSubstrateTransaction ({ address, id, transaction }: SWTransaction): EventEmitter<SendTransactionEvents, TransactionEventResponse> {
    const emitter = new EventEmitter<SendTransactionEvents, TransactionEventResponse>();

    (transaction as SubmittableExtrinsic).signAsync(address, {
      signer: {
        signPayload: async (payload: SignerPayloadJSON) => {
          const signing = await this.requestService.signInternalTransaction(id, address, payload);

          return {
            id: (new Date()).getTime(),
            signature: signing.signature
          } as SignerResult;
        }
      } as Signer
    }).then((rs) => {
      // Todo: Handle and emit event from runningTransaction
      rs.send().then((result) => {
        emitter.emit('extrinsicHash', { id, extrinsicHash: result.toHex() });
      }).then(() => {
        emitter.emit('success', { id });
      }).catch((e: Error) => {
        emitter.emit('error', { id, error: e });
      });
    }).catch((e: Error) => {
      this.removeTransaction(id);
      emitter.emit('error', { id, error: e });
    });

    return emitter;
  }
}
