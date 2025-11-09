import { NextRequest, NextResponse } from 'next/server'
import { verifyMessage, type Address, type Hex } from 'viem'

// POST /api/auth/wallet/connect
// body: { address, message, signature }
// verifies EIP-191 signature against a nonce cookie, and sets an httpOnly cookie `connected_wallet`
export async function POST(req: NextRequest) {
  try {
    const { address, message, signature } = await req.json().catch(() => ({}))
    const addr = String(address || '').toLowerCase()
    const msg = String(message || '')
    const sig = String(signature || '')
    if (!addr || !msg || !sig) {
      return NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 })
    }
    const nonceCookie = req.cookies.get('wallet_nonce')?.value
    if (!nonceCookie || !msg.includes(nonceCookie)) {
      return NextResponse.json({ success: false, error: '无效的签名挑战' }, { status: 400 })
    }
    const ok = await verifyMessage({ address: addr as Address, message: msg, signature: sig as Hex })
    if (!ok) return NextResponse.json({ success: false, error: '签名验证失败' }, { status: 401 })

    const res = NextResponse.json({ success: true, data: { address: addr } })
    // set connected wallet cookie, valid for 7 days
    res.cookies.set('connected_wallet', addr, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    // clear nonce to prevent replay
    res.cookies.set('wallet_nonce', '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 0, path: '/' })
    return res
  } catch (e) {
    console.error('wallet connect error', e)
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 })
  }
}
