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

    // 检查唯一性 (用户名或邮箱)
    if (request.method === 'POST' && url.pathname === '/check-uniqueness') {
      const { username, email } = await request.json()
      const users = (await this.ctx.storage.get('users')) as Array<any> || []
      
      const normalizedEmail = email?.toLowerCase().trim()
      
      if (users.some(u => u.username === username)) {
        return new Response(JSON.stringify({ error: 'Username already exists' }), { status: 409 })
      }
      
      if (normalizedEmail && users.some(u => u.email?.toLowerCase().trim() === normalizedEmail)) {
        return new Response(JSON.stringify({ error: 'Email already in use' }), { status: 409 })
      }
      
      return new Response(JSON.stringify({ success: true }))
    }

    if (request.method === 'POST' && url.pathname === '/add-user') {
      const data = await request.json()
      const { username, type, email, emailVerified, avatar, bio }: { username: string, type: string, email: string, emailVerified?: boolean, avatar?: string, bio?: string } = data
      const users = (await this.ctx.storage.get('users')) as Array<any> || []

      const normalizedEmail = email.toLowerCase().trim()

      // 再次双重检查唯一性 (排除自己)
      if (users.some(u => u.email?.toLowerCase().trim() === normalizedEmail && u.username !== username)) {
        return new Response(JSON.stringify({ error: 'Email already in use' }), { status: 409 })
      }

      const userIndex = users.findIndex(u => u.username === username)
      const userData = { 
        username, 
        type, 
        email: normalizedEmail,
        emailVerified: emailVerified ?? false,
        avatar: avatar || (userIndex !== -1 ? users[userIndex].avatar : ''),
        bio: bio || (userIndex !== -1 ? users[userIndex].bio : '')
      }

      if (userIndex !== -1) {
        users[userIndex] = userData
      } else {
        users.push(userData)
      }
      
      await this.ctx.storage.put('users', users)
      return new Response(JSON.stringify({ success: true }))
    }

    if (request.method === 'POST' && url.pathname === '/sync-profile') {
      const { username, avatar, bio } = await request.json()
      const users = (await this.ctx.storage.get('users')) as Array<any> || []
      const index = users.findIndex(u => u.username === username)
      if (index !== -1) {
        users[index].avatar = avatar
        users[index].bio = bio
        await this.ctx.storage.put('users', users)
      }
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
      const users = (await this.ctx.storage.get('users')) as Array<{username: string, type: string, emailVerified?: boolean}> || []
      if (users.length === 0) {
        users.push({ username: 'admin', type: 'admin', emailVerified: true })
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
