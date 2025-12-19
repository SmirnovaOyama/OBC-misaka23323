export interface CreateAccount {
    username: string
    password: string
    token: string
    type: string
    email?: string
    emailVerified?: boolean
    verificationCode?: string
}