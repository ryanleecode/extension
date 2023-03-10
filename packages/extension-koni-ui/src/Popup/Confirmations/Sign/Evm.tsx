// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ConfirmationDefinitions, ConfirmationResult } from '@subwallet/extension-base/background/KoniTypes';
import { CONFIRMATION_QR_MODAL } from '@subwallet/extension-koni-ui/constants/modal';
import { SIGN_MODE } from '@subwallet/extension-koni-ui/constants/signing';
import { completeConfirmation } from '@subwallet/extension-koni-ui/messaging';
import DisplayPayloadModal from '@subwallet/extension-koni-ui/Popup/Confirmations/Qr/DisplayPayload';
import EvmQr from '@subwallet/extension-koni-ui/Popup/Confirmations/Qr/DisplayPayload/Evm';
import ScanSignature from '@subwallet/extension-koni-ui/Popup/Confirmations/Qr/ScanSignature';
import { PhosphorIcon, SigData, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { EvmSignatureSupportType } from '@subwallet/extension-koni-ui/types/confirmation';
import { isEvmMessage } from '@subwallet/extension-koni-ui/util';
import { getSignMode } from '@subwallet/extension-koni-ui/util/account';
import { Button, Icon, ModalContext } from '@subwallet/react-ui';
import CN from 'classnames';
import { CheckCircle, QrCode, Swatches, XCircle } from 'phosphor-react';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

interface Props extends ThemeProps {
  id: string;
  type: EvmSignatureSupportType;
  payload: ConfirmationDefinitions[EvmSignatureSupportType][0];
}

const handleConfirm = async (type: EvmSignatureSupportType, id: string, payload: string) => {
  return await completeConfirmation(type, {
    id,
    isApproved: true,
    payload
  } as ConfirmationResult<string>);
};

const handleCancel = async (type: EvmSignatureSupportType, id: string) => {
  return await completeConfirmation(type, {
    id,
    isApproved: false
  } as ConfirmationResult<string>);
};

const handleSignature = async (type: EvmSignatureSupportType, id: string, signature: string) => {
  return await completeConfirmation(type, {
    id,
    isApproved: true,
    payload: signature
  } as ConfirmationResult<string>);
};

const Component: React.FC<Props> = (props: Props) => {
  const { className, id, payload, type } = props;
  const { payload: { account, canSign, hashPayload } } = payload;

  const { t } = useTranslation();
  const { activeModal } = useContext(ModalContext);

  const signMode = useMemo(() => getSignMode(account), [account]);

  const [loading, setLoading] = useState(false);

  const approveIcon = useMemo((): PhosphorIcon => {
    switch (signMode) {
      case SIGN_MODE.QR:
        return QrCode;
      case SIGN_MODE.LEDGER:
        return Swatches;
      default:
        return CheckCircle;
    }
  }, [signMode]);

  // Handle buttons actions
  const onCancel = useCallback(() => {
    setLoading(true);
    handleCancel(type, id).finally(() => {
      setLoading(false);
    });
  }, [id, type]);

  const onApprovePassword = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      handleConfirm(type, id, '').finally(() => {
        setLoading(false);
      });
    }, 1000);
  }, [id, type]);

  const onApproveSignature = useCallback((signature: SigData) => {
    setLoading(true);

    setTimeout(() => {
      handleSignature(type, id, signature.signature)
        .catch((e) => {
          console.log(e);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 300);
  }, [id, type]);

  const onConfirmQr = useCallback(() => {
    activeModal(CONFIRMATION_QR_MODAL);
  }, [activeModal]);

  const onConfirm = useCallback(() => {
    switch (signMode) {
      case SIGN_MODE.QR:
        onConfirmQr();
        break;
      default:
        onApprovePassword();
    }
  }, [onApprovePassword, onConfirmQr, signMode]);

  return (
    <div className={CN(className, 'confirmation-footer')}>
      <Button
        disabled={loading}
        icon={(
          <Icon
            phosphorIcon={XCircle}
            weight='fill'
          />
        )}
        onClick={onCancel}
        schema={'secondary'}
      >
        {t('Cancel')}
      </Button>
      <Button
        disabled={!canSign}
        icon={(
          <Icon
            phosphorIcon={approveIcon}
            weight='fill'
          />
        )}
        loading={loading}
        onClick={onConfirm}
      >
        {t('Approve')}
      </Button>
      {
        signMode === SIGN_MODE.QR && (
          <DisplayPayloadModal>
            <EvmQr
              address={account.address}
              hashPayload={hashPayload}
              isMessage={isEvmMessage(payload)}
            />
          </DisplayPayloadModal>
        )
      }
      {signMode === SIGN_MODE.QR && <ScanSignature onSignature={onApproveSignature} />}
    </div>
  );
};

const EvmSignArea = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {};
});

export default EvmSignArea;
