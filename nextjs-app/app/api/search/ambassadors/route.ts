import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '20')))
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'))
    if (!q) return NextResponse.json({ success: true, data: [], total: 0 })
  const query = supabase.from('ambassadors').select('*', { count: 'exact' })
      .or(`name.ilike.%${q}%,country.ilike.%${q}%,city.ilike.%${q}%`)
      .eq('status', 'active')
      .order('contributions', { ascending: false })
      .range(offset, offset + limit - 1)
    const { data, error, count } = await query
    if (error) throw error
    return NextResponse.json({ success: true, data, total: count || 0 })
  } catch (e) {
    return NextResponse.json({ error: '大使搜索失败' }, { status: 500 })
  }
}
