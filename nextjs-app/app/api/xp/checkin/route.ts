import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'

export async function POST(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    const uid = (session as any)?.uid as string | undefined
    if (!uid) return NextResponse.json({ error: '未登录' }, { status: 401 })

    // 插入每日签到，利用唯一索引避免重复
    const { error } = await supabaseAdmin.from('xp_events').insert({
      user_uid: uid,
      type: 'checkin',
      amount: 5,
      day_utc: new Date().toISOString().slice(0, 10),
      metadata: { source: 'daily_checkin' },
    })

    if (error) {
      // 重复签到或其他错误
      if ((error as any).message?.includes('uniq_xp_checkin_daily')) {
        return NextResponse.json({ success: false, message: '今天已签到' })
      }
      // 也可能是唯一约束名字不在 message 中，返回通用提示
      return NextResponse.json({ success: false, message: '签到失败或已签到' })
    }

    // 查询最新总分
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('xp_total')
      .eq('uid', uid)
      .single()

    return NextResponse.json({ success: true, data: { xpTotal: user?.xp_total ?? null } })
  } catch (e) {
    console.error('XP checkin error', e)
    return NextResponse.json({ error: '签到异常' }, { status: 500 })
  }
}
