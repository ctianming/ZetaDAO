import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { contentId } = await request.json()
    if (!contentId) return NextResponse.json({ error: '缺少内容ID' }, { status: 400 })

    // 增加浏览次数
    const { data: content, error: fetchErr } = await supabaseAdmin
      .from('published_content')
      .select('id,views,author_uid,author_wallet')
      .eq('id', contentId)
      .single()

    if (fetchErr || !content) return NextResponse.json({ error: '内容不存在' }, { status: 404 })

    const newViews = (content.views || 0) + 1
    await supabaseAdmin.from('published_content').update({ views: newViews }).eq('id', contentId)

    // 每满10次浏览，给作者 +2xp
    const milestone = Math.floor(newViews / 10)
    const prevMilestone = Math.floor((newViews - 1) / 10)
    if (milestone > prevMilestone && milestone > 0) {
      // 解析作者 uid
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
      if (authorUid) {
        // 利用唯一索引（user_uid, content_id, milestone）防止重复奖励
        await supabaseAdmin.from('xp_events').insert({
          user_uid: authorUid,
          type: 'view_threshold',
          amount: 2,
          content_id: contentId,
          milestone,
          metadata: { views: newViews },
        })
      }
    }

    return NextResponse.json({ success: true, data: { views: newViews } })
  } catch (e) {
    console.error('Content view error', e)
    return NextResponse.json({ error: '记录浏览失败' }, { status: 500 })
  }
}
