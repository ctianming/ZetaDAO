'use client'

import { useState, useEffect } from 'react'
import { Wind } from 'lucide-react'

const newsItems = [
  {
    text: 'ZetaChain 中文助推官计划正式上线',
    href: 'https://x.com/ZetaChain_CH/status/1982774373531722088',
  },
  {
    text: '手把手教你写下第一个通用智能合约',
    href: 'https://x.com/ZetaChain_CH/status/1983890325790769280',
  },
  {
    text: 'KaiaChain测试网现已集成 ZetaChain',
    href: 'https://x.com/ZetaChain_CH/status/1963526510968762790',
  },
  {
    text: '加入社区新大使见面会赢取ZETA好礼',
    href: 'https://x.com/ZetaChain_CH/status/1963602055924449390',
  },
]

export default function NewsTicker() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFading, setIsFading] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFading(true)
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % newsItems.length)
        setIsFading(false)
      }, 500) // CSS transition duration
    }, 4000) // Change item every 4 seconds

    return () => clearInterval(interval)
  }, [])

  const currentItem = newsItems[currentIndex]

  return (
    <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 h-12 flex items-center">
        <div className="flex items-center gap-3 flex-shrink-0 mr-4">
          <Wind className="w-5 h-5 text-primary-500" />
          <span className="font-semibold text-sm">最新动态</span>
        </div>
        <div className="flex-1 overflow-hidden h-full relative">
          <a
            key={currentIndex} // Use key to force re-render on change
            href={currentItem.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`absolute inset-0 flex items-center text-sm text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-500 ease-in-out ${
              isFading ? 'opacity-0 transform -translate-y-full' : 'opacity-100 transform translate-y-0'
            }`}
          >
            {currentItem.text}
          </a>
        </div>
      </div>
    </div>
  )
}
