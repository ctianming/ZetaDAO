import * as tencentcloud from 'tencentcloud-sdk-nodejs'

const SesClient = (tencentcloud as any).ses.v20201002.Client

export async function sendVerificationEmail(to: string, code: string) {
  const secretId = process.env.TENCENT_SECRET_ID
  const secretKey = process.env.TENCENT_SECRET_KEY
  const region = process.env.TENCENT_SES_REGION || 'ap-hongkong'
  const from = process.env.TENCENT_SES_FROM
  if (!secretId || !secretKey || !from) {
    throw new Error('Tencent SES env not configured')
  }
  const client = new SesClient({
    credential: { secretId, secretKey },
    region,
    profile: { httpProfile: { endpoint: 'ses.tencentcloudapi.com' } },
  })

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'ZetaDAO'
  const subject = `${appName} 邮箱验证`
  const html = `
    <div style="font-size:14px;line-height:1.7">
      <p>您好，感谢注册 ${appName}。</p>
      <p>您的验证码：<strong style="font-size:18px">${code}</strong></p>
      <p>验证码有效期 15 分钟，请尽快完成验证。</p>
      <p>如果不是您本人操作，请忽略此邮件。</p>
    </div>
  `
  const text = `您好，感谢注册 ${appName}。验证码：${code}。验证码有效期 15 分钟。`

  const params = {
    FromEmailAddress: from,
    Destination: [to],
    Subject: subject,
    Simple: {
      Html: { Content: html },
      Text: { Content: text },
    },
  }

  await client.SendEmail(params as any)
}
