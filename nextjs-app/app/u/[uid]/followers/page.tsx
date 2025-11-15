import Header from '@/components/layout/Header'
import Link from 'next/link'
import { supabase } from '@/lib/db'

// Use dynamic rendering to avoid build-time fetch issues
export const dynamic = 'force-dynamic'

async function getFollowers(uid: string) {
  try {
  const { data, error } = await supabase.from('user_follows').select('follower_uid').eq('following_uid', uid)
  if (error) return []
  const ids = data.map((r:any)=>r.follower_uid)
  if (ids.length === 0) return []
  const { data: users } = await supabase.from('users').select('uid,username,xp_total').in('uid', ids)
  return users || []
  } catch (e) {
    console.error('Error in getFollowers:', e)
    return []
  }
}

export default async function FollowersPage({ params }: { params: { uid: string } }) {
  const users = await getFollowers(params.uid)
  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-xl font-semibold mb-4">粉丝</div>
          <div className="space-y-2">
            {users.length===0 ? (
              <div className="text-sm text-gray-500">暂无粉丝</div>
            ) : users.map((u:any)=> (
              <Link key={u.uid} href={`/u/${u.uid}`} className="flex items-center justify-between rounded-xl border p-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center text-xs font-semibold">{(u.username||'用').slice(0,1)}</div>
                  <div className="text-sm">
                    <div className="font-medium">{u.username || '用户'}</div>
                    <div className="text-gray-500">XP {u.xp_total ?? 0}</div>
                  </div>
                </div>
                <span className="text-xs text-gray-400">查看</span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
