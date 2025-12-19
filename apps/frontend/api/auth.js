// API服务层 - 认证相关
const API_BASE = '/api/'

export const authAPI = {
  // 用户登录
  async login(credentials) {
    const response = await fetch(`${API_BASE}signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials)
    })

    if (!response.ok) {
      try {
        const error = await response.json()
        throw new Error(error.error || 'Login failed')
      } catch (parseError) {
        throw new Error(`Login failed: ${response.status} ${response.statusText}`)
      }
    }

    return await response.json()
  },

  // 用户注册
  async signup(userData) {
    const response = await fetch(`${API_BASE}signup/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...userData, type: 'user' })
    })

    if (!response.ok) {
      try {
        const error = await response.json()
        throw new Error(error.error || 'Signup failed')
      } catch (parseError) {
        throw new Error(`Signup failed: ${response.status} ${response.statusText}`)
      }
    }

    return await response.json()
  },

  // 验证邮箱
  async verifyEmail(username, code) {
    const response = await fetch(`${API_BASE}signup/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, code })
    })

    if (!response.ok) {
      try {
        const error = await response.json()
        throw new Error(error.error || 'Verification failed')
      } catch (parseError) {
        throw new Error(`Verification failed: ${response.status} ${response.statusText}`)
      }
    }

    return await response.json()
  },

  // 检查管理员权限
  async checkPermission(token, username) {
    const response = await fetch(`${API_BASE}admin/check-permission`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, token })
    })

    // Token有效但无管理员权限
    if (response.status === 403) {
      return { authorized: true, isAdmin: false }
    }

    // Token无效或未认证
    if (!response.ok) {
      return { authorized: false, isAdmin: false }
    }

    try {
      const data = await response.json()
      return { authorized: true, isAdmin: data.success }
    } catch (parseError) {
      console.error('Failed to parse permission response:', parseError)
      return { authorized: false, isAdmin: false }
    }
  }
}