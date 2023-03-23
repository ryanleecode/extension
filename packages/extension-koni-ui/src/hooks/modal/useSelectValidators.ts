// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BasicOnChangeFunction } from '@subwallet/extension-koni-ui/components/Field/Base';
import { ModalContext } from '@subwallet/react-ui';
import { useCallback, useContext, useState } from 'react';

export function useSelectValidators (modalId: string, onChange?: BasicOnChangeFunction, isSingleSelect?: boolean) {
  const [defaultSelected, setDefaultSelected] = useState<string[]>([]);
  const [changeValidators, setChangeValidators] = useState<string[]>([]);
  const { inactiveModal } = useContext(ModalContext);

  const onApplyChange = useCallback((changeValidators: string[]) => {
    onChange && onChange({ target: { value: changeValidators.join(',') } });
    inactiveModal(modalId);
  }, [inactiveModal, modalId, onChange]);

  const onChangeSelectedValidator = useCallback((changeVal: string) => {
    setChangeValidators((changeValidators) => {
      if (!changeValidators.includes(changeVal)) {
        let result;

        if (isSingleSelect) {
          result = [...defaultSelected, changeVal];
          onApplyChange(result);
        } else {
          result = [...changeValidators, changeVal];
        }

        return result;
      } else {
        return changeValidators.filter((item) => item !== changeVal);
      }
    });
  }, [defaultSelected, isSingleSelect, onApplyChange]);

  const onApplyChangeValidators = useCallback(() => {
    onApplyChange(changeValidators);
  }, [changeValidators, onApplyChange]);

  const onCancelSelectValidator = useCallback(() => {
    setChangeValidators(defaultSelected);
    inactiveModal(modalId);
  }, [defaultSelected, inactiveModal, modalId]);

  const onInitValidators = useCallback((selected: string) => {
    setDefaultSelected(selected.split(','));
    setChangeValidators(selected.split(','));
  }, []);

  return {
    onChangeSelectedValidator,
    changeValidators,
    onApplyChangeValidators,
    onCancelSelectValidator,
    onInitValidators
  };
}
