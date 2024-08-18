import { addUTXO, getUserUTXOs, removeUTXO } from '../utxo';
import { Utxo } from '../utxo/types';
import { SignedTransaction, SignedTransactionSchema } from './types';
import {
    createUTXO,
    hashTransaction,
    outputIndexGenerator,
    verifyTransactionSign,
} from './utils';

export const transact = async (transaction: SignedTransaction) => {
    try {
        const txnUtxos = await validateTransactionAndGetUtxos(transaction);
        const outputIndex = outputIndexGenerator();
        const reciverUtxo = createUTXO(transaction);

        await addUTXO(reciverUtxo, outputIndex.next().value);

        let amountDeducted = 0;

        for (const { txnId, amount } of txnUtxos) {
            if (amountDeducted < transaction.amount) {
                await removeUTXO(transaction.sender, txnId);
                amountDeducted += amount;
            } else {
                break;
            }
        }

        const changeAmount =
            amountDeducted - transaction.amount;

        // Return change balance to user if any
        if (changeAmount > 0) {
            const changeUtxo: Utxo = {
                amount: changeAmount,
                address: transaction.sender,
                txnId: hashTransaction(transaction),
            };
            await addUTXO(changeUtxo, outputIndex.next().value);
        }
    } catch (e) {
        if (e instanceof Error) {
            console.log(`Transaction failed: `, e.message);
        } else {
            console.log(`Transaction failed: `, e);
        }
    }
};

export async function validateTransactionAndGetUtxos(
    transaction: SignedTransaction
): Promise<Utxo[]> {
    const { sender, utxoIds, amount, fee } =
        SignedTransactionSchema.parse(transaction);

    const isSignatureValid = verifyTransactionSign(transaction);
    if (!isSignatureValid) {
        throw new Error('Invalid signature');
    }

    const userUtxos = await getUserUTXOs(sender);
    const userUtxoMap = new Map(userUtxos.map((utxo) => [utxo.txnId, utxo]));

    const txnUtxos = [];
    for (const utxoId of utxoIds) {
        const utxo = userUtxoMap.get(utxoId);

        if (!utxo) {
            throw new Error('utxo not found');
        }

        txnUtxos.push(utxo);
    }

    if (amount + fee > getBalanceAvailableInUtxos(txnUtxos)) {
        throw new Error('Insufficient balance: ' + getBalanceAvailableInUtxos(txnUtxos) + "amount: "+ amount);
    }

    return txnUtxos;
}

const getBalanceAvailableInUtxos = (utxos: Utxo[]): number => {
    return utxos.reduce((total, { amount }) => total + amount, 0);
};
