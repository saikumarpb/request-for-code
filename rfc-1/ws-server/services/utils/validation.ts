import * as bitcoin from 'bitcoin-address-validation';

export const isValidBitcoinAddress = (address: string): boolean => {
    return bitcoin.validate(address);
  };
