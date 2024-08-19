import { redis } from '../../redis';
import { Utxo, UtxoDetails, UtxoSchema } from './types';
import { getUtxoKey, parseAmount } from './utils';

export const addUTXO = async (utxo: Utxo,  outputIndex: number) => {
    const { txnId, address, amount } = UtxoSchema.parse(utxo);
    const keyUTXO = getUtxoKey(txnId, outputIndex);

    try {
        const pipeline = redis.pipeline();
        const utxoDetails: UtxoDetails = {
            address,
            amount,
        };

        pipeline.hset(keyUTXO, utxoDetails);

        pipeline.sadd(address, keyUTXO);

        await pipeline.exec();
        console.log('UTXO added successfully.');
    } catch (error) {
        console.error('Error adding UTXO:', error);
    }
};

export const removeUTXO = async (
    userPublicKey: string,
    utxoId: string,
) => {

    try {
        const pipeline = redis.pipeline();

        pipeline.del(utxoId);

        pipeline.srem(userPublicKey, utxoId);

        await pipeline.exec();
        console.log(`UTXO ${utxoId} removed successfully.`);
    } catch (error) {
        console.error('Error removing UTXO:', error);
    }
};

export async function getUserUTXOs(userPublicKey: string): Promise<Utxo[]> {
    try {
        const utxoReferences = await redis.smembers(userPublicKey);

        if (utxoReferences.length === 0) {
            return [];
        }

        const utxoDetailsPromises = utxoReferences.map((utxoRef) =>
            redis.hgetall(utxoRef)
        );

        const utxoDetails = await Promise.all(utxoDetailsPromises);

        const results: Utxo[] = utxoReferences.map((ref, index) => {
            const details = utxoDetails[index];
            return {
                txnId: ref,
                amount: details.amount ? parseAmount(details.amount) : 0,
                address: details.address || '',
            };
        });

        return results;
    } catch (error) {
        console.error('Error fetching UTXOs:', error);
        return [];
    }
}

export async function getUserBalance(userPublicKey: string): Promise<number> {
    try {
        const utxoReferences = await redis.smembers(userPublicKey);

        if (utxoReferences.length === 0) {
            return 0;
        }

        const utxoDetailsPromises = utxoReferences.map((utxoRef) =>
            redis.hgetall(utxoRef)
        );

        const utxoDetails = await Promise.all(utxoDetailsPromises);

        const balance = utxoDetails.reduce((total, details) => {
            const amount = parseAmount(details.amount) || 0;
            return total + amount;
        }, 0);

        return balance;
    } catch (error) {
        console.error('Error fetching user balance:', error);
        return 0;
    }
}
