import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const qraw = (searchParams.get('q') || '').trim()
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '20')))
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'))
    if (!qraw) return NextResponse.json({ success: true, data: [], total: 0 })
    // 支持 @username 查询，优先精确匹配；其次模糊匹配（用户名 / 绑定的钱包地址）
    const q = qraw.replace(/^@+/, '')
    if (!q) return NextResponse.json({ success: true, data: [], total: 0 })

    // 1) 精确匹配用户名
    const exactSel = supabase
      .from('users')
      .select('uid,username,xp_total', { count: 'exact' })
      .eq('username', q)
    const [{ data: exactRows, count: exactCount }, exactErr] = await Promise.all([
      exactSel,
      Promise.resolve(null as any)
    ])
    if ((exactRows as any)?.error) throw (exactRows as any).error

    // 2) 模糊匹配：用户名或钱包地址 ilike
    const likeSel = supabase
      .from('users')
      .select('uid,username,xp_total', { count: 'exact' })
      .or(`username.ilike.%${q}%,wallet_address.ilike.%${q}%`)
      .order('xp_total', { ascending: false })
    const { data: likeRows, error: likeErr, count: likeCount } = await likeSel
    if (likeErr) throw likeErr

    const exactList = Array.isArray(exactRows) ? exactRows : []
    const likeList = Array.isArray(likeRows) ? likeRows : []
    const exactUid = exactList[0]?.uid
    const likeSet = new Set(likeList.map((r:any)=> r.uid))
    // 合并：精确匹配放前面，其次去重后的模糊匹配
    const merged = [...exactList, ...likeList.filter((r:any)=> r.uid !== exactUid)]
    const total = (exactCount || 0) + (likeCount || 0) - (exactUid && likeSet.has(exactUid) ? 1 : 0)
    const paged = merged.slice(offset, offset + limit)
    return NextResponse.json({ success: true, data: paged, total })
  } catch (e) {
    return NextResponse.json({ error: '用户搜索失败' }, { status: 500 })
  }
}
