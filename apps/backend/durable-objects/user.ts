import { CreateAccount } from '../types/siginup'
import { DurableObject } from 'cloudflare:workers'

interface Profile {
  name?: string
  userType?: string
  avatar?: string
  bio?: string
  location?: string
  website?: string
  contacts?: any[]
  socialLinks?: any[]
  projects?: any[]
  gallery?: any[]
  currentCompany?: string
  currentCompanyLink?: string
  currentSchool?: string
  currentSchoolLink?: string
  workExperiences?: any[]
  schoolExperiences?: any[]
  locales?: { [key: string]: Partial<Profile> }
  [key: string]: any
}

// 账号级字段只能由服务端流程（注册、改密、管理员操作）写入，
// 绝不能通过用户可控的资料更新 / 导入覆盖，否则可以自行提权 type。
const ACCOUNT_FIELDS: ReadonlyArray<keyof CreateAccount> = [
  'username', 'password', 'token', 'type', 'email'
]

function stripAccountFields(profile: Record<string, any>): Profile {
  const cleaned: Record<string, any> = { ...profile }
  for (const key of ACCOUNT_FIELDS) delete cleaned[key]
  return cleaned as Profile
}

export class UserDO extends DurableObject {
  constructor(state: DurableObjectState, env: CloudflareBindings) {
    super(state, env)
  }

  async fetch(request: Request) {
    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/store') {
      const data: CreateAccount = await request.json()
      await this.ctx.storage.put('user', data)

      // 注册到AdminDO（如果不是root用户）
      if (data.type !== 'root') {
        try {
          // 这里需要AdminDO的引用，暂时简化
          // 实际应该通过环境变量传递AdminDO
        } catch {
          // 忽略错误
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (request.method === 'GET' && url.pathname === '/get') {
      const data = await this.ctx.storage.get('user')
      return new Response(JSON.stringify(data || null), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (request.method === 'POST' && url.pathname === '/verify-token') {
      const { token }: { token: string } = await request.json()
      const data = await this.ctx.storage.get('user') as CreateAccount | undefined
      if (data && data.token === token) {
        return new Response(JSON.stringify({ 
          valid: true, 
          type: data.type, 
          username: data.username,
          email: data.email
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      } else {
        return new Response(JSON.stringify({ valid: false }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    if (request.method === 'POST' && url.pathname === '/delate') {
      // 删除账号时同时删除所有相关资料
      await this.ctx.storage.delete('user')
      await this.ctx.storage.delete('profile')
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (request.method === 'GET' && url.pathname === '/get-profile') {
      const data = await this.ctx.storage.get('user') as CreateAccount | undefined
      if (data) {
        const profile = (await this.ctx.storage.get('profile') || {}) as Profile
        return new Response(JSON.stringify({
          name: '',
          userType: profile.userType || '',
          avatar: '',
          bio: '',
          location: '',
          website: '',
          contacts: [],
          socialLinks: [],
          projects: [],
          gallery: [],
          currentCompany: profile.currentCompany || '',
          currentCompanyLink: profile.currentCompanyLink || '',
          currentSchool: profile.currentSchool || '',
          currentSchoolLink: profile.currentSchoolLink || '',
          workExperiences: profile.workExperiences || [],
          schoolExperiences: profile.schoolExperiences || [],
          ...stripAccountFields(profile),
          // 放在展开之后：账号信息以 user 记录为准，不受 profile 内容影响
          username: data.username,
          email: data.email
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      } else {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    if (request.method === 'POST' && url.pathname === '/update-profile') {
      const profileData = stripAccountFields(await request.json() as Record<string, any>)
      const existingProfile = (await this.ctx.storage.get('profile') || {}) as Profile
      const updatedProfile = { ...existingProfile, ...profileData }
      await this.ctx.storage.put('profile', updatedProfile)
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (request.method === 'POST' && url.pathname === '/change-password') {
      const { password: hashedPassword }: { password: string } = await request.json()
      const userData = await this.ctx.storage.get('user') as CreateAccount | undefined
      if (userData) {
        userData.password = hashedPassword
        await this.ctx.storage.put('user', userData)
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        })
      } else {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    if (request.method === 'GET' && url.pathname === '/export') {
      const account = await this.ctx.storage.get('user') as CreateAccount | undefined
      const profile = await this.ctx.storage.get('profile')
      // 导出文件会离开系统，不能包含密码哈希或会话 token
      const user = account
        ? { username: account.username, type: account.type, email: account.email }
        : undefined
      return new Response(JSON.stringify({ user, profile }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (request.method === 'POST' && url.pathname === '/import') {
      // 只恢复资料。user 记录（身份、凭据、角色）永远不从导入文件中读取，
      // 否则任何登录用户都能把自己的 type 改成 admin。
      const { profile } = await request.json() as { profile?: any }
      if (profile && typeof profile === 'object' && !Array.isArray(profile)) {
        await this.ctx.storage.put('profile', stripAccountFields(profile))
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (request.method === 'GET' && url.pathname === '/get-users') {
      // 特殊端点：如果这是admin-manager实例，返回所有用户
      const url = new URL(request.url)
      if (url.hostname.includes('admin-manager')) {
        // 这里简化实现，实际应该从AdminDO获取
        // 暂时返回示例数据
        const users = [
          { username: 'admin', type: 'admin' },
          { username: 'user1', type: 'user' }
        ]
        return new Response(JSON.stringify({ users }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }
      return new Response(JSON.stringify({ users: [] }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response('Not found', { status: 404 })
  }
}
