// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { MetaInfo } from '@subwallet/extension-web-ui/components';
import { useTranslation } from '@subwallet/extension-web-ui/hooks';
import { ThemeProps } from '@subwallet/extension-web-ui/types';
import { customFormatDate, openInNewTab } from '@subwallet/extension-web-ui/utils';
import { Button, Icon } from '@subwallet/react-ui';
import CN from 'classnames';
import { ArrowSquareOut } from 'phosphor-react';
import React, { useCallback } from 'react';
import styled from 'styled-components';

type Props = ThemeProps;
const modalId = 'earning-rewards-history-modal';

function Component ({ className }: Props) {
  const { t } = useTranslation();
  const onClickViewExplore = useCallback(() => {
    const currentAccount = 'p8DyH23aDbJCpioSXLSv9unX7b1fsF1Wg4FzKuyoPpUwW4yFL';

    if (currentAccount) {
      const subscanSlug = 'dung-nguyen';

      if (subscanSlug) {
        openInNewTab(`https://${subscanSlug}.subscan.io/account/${currentAccount}?tab=reward`)();
      }
    }
  }, []);

  return (
    <div
      className={CN(className)}
    >
      <MetaInfo
        labelColorScheme='gray'
        labelFontWeight='regular'
        spaceSize='sm'
        valueColorScheme='light'
      >
        <MetaInfo.Number
          decimals={0}
          label={customFormatDate(new Date('13261128'), '#DD# #MMM#, #YYYY#')}
          suffix={'DOT'}
          value={12345}
        />
      </MetaInfo>

      <Button
        block={true}
        className={'__view-explorer-button'}
        icon={(
          <Icon
            phosphorIcon={ArrowSquareOut}
          />
        )}
        onClick={onClickViewExplore}
        size={'xs'}
        type={'ghost'}
      >
        {t('View on explorer')}
      </Button>
    </div>
  );
}

export const RewardInfoPart = styled(Component)<Props>(({ theme: { token } }: Props) => ({
  borderRadius: token.borderRadiusLG,
  backgroundColor: token.colorBgSecondary,
  minHeight: 54,

  '.__part-title': {
    paddingTop: token.padding,
    paddingLeft: token.padding,
    paddingRight: token.padding
  },

  '.__separator': {
    height: 2,
    backgroundColor: 'rgba(33, 33, 33, 0.80)',
    marginTop: token.marginSM,
    marginBottom: token.marginSM,
    marginLeft: token.margin,
    marginRight: token.margin
  },

  '.__claim-reward-area': {
    display: 'flex',
    gap: token.sizeSM,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: token.paddingSM,
    paddingLeft: token.padding,
    paddingRight: token.padding
  },

  '.__claim-reward-value': {
    fontSize: token.fontSizeHeading4,
    lineHeight: token.lineHeightHeading4,
    fontWeight: token.headingFontWeight,
    color: token.colorTextLight1,

    '.ant-number-integer': {
      color: 'inherit !important',
      fontSize: 'inherit !important',
      fontWeight: 'inherit !important',
      lineHeight: 'inherit'
    },

    '.ant-number-decimal, .ant-number-suffix': {
      color: `${token.colorTextLight3} !important`,
      fontSize: `${token.fontSizeHeading5}px !important`,
      fontWeight: 'inherit !important',
      lineHeight: token.lineHeightHeading5
    }
  },

  '.__visit-dapp-label': {
    fontSize: token.fontSize,
    lineHeight: token.lineHeight,
    color: token.colorTextLight4
  },

  '.__claim-reward-area + .__separator': {
    marginTop: 0
  },

  '.__separator + .__reward-history-panel': {
    marginTop: -13
  },

  '.__view-explorer-button': {
    marginTop: token.marginSM
  }
}));
