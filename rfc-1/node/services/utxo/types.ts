import { z } from 'zod';

export const NonNegativeIntegerSchema = z.number().int().nonnegative();

export const UtxoDetailsSchema = z.object({
    amount: NonNegativeIntegerSchema,
    address: z.string(),
});

export const UtxoSchema = UtxoDetailsSchema.extend({
    txnId: z.string(),
});


export type NonNegativeInteger = z.infer<typeof NonNegativeIntegerSchema>;
export type UtxoDetails = z.infer<typeof UtxoDetailsSchema>;
export type Utxo = z.infer<typeof UtxoSchema>;