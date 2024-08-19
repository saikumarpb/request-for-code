import * as bitcoin from 'bitcoinjs-lib';
import { BIP32Factory } from 'bip32';
import * as bip39 from 'bip39';
import * as ecc from 'tiny-secp256k1';


import { ec as EC } from 'elliptic';

const ec = new EC('secp256k1');
const bip32 = BIP32Factory(ecc);


export function generateBitcoinWallet() {
    const network = bitcoin.networks.bitcoin;
    const path = `m/44'/0'/0'/0`;

    const mnemonic = bip39.generateMnemonic();
    console.log(`Mnemonic: ${mnemonic}`);

    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.fromSeed(seed, network);

    const account = root.derivePath(path);
    const node = account.derive(0).derive(0);

    if (!node.privateKey) {
        throw new Error('Private key not found');
    }

    const privateKey = node.privateKey;

    const keyPair = ec.keyFromPrivate(privateKey);
    const publicKey = keyPair.getPublic(true, 'hex');

    const btcAddress = bitcoin.payments.p2pkh({
        pubkey: node.publicKey,
        network: network,
    }).address;

    return {
        address: btcAddress,
        privateKey: privateKey.toString('hex'),
        publicKey: publicKey,
        mnemonic: mnemonic,
    };
}