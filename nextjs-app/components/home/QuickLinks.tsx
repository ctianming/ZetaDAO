'use client'

import Link from 'next/link'
import { FileText, Video, Calendar, Users } from 'lucide-react'

const links = [
  {
    title: '技术文章',
    description: '深入了解ZetaChain技术架构',
    icon: FileText,
    href: '/articles',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    title: '会议回放',
    description: '观看社区技术分享视频',
    icon: Video,
    href: '/videos',
    color: 'from-purple-500 to-pink-500',
  },
  {
    title: '社区活动',
    description: '参与最新社区激励活动',
    icon: Calendar,
    href: '/activities',
    color: 'from-green-500 to-emerald-500',
  },
  {
    title: '大使名录',
    description: '认识全球社区大使',
    icon: Users,
    href: '/ambassadors',
    color: 'from-orange-500 to-red-500',
  },
]

export default function QuickLinks() {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">快速导航</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {links.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${link.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${link.color} text-white mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                
                <h3 className="text-xl font-semibold mb-2">{link.title}</h3>
                <p className="text-muted-foreground">{link.description}</p>
                
                <div className="mt-4 flex items-center text-primary-500 font-medium">
                  <span>了解更多</span>
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
