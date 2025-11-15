'use client'

import { useEffect, useState } from 'react'

interface Banner {
  content: string;
  link_url?: string | null;
}

export default function NewsTicker() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch active banners from API
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await fetch('/api/banners')
        const data = await response.json()
        if (data.success && data.data && data.data.length > 0) {
          setBanners(data.data)
        }
      } catch (error) {
        console.error('Error fetching banners:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBanners()
  }, [])

  useEffect(() => {
    if (banners.length === 0) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [banners.length])

  if (loading || banners.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-primary-500 text-white py-2 overflow-hidden">
      <div className="container mx-auto px-4 flex items-center gap-4">
        <span className="font-semibold whitespace-nowrap">📢 最新动态</span>
        <div className="flex-1 overflow-hidden">
          <div
            className="transition-transform duration-500 ease-in-out"
            style={{ transform: `translateY(-${currentIndex * 100}%)` }}
          >
            {banners.map((banner, index) => (
              <div key={index} className="h-6 flex items-center truncate">
                {banner.link_url ? (
                  <a href={banner.link_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {banner.content}
                  </a>
                ) : (
                  <span>{banner.content}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
