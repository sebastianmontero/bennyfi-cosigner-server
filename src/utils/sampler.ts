import {
    PackedTransaction
} from '@greymass/eosio'

import {
    logger,
    samplerClient,
} from '../common'

import {
    TransactionEstimate,
} from '../types'

export interface PushTransactionResponse {
    transaction_id: string
    processed: {
        id: string
        block_num: number
        block_time: string
        receipt: {status: string; cpu_usage_us: number; net_usage_words: number}
        elapsed: number
        net_usage: number
        scheduled: boolean
        action_traces: any[]
        account_ram_delta: any
    }
}

export async function sampleTransaction(
    transaction: PackedTransaction,
    iterations: number = 5
): Promise<TransactionEstimate> {
    try {
        logger.debug({ iterations }, 'starting sampler')
        const tx = transaction
        const { cpu, net } = await performSampling(tx, iterations)
        return {
            cpu,
            net,
        }
    } catch (error) {
        logger.warn({
            error,
            keys: Object.keys(error),
            msg: error.message,
            response: error.response
        }, 'transaction sampling error')
        return {
            cpu: false,
            net: false,
            error,
        }
    }
}

async function performSampling(
    transaction: PackedTransaction,
    iterations: number = 5
): Promise<TransactionEstimate> {
    logger.debug({ transaction }, 'sampling started')
    const samples = await Promise.all([...Array(iterations)].map(() => {
        return samplerClient.call<PushTransactionResponse>({
            path: '/v1/chain/test_transaction',
            params: transaction,
        })
    }))

    // map and sort the CPU estimates
    const cpuEstimates = samples
        .map((s) => s.processed.elapsed)
        .sort((a, b) => a - b)

    // Calculate median value of the sampled results
    const middle = Math.floor(cpuEstimates.length / 2)
    const cpu = cpuEstimates.length % 2 !== 0
        ? cpuEstimates[middle]
        : Math.floor((cpuEstimates[middle - 1] + cpuEstimates[middle]) / 2)
    logger.debug({ cpu, cpuEstimates }, 'sampling results for CPU')

    // Take the first net usage value (deterministic)
    const net = samples[0].processed.net_usage
    logger.debug({ net }, 'sampling results for NET')
    return {
        cpu,
        net,
    }
}
