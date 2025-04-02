import { Checksum256Type } from '@greymass/eosio'

// API Configuration for the cosigner to talk with EOSIO
//      These should be base level URLs (https://eos.greymass.com)
export interface APIConfig {
    // API Client - basic node
    apiDefault: string
    // API Client - sampler node
    apiSampler: string
    // The chainId for this chain
    chainId: Checksum256Type
    // System Token
    systemToken: string
}

export interface ServerConfig {
    // Port the cosigner API runs on
    port: string
}
