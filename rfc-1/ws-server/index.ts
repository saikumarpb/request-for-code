import { transact } from './services/txn';
import { SignedTransaction, Transaction } from './services/txn/types';
import { signTransaction } from './services/txn/utils';
import { isValidBitcoinAddress } from './services/utils/validation';
import { getUserUTXOs, getUserBalance } from './services/utxo';
import { addUTXO } from './services/utxo';
import { generateBitcoinWallet } from './services/wallet';

import { ec as EC } from 'elliptic';
const ec = new EC('secp256k1'); // Bitcoin uses secp256k1
Bun.serve({
    port: 8333,
    fetch(req, server) {
        if (server.upgrade(req)) {
            return;
        }
        return new Response('Upgrade failed', { status: 500 });
    },
    websocket: {
        message(ws, message) {
            ws.send(message);
        },
        open(ws) {
            ws.send('Connection Successful');
        },
        close(ws, code, message) {},
    },
});


const wallet1 = generateBitcoinWallet();
const wallet2 = generateBitcoinWallet();

const txnId = 'wallet1';
const utxoDetails = {
    amount: 100,
    address: wallet1.address!,
};

console.log('Address Valid:', isValidBitcoinAddress(wallet1.address!));

// Adding a UTXO
addUTXO({ txnId, ...utxoDetails }, 0);
addUTXO({  ...utxoDetails, txnId: txnId + "..", ...utxoDetails }, 0);

addUTXO({ amount: 100,
  address: wallet2.address!, txnId: "wallet2" }, 0);



const init = async () => {
    let utxos = await getUserUTXOs(wallet1.address!);
    utxos.forEach((x) => {
        console.log(x);
    });

    let bal = await getUserBalance(wallet1.address!);
    console.log(bal);


    bal = await getUserBalance(wallet2.address!);
    console.log(bal);

    const txn: Transaction = {
        amount: 10,
        fee: 0,
        sender: wallet1.address!,
        senderPubKey: wallet1.publicKey,
        receiver: wallet2.address!,
        utxoIds: [utxos[0].txnId, ...utxos.slice(1).map((utxo) => utxo.txnId)],
    };

    const signedTxn: SignedTransaction = {
        ...txn,
        signature: signTransaction(txn, wallet1.privateKey)
    };

    await transact(signedTxn);
    console.log("------------------------")

    utxos = await getUserUTXOs(wallet1.address!);
    utxos.forEach((x) => {
        console.log(x);
    });

    bal = await getUserBalance(wallet1.address!);
    console.log(bal);


    console.log("------------------------")

    utxos = await getUserUTXOs(wallet2.address!);
    utxos.forEach((x) => {
        console.log(x);
    });

    bal = await getUserBalance(wallet2.address!);
    console.log(bal);
};

init();
