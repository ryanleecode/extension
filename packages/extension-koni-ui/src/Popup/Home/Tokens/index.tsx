// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import PageWrapper from '@subwallet/extension-koni-ui/components/Layout/PageWrapper';
import { DataContext } from '@subwallet/extension-koni-ui/contexts/DataContext';
import useFetchCrypto from '@subwallet/extension-koni-ui/hooks/screen/crypto/useFetchCrypto';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import React, { useContext } from 'react';
import styled from 'styled-components';

type Props = ThemeProps

function Component ({ className = '' }: Props): React.ReactElement<Props> {
  const dataContext = useContext(DataContext);

  useFetchCrypto();

  return (
    <PageWrapper
      className={`tokens ${className}`}
      resolve={dataContext.awaitStores(['price', 'chainStore', 'assetRegistry', 'balance'])}
    >
      <>
        Tokens
      </>
    </PageWrapper>
  );
}

export const Tokens = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({
    color: token.colorTextLight1,
    fontSize: token.fontSizeLG
  });
});