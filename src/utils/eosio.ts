import config from 'config'
import {APIClient, FetchProvider} from '@greymass/eosio'

import {APIConfig} from '../types'

const fetch = require('node-fetch')
const eosio:APIConfig = config.get('eosio')

// Export the configured chainId
export const chainId = eosio.chainId

// API Client - basic node
export const provider = new FetchProvider(eosio.apiDefault, {fetch})
export const client = new APIClient({provider})

// API Client - sampler node
export const samplerProvider = new FetchProvider(eosio.apiSampler, {fetch})
export const samplerClient = new APIClient({provider: samplerProvider})
