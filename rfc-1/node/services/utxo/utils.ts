import { NonNegativeIntegerSchema } from "./types";

export const getUtxoKey = (txnId: string, outputIndex: number) =>
    `${txnId}:${outputIndex}`;

export const parseAmount = (amount: string) => NonNegativeIntegerSchema.parse(parseInt(amount))