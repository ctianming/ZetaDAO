import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { auth } from '@/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const uid = (session as any)?.uid as string | undefined
    if (!uid) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const { contentId } = await request.json()
    if (!contentId) return NextResponse.json({ error: '缺少内容ID' }, { status: 400 })

    // 查询内容作者
    const { data: content, error: fetchErr } = await supabaseAdmin
      .from('published_content')
      .select('id,author_uid,author_wallet')
      .eq('id', contentId)
      .single()

    if (fetchErr || !content) return NextResponse.json({ error: '内容不存在' }, { status: 404 })

    let authorUid: string | null = (content as any).author_uid || null
    if (!authorUid && (content as any).author_wallet) {
      const { data: ident } = await supabaseAdmin
        .from('user_identities')
        .select('user_uid')
        .eq('provider', 'wallet')
        .eq('account_id', (content as any).author_wallet)
        .maybeSingle()
      authorUid = ident?.user_uid || null
    }

    // 领取者 XP（作者）：每次 +1xp，无上限
    if (authorUid) {
      await supabaseAdmin.from('xp_events').insert({
        user_uid: authorUid,
        type: 'tip_receive',
        amount: 1,
        content_id: contentId,
        metadata: { source: 'tip' },
      })
    }

    // 打赏者 XP：每天最多 +5xp（以 UTC 天为准）；自赞不计入打赏者 XP
    if (authorUid !== uid) {
      const todayUtc = new Date().toISOString().slice(0, 10)
      const { count } = await supabaseAdmin
        .from('xp_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_uid', uid)
        .eq('type', 'tip_give')
        .eq('day_utc', todayUtc)
      if ((count || 0) >= 5) {
        return NextResponse.json({ success: true, message: '今日打赏已达上限（5xp）' })
      }

      await supabaseAdmin.from('xp_events').insert({
        user_uid: uid,
        type: 'tip_give',
        amount: 1,
        day_utc: todayUtc,
        content_id: contentId,
        metadata: { source: 'tip' },
      })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Tip error', e)
    return NextResponse.json({ error: '打赏失败' }, { status: 500 })
  }
}
