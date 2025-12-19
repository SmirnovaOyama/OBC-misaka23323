import { DurableObject } from 'cloudflare:workers'

export class AdminDO extends DurableObject {
  constructor(state: DurableObjectState, env: CloudflareBindings) {
    super(state, env)
  }

  async fetch(request: Request) {
    const url = new URL(request.url)

    if (request.method === 'GET' && url.pathname === '/users') {
      const users = (await this.ctx.storage.get('users')) as Array<{username: string, type: string}> || []
      return new Response(JSON.stringify({ users }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (request.method === 'POST' && url.pathname === '/add-user') {
      const { username, type, emailVerified }: { username: string, type: string, emailVerified?: boolean } = await request.json()
      const users = (await this.ctx.storage.get('users')) as Array<{username: string, type: string, emailVerified?: boolean}> || []

      // 检查用户是否已存在
      const userIndex = users.findIndex(u => u.username === username)
      if (userIndex !== -1) {
        // 如果用户已存在，更新其类型和验证状态（可能是在重新注册或更新）
        users[userIndex].type = type
        if (emailVerified !== undefined) {
          users[userIndex].emailVerified = emailVerified
        }
      } else {
        users.push({ username, type, emailVerified: emailVerified || false })
      }
      
      await this.ctx.storage.put('users', users)

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (request.method === 'POST' && url.pathname === '/update-user-status') {
      const { username, emailVerified }: { username: string, emailVerified: boolean } = await request.json()
      const users = (await this.ctx.storage.get('users')) as Array<{username: string, type: string, emailVerified?: boolean}> || []
      
      const userIndex = users.findIndex(u => u.username === username)
      if (userIndex !== -1) {
        users[userIndex].emailVerified = emailVerified
        await this.ctx.storage.put('users', users)
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (request.method === 'POST' && url.pathname === '/remove-user') {
      const { username }: { username: string } = await request.json()
      const users = (await this.ctx.storage.get('users')) as Array<{username: string, type: string}> || []
      const filteredUsers = users.filter(u => u.username !== username)
      await this.ctx.storage.put('users', filteredUsers)

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (request.method === 'POST' && url.pathname === '/init-admin') {
      const users = (await this.ctx.storage.get('users')) as Array<{username: string, type: string}> || []
      if (users.length === 0) {
        users.push({ username: 'admin', type: 'admin' })
        await this.ctx.storage.put('users', users)
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (request.method === 'POST' && url.pathname === '/set-root-token') {
      const { token }: { token: string } = await request.json()
      await this.ctx.storage.put('root_token', token)
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (request.method === 'POST' && url.pathname === '/verify-root-token') {
      const { token }: { token: string } = await request.json()
      const storedToken = await this.ctx.storage.get('root_token')
      return new Response(JSON.stringify({ valid: storedToken === token }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (request.method === 'GET' && url.pathname === '/settings') {
      const settings = (await this.ctx.storage.get('settings')) as { title: string, logo: string } || { title: 'OpenBioCard', logo: '' }
      return new Response(JSON.stringify(settings), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (request.method === 'POST' && url.pathname === '/update-settings') {
      const newSettings = await request.json()
      await this.ctx.storage.put('settings', newSettings)
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response('Not found', { status: 404 })
  }
}
