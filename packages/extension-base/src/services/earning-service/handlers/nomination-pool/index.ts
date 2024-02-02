// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { TransactionError } from '@subwallet/extension-base/background/errors/TransactionError';
import { APIItemState, BasicTxErrorType, ChainType, ExtrinsicType, NominationInfo, StakingTxErrorType, StakingType, UnstakingInfo } from '@subwallet/extension-base/background/KoniTypes';
import { calculateChainStakedReturn, calculateChainStakedReturnV2, calculateInflation, getExistUnstakeErrorMessage, getMinStakeErrorMessage, parsePoolStashAddress } from '@subwallet/extension-base/koni/api/staking/bonding/utils';
import KoniState from '@subwallet/extension-base/koni/background/handlers/State';
import { _EXPECTED_BLOCK_TIME, _STAKING_ERA_LENGTH_MAP } from '@subwallet/extension-base/services/chain-service/constants';
import { _SubstrateApi } from '@subwallet/extension-base/services/chain-service/types';
import { _getChainSubstrateAddressPrefix } from '@subwallet/extension-base/services/chain-service/utils';
import { BaseYieldPositionInfo, EarningRewardHistoryItem, EarningRewardItem, EarningStatus, HandleYieldStepData, NominationPoolInfo, NominationYieldPoolInfo, OptimalYieldPath, OptimalYieldPathParams, PalletNominationPoolsBondedPoolInner, PalletNominationPoolsPoolMember, PalletStakingExposure, PalletStakingNominations, RequestStakePoolingBonding, StakeCancelWithdrawalParams, SubmitJoinNominationPool, SubmitYieldJoinData, TransactionData, UnstakingStatus, YieldPoolInfo, YieldPoolMethodInfo, YieldPoolType, YieldPositionInfo, YieldStepBaseInfo, YieldStepType, YieldTokenBaseInfo } from '@subwallet/extension-base/types';
import { balanceFormatter, formatNumber, reformatAddress } from '@subwallet/extension-base/utils';
import BigN from 'bignumber.js';
import { t } from 'i18next';

import { SubmittableExtrinsic } from '@polkadot/api/types';
import { UnsubscribePromise } from '@polkadot/api-base/types/base';
import { DeriveSessionProgress } from '@polkadot/api-derive/types';
import { Codec } from '@polkadot/types/types';
import { BN, BN_ZERO, hexToString, isHex, noop } from '@polkadot/util';

import BasePoolHandler from '../base';

export default class NominationPoolHandler extends BasePoolHandler {
  public readonly type = YieldPoolType.NOMINATION_POOL;
  protected readonly name: string;
  protected readonly shortName: string;
  public slug: string;
  protected readonly availableMethod: YieldPoolMethodInfo = {
    join: true,
    defaultUnstake: true,
    fastUnstake: false,
    cancelUnstake: false,
    withdraw: true,
    claimReward: true
  };

  constructor (state: KoniState, chain: string) {
    super(state, chain);

    const _chainAsset = this.nativeToken;
    const _chainInfo = this.chainInfo;

    const symbol = _chainAsset.symbol;
    const tokenName = _chainAsset.name;

    this.slug = `${symbol}___nomination_pool___${_chainInfo.slug}`;
    this.name = `${tokenName} Nomination Pool`;
    this.shortName = _chainInfo.name.replaceAll(' Relay Chain', '');
  }

  protected getDescription (amount = '0'): string {
    const _chainAsset = this.nativeToken;
    const symbol = _chainAsset.symbol;

    return `Start staking with just {{amount}} ${symbol}`.replace('{{amount}}', amount);
  }

  /* Subscribe pool info */

  async subscribePoolInfo (callback: (data: YieldPoolInfo) => void): Promise<VoidFunction> {
    let cancel = false;
    const substrateApi = this.substrateApi;
    const chainInfo = this.chainInfo;
    const nativeToken = this.nativeToken;

    const defaultCallback = async () => {
      const data: NominationYieldPoolInfo = {
        ...this.baseInfo,
        type: this.type,
        metadata: {
          ...this.metadataInfo,
          description: this.getDescription()
        }
      };

      const poolInfo = await this.getPoolInfo();

      !poolInfo && callback(data);
    };

    if (!this.isActive) {
      await defaultCallback();

      return () => {
        cancel = true;
      };
    }

    await defaultCallback();

    await substrateApi.isReady;

    const unsub = await (substrateApi.api.query.staking?.currentEra(async (_currentEra: Codec) => {
      if (cancel) {
        unsub();

        return;
      }

      if (!substrateApi.api.query.nominationPools) {
        return;
      }

      const currentEra = _currentEra.toString();
      const maxUnlockingChunks = substrateApi.api.consts.staking.maxUnlockingChunks.toString();
      const unlockingEras = substrateApi.api.consts.staking.bondingDuration.toString();

      const epochDuration = substrateApi.api.consts.babe.epochDuration.toString();
      const blockTime = _EXPECTED_BLOCK_TIME[chainInfo.slug];
      const sessionsPerEra = substrateApi.api.consts.staking.sessionsPerEra.toString();
      const maxSupportedDays = substrateApi.api.consts.staking.historyDepth.toString(); // todo: check maxSupportedDays to calculate for 30 or 15 days

      const supportedDays = 30;
      const startEra = parseInt(currentEra) - supportedDays;
      const eraRewardPromises = [];

      for (let era = startEra; era < parseInt(currentEra); era++) {
        eraRewardPromises.push(substrateApi.api.query.staking.erasValidatorReward(era));
      }

      const [_totalEraStake, _totalIssuance, _auctionCounter, _minPoolJoin, _lastTotalStaked, ..._eraReward] = await Promise.all([
        substrateApi.api.query.staking.erasTotalStake(parseInt(currentEra)),
        substrateApi.api.query.balances.totalIssuance(),
        substrateApi.api.query.auctions?.auctionCounter(),
        substrateApi.api.query?.nominationPools?.minJoinBond(),
        substrateApi.api.query.staking.erasTotalStake(parseInt(currentEra) - 1),
        ...eraRewardPromises
      ]);

      let sumEraReward = new BigN(0);
      let failEra = 0; // todo: handle case era not return rewards.

      for (const _item of _eraReward) {
        const item = _item.toString();

        if (!item) {
          failEra += 1;
        } else {
          const eraReward = new BigN(item);

          sumEraReward = sumEraReward.plus(eraReward);
        }
      }

      const validatorEraReward = sumEraReward.dividedBy(new BigN(supportedDays - failEra));
      const lastTotalStaked = _lastTotalStaked.toString();

      const rawTotalEraStake = _totalEraStake.toString();
      const rawTotalIssuance = _totalIssuance.toString();

      const numAuctions = _auctionCounter ? _auctionCounter.toHuman() as number : 0;
      const bnTotalEraStake = new BN(rawTotalEraStake);
      const bnTotalIssuance = new BN(rawTotalIssuance);

      const inflation = calculateInflation(bnTotalEraStake, bnTotalIssuance, numAuctions, chainInfo.slug);
      const minPoolJoin = _minPoolJoin?.toString() || undefined;
      const expectedReturn = calculateChainStakedReturnV2(new BigN(rawTotalIssuance), new BigN(blockTime), new BigN(epochDuration), new BigN(sessionsPerEra), new BigN(lastTotalStaked), validatorEraReward);
      const eraTime = _STAKING_ERA_LENGTH_MAP[this.chain] || _STAKING_ERA_LENGTH_MAP.default; // in hours
      const unlockingPeriod = parseInt(unlockingEras) * eraTime; // in hours

      const minToHuman = formatNumber(minPoolJoin || '0', nativeToken.decimals || 0, balanceFormatter);

      const data: NominationYieldPoolInfo = {
        ...this.baseInfo,
        type: this.type,
        metadata: {
          ...this.metadataInfo,
          description: this.getDescription(minToHuman)
        },
        statistic: {
          assetEarning: [
            {
              slug: this.nativeToken.slug,
              apy: expectedReturn
            }
          ],
          maxCandidatePerFarmer: 1,
          maxWithdrawalRequestPerFarmer: parseInt(maxUnlockingChunks), // TODO recheck
          earningThreshold: {
            join: minPoolJoin || '0',
            defaultUnstake: '0',
            fastUnstake: '0'
          },
          farmerCount: 0, // TODO recheck
          era: parseInt(currentEra),
          eraTime,
          tvl: bnTotalEraStake.toString(), // TODO recheck
          totalApy: expectedReturn, // TODO recheck
          unstakingPeriod: unlockingPeriod,
          inflation: inflation
        }
      };

      callback(data);
    }) as unknown as UnsubscribePromise);

    return () => {
      cancel = true;
      unsub();
    };
  }

  /* Subscribe pool info */

  /* Subscribe pool position */

  async parsePoolMemberMetadata (substrateApi: _SubstrateApi, poolMemberInfo: PalletNominationPoolsPoolMember, currentEra: string, _deriveSessionProgress: DeriveSessionProgress): Promise<Omit<YieldPositionInfo, keyof BaseYieldPositionInfo>> {
    const chainInfo = this.chainInfo;
    const unlimitedNominatorRewarded = substrateApi.api.consts.staking.maxExposurePageSize !== undefined;
    const _maxNominatorRewardedPerValidator = (substrateApi.api.consts.staking.maxNominatorRewardedPerValidator || 0).toString();
    const maxNominatorRewardedPerValidator = parseInt(_maxNominatorRewardedPerValidator);
    const poolsPalletId = substrateApi.api.consts.nominationPools.palletId.toString();
    const poolStashAccount = parsePoolStashAddress(substrateApi.api, 0, poolMemberInfo.poolId, poolsPalletId);

    const [_nominations, _poolMetadata] = await Promise.all([
      substrateApi.api.query.staking.nominators(poolStashAccount),
      substrateApi.api.query.nominationPools.metadata(poolMemberInfo.poolId)
    ]);

    const poolMetadata = _poolMetadata.toPrimitive() as unknown as string;
    const nominations = _nominations.toJSON() as unknown as PalletStakingNominations;
    const poolName = isHex(poolMetadata) ? hexToString(poolMetadata) : poolMetadata;

    let stakingStatus = EarningStatus.NOT_EARNING;

    if (nominations) {
      const validatorList = nominations.targets;

      await Promise.all(validatorList.map(async (validatorAddress) => {
        const _eraStaker = await substrateApi.api.query.staking.erasStakers(currentEra, validatorAddress);
        const eraStaker = _eraStaker.toPrimitive() as unknown as PalletStakingExposure;

        const sortedNominators = eraStaker.others
          .sort((a, b) => {
            return new BigN(b.value).minus(a.value).toNumber();
          })
        ;

        const topNominators = sortedNominators
          .map((nominator) => {
            return nominator.who;
          })
          .slice(0, unlimitedNominatorRewarded ? undefined : maxNominatorRewardedPerValidator)
        ;

        if (topNominators.includes(reformatAddress(poolStashAccount, _getChainSubstrateAddressPrefix(chainInfo)))) { // if address in top nominators
          stakingStatus = EarningStatus.EARNING_REWARD;
        }
      }));
    }

    const joinedPoolInfo: NominationInfo = {
      activeStake: poolMemberInfo.points.toString(),
      chain: chainInfo.slug,
      status: stakingStatus,
      validatorIdentity: poolName,
      validatorAddress: poolMemberInfo.poolId.toString(), // use poolId
      hasUnstaking: poolMemberInfo.unbondingEras && Object.keys(poolMemberInfo.unbondingEras).length > 0
    };

    const unstakings: UnstakingInfo[] = [];
    let unstakingBalance = BN_ZERO;

    Object.entries(poolMemberInfo.unbondingEras).forEach(([unlockingEra, amount]) => {
      // Calculate the remaining time for current era ending
      const isClaimable = parseInt(unlockingEra) - parseInt(currentEra) < 0;
      const remainingEra = parseInt(unlockingEra) - parseInt(currentEra);
      const expectedBlockTime = _EXPECTED_BLOCK_TIME[this.chain];
      const eraLength = _deriveSessionProgress.eraLength.toNumber();
      const eraProgress = _deriveSessionProgress.eraProgress.toNumber();
      const remainingSlots = eraLength - eraProgress;
      const remainingHours = expectedBlockTime * remainingSlots / 60 / 60;
      const eraTime = _STAKING_ERA_LENGTH_MAP[chainInfo.slug] || _STAKING_ERA_LENGTH_MAP.default; // in hours
      const waitingTime = remainingEra * eraTime + remainingHours;

      unstakingBalance = unstakingBalance.add(new BN(amount));
      unstakings.push({
        chain: chainInfo.slug,
        status: isClaimable ? UnstakingStatus.CLAIMABLE : UnstakingStatus.UNLOCKING,
        claimable: amount.toString(),
        waitingTime: waitingTime
      } as UnstakingInfo);
    });

    const bnActiveStake = new BN(poolMemberInfo.points.toString());
    const bnTotalStake = bnActiveStake.add(unstakingBalance);

    if (!bnActiveStake.gt(BN_ZERO)) {
      stakingStatus = EarningStatus.NOT_EARNING;
    }

    return {
      status: stakingStatus,
      balanceToken: this.nativeToken.slug,
      totalStake: bnTotalStake.toString(),
      activeStake: bnActiveStake.toString(),
      unstakeBalance: unstakingBalance.toString(),
      isBondedBefore: bnTotalStake.gt(BN_ZERO),
      nominations: [joinedPoolInfo], // can only join 1 pool at a time
      unstakings
    };
  }

  async subscribePoolPosition (useAddresses: string[], resultCallback: (rs: YieldPositionInfo) => void): Promise<VoidFunction> {
    let cancel = false;
    const substrateApi = this.substrateApi;
    const defaultInfo = this.baseInfo;

    await substrateApi.isReady;

    const unsub = await substrateApi.api.query?.nominationPools?.poolMembers.multi(useAddresses, async (ledgers: Codec[]) => {
      if (cancel) {
        unsub();

        return;
      }

      if (ledgers) {
        const [_currentEra, _deriveSessionProgress] = await Promise.all([
          substrateApi.api.query.staking.currentEra(),
          substrateApi.api.derive?.session?.progress()
        ]);

        const currentEra = _currentEra.toString();

        await Promise.all(ledgers.map(async (_poolMemberInfo, i) => {
          const poolMemberInfo = _poolMemberInfo.toPrimitive() as unknown as PalletNominationPoolsPoolMember;
          const owner = reformatAddress(useAddresses[i], 42);

          if (poolMemberInfo) {
            const nominatorMetadata = await this.parsePoolMemberMetadata(substrateApi, poolMemberInfo, currentEra, _deriveSessionProgress);

            resultCallback({
              ...defaultInfo,
              ...nominatorMetadata,
              address: owner,
              type: this.type
            });
          } else {
            resultCallback({
              ...defaultInfo,
              type: this.type,
              address: owner,
              balanceToken: this.nativeToken.slug,
              totalStake: '0',
              activeStake: '0',
              unstakeBalance: '0',
              isBondedBefore: false,
              status: EarningStatus.NOT_STAKING,
              nominations: [], // can only join 1 pool at a time
              unstakings: []
            });
          }
        }));
      }
    });

    return () => {
      cancel = true;
      unsub();
    };
  }

  /* Subscribe pool position */

  /* Get pool reward */

  async getPoolReward (useAddresses: string[], callBack: (rs: EarningRewardItem) => void): Promise<VoidFunction> {
    let cancel = false;
    const substrateApi = this.substrateApi;

    await substrateApi.isReady;

    if (substrateApi.api.call.nominationPoolsApi) {
      for (const address of useAddresses) {
        if (!cancel) {
          const _unclaimedReward = await substrateApi.api.call?.nominationPoolsApi?.pendingRewards(address);

          if (_unclaimedReward) {
            callBack({
              ...this.baseInfo,
              address: address,
              type: this.type,
              unclaimedReward: _unclaimedReward.toString(),
              state: APIItemState.READY
            });
          }
        }
      }
    }

    return () => {
      cancel = false;
    };
  }

  async getPoolRewardHistory (useAddresses: string[], callBack: (rs: EarningRewardHistoryItem) => void): Promise<VoidFunction> {
    return new Promise((resolve) => resolve(noop));
  }

  /* Get pool reward */

  /* Get pool targets */

  async getPoolTargets (): Promise<NominationPoolInfo[]> {
    const substrateApi = await this.substrateApi.isReady;

    const nominationPools: NominationPoolInfo[] = [];

    const _allPoolsInfo = await substrateApi.api.query.nominationPools.reversePoolIdLookup.entries();

    await Promise.all(_allPoolsInfo.map(async (_poolInfo) => {
      const poolAddressList = _poolInfo[0].toHuman() as string[];
      const poolAddress = poolAddressList[0];
      const poolId = _poolInfo[1].toPrimitive() as number;
      const poolsPalletId = substrateApi.api.consts.nominationPools.palletId.toString();
      const poolStashAccount = parsePoolStashAddress(substrateApi.api, 0, poolId, poolsPalletId);

      const [_nominations, _bondedPool, _metadata, _minimumActiveStake] = await Promise.all([
        substrateApi.api.query.staking.nominators(poolStashAccount),
        substrateApi.api.query.nominationPools.bondedPools(poolId),
        substrateApi.api.query.nominationPools.metadata(poolId),
        substrateApi.api.query.staking.minimumActiveStake()
      ]);

      const minimumActiveStake = _minimumActiveStake.toPrimitive() as number;
      const nominations = _nominations.toJSON() as unknown as PalletStakingNominations;

      const poolMetadata = _metadata.toPrimitive() as unknown as string;
      const bondedPool = _bondedPool.toPrimitive() as unknown as PalletNominationPoolsBondedPoolInner;

      const poolName = isHex(poolMetadata) ? hexToString(poolMetadata) : poolMetadata;

      const isPoolOpen = bondedPool.state === 'Open';
      const isPoolNominating = !!nominations && nominations.targets.length > 0;
      const isPoolEarningReward = bondedPool.points > minimumActiveStake;

      nominationPools.push({
        id: poolId,
        address: poolAddress,
        name: poolName,
        bondedAmount: bondedPool.points?.toString() || '0',
        roles: bondedPool.roles,
        memberCounter: bondedPool.memberCounter,
        state: bondedPool.state,
        isProfitable: isPoolOpen && isPoolNominating && isPoolEarningReward
      });
    }));

    return nominationPools;
  }

  /* Get pool targets */

  /* Join pool action */

  get defaultSubmitStep (): YieldStepBaseInfo {
    return [
      {
        name: 'Join nomination pool',
        type: YieldStepType.JOIN_NOMINATION_POOL
      },
      {
        slug: this.nativeToken.slug,
        amount: '0'
      }
    ];
  }

  protected async getSubmitStep (params: OptimalYieldPathParams): Promise<YieldStepBaseInfo> {
    const { address, amount, slug, targets } = params;

    if (!targets || !targets.length) {
      return Promise.reject(new TransactionError(BasicTxErrorType.INVALID_PARAMS));
    }

    const data: SubmitJoinNominationPool = {
      amount,
      address,
      slug,
      selectedPool: targets[0] as NominationPoolInfo
    };
    const positionInfo = await this.getPoolPosition(address);
    const [, fee] = await this.createJoinExtrinsic(data, positionInfo);

    return [
      {
        name: 'Join nomination pool',
        type: YieldStepType.JOIN_NOMINATION_POOL,
        metadata: {
          amount: amount
        }
      },
      fee
    ];
  }

  async validateYieldJoin (data: SubmitYieldJoinData, path: OptimalYieldPath): Promise<TransactionError[]> {
    const { address, amount, selectedPool } = data as SubmitJoinNominationPool;
    const _poolInfo = await this.getPoolInfo();
    const bnAmount = new BN(amount);

    if (bnAmount.lte(BN_ZERO)) {
      return [new TransactionError(BasicTxErrorType.INVALID_PARAMS, 'Amount must be greater than 0')];
    }

    if (!_poolInfo || !_poolInfo.statistic) {
      return Promise.resolve([new TransactionError(BasicTxErrorType.INTERNAL_ERROR)]);
    }

    const poolInfo = _poolInfo as NominationYieldPoolInfo;
    const chainInfo = this.chainInfo;

    const positionInfo = await this.getPoolPosition(address);

    // cannot stake when unstake all
    // amount >= min stake
    const errors: TransactionError[] = [];
    let bnTotalStake = new BN(amount);
    const bnMinStake = new BN(poolInfo.statistic?.earningThreshold.join || '0');
    const minStakeErrorMessage = getMinStakeErrorMessage(chainInfo, bnMinStake);
    const existUnstakeErrorMessage = getExistUnstakeErrorMessage(chainInfo.slug, StakingType.POOLED, true);

    if (selectedPool.state !== 'Open') {
      errors.push(new TransactionError(StakingTxErrorType.INACTIVE_NOMINATION_POOL));
    }

    if (positionInfo) {
      const bnCurrentActiveStake = new BN(positionInfo.activeStake);

      bnTotalStake = bnTotalStake.add(bnCurrentActiveStake);

      if (positionInfo.unstakings.length > 0 && bnCurrentActiveStake.isZero()) {
        errors.push(new TransactionError(StakingTxErrorType.EXIST_UNSTAKING_REQUEST, existUnstakeErrorMessage));
      }
    }

    if (!bnTotalStake.gte(bnMinStake)) {
      errors.push(new TransactionError(StakingTxErrorType.NOT_ENOUGH_MIN_STAKE, minStakeErrorMessage));
    }

    return errors;
  }

  async createJoinExtrinsic (data: SubmitJoinNominationPool, positionInfo?: YieldPositionInfo): Promise<[TransactionData, YieldTokenBaseInfo]> {
    const { amount, selectedPool: { id: selectedPoolId } } = data;

    const chainApi = await this.substrateApi.isReady;
    const bnActiveStake = new BN(positionInfo?.activeStake || '0');

    // eslint-disable-next-line @typescript-eslint/require-await
    const compoundResult = async (extrinsic: SubmittableExtrinsic<'promise'>): Promise<[TransactionData, YieldTokenBaseInfo]> => {
      const tokenSlug = this.nativeToken.slug;
      // const feeInfo = await extrinsic.paymentInfo(address);
      // const fee = feeInfo.toPrimitive() as unknown as RuntimeDispatchInfo;

      // Not use the fee to validate and to display on UI
      return [extrinsic, { slug: tokenSlug, amount: '0' }];
    };

    if (bnActiveStake.gt(BN_ZERO)) { // already joined a pool
      const extrinsic = chainApi.api.tx.nominationPools.bondExtra({ FreeBalance: amount });

      return compoundResult(extrinsic);
    }

    const extrinsic = chainApi.api.tx.nominationPools.join(amount, selectedPoolId);

    return compoundResult(extrinsic);
  }

  async handleYieldJoin (_data: SubmitYieldJoinData, path: OptimalYieldPath, currentStep: number): Promise<HandleYieldStepData> {
    const data = _data as SubmitJoinNominationPool;
    const { address, amount, selectedPool } = data;
    const positionInfo = await this.getPoolPosition(address);
    const [extrinsic] = await this.createJoinExtrinsic(data, positionInfo);

    const joinPoolData: RequestStakePoolingBonding = {
      poolPosition: positionInfo,
      slug: this.slug,
      selectedPool,
      amount,
      address
    };

    return {
      txChain: this.chain,
      extrinsicType: ExtrinsicType.STAKING_JOIN_POOL,
      extrinsic,
      txData: joinPoolData,
      transferNativeAmount: amount,
      chainType: ChainType.SUBSTRATE
    };
  }

  /* Join pool action */

  /* Leave pool action */

  /**
   * @todo Recheck
   * */
  async validateYieldLeave (amount: string, address: string, fastLeave: boolean, selectedTarget?: string): Promise<TransactionError[]> {
    const errors: TransactionError[] = [];

    const poolInfo = await this.getPoolInfo();
    const poolPosition = await this.getPoolPosition(address);

    if (!poolInfo || !poolPosition || fastLeave || !poolInfo.statistic) {
      return [new TransactionError(BasicTxErrorType.INTERNAL_ERROR)];
    }

    if (fastLeave) {
      return [new TransactionError(BasicTxErrorType.INVALID_PARAMS)];
    }

    const bnAmount = new BN(amount);

    if (bnAmount.lte(BN_ZERO)) {
      errors.push(new TransactionError(BasicTxErrorType.INVALID_PARAMS, t('Amount must be greater than 0')));
    }

    const bnActiveStake = new BN(poolPosition.activeStake);
    const bnRemainingStake = bnActiveStake.sub(new BN(amount));
    const minStake = new BN(poolInfo.statistic.earningThreshold.join || '0');
    const maxUnstake = poolInfo.statistic.maxWithdrawalRequestPerFarmer;

    if (!(bnRemainingStake.isZero() || bnRemainingStake.gte(minStake))) {
      errors.push(new TransactionError(StakingTxErrorType.INVALID_ACTIVE_STAKE));
    }

    if (poolPosition.unstakings.length > maxUnstake) {
      errors.push(new TransactionError(StakingTxErrorType.EXCEED_MAX_UNSTAKING, t('You cannot unstake more than {{number}} times', { replace: { number: maxUnstake } })));
    }

    return Promise.resolve(errors);
  }

  async handleYieldRedeem (amount: string, address: string, selectedTarget?: string): Promise<[ExtrinsicType, TransactionData]> {
    return Promise.reject(new TransactionError(BasicTxErrorType.UNSUPPORTED));
  }

  async handleYieldUnstake (amount: string, address: string, selectedTarget?: string): Promise<[ExtrinsicType, TransactionData]> {
    const chainApi = await this.substrateApi.isReady;
    const poolPosition = await this.getPoolPosition(address);

    if (!poolPosition) {
      return Promise.reject(new TransactionError(BasicTxErrorType.INTERNAL_ERROR));
    }

    const extrinsic = chainApi.api.tx.nominationPools.unbond({ Id: poolPosition.address }, amount);

    return [ExtrinsicType.STAKING_LEAVE_POOL, extrinsic];
  }

  /* Leave pool action */

  /* Other action */

  handleYieldCancelUnstake (params: StakeCancelWithdrawalParams): Promise<TransactionData> {
    return Promise.reject(new TransactionError(BasicTxErrorType.UNSUPPORTED));
  }

  async handleYieldClaimReward (address: string, bondReward?: boolean): Promise<TransactionData> {
    const chainApi = await this.substrateApi.isReady;

    if (bondReward) {
      return chainApi.api.tx.nominationPools.bondExtra('Rewards');
    }

    return chainApi.api.tx.nominationPools.claimPayout();
  }

  async handleYieldWithdraw (address: string, unstakingInfo: UnstakingInfo): Promise<TransactionData> {
    const chainApi = await this.substrateApi.isReady;

    if (chainApi.api.tx.nominationPools.withdrawUnbonded.meta.args.length === 2) {
      const _slashingSpans = (await chainApi.api.query.staking.slashingSpans(address)).toHuman() as Record<string, any>;
      const slashingSpanCount = _slashingSpans !== null ? _slashingSpans.spanIndex as string : '0';

      return chainApi.api.tx.nominationPools.withdrawUnbonded({ Id: address }, slashingSpanCount);
    } else {
      return chainApi.api.tx.nominationPools.withdrawUnbonded({ Id: address });
    }
  }

  /* Other actions */
}
