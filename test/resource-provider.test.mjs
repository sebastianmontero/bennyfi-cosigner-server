import {describe, it, before} from 'node:test'
import assert from 'node:assert'
import { Session } from "@wharfkit/session"
import { WalletPluginPrivateKey } from "@wharfkit/wallet-plugin-privatekey"
import {TransactPluginResourceProvider} from '@wharfkit/transact-plugin-resource-provider'


const chain = {
    id: "8a34ec7df1b8cd06ff4a8abbaa7cc50300823350cadc59ab296cb00d104d2b8f",
    url: "http://localhost:8888"
}

const privateKey = "5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3"



describe('resource provider', () => {
    let session
    before(() => {
        session = new Session({
            actor: "userc",
            permission: "active",
            walletPlugin: new WalletPluginPrivateKey(privateKey),
            chain,
        }, {
            transactPlugins:[new TransactPluginResourceProvider({
                endpoints: {
                    [chain.id]:
                        'http://localhost:8080',
                },
            })]
        })
    })
    it('should enter round', async () => {
        const enterRound = {
            account: "bennyfi",
            name: "enterpool",
            authorization: [session.permissionLevel],
            data: {
                pool_id: 0,
                participant: session.actor,
            },
        }

        const result = await session.transact({action: enterRound})
        console.log("Tx:", result.response.transaction_id)


    })
    it('should provide resources for transfer tokens to bennyfi contract', async () => {
        const transfer = {
            account: "eosio.token",
            name: "transfer",
            authorization: [session.permissionLevel],
            data: {
                from: session.actor,
                to: "bennyfi",
                quantity: "1.000 BENY",
                memo: "transfer",
            },
        }

        const result = await session.transact({action: transfer})
        console.log("Tx:", result.response.transaction_id)

    })

    it('should not provide resources for transfer tokens not to bennyfi contract', async () => {
        const transfer = {
            account: "eosio.token",
            name: "transfer",
            authorization: [session.permissionLevel],
            data: {
                from: "userc",
                to: "userb",
                quantity: "1.000 BENY",
                memo: "transfer",
            },
        }

        const result = await session.transact({action: transfer})
        console.log("Tx:", result.response.transaction_id)

    })
})
