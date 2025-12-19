import { Hono } from 'hono'
import { CreateAccount } from '../types/siginup'
import { hashPassword } from '../utils/password'
import { sendVerificationEmail } from '../utils/email'

export const siginup = new Hono<{ Bindings: CloudflareBindings }>()

siginup.post('/create', async (c) => {
  try {
    const body = await c.req.json<CreateAccount>()
    const { username, password, email } = body
    const type = body.type || 'user'
    
    // 1. 强制要求邮箱
    if (!email || !email.includes('@')) {
      return c.json({ error: '请提供有效的电子邮箱' }, 400)
    }

    // 2. 在 AdminDO 中检查唯一性 (不在此处录入正式列表)
    const adminId = c.env.ADMIN_DO.idFromName('admin-manager')
    const adminStub = c.env.ADMIN_DO.get(adminId)
    const checkResp = await adminStub.fetch('http://internal/check-uniqueness', {
      method: 'POST',
      body: JSON.stringify({ username, email }),
      headers: { 'Content-Type': 'application/json' }
    })

    if (!checkResp.ok) {
      const err: any = await checkResp.json()
      return c.json({ error: err.error === 'Email already in use' ? '该邮箱已被注册' : '用户名已存在' }, checkResp.status)
    }

    // Generate a token for auth
    const token = crypto.randomUUID()
    
    // Generate a verification code for email
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Hash the password
    const hashedPassword = await hashPassword(password)

    // Store in Durable Object (此时 emailVerified 为 false)
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
      return c.json({ error: '创建账号失败' }, 500)
    }

    // Send verification email
    await sendVerificationEmail(email, verificationCode, username, c.env.RESEND_API_KEY)

    return c.json({ token, needsVerification: true })
  } catch (error: any) {
      console.error('Signup error:', error)
      if (error.message && error.message.includes('durableObjectReset')) {
          return c.json({ error: '服务繁忙，请稍后再试' }, 503)
      }
      return c.json({ error: '服务器内部错误' }, 500)
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
      return c.json({ error: errorData.error || '验证失败' }, response.status)
    }

    const userData: any = await response.json()

    // 2. 只有在此处验证码校验成功后，才录入 AdminDO 列表
    try {
      const adminId = c.env.ADMIN_DO.idFromName('admin-manager')
      const adminStub = c.env.ADMIN_DO.get(adminId)
      await adminStub.fetch('http://internal/add-user', {
        method: 'POST',
        body: JSON.stringify({ 
          username, 
          type: userData.type || 'user', 
          email: userData.email,
          emailVerified: true 
        }),
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (adminError) {
      console.error('Failed to sync to AdminDO after verification:', adminError)
    }

    return c.json({ success: true })
  } catch (error) {
    console.error('Verify error:', error)
    return c.json({ error: '服务器内部错误' }, 500)
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
