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
        <p style="color: var(--color-text-tertiary); margin: 0;">{{ $t('auth.signUpToAccount') }}</p>
      </div>

      <!-- 注册表单 -->
      <div v-if="view === 'signup'" style="background: var(--color-bg-overlay); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 1rem; box-shadow: var(--shadow-sm); border: 1px solid var(--color-border-tertiary); padding: 2rem;">
        <form @submit.prevent="handleSignup" style="display: flex; flex-direction: column; gap: 1.5rem;">
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
            <label for="email" style="display: block; font-size: 0.875rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 0.5rem;">
              Email
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              :placeholder="$t('auth.enterEmail')"
              required
              autocomplete="email"
              style="width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--color-border-secondary); border-radius: 0.5rem; outline: none; transition: all 0.2s; font-size: 0.9375rem; box-sizing: border-box; background: var(--color-bg-primary); color: var(--color-text-primary);"
              onfocus="this.style.borderColor='var(--color-primary)'; this.style.boxShadow='var(--shadow-focus)'"
              onblur="this.style.borderColor='var(--color-border-secondary)'; this.style.boxShadow='none'"
            />
          </div>

          <div>
            <label for="password" style="display: block; font-size: 0.875rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 0.5rem;">
              {{ $t('common.password') }}
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              :placeholder="$t('auth.enterPassword')"
              required
              autocomplete="new-password"
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
            <span v-if="!loading">{{ $t('auth.signUp') }}</span>
            <div v-else style="width: 1.25rem; height: 1.25rem; border: 2px solid rgba(255, 255, 255, 0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite;"></div>
          </button>
        </form>

        <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--color-border-tertiary); text-align: center;">
          <p style="font-size: 0.875rem; color: var(--color-text-tertiary); margin: 0;">
            {{ $t('auth.hasAccount') }}
            <a href="#" @click.prevent="$emit('switchView', 'login')" style="color: var(--color-primary); font-weight: 600; text-decoration: none; margin-left: 0.5rem;">{{ $t('auth.signIn') }}</a>
          </p>
        </div>
      </div>

      <!-- 邮箱验证 -->
      <div v-else-if="view === 'verify'" style="background: var(--color-bg-overlay); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 1rem; box-shadow: var(--shadow-sm); border: 1px solid var(--color-border-tertiary); padding: 2rem;">
        <div style="text-align: center; margin-bottom: 2rem;">
          <p style="color: var(--color-text-secondary);">{{ $t('auth.emailVerificationSent') }}</p>
          <p style="font-weight: 600; color: var(--color-text-primary);">{{ email }}</p>
        </div>

        <form @submit.prevent="handleVerify" style="display: flex; flex-direction: column; gap: 1.5rem;">
          <div>
            <label for="code" style="display: block; font-size: 0.875rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 0.5rem;">
              {{ $t('auth.verificationCode') }}
            </label>
            <input
              id="code"
              v-model="verificationCode"
              type="text"
              :placeholder="$t('auth.enterVerificationCode')"
              required
              maxlength="6"
              style="width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--color-border-secondary); border-radius: 0.5rem; outline: none; transition: all 0.2s; font-size: 1.5rem; letter-spacing: 0.5rem; text-align: center; box-sizing: border-box; background: var(--color-bg-primary); color: var(--color-text-primary);"
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
            <span v-if="!loading">{{ $t('auth.verify') }}</span>
            <div v-else style="width: 1.25rem; height: 1.25rem; border: 2px solid rgba(255, 255, 255, 0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite;"></div>
          </button>
        </form>

        <div style="margin-top: 1.5rem; text-align: center;">
          <a href="#" @click.prevent="view = 'signup'" style="color: var(--color-text-tertiary); font-size: 0.875rem; text-decoration: none;">
            ← {{ $t('common.cancel') }}
          </a>
        </div>
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

const emit = defineEmits(['signup', 'verify', 'switchView'])

const view = ref('signup')
const username = ref('')
const email = ref('')
const password = ref('')
const verificationCode = ref('')
const loading = ref(false)

const handleSignup = async () => {
  if (!username.value || !password.value || !email.value) return

  loading.value = true
  try {
    emit('signup', {
      username: username.value,
      password: password.value,
      email: email.value
    }, (needsVerification) => {
      if (needsVerification) {
        view.value = 'verify'
      }
    })
  } finally {
    loading.value = false
  }
}

const handleVerify = async () => {
  if (!verificationCode.value || verificationCode.value.length !== 6) return

  loading.value = true
  try {
    emit('verify', username.value, verificationCode.value)
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

