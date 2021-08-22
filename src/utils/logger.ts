import bunyan from 'bunyan'
import config from 'config'

const streams:any = (config.get('log') as any[]).map(({level, out}) => {
    if (out === 'stdout') {
        return {level, stream: process.stdout}
    } else if (out === 'stderr') {
        return {level, stream: process.stderr}
    } else {
        return {level, path: out}
    }
})

export const createLogger = (name:string) => bunyan.createLogger({
    name,
    streams,
})

export const logger = createLogger('cosigner')
