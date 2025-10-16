import Header from '@/components/layout/Header'
import { supabase } from '@/lib/db'
import { Ambassador } from '@/types'
import { Mail, Twitter, Send } from 'lucide-react'
import { mapAmbassadorRows } from '@/lib/transform'

export const revalidate = 60

async function getAmbassadors(): Promise<Ambassador[]> {
  try {
    const { data, error } = await supabase
      .from('ambassadors')
      .select('*')
      .eq('status', 'active')
      .order('contributions', { ascending: false })

    if (error) {
      console.error('Error fetching ambassadors:', error)
      return []
    }
    return mapAmbassadorRows(data)
  } catch (e) {
    console.error('Error fetching ambassadors:', e)
    return []
  }
}

export default async function AmbassadorsPage() {
  const ambassadors = await getAmbassadors()

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-4 gradient-text">大使名录</h1>
          <p className="text-muted-foreground mb-12">
            认识来自全球各地的 ZetaChain 社区大使
          </p>

          {ambassadors.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">大使招募中，敬请期待</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ambassadors.map((ambassador) => (
                <div
                  key={ambassador.id}
                  className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                >
                  {/* 头像 */}
                  <div className="flex items-center gap-4 mb-4">
                    {ambassador.avatar ? (
                      <img
                        src={ambassador.avatar}
                        alt={ambassador.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold">
                        {ambassador.name.charAt(0)}
                      </div>
                    )}
                    
                    <div>
                      <h3 className="text-xl font-semibold">{ambassador.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {ambassador.city ? `${ambassador.city}, ` : ''}{ambassador.country}
                      </p>
                    </div>
                  </div>

                  {/* 简介 */}
                  <p className="text-muted-foreground mb-4 line-clamp-3">
                    {ambassador.bio}
                  </p>

                  {/* 统计 */}
                  <div className="flex gap-4 mb-4 text-sm">
                    <div>
                      <span className="font-semibold text-primary-600">
                        {ambassador.contributions}
                      </span>
                      <span className="text-muted-foreground ml-1">贡献</span>
                    </div>
                    <div>
                      <span className="font-semibold text-primary-600">
                        {ambassador.eventsHosted || 0}
                      </span>
                      <span className="text-muted-foreground ml-1">活动</span>
                    </div>
                  </div>

                  {/* 社交链接 */}
                  <div className="flex gap-2 border-t border-border/40 pt-4">
                    {ambassador.twitter && (
                      <a
                        href={`https://twitter.com/${ambassador.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Twitter"
                      >
                        <Twitter className="w-5 h-5 text-primary-600" />
                      </a>
                    )}
                    {ambassador.telegram && (
                      <a
                        href={`https://t.me/${ambassador.telegram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Telegram"
                      >
                        <Send className="w-5 h-5 text-primary-600" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
