import { Hono } from 'hono'
import { CreateAccount } from '../types/siginup'
import { hashPassword } from '../utils/password'
import { sendVerificationEmail } from '../utils/email'

export const siginup = new Hono<{ Bindings: CloudflareBindings }>()

siginup.post('/create', async (c) => {
  try {
    const body = await c.req.json<CreateAccount>()
    const username = body.username
    const password = body.password
    const email = body.email
    const type = body.type || 'user'
    
    // Generate a token for auth
    const token = crypto.randomUUID()
    
    // Generate a verification code for email
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Hash the password
    const hashedPassword = await hashPassword(password)

    // Store in Durable Object
    const id = c.env.USER_DO.idFromName(username)
    const stub = c.env.USER_DO.get(id)
    const storeResponse = await stub.fetch('http://do/store', {
      method: 'POST',
      body: JSON.stringify({ 
        username, 
        password: hashedPassword, 
        type, 
        token, 
        email, 
        emailVerified: false,
        verificationCode 
      }),
      headers: { 'Content-Type': 'application/json' }
    })

    if (!storeResponse.ok) {
      return c.json({ error: 'Failed to create account' }, 500)
    }

    // Send verification email if email is provided
    if (email) {
      await sendVerificationEmail(email, verificationCode, username, c.env.RESEND_API_KEY)
    }

    return c.json({ token, needsVerification: !!email })
  } catch (error: any) {
      console.error('Signup error:', error)
      // Handle Durable Object reset
      if (error.message && error.message.includes('durableObjectReset')) {
          return c.json({ error: 'Service temporarily unavailable, please try again' }, 503)
      }
      return c.json({ error: 'Internal server error' }, 500)
  }
})

siginup.post('/verify-email', async (c) => {
  try {
    const { username, code } = await c.req.json<{ username: string, code: string }>()
    
    const id = c.env.USER_DO.idFromName(username)
    const stub = c.env.USER_DO.get(id)
    const response = await stub.fetch('http://do/verify-email', {
      method: 'POST',
      body: JSON.stringify({ code }),
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      const errorData: any = await response.json()
      return c.json({ error: errorData.error || 'Verification failed' }, response.status)
    }

    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})
