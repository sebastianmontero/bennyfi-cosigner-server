
export interface AuthorizeObj {
    contract: string
    actions: string[]
}

export interface Authorize {
    bennyfi: AuthorizeObj
    xchange: AuthorizeObj
    token: AuthorizeObj
}
