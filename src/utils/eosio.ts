import config from 'config'
import {APIClient, FetchProvider} from '@greymass/eosio'

import {APIConfig} from '../types'

const fetch = require('node-fetch')
const eosio:APIConfig = config.get('eosio')

// Export the configured chain_id
export const chainId = eosio.chain_id

// API Client - basic node
export const provider = new FetchProvider(eosio.api_default, {fetch})
export const client = new APIClient({provider})

// API Client - sampler node
export const samplerProvider = new FetchProvider(eosio.api_sampler, {fetch})
export const samplerClient = new APIClient({provider: samplerProvider})