import { redis } from '../../redis';
import { getUserUTXOs } from '../utxo';
import { Utxo } from '../utxo/types';
import { getUtxoKey } from '../utxo/utils';
import { SignedTransaction, SignedTransactionSchema } from './types';
import {
    createUTXO,
    hashTransaction,
    outputIndexGenerator,
    verifyTransactionSign,
} from './utils';

export const transact = async (transaction: SignedTransaction) => {
    // Start a redis transaction
    const txn = redis.multi();

    try {
        const txnUtxos = await validateTransactionAndGetUtxos(transaction);
        const outputIndex = outputIndexGenerator();
        const receiverUtxo = createUTXO(transaction);

        // Add receiver's UTXO inside the transaction
        const receiverUtxoKey = getUtxoKey(receiverUtxo.txnId, outputIndex.next().value);
        txn.hset(receiverUtxoKey, { address: receiverUtxo.address, amount: receiverUtxo.amount });
        txn.sadd(receiverUtxo.address, receiverUtxoKey);

        let amountDeducted = 0;

        // Loop through UTXOs to remove sender's UTXOs inside the transaction
        for (const { txnId, amount } of txnUtxos) {
            if (amountDeducted < transaction.amount) {
                txn.del(txnId);
                txn.srem(transaction.sender, txnId);
                amountDeducted += amount;
            } else {
                break;
            }
        }

        const changeAmount = amountDeducted - transaction.amount;


        // Return change balance to the sender if there's any change
        if (changeAmount > 0) {
            const changeUtxo: Utxo = {
                amount: changeAmount,
                address: transaction.sender,
                txnId: hashTransaction(transaction),
            };
            const changeUtxoKey = getUtxoKey(changeUtxo.txnId, outputIndex.next().value);
            txn.hset(changeUtxoKey, { address: changeUtxo.address, amount: changeUtxo.amount });
            txn.sadd(changeUtxo.address, changeUtxoKey);
        }

        // Execute all Redis operations in a transaction
        await txn.exec();
        console.log('Transaction successful');
    } catch (e) {
        // If something goes wrong, discard the transaction
        txn.discard();

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
