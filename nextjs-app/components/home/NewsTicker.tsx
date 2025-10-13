'use client'

import { useEffect, useState } from 'react'

const newsItems = [
  '<a href="https://x.com/ZetaChain_CH/status/1953664909180645384" target="_blank" rel="noopener">第三季中文大使计划正在开发申请</a>',
  '<a href="https://x.com/ZetaChain_CH/status/1965329974250144060" target="_blank" rel="noopener">9月社区活动Gluck抽卡乐现已上线</a>',
  '<a href="https://x.com/ZetaChain_CH/status/1963526510968762790" target="_blank" rel="noopener">ZetaChain已集成KaiaChain测试网</a>',
  '<a href="https://x.com/ZetaChain_CH/status/1963602055924449390" target="_blank" rel="noopener">加入社区新大使见面会赢取ZETA好礼</a>',
  '<a href="https://x.com/0xmediaco/status/1960356760344260983" target="_blank" rel="noopener">用五个问题带你看懂ZetaChain</a>',
]

export default function NewsTicker() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % newsItems.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full bg-primary-500 text-white py-2 overflow-hidden">
      <div className="container mx-auto px-4 flex items-center gap-4">
        <span className="font-semibold whitespace-nowrap">📢 最新动态</span>
        <div className="flex-1 overflow-hidden">
          <div
            className="transition-transform duration-500 ease-in-out"
            style={{ transform: `translateY(-${currentIndex * 100}%)` }}
          >
            {newsItems.map((item, index) => (
              <div
                key={index}
                className="h-6 flex items-center"
                dangerouslySetInnerHTML={{ __html: item }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
