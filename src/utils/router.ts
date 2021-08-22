import * as http from 'http'

import { logger } from './logger'
import { presign } from '../provider/presign'
import { serveResponse } from './server'

export const router = require('find-my-way')()

const handleError = (
    req: http.IncomingMessage,
    res: http.ServerResponse,
    error: any
) => {
    const message = 'Unexpected error while processing request.'
    const data = { error: String(error), url: req.url }
    logger.error(data, message)
    serveResponse(res, 400, message, data)
}

router.on('GET', '/', (
    req: http.IncomingMessage,
    res: http.ServerResponse,
) => {
    logger.debug(req.url)
    res.end(`EOSIO Cosigner`)
})

router.on(['GET', 'POST'], '/v1/resource_provider/request_transaction', (
    req: http.IncomingMessage,
    res: http.ServerResponse,
) => presign(req, res).catch((error) => handleError(req, res, error)))