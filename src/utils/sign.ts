import {
    Checksum256,
    PrivateKey,
    Signature,
    Transaction,
} from '@greymass/eosio'

import { chainId } from './eosio'

export function signTransaction(
    privateKey: PrivateKey,
    transaction: Transaction
): Signature {
    const digest = transaction.signingDigest(Checksum256.from(chainId))
    return privateKey.signDigest(digest)
}
