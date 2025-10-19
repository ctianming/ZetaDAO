import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { supabaseAdmin } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    const s = session as any
    if (!s?.uid) return NextResponse.json({ error: '未登录' }, { status: 401 })
    const body = await req.json()
    const targetUid = String(body?.targetUid || '')
    if (!targetUid) return NextResponse.json({ error: '缺少目标用户' }, { status: 400 })
    if (targetUid === s.uid) return NextResponse.json({ error: '不能关注自己' }, { status: 400 })
    const { error } = await supabaseAdmin.from('user_follows').insert({ follower_uid: s.uid, following_uid: targetUid })
    if (error && error.code !== '23505') throw error // ignore duplicate
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: '关注失败' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    const s = session as any
    if (!s?.uid) return NextResponse.json({ error: '未登录' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const targetUid = String(searchParams.get('targetUid') || '')
    if (!targetUid) return NextResponse.json({ error: '缺少目标用户' }, { status: 400 })
    const { error } = await supabaseAdmin.from('user_follows').delete().match({ follower_uid: s.uid, following_uid: targetUid })
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: '取消关注失败' }, { status: 500 })
  }
}
