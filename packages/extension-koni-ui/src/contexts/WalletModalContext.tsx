// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AttachAccountModal, CreateAccountModal, DeriveAccountModal, ImportAccountModal, NewAccountModal, RequestCreatePasswordModal } from '@subwallet/extension-koni-ui/components/Modal';
import Confirmations from '@subwallet/extension-koni-ui/Popup/Confirmations';
import { Debugger } from '@subwallet/extension-koni-ui/Popup/Debugger';
import { Button, Icon, ModalContext, SwModal } from '@subwallet/react-ui';
import { Bug } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

interface Props {
  children: React.ReactNode;
}

export const PREDEFINED_MODAL_NAMES = ['debugger', 'transaction', 'confirmations'];
type PredefinedModalName = typeof PREDEFINED_MODAL_NAMES[number];

export const usePredefinedModal = () => {
  const [seachParam, setSearchParams] = useSearchParams();
  const openPModal = useCallback((name: PredefinedModalName | null) => {
    setSearchParams((prev) => {
      if (name) {
        prev.set('popup', name);
      } else {
        prev.delete('popup');
      }

      return prev;
    });
  }, [setSearchParams]);

  const isOpenPModal = useMemo(() => (seachParam.has('popup')), [seachParam]);

  return { openPModal, isOpenPModal };
};

const DebugIcon = <Icon
  phosphorIcon={Bug}
  type={'phosphor'}
/>;

const DebugTrigger = styled.div(({ theme }) => ({
  position: 'absolute',
  right: 16,
  bottom: 90
}));

export const WalletModalContext = ({ children }: Props) => {
  const { activeList, activeModal, inactiveModals, scannerOpen } = useContext(ModalContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const { openPModal } = usePredefinedModal();

  const hasActiveModal = useMemo(() => !!activeList.length, [activeList.length]);

  useEffect(() => {
    const confirmID = searchParams.get('popup');

    // Auto open confirm modal with method modalContext.activeModal else auto close all modal
    if (confirmID) {
      PREDEFINED_MODAL_NAMES.includes(confirmID) && activeModal(confirmID);
    } else {
      inactiveModals(PREDEFINED_MODAL_NAMES);
    }
  }, [activeModal, inactiveModals, searchParams]);

  const onCloseModal = useCallback(() => {
    setSearchParams((prev) => {
      prev.delete('popup');

      return prev;
    });
  }, [setSearchParams]);

  const openDebugger = useCallback(() => {
    openPModal('debugger');
  }, [openPModal]);

  return <>
    <div
      id='popup-container'
      style={{ zIndex: hasActiveModal || scannerOpen ? undefined : -1 }}
    />
    {children}
    <DebugTrigger>
      <Button
        block
        icon={DebugIcon}
        onClick={openDebugger}
        shape='round'
        size='md'
      />
    </DebugTrigger>
    <SwModal
      id={'debugger'}
      onCancel={onCloseModal}
      title={'Debugger'}
    >
      <Debugger />
    </SwModal>
    <SwModal
      className={'modal-full'}
      closable={false}
      id={'confirmations'}
      onCancel={onCloseModal}
      transitionName={'fade'}
    >
      <Confirmations />
    </SwModal>
    <CreateAccountModal />
    <ImportAccountModal />
    <AttachAccountModal />
    <NewAccountModal />
    <DeriveAccountModal />
    <RequestCreatePasswordModal />
  </>;
};
