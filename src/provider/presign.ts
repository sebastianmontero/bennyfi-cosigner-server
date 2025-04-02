import * as http from 'http'
import * as _ from 'lodash'
import config from 'config'

import {
    Name,
    PermissionLevel,
    PrivateKey,
} from '@greymass/eosio'

import {
    client,
    logger,
    sampleTransaction,
} from '../common'
import {
    AccountConfig,
    Cosigner
} from '../types'

import authorizer from '../service/authorizer'

import { cosignTransaction } from '../utils/cosign'
import { prependNoopAction } from '../utils/noop'
import { parseRequest } from '../utils/parse'
import { readRequest, serveResponse } from '../utils/server'
import { signerHasSignificantResources, SignificantResources } from '../utils/account'

const accountConfig:AccountConfig = config.get('account')

const defaultCosigner: Cosigner = {
    account: Name.from(accountConfig.name),
    permission: Name.from(accountConfig.permission),
    private: PrivateKey.from(accountConfig.key)
}

export function getCosigner(): Cosigner {
    return {
        ...defaultCosigner,
        public: defaultCosigner.private.toPublic(),
    }
}

export function resourcesNotRequired(
    res: http.ServerResponse,
    signer: PermissionLevel,
) {
    const message = 'Network resources not required by this account.'
    logger.warn({
        account: signer.actor,
        message,
    })
    return serveResponse(res, 400, message)
}

export const presign = async (
    req: http.IncomingMessage,
    res: http.ServerResponse,
) => {
    // Process the incoming request
    const {
        body,
        ipAddress,
    } = await readRequest(req)

    // OPTIONAL: Use IP address to determine if abuse is occurring
    logger.debug({ ipAddress }, 'ip address making request')

    // If the request cannot be processed, serve a 400 response
    if (!body) {
        const message = 'Incoming request could not be processed.'
        logger.debug({
            message,
        })
        return serveResponse(res, 400, message)
    }
    console.log('body', JSON.stringify(body, null, 4))
    // Process the body of the request
    const request = await parseRequest(body)

    // Ensure a transaction is specified
    if (!request) {
        const message = 'Transaction not supplied in resource request. Either request, transaction, or packedTransaction must be specified in the request.'
        logger.warn({
            message,
        })
        return serveResponse(res, 400, message)
    }
    request.getRawActions().forEach((action: any) => {
        console.log('action', JSON.stringify(action, null, 4))
    })
    console.log('request', JSON.stringify(request, null, 4))
    console.log('isAuthorized', authorizer.isAuthorized(request))

    // Ensure a signer is specified
    if (!body.signer) {
        const message = 'Signer not supplied in resource request. The signer property must be specified in the request.'
        logger.warn({
            message,
        })
        return serveResponse(res, 400, message)
    }

    // Reject any identity requests immediately
    if (request.isIdentity()) {
        const message = 'Identity requests cannot be cosigned.'
        logger.warn({
            message,
        })
        return serveResponse(res, 400, message)
    }

    // Retrieve the signer requesting cosignature
    const signer = PermissionLevel.from(body.signer)
    logger.debug({ signer }, 'signer requesting signature')

    // OPTIONAL: Check the signer against a blacklist you've created
    //      Note: You will need to write the checkAccountBan function to check your blacklist
    //            and return true or false based on the result.
    // const banned = await checkAccountBan(signer)
    // if (banned) {
    //     const message = 'This account has been disabled. Please contact us with any questions.'
    //     logger.warn({
    //         account: signer.actor,
    //         message,
    //     })
    //     return serveResponse(res, 400, message)
    // }

    // Determine if the signer has significant resources of their own and for this transaction
    const signerHasResources: SignificantResources = await signerHasSignificantResources(signer.actor)
    logger.debug({ signerHasResources, signer }, 'signer has their own resources?')
    if (signerHasResources.all) {
        return resourcesNotRequired(res, signer)
    }

    // Load required ABIs for transaction
    const abis = await request.fetchAbis()
    logger.debug({ abis }, 'abis loaded')

    // Generate tapos values for transaction
    const info = await client.v1.chain.get_info()
    const header = info.getTransactionHeader(300) // 300 = seconds this cosigned transaction is valid for
    logger.debug({ header }, 'transaction header generated')

    // Resolve the signing request
    const resolved = request.resolve(abis, signer, header)
    logger.debug({ resolved }, 'resolved signing request')

    // Ensure the supplied transaction doesn't include unsolicited transactions for the cosigner
    const cosigner = getCosigner()
    const authorizations = _.flatten(resolved.transaction.actions.map((action) => action.authorization))
    const isSpecifyingCosigner = authorizations.some((auth) => auth.actor.equals(cosigner.account))
    if (isSpecifyingCosigner) {
        const message = 'Incoming transaction cannot manually specify the authority of the cosigner.'
        logger.warn({
            account: signer.actor,
            cosigner: cosigner.account,
            message,
        })
        return serveResponse(res, 400, message)
    }

    // Modify the resolved transaction to append the cosigning action
    const modified = prependNoopAction(resolved.transaction, cosigner)
    logger.debug({ modified }, 'transaction modified for cosigning')

    // OPTIONAL: Sample the transaction to determine resource usage
    const transactionUsage = await sampleTransaction(modified)
    logger.debug({ transactionUsage }, 'transaction sample usage')
    if (!transactionUsage.cpu || !transactionUsage.net) {
        const message = 'Unable to process and sample transaction'
        logger.warn({
            cosigner: cosigner.account,
            request: request.encode(),
            signer,
            usage: transactionUsage,
        }, message)
        return serveResponse(res, 400, message, {
            request: body.request,
            error: transactionUsage.error
        })
    }

    // OPTIONAL: Determine if resource usage is acceptable
    //      Note: Each transaction automatically has a `max_cpu_usage_ms` embedded to create a hard cap.
    //            This section is primarily if you want to do extra checks based on the results of the sampling.

    // EXAMPLE:
    // if (transactionUsage.cpu > 1000) {
    //     const message = 'CPU usage exceeds limits set in this example'
    //     logger.warn({
    //         cosigner: cosigner.account,
    //         request: request.encode(),
    //         signer,
    //         usage: transactionUsage,
    //     }, message)
    //     return serveResponse(res, 400, message, {
    //         request: body.request,
    //         error: transactionUsage.error
    //     })
    // }

    // **************************
    // REQUIRED: Implement your own business logic here to determine transaction eligibility
    //      Note: You should check to ensure the transaction contains actions that match what you're willing to cosign for.
    const isEligibleTransaction = true
    // **************************

    // If transaction is eligible, create and return a signature
    if (isEligibleTransaction) {
        const {
            result,
            signatures,
            transaction,
        } = await cosignTransaction(cosigner, modified)

        logger.info({
            cosigner: cosigner.account,
            cosignee: signer.actor,
            transaction: transaction.id,
            usage: transactionUsage,
        }, 'Transaction eligible, returning signature')

        // Serve the resulting transaction and signature
        res.statusCode = 200
        res.end(
            JSON.stringify({
                code: 200,
                data: {
                    request: result.data.req,
                    signatures,
                },
            })
        )
    } else {
        // If not, return a 400 to tell the wallet to proceed on its own.
        const message = 'Transaction not eligible for signature.'
        logger.warn({
            cosigner: cosigner.account,
            request: request.encode(),
            signer,
            usage: transactionUsage,
        }, message)
        return serveResponse(res, 400, message)
    }
}
