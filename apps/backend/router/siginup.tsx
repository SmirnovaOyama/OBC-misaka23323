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

    // 注册到 AdminDO 以便在管理面板中可见
    try {
      const adminId = c.env.ADMIN_DO.idFromName('admin-manager')
      const adminStub = c.env.ADMIN_DO.get(adminId)
      await adminStub.fetch('http://internal/add-user', {
        method: 'POST',
        body: JSON.stringify({ username, type, emailVerified: false }),
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (adminError) {
      console.error('Failed to sync user to AdminDO:', adminError)
      // 即使同步失败也继续，不影响用户注册
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

    // 同步验证状态到 AdminDO
    try {
      const adminId = c.env.ADMIN_DO.idFromName('admin-manager')
      const adminStub = c.env.ADMIN_DO.get(adminId)
      await adminStub.fetch('http://internal/update-user-status', {
        method: 'POST',
        body: JSON.stringify({ username, emailVerified: true }),
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (adminError) {
      console.error('Failed to sync verification status to AdminDO:', adminError)
    }

    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

siginup.post('/request-password-reset', async (c) => {
  try {
    const { username, email } = await c.req.json<{ username: string, email: string }>()
    
    const id = c.env.USER_DO.idFromName(username)
    const stub = c.env.USER_DO.get(id)
    const response = await stub.fetch('http://do/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      const errorData: any = await response.json()
      return c.json({ error: errorData.error || 'User not found or email mismatch' }, response.status)
    }

    const { code } = await response.json() as { code: string }
    
    // Send reset email
    await sendVerificationEmail(email, code, username, c.env.RESEND_API_KEY)

    return c.json({ success: true })
  } catch (error) {
    console.error('Password reset request error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

siginup.post('/reset-password', async (c) => {
  try {
    const { username, code, newPassword } = await c.req.json<{ username: string, code: string, newPassword: string }>()
    
    const hashedPassword = await hashPassword(newPassword)
    const id = c.env.USER_DO.idFromName(username)
    const stub = c.env.USER_DO.get(id)
    const response = await stub.fetch('http://do/reset-password', {
      method: 'POST',
      body: JSON.stringify({ code, newPassword: hashedPassword }),
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      const errorData: any = await response.json()
      return c.json({ error: errorData.error || 'Reset failed' }, response.status)
    }

    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})
