'use client'

import Link from 'next/link'
import Image from 'next/image'
import { PublishedContent } from '@/types'
import { formatRelativeTime, truncateAddress } from '@/lib/utils'
import { Eye, Heart } from 'lucide-react'

interface ArticleCardProps {
  article: PublishedContent
}

export default function ArticleCard({ article }: ArticleCardProps) {
  return (
    <Link
      href={`/articles/${article.id}`}
      className="block bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
    >
      <div className="flex gap-6">
        {article.metadata?.imageUrl && (
          <Image
            src={article.metadata.imageUrl}
            alt={article.title}
            width={192}
            height={128}
            unoptimized
            className="object-cover rounded-xl w-48 h-32"
          />
        )}
        
        <div className="flex-1">
          <h3 className="text-2xl font-semibold mb-2 hover:text-primary-600 transition-colors">
            {article.title}
          </h3>
          
          <p className="text-muted-foreground mb-4 line-clamp-2">
            {article.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
          </p>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4 text-muted-foreground">
              {article.authorName && (
                <span>{article.authorName}</span>
              )}
              {article.authorWallet && !article.authorName && (
                <span>{truncateAddress(article.authorWallet)}</span>
              )}
              <span>•</span>
              <span>{formatRelativeTime(article.publishedAt)}</span>
              {article.articleCategory && (
                <>
                  <span>•</span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">
                    {article.articleCategory}
                  </span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{article.views || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                <span>{article.likes || 0}</span>
              </div>
            </div>
          </div>
          
          {article.metadata?.tags && article.metadata.tags.length > 0 && (
            <div className="flex gap-2 mt-4">
              {article.metadata.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
