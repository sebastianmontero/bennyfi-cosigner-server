import {
    API,
    Name,
} from '@greymass/eosio'

import * as _ from 'lodash'

import {
    client,
    logger,
} from '../common'

export interface SignificantResources {
    account: API.v1.AccountObject
    all: boolean
    cpu: boolean
    net: boolean
    ram: boolean
    values: {
        cpu: number
        net: number
        ram: number
    }
}

export async function signerHasSignificantResources(
    account: Name,
    cpu: number = 5000,
    net: number = 1000,
    ram: number = 128,
): Promise<SignificantResources> {
    const accountObj = await client.v1.chain.get_account(account)
    logger.debug({ account: JSON.parse(JSON.stringify(accountObj))}, 'account object')

    const hasSignificantCPU = accountObj.cpu_limit.available.toNumber() > cpu
    logger.debug({
        cpu,
        available: accountObj.cpu_limit.available.toNumber(),
        hasSignificantCPU,
    }, 'CPU resource check')

    const hasSignificantNET = accountObj.net_limit.available.toNumber() > net
    logger.debug({
        net,
        available: accountObj.net_limit.available.toNumber(),
        hasSignificantNET,
    }, 'NET resource check')

    const hasSignificantRAM = (accountObj.ram_quota.toNumber() - accountObj.ram_usage.toNumber()) > ram
    logger.debug({
        ram,
        available: (accountObj.ram_quota.toNumber() - accountObj.ram_usage.toNumber()),
        hasSignificantRAM,
    }, 'RAM resource check')

    return {
        account: accountObj,
        all: hasSignificantCPU && hasSignificantNET && hasSignificantRAM,
        cpu: hasSignificantCPU,
        net: hasSignificantNET,
        ram: hasSignificantRAM,
        values: {
            cpu: accountObj.cpu_limit.available.toNumber(),
            net: accountObj.net_limit.available.toNumber(),
            ram: (accountObj.ram_quota.toNumber() - accountObj.ram_usage.toNumber()),
        }
    }
}
