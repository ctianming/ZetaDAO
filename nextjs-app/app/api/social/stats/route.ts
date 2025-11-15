import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/db'

// Force dynamic rendering to avoid build-time fetch errors
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const s = session as any
    const { searchParams } = new URL(req.url)
    const uid = String(searchParams.get('uid') || s?.uid || '')
    if (!uid) return NextResponse.json({ error: '缺少 uid 或未登录' }, { status: 400 })

    const [followersCount, followingCount, isFollowing, postsCount] = await Promise.all([
      supabaseAdmin.from('user_follows').select('follower_uid', { count: 'exact', head: true }).eq('following_uid', uid),
      supabaseAdmin.from('user_follows').select('following_uid', { count: 'exact', head: true }).eq('follower_uid', uid),
      s?.uid ? supabaseAdmin.from('user_follows').select('follower_uid').eq('follower_uid', s.uid).eq('following_uid', uid).maybeSingle() : Promise.resolve({ data: null }),
      supabaseAdmin.from('user_posts').select('id', { count: 'exact', head: true }).eq('user_uid', uid)
    ])

    return NextResponse.json({ success: true, data: {
      followers: followersCount.count || 0,
      following: followingCount.count || 0,
      isFollowing: !!(isFollowing as any)?.data,
      posts: (postsCount as any)?.count || 0
    } })
  } catch (e: any) {
    console.error('Error fetching social stats:', {
      message: e?.message || 'Unknown error',
      details: e?.toString() || '',
    });
    // Return default values instead of error to prevent page crashes
    return NextResponse.json({ 
      success: true, 
      data: { followers: 0, following: 0, isFollowing: false, posts: 0 } 
    })
  }
}
