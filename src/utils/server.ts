import config from 'config'
import * as http from 'http'
import { parse as parseUrl } from 'url'

import { ServerConfig } from '../types'
import { logger, router } from '../common'

const serverConfig:ServerConfig = config.get('server')

const handleRequest = (req: http.IncomingMessage, res: http.ServerResponse) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Request-Method', '*')
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST')
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type')
    if (req.method === 'OPTIONS') {
        res.writeHead(200)
        res.end()
        return
    }
    // Perform router lookups to resolve routes
    router.lookup(req, res)
}

const httpServer = http.createServer(handleRequest)

const port = parseInt(serverConfig.port, 10)
if (!isFinite(port)) {
    throw new Error('Invalid port number')
}

export const createHttpServer = new Promise((resolve, reject) => {
    httpServer.listen(port, resolve)
    httpServer.once('error', reject)
    logger.info({port}, 'http server started')
})

export async function readRequest(req: http.IncomingMessage) {
    const raw = await readBody(req)
    const query = parseUrl(req.url!, true).query as any
    const { headers } = req
    let body

    try {
        body = JSON.parse(raw)
    } catch(error) {
        logger.debug({ error }, 'error processing json')
    }

    // Retrieve the IP Address of the incoming request
    const ipAddresses:any = headers['x-forwarded-for'] || 'unknown'
    const [ipAddress] = ipAddresses.split(', ')
    return {
        body,
        headers,
        ipAddress,
        query,
        raw,
    }
}

export function readBody(req: http.IncomingMessage) {
    return new Promise<string>((resolve, reject) => {
        let body = ''
        req.on('error', reject)
        req.on('data', (chunk) => { body += chunk.toString() })
        req.on('end', () => resolve(body))
    })
}

export function serveResponse(
    res: http.ServerResponse,
    code: number,
    message: string,
    data: object = {},
) {
    res.writeHead(code)
    return res.end(
        JSON.stringify({
            code,
            message,
            data,
        })
    )
}
