import Header from '@/components/layout/Header'
import { supabase } from '@/lib/db'
import { mapPublishedRows } from '@/lib/transform'
import Link from 'next/link'
import FollowButton from '@/components/social/FollowButton'
import AvatarEditor from '@/components/profile/AvatarEditor'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { redirect } from 'next/navigation'

async function getUser(uid: string) {
  const { data, error } = await supabase.from('users').select('uid,username,avatar_url,bio,xp_total,created_at').eq('uid', uid).single()
  if (error) return null
  return data
}

async function getArticles(uid: string) {
  const { data, error } = await supabase.from('published_content').select('*').eq('author_uid', uid).eq('category','article').order('published_at', { ascending: false }).limit(6)
  if (error) return []
  return mapPublishedRows(data)
}

export default async function PublicUserPage({ params }: { params: { uid: string } }) {
  const user = await getUser(params.uid)
  if (!user) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="text-center text-gray-500">用户不存在</div>
        </main>
      </div>
    )
  }
  const articles = await getArticles(params.uid)
  // Determine if this is self page
  const session = await getServerSession(authOptions as any)
  const isSelf = Boolean((session as any)?.uid && (session as any).uid === user.uid)
  if (isSelf) {
    // 自己访问 /u/<uid> 时跳转到 /profile
    redirect('/profile')
  }
  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <div className="rounded-2xl bg-gradient-to-r from-primary-50 to-white border p-6 mb-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <AvatarEditor
                  avatarUrl={user.avatar_url || undefined}
                  username={user.username || undefined}
                  isSelf={isSelf}
                  size={64}
                />
                <div>
                  <div className="text-2xl font-semibold">{user.username || '用户'}</div>
                  <div className="text-sm text-gray-500">XP {user.xp_total ?? 0}</div>
                  <div className="flex gap-4 text-xs text-gray-600 mt-1">
                    <Link href={`/u/${user.uid}/following`} className="hover:underline">关注</Link>
                    <Link href={`/u/${user.uid}/followers`} className="hover:underline">粉丝</Link>
                    <Link href={`/dynamics?uid=${user.uid}`} className="hover:underline">动态</Link>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!isSelf && <FollowButton targetUid={user.uid} />}
                <Link href={`/dynamics?uid=${user.uid}`} className="text-sm text-primary-600 hover:underline">TA 的动态</Link>
              </div>
            </div>
            {user.bio && <div className="mt-3 text-gray-700">{user.bio}</div>}
          </div>

          {/* Articles */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-medium">TA 的文章</div>
              <Link href={`/articles?authorUid=${user.uid}`} className="text-sm text-gray-500 hover:underline">查看更多</Link>
            </div>
            <div className="grid gap-3">
              {articles.length === 0 ? (
                <div className="text-sm text-gray-500">暂无文章</div>
              ) : (
                articles.map((a) => (
                  <Link key={a.id} href={`/articles/${a.id}`} className="rounded-xl border p-4 hover:bg-gray-50">
                    <div className="font-medium">{a.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{new Date(a.publishedAt).toLocaleString()}</div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Dynamics snippet */}
          <UserDynamics uid={user.uid} />
        </div>
      </main>
    </div>
  )
}

async function getUserPosts(uid: string) {
  const { data, error } = await supabase.from('user_posts').select('id,content,created_at').eq('user_uid', uid).order('created_at', { ascending: false }).limit(5)
  if (error) return []
  return data
}

async function UserDynamics({ uid }: { uid: string }) {
  const items = await getUserPosts(uid)
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-medium">TA 的动态</div>
        <Link href={`/dynamics?uid=${uid}`} className="text-sm text-gray-500 hover:underline">查看全部</Link>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="text-sm text-gray-500">暂无动态</div>
        ) : (
          items.map(it => (
            <div key={it.id} className="rounded-xl border p-4">
              <div className="text-xs text-gray-500 mb-1">{new Date(it.created_at).toLocaleString()}</div>
              <div className="whitespace-pre-wrap text-sm">{it.content}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
