export async function sendVerificationEmail(email: string, code: string, username: string, apiKey?: string) {
  console.log(`[Email Service] Sending verification code ${code} to ${email} for user ${username}`)
  
  if (!apiKey) {
    console.warn('[Email Service] No API Key provided, email not sent (only logged to console)')
    return true
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'OpenBioCard <onboarding@resend.dev>', // 默认测试发件人，生产环境请更换为您的域名
        to: [email],
        subject: '验证您的 OpenBioCard 邮箱',
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #333;">欢迎加入 OpenBioCard!</h2>
            <p>你好 ${username},</p>
            <p>感谢注册。请在页面输入以下验证码以完成邮箱验证：</p>
            <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #3b82f6; border-radius: 5px; margin: 20px 0;">
              ${code}
            </div>
            <p style="color: #666; font-size: 12px;">如果您没有尝试注册 OpenBioCard，请忽略此邮件。</p>
          </div>
        `
      })
    });

    const data = await res.json()
    if (!res.ok) {
      console.error('[Email Service] Resend API error:', data)
      return false
    }

    console.log('[Email Service] Email sent successfully via Resend')
    return true
  } catch (error) {
    console.error('[Email Service] Failed to send email:', error)
    return false
  }
}

