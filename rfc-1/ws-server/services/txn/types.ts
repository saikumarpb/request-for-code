import { z } from 'zod';
import { isValidBitcoinAddress } from '../utils/validation';

export const BitcoinAddressSchema = z
    .string()
    .min(1, { message: 'Address cannot be empty' })
    .refine(isValidBitcoinAddress, { message: 'Invalid Bitcoin address' });

export const TransactionSchema = z.object({
    sender: BitcoinAddressSchema,
    senderPubKey: z.string().length(66, { message: 'Public key must be 66 characters long' }), // 66 characters for compressed public key
    receiver: BitcoinAddressSchema,
    amount: z.number().positive({ message: 'Amount must be greater than 0' }),
    utxoIds: z
        .array(z.string().min(1, { message: 'UTXO ID cannot be empty' }))
        .nonempty({ message: 'Must have at least one UTXO' }),
    fee: z.number().nonnegative({ message: 'Fee cannot be negative' }),
});

export const SignedTransactionSchema = TransactionSchema.extend({
    signature: z.string().min(1, { message: 'Signature cannot be empty' }),
});

export type SignedTransaction = z.infer<typeof SignedTransactionSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;

export type BitcoinAddress = z.infer<typeof BitcoinAddressSchema>;
