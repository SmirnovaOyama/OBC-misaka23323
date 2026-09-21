import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { CreateAccount } from '../types/siginup'
import { hashPassword } from '../utils/password'

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

    // 2. 在 AdminDO 中检查用户名/邮箱唯一性
    const adminId = c.env.ADMIN_DO.idFromName('admin-manager')
    const adminStub = c.env.ADMIN_DO.get(adminId)
    
    const checkResp = await adminStub.fetch('http://internal/check-uniqueness', {
      method: 'POST',
      body: JSON.stringify({ username, email }),
      headers: { 'Content-Type': 'application/json' }
    })

    if (!checkResp.ok) {
      const err: any = await checkResp.json()
      return c.json({ error: err.error === 'Email already in use' ? '该邮箱已被注册' : '用户名已存在' }, checkResp.status as ContentfulStatusCode)
    }

    // 3. 录入 AdminDO 用户列表
    await adminStub.fetch('http://internal/add-user', {
      method: 'POST',
      body: JSON.stringify({ username, type, email }),
      headers: { 'Content-Type': 'application/json' }
    })

    // Generate a token for auth
    const token = crypto.randomUUID()

    // Hash the password
    const hashedPassword = await hashPassword(password)

    // Store in Durable Object
    const id = c.env.USER_DO.idFromName(username)
    const stub = c.env.USER_DO.get(id)
    const storeResponse = await stub.fetch('http://do/store', {
      method: 'POST',
      body: JSON.stringify({ username, password: hashedPassword, type, token, email }),
      headers: { 'Content-Type': 'application/json' }
    })

    if (!storeResponse.ok) {
      return c.json({ error: '创建账号失败' }, 500)
    }

    return c.json({ token })
  } catch (error: any) {
      console.error('Signup error:', error)
      if (error.message && error.message.includes('durableObjectReset')) {
          return c.json({ error: '服务繁忙，请稍后再试' }, 503)
      }
      return c.json({ error: '服务器内部错误' }, 500)
  }
})
