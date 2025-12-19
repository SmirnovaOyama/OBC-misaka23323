import { Hono } from 'hono'
import { authMiddleware, requirePermission, AuthVariables } from '../middleware/auth'
import { hashPassword } from '../utils/password'

export const admin = new Hono<{ Bindings: CloudflareBindings & { ADMIN_DO: DurableObjectNamespace }, Variables: AuthVariables }>()

admin.post('/users/password', authMiddleware, requirePermission(['admin', 'root']), async (c) => {
  try {
    const { targetUsername, newPassword } = await c.req.json()
    const hashedPassword = await hashPassword(newPassword)
    const id = c.env.USER_DO.idFromName(targetUsername)
    const stub = c.env.USER_DO.get(id)
    
    // 获取当前数据并更新密码
    const getResp = await stub.fetch('http://internal/get')
    if (!getResp.ok) return c.json({ error: 'User not found' }, 404)
    const userData: any = await getResp.json()
    
    const updateResp = await stub.fetch('http://do/store', {
      method: 'POST',
      body: JSON.stringify({ ...userData, password: hashedPassword }),
      headers: { 'Content-Type': 'application/json' }
    })

    return updateResp.ok ? c.json({ success: true }) : c.json({ error: 'Update failed' }, 500)
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

admin.post('/users/sync-existing', authMiddleware, requirePermission(['admin', 'root']), async (c) => {
  try {
    const { targetUsername } = await c.req.json()
    const id = c.env.USER_DO.idFromName(targetUsername)
    const stub = c.env.USER_DO.get(id)
    
    // 1. 尝试从 UserDO 获取数据
    const getResp = await stub.fetch('http://internal/get')
    if (!getResp.ok) return c.json({ error: 'User not found in DO' }, 404)
    const userData: any = await getResp.json()
    
    // 2. 获取资料详情（头像和简介）
    const profileResp = await stub.fetch('http://internal/get-profile')
    let profileData: any = {}
    if (profileResp.ok) {
      profileData = await profileResp.json()
    }

    // 3. 强制同步到 AdminDO
    const adminId = c.env.ADMIN_DO.idFromName('admin-manager')
    const adminStub = c.env.ADMIN_DO.get(adminId)
    await adminStub.fetch('http://internal/add-user', {
      method: 'POST',
      body: JSON.stringify({ 
        username: targetUsername, 
        type: userData.type || 'user',
        email: userData.email,
        emailVerified: userData.emailVerified || false,
        avatar: profileData.avatar,
        bio: profileData.bio
      }),
      headers: { 'Content-Type': 'application/json' }
    })

    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: 'Internal error' }, 500)
  }
})

// 检查权限（用于前端权限验证）
admin.post('/check-permission', authMiddleware, requirePermission(['admin', 'root']), async (c) => {
  // 权限检查由中间件完成，这里只需返回成功
  return c.json({ success: true, type: c.var.user?.type })
})

// 获取用户列表（POST方式，用于前端）
admin.post('/users/list', authMiddleware, requirePermission(['admin', 'root']), async (c) => {
  try {
    console.log('Getting users list...')

    // 检查 ADMIN_DO 是否存在
    if (!c.env.ADMIN_DO) {
      console.error('ADMIN_DO is not available in environment')
      return c.json({ error: 'Service configuration error' }, 500)
    }

    // 从 AdminDO 读取用户列表
    const adminId = c.env.ADMIN_DO.idFromName('admin-manager')
    console.log('Got admin ID:', adminId)

    const adminStub = c.env.ADMIN_DO.get(adminId)
    console.log('Got admin stub, fetching users...')

    const doResponse = await adminStub.fetch('http://internal/users')
    console.log('AdminDO response status:', doResponse.status)

    if (!doResponse.ok) {
      const errorText = await doResponse.text()
      console.error('Failed to fetch users from AdminDO:', errorText)
      return c.json({ error: 'Failed to fetch users' }, 500)
    }

    const allUsers = await doResponse.json() as { users: Array<{username: string, type: string, emailVerified?: boolean}> }
    console.log('Users from AdminDO:', allUsers.users.length, 'users:', allUsers.users.map(u => u.username))

    // 过滤掉root用户
    const users = allUsers.users.filter(u => u.username !== c.env.ROOT_USERNAME)
    console.log('Returning users list:', users.length, 'users:', users.map(u => u.username))
    return c.json({ users })
  } catch (error: any) {
    console.error('Get users list error:', error)
    console.error('Error stack:', error.stack)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 获取所有用户列表（admin或root权限）
admin.get('/users', authMiddleware, requirePermission(['admin', 'root']), async (c) => {
  try {
    // 从 AdminDO 读取用户列表
    const adminId = c.env.ADMIN_DO.idFromName('admin-manager')
    const adminStub = c.env.ADMIN_DO.get(adminId)
    const doResponse = await adminStub.fetch('http://internal/users')

    if (!doResponse.ok) {
      console.error('Failed to fetch users from AdminDO')
      return c.json({ error: 'Failed to fetch users' }, 500)
    }

    const allUsers = await doResponse.json() as { users: Array<{username: string, type: string, emailVerified?: boolean}> }
    const users = allUsers.users.filter(u => u.username !== c.env.ROOT_USERNAME)
    return c.json({ users })
  } catch (error: any) {
    console.error('Get users error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 创建用户（admin权限）
admin.post('/users', authMiddleware, requirePermission(['admin', 'root']), async (c) => {
  try {
    const body = c.var.requestBody as { username: string, token: string, newUsername: string, password: string, type: string, email: string }
    const { newUsername, password, type, email } = body

    if (!email || !email.includes('@')) {
      return c.json({ error: 'Valid email is required' }, 400)
    }

    const adminId = c.env.ADMIN_DO.idFromName('admin-manager')
    const adminStub = c.env.ADMIN_DO.get(adminId)
    
    // 1. 检查唯一性 (包括邮箱)
    const checkResp = await adminStub.fetch('http://internal/check-uniqueness', {
      method: 'POST',
      body: JSON.stringify({ username: newUsername, email }),
      headers: { 'Content-Type': 'application/json' }
    })

    if (!checkResp.ok) {
      const err: any = await checkResp.json()
      return c.json({ error: err.error === 'Email already in use' ? 'Email already in use' : 'Username already exists' }, checkResp.status)
    }

    // 2. 创建 UserDO
    const token = crypto.randomUUID()
    const hashedPassword = await hashPassword(password)
    const id = c.env.USER_DO.idFromName(newUsername)
    const stub = c.env.USER_DO.get(id)
    
    await stub.fetch('http://do/store', {
      method: 'POST',
      body: JSON.stringify({ 
        username: newUsername, 
        password: hashedPassword, 
        type, 
        token,
        email,
        emailVerified: true 
      }),
      headers: { 'Content-Type': 'application/json' }
    })

    // 3. 同步到 AdminDO
    await adminStub.fetch('http://internal/add-user', {
      method: 'POST',
      body: JSON.stringify({ username: newUsername, type, email, emailVerified: true }),
      headers: { 'Content-Type': 'application/json' }
    })

    return c.json({ message: 'User created', token })
  } catch (error: any) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 获取系统设置
admin.post('/settings', authMiddleware, requirePermission(['admin', 'root']), async (c) => {
  try {
    const adminId = c.env.ADMIN_DO.idFromName('admin-manager')
    const adminStub = c.env.ADMIN_DO.get(adminId)
    const doResponse = await adminStub.fetch('http://internal/settings')
    const settings = await doResponse.json()
    return c.json(settings)
  } catch (error: any) {
    console.error('Get settings error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 更新系统设置
admin.post('/settings/update', authMiddleware, requirePermission(['admin', 'root']), async (c) => {
  try {
    const body = c.var.requestBody
    // 移除 body 中的验证字段，只保留设置字段
    const { username, token, ...settings } = body
    
    const adminId = c.env.ADMIN_DO.idFromName('admin-manager')
    const adminStub = c.env.ADMIN_DO.get(adminId)
    const doResponse = await adminStub.fetch('http://internal/update-settings', {
      method: 'POST',
      body: JSON.stringify(settings),
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!doResponse.ok) {
      return c.json({ error: 'Failed to update settings' }, 500)
    }
    
    return c.json({ success: true })
  } catch (error: any) {
    console.error('Update settings error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 删除用户（admin权限）
admin.delete('/users/:username', authMiddleware, requirePermission(['admin', 'root']), async (c) => {
  try {
    const targetUsername = c.req.param('username')
    const currentUser = c.var.user!

    // 不能删除自己或root用户
    if (targetUsername === currentUser.username) {
      return c.json({ error: 'Cannot delete yourself' }, 403)
    }
    if (targetUsername === c.env.ROOT_USERNAME) {
      return c.json({ error: 'Cannot delete root user' }, 403)
    }

    // 1. 删除 UserDO 中的用户数据
    try {
      const userId = c.env.USER_DO.idFromName(targetUsername)
      const userStub = c.env.USER_DO.get(userId)
      const userResponse = await userStub.fetch('http://do/delate', { method: 'POST' })

      if (!userResponse.ok) {
        console.error('Failed to delete user from UserDO')
        return c.json({ error: 'Failed to delete user account' }, 500)
      }
    } catch (userError: any) {
      console.error('UserDO deletion error:', userError)
      return c.json({ error: 'Failed to delete user account' }, 500)
    }

    // 2. 从 AdminDO 持久化存储中删除
    try {
      const adminId = c.env.ADMIN_DO.idFromName('admin-manager')
      const adminStub = c.env.ADMIN_DO.get(adminId)
      const doResponse = await adminStub.fetch('http://internal/remove-user', {
        method: 'POST',
        body: JSON.stringify({ username: targetUsername }),
        headers: { 'Content-Type': 'application/json' }
      })

      if (!doResponse.ok) {
        console.error('Failed to sync user deletion to AdminDO')
        return c.json({ error: 'Failed to persist user deletion' }, 500)
      }
    } catch (doError: any) {
      console.error('AdminDO sync error:', doError)
      return c.json({ error: 'Failed to persist user deletion' }, 500)
    }

    return c.json({ message: 'User deleted' })
  } catch (error: any) {
    console.error('Delete user error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})