<template>
  <div style="min-height: 100vh; background: var(--gradient-bg); display: flex; align-items: center; justify-content: center; padding: 2rem;">
    <div style="width: 100%; max-width: 420px;">
      <!-- Logo 和标题 -->
      <div style="text-align: center; margin-bottom: 3rem;">
        <div style="width: 4rem; height: 4rem; background: var(--color-bg-primary); border-radius: 1rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; border: 2px solid var(--color-border-primary); overflow: hidden;">
          <img v-if="logo" :src="logo" :alt="title || $t('app.name')" style="width: 100%; height: 100%; object-fit: cover;" />
          <svg v-else width="32" height="32" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <rect x="25" y="50" width="150" height="100" rx="15" ry="15" fill="var(--color-bg-primary)" stroke="var(--color-text-primary)" stroke-width="4"/>
            <circle cx="50" cy="90" r="15" fill="none" stroke="var(--color-text-primary)" stroke-width="3"/>
            <line x1="50" y1="105" x2="50" y2="120" stroke="var(--color-text-primary)" stroke-width="2"/>
            <text x="70" y="85" font-family="monospace" font-size="8" fill="var(--color-text-primary)">console.log("Open")</text>
            <line x1="70" y1="95" x2="150" y2="95" stroke="var(--color-text-primary)" stroke-width="1.5"/>
            <line x1="70" y1="110" x2="130" y2="110" stroke="var(--color-text-primary)" stroke-width="1.5"/>
            <line x1="35" y1="145" x2="165" y2="145" stroke="var(--color-text-primary)" stroke-width="1" stroke-dasharray="4,4"/>
          </svg>
        </div>
        <h1 style="font-size: 2rem; font-weight: bold; color: var(--color-text-primary); margin: 0 0 0.5rem;">{{ title || $t('app.name') }}</h1>
        <p style="color: var(--color-text-tertiary); margin: 0;">{{ $t('auth.signInToAccount') }}</p>
      </div>

      <!-- 登录表单 -->
      <div v-if="view === 'login'" style="background: var(--color-bg-overlay); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 1rem; box-shadow: var(--shadow-sm); border: 1px solid var(--color-border-tertiary); padding: 2rem;">
        <form @submit.prevent="handleLogin" style="display: flex; flex-direction: column; gap: 1.5rem;">
          <div>
            <label for="username" style="display: block; font-size: 0.875rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 0.5rem;">
              {{ $t('common.username') }}
            </label>
            <input
              id="username"
              v-model="username"
              type="text"
              :placeholder="$t('auth.enterUsername')"
              required
              autocomplete="username"
              style="width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--color-border-secondary); border-radius: 0.5rem; outline: none; transition: all 0.2s; font-size: 0.9375rem; box-sizing: border-box; background: var(--color-bg-primary); color: var(--color-text-primary);"
              onfocus="this.style.borderColor='var(--color-primary)'; this.style.boxShadow='var(--shadow-focus)'"
              onblur="this.style.borderColor='var(--color-border-secondary)'; this.style.boxShadow='none'"
            />
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <label for="password" style="display: block; font-size: 0.875rem; font-weight: 600; color: var(--color-text-secondary);">
                {{ $t('common.password') }}
              </label>
              <a href="#" @click.prevent="view = 'forgot'" style="font-size: 0.75rem; color: var(--color-primary); text-decoration: none;">{{ $t('auth.forgotPassword') }}</a>
            </div>
            <input
              id="password"
              v-model="password"
              type="password"
              :placeholder="$t('auth.enterPassword')"
              required
              autocomplete="current-password"
              style="width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--color-border-secondary); border-radius: 0.5rem; outline: none; transition: all 0.2s; font-size: 0.9375rem; box-sizing: border-box; background: var(--color-bg-primary); color: var(--color-text-primary);"
              onfocus="this.style.borderColor='var(--color-primary)'; this.style.boxShadow='var(--shadow-focus)'"
              onblur="this.style.borderColor='var(--color-border-secondary)'; this.style.boxShadow='none'"
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            style="width: 100%; padding: 0.875rem; background: var(--color-primary); color: var(--color-text-inverse); border: none; border-radius: 0.5rem; font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; min-height: 3rem;"
            :style="{ opacity: loading ? 0.7 : 1 }"
            onmouseover="if(!this.disabled) this.style.backgroundColor='var(--color-primary-hover)'"
            onmouseout="this.style.backgroundColor='var(--color-primary)'"
          >
            <span v-if="!loading">{{ $t('auth.signIn') }}</span>
            <div v-else style="width: 1.25rem; height: 1.25rem; border: 2px solid rgba(255, 255, 255, 0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite;"></div>
          </button>
        </form>

        <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--color-border-tertiary); text-align: center;">
          <p style="font-size: 0.875rem; color: var(--color-text-tertiary); margin: 0;">
            {{ $t('auth.firstTimeUser') }}
            <a href="#" @click.prevent="$emit('switchView', 'signup')" style="color: var(--color-primary); font-weight: 600; text-decoration: none; margin-left: 0.5rem;">{{ $t('auth.signUp') }}</a>
          </p>
        </div>
      </div>

      <!-- 忘记密码 - 输入邮箱 -->
      <div v-else-if="view === 'forgot'" style="background: var(--color-bg-overlay); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 1rem; box-shadow: var(--shadow-sm); border: 1px solid var(--color-border-tertiary); padding: 2rem;">
        <h3 style="text-align: center; margin-bottom: 1.5rem; color: var(--color-text-primary);">{{ $t('auth.resetPassword') }}</h3>
        <form @submit.prevent="handleRequestReset" style="display: flex; flex-direction: column; gap: 1.5rem;">
          <div>
            <label for="reset-username" style="display: block; font-size: 0.875rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 0.5rem;">
              {{ $t('common.username') }}
            </label>
            <input
              id="reset-username"
              v-model="username"
              type="text"
              :placeholder="$t('auth.enterUsername')"
              required
              style="width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--color-border-secondary); border-radius: 0.5rem; outline: none; transition: all 0.2s; background: var(--color-bg-primary); color: var(--color-text-primary);"
            />
          </div>
          <div>
            <label for="reset-email" style="display: block; font-size: 0.875rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 0.5rem;">
              Email
            </label>
            <input
              id="reset-email"
              v-model="email"
              type="email"
              :placeholder="$t('auth.enterEmail')"
              required
              style="width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--color-border-secondary); border-radius: 0.5rem; outline: none; transition: all 0.2s; background: var(--color-bg-primary); color: var(--color-text-primary);"
            />
          </div>
          <button
            type="submit"
            :disabled="loading"
            style="width: 100%; padding: 0.875rem; background: var(--color-primary); color: var(--color-text-inverse); border: none; border-radius: 0.5rem; font-size: 0.9375rem; font-weight: 600; cursor: pointer;"
          >
            {{ $t('auth.verify') }}
          </button>
        </form>
        <div style="margin-top: 1.5rem; text-align: center;">
          <a href="#" @click.prevent="view = 'login'" style="color: var(--color-text-tertiary); font-size: 0.875rem; text-decoration: none;">
            ← {{ $t('common.cancel') }}
          </a>
        </div>
      </div>

      <!-- 忘记密码 - 输入验证码和新密码 -->
      <div v-else-if="view === 'reset'" style="background: var(--color-bg-overlay); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 1rem; box-shadow: var(--shadow-sm); border: 1px solid var(--color-border-tertiary); padding: 2rem;">
        <h3 style="text-align: center; margin-bottom: 1.5rem; color: var(--color-text-primary);">{{ $t('auth.resetPassword') }}</h3>
        <form @submit.prevent="handleReset" style="display: flex; flex-direction: column; gap: 1.5rem;">
          <div>
            <label for="reset-code" style="display: block; font-size: 0.875rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 0.5rem;">
              {{ $t('auth.verificationCode') }}
            </label>
            <input
              id="reset-code"
              v-model="verificationCode"
              type="text"
              required
              maxlength="6"
              style="width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--color-border-secondary); border-radius: 0.5rem; outline: none; transition: all 0.2s; text-align: center; font-size: 1.25rem; letter-spacing: 0.5rem; background: var(--color-bg-primary); color: var(--color-text-primary);"
            />
          </div>
          <div>
            <label for="new-password" style="display: block; font-size: 0.875rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 0.5rem;">
              {{ $t('auth.newPassword') }}
            </label>
            <input
              id="new-password"
              v-model="password"
              type="password"
              :placeholder="$t('auth.enterNewPassword')"
              required
              style="width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--color-border-secondary); border-radius: 0.5rem; outline: none; background: var(--color-bg-primary); color: var(--color-text-primary);"
            />
          </div>
          <button
            type="submit"
            :disabled="loading"
            style="width: 100%; padding: 0.875rem; background: var(--color-primary); color: var(--color-text-inverse); border: none; border-radius: 0.5rem; font-size: 0.9375rem; font-weight: 600; cursor: pointer;"
          >
            {{ $t('common.save') }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  title: {
    type: String,
    default: ''
  },
  logo: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['login', 'switchView', 'requestReset', 'resetPassword'])

const view = ref('login')
const username = ref('')
const password = ref('')
const email = ref('')
const verificationCode = ref('')
const loading = ref(false)

const handleLogin = async () => {
  if (!username.value || !password.value) return

  loading.value = true
  try {
    emit('login', username.value, password.value)
  } finally {
    loading.value = false
  }
}

const handleRequestReset = async () => {
  if (!username.value || !email.value) return
  loading.value = true
  try {
    emit('requestReset', username.value, email.value, () => {
      view.value = 'reset'
      password.value = '' // Clear password field for new password
    })
  } finally {
    loading.value = false
  }
}

const handleReset = async () => {
  if (!verificationCode.value || !password.value) return
  loading.value = true
  try {
    emit('resetPassword', username.value, verificationCode.value, password.value, () => {
      view.value = 'login'
      password.value = ''
      verificationCode.value = ''
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
