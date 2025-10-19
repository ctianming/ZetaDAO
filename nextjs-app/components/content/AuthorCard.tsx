import Link from 'next/link'
import FollowButton from '@/components/social/FollowButton'
import { supabase } from '@/lib/db'
import UserAvatar from '@/components/common/UserAvatar'

export default async function AuthorCard({ uid }: { uid: string }) {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('uid,username,avatar_url,bio,xp_total,created_at')
      .eq('uid', uid)
      .maybeSingle()
    const [followers, following, posts] = await Promise.all([
      supabase.from('user_follows').select('follower_uid', { count: 'exact', head: true }).eq('following_uid', uid),
      supabase.from('user_follows').select('following_uid', { count: 'exact', head: true }).eq('follower_uid', uid),
      supabase.from('user_posts').select('id', { count: 'exact', head: true }).eq('user_uid', uid),
    ])

    const name = user?.username || '用户'
    return (
      <div className="flex items-center justify-between rounded-2xl border p-4 bg-white">
        <div className="flex items-center gap-3">
          <UserAvatar url={user?.avatar_url || null} name={name} size={48} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link href={`/u/${uid}`} className="font-semibold hover:underline truncate max-w-[200px]">{name}</Link>
              <span className="text-xs text-gray-500">XP {user?.xp_total ?? 0}</span>
            </div>
            <div className="flex gap-4 text-xs text-gray-600 mt-1">
              <span>关注 {following.count || 0}</span>
              <span>粉丝 {followers.count || 0}</span>
              <span>动态 {posts.count || 0}</span>
            </div>
          </div>
        </div>
        <FollowButton targetUid={uid} />
      </div>
    )
  } catch {
    return null
  }
}
