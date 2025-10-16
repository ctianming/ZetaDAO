import * as tencentcloud from 'tencentcloud-sdk-nodejs'

const SesClient = (tencentcloud as any).ses.v20201002.Client

export async function sendVerificationEmail(to: string, code: string) {
  const secretId = process.env.TENCENT_SECRET_ID
  const secretKey = process.env.TENCENT_SECRET_KEY
  const region = process.env.TENCENT_SES_REGION || 'ap-hongkong'
  const from = process.env.TENCENT_SES_FROM
  const templateId = process.env.TENCENT_SES_TEMPLATE_ID
  if (!secretId || !secretKey || !from) {
    throw new Error('Tencent SES env not configured')
  }
  if (!templateId) {
    throw new Error('Tencent SES template not configured')
  }
  const client = new SesClient({
    credential: { secretId, secretKey },
    region,
    profile: { httpProfile: { endpoint: 'ses.tencentcloudapi.com' } },
  })

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'ZetaDAO'
  const params = {
    FromEmailAddress: from,
    Destination: [to],
    Template: {
      TemplateID: Number(templateId),
      TemplateData: JSON.stringify({ appName, code, expireMinutes: 15 }),
    },
    Subject: `${appName} 邮箱验证`,
  }

  await client.SendEmail(params as any)
}
