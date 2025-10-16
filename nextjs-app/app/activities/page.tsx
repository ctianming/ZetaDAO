import Header from '@/components/layout/Header'
import { supabase } from '@/lib/db'
import { PublishedContent } from '@/types'
import { mapPublishedRows } from '@/lib/transform'
import { Calendar, MapPin, Users } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const revalidate = 60

async function getActivities(): Promise<PublishedContent[]> {
  try {
    const { data, error } = await supabase
      .from('published_content')
      .select('*')
      .eq('category', 'activity')
      .order('published_at', { ascending: false })

    if (error) {
      console.error('Error fetching activities:', error)
      return []
    }
    return mapPublishedRows(data)
  } catch (e) {
    console.error('Error fetching activities:', e)
    return []
  }
}

export default async function ActivitiesPage() {
  const activities = await getActivities()

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-4 gradient-text">社区活动</h1>
          <p className="text-muted-foreground mb-12">
            参与社区激励活动，赢取丰厚奖励
          </p>

          {activities.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">暂无活动，敬请期待</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300"
                >
                  <div className="flex flex-col md:flex-row gap-6">
          {activity.metadata?.imageUrl && (
                      <img
            src={activity.metadata.imageUrl}
                        alt={activity.title}
                        className="w-full md:w-64 h-48 object-cover rounded-xl"
                      />
                    )}
                    
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-3">{activity.title}</h3>
                      
                      <div className="flex flex-wrap gap-4 mb-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(activity.publishedAt)}</span>
                        </div>
                        {activity.metadata?.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{activity.metadata.location}</span>
                          </div>
                        )}
                        {activity.metadata?.participants && (
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>{activity.metadata.participants} 人参与</span>
                          </div>
                        )}
                      </div>
                      
                      <div
                        className="prose mb-4"
                        dangerouslySetInnerHTML={{ 
                          __html: activity.content.substring(0, 200) + '...' 
                        }}
                      />
                      
                      <div className="flex gap-4">
            {activity.metadata?.externalLink && (
                          <a
              href={activity.metadata.externalLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors"
                          >
                            立即参与
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
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
