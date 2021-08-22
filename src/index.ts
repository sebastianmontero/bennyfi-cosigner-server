import config from 'config'

import {
    client,
    createHttpServer,
    logger,
} from './common'
import version from './version'

export async function main() {
    // Await the creation of the HTTP server
    await createHttpServer
    // Retrieve chainId from the API server being used
    const info = await client.v1.chain.get_info()
    const chainId:string = info.chain_id.toString()
    const [logInfo] = config.get('log')
    // Report start success
    logger.info({chainId, version, logging: logInfo.level }, 'cosigner startup successful')
}

function ensureExit(code: number, timeout = 3000) {
    process.exitCode = code
    setTimeout(() => { process.exit(code) }, timeout)
}

if (module === require.main) {
    process.once('uncaughtException', (error) => {
        logger.error(error, 'Uncaught exception')
        ensureExit(1)
    })
    main().catch((error) => {
        logger.fatal(error, 'Unable to start application')
        ensureExit(1)
    })
}
