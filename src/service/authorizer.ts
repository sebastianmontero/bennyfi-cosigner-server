import {Authorize} from '../types'
import config from 'config'
import { SigningRequest } from 'eosio-signing-request'
import { Action, } from '@greymass/eosio'
import {
    Asset,
    Name,
    Struct,
} from '@wharfkit/session'

const authorize:Authorize = config.get('authorize')


const transferStruct = {
    structs:[
        {
            name: "transfer",
            base: "",
            fields: [
                {
                    name: "from",
                    type: "name"
                },
                {
                    name: "to",
                    type: "name"
                },
                {
                    name: "quantity",
                    type: "asset"
                },
                {
                    name: "memo",
                    type: "string"
                }
            ]
        }
    ],
    actions: [
        {
            name: "transfer",
            type: "transfer",
            ricardian_contract: ""
        }
    ]
}

@Struct.type('transfer')
export class Transfer extends Struct {
    @Struct.field(Name) from!: Name
    @Struct.field(Name) to!: Name
    @Struct.field(Asset) quantity!: Asset
    @Struct.field('string') memo!: string
}

class Authorizer {
    authorize: Authorize
    map: Map<string, Map<string, boolean>>

    constructor(authorize: Authorize) {
        this.authorize = authorize
        this.map = this.buildMap(authorize)
        console.log("map", this.map)

    }

    private buildMap(authorize: Authorize): Map<string, Map<string, boolean>>{
        const map = new Map()
        for (const [_, {contract,actions}] of Object.entries(authorize)) {
            map.set(contract, new Map())
            for (const action of actions) {
                map.get(contract)!.set(action, true)
            }
        }
        return map
    }


    public isAuthorized(request: SigningRequest): boolean {
        for (const action of request.getRawActions()) {
            if (!this.isActionAuthorized(action)) {
                return false
            }
        }
        return true
    }
    private isActionAuthorized(action: Action): boolean {
        const contract = action.account.toString()
        const actionName = action.name.toString()
        if (this.map.has(contract) && this.map.get(contract)!.has(actionName)){
            return true
        }
        if(actionName === 'transfer'){
            const data = Transfer.from(action.decodeData(transferStruct))
            console.log("transfer data:", data)
            if (data.to.toString() === this.authorize.bennyfi.contract) {
                return true
            }
        }
        return false
    }
}

const authorizer = new Authorizer(authorize)
export default authorizer
