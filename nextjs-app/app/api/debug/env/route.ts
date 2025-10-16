import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const has = (k: string) => !!process.env[k]
  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV,
    TENCENT_SES_REGION: process.env.TENCENT_SES_REGION,
    TENCENT_SES_FROM_set: has('TENCENT_SES_FROM'),
    TENCENT_SECRET_ID_set: has('TENCENT_SECRET_ID'),
    TENCENT_SECRET_KEY_set: has('TENCENT_SECRET_KEY'),
    TENCENT_SES_TEMPLATE_ID_set: has('TENCENT_SES_TEMPLATE_ID'),
  })
}
