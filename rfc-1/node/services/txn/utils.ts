import { SignedTransaction, Transaction } from './types';
import { ec as EC } from 'elliptic';
import { Utxo } from '../utxo/types';
import { createHash } from 'crypto';

const ec = new EC('secp256k1');

export function hashTransaction(
    transaction: Omit<Transaction, 'signature'>
): string {
    const { sender, receiver, amount, utxoIds, fee } = transaction;
    const txString = `${sender}::${receiver}::${amount}::${utxoIds.join(',')}::${fee}`;
    return createHash('sha256').update(txString).digest('hex');
}

export const verifyTransactionSign = (
    transaction: SignedTransaction
): boolean => {
    try {
        const transactionHash = hashTransaction(transaction);

        const publicKey = transaction.senderPubKey;
        const signature = transaction.signature;

        const key = ec.keyFromPublic(publicKey, 'hex');
        const isValidSignature = key.verify(transactionHash, signature);

        return isValidSignature;
    } catch (error) {
        console.error('Error verifying transaction:', error);
        return false;
    }
};

export const signTransaction = (
    transaction: Transaction,
    privateKey: string
): string => {
    try {
        const transactionHash = hashTransaction(transaction);
        const key = ec.keyFromPrivate(privateKey, 'hex');

        const signature = key.sign(transactionHash, 'hex');
        return signature.toDER('hex');
    } catch (error) {
        console.error('Error signing transaction:', error);
        throw new Error('Signing failed');
    }
};
export function createUTXO(txn: SignedTransaction): Utxo {
    const { amount, receiver } = txn;
    const txnId = hashTransaction(txn);
    return {
        txnId: txnId,
        amount,
        address: receiver,
    };
}

export function* outputIndexGenerator(): Generator<number> {
    let index = 0;
    while (true) {
        yield index++;
    }
}
