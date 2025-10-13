'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative py-20 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-20 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>欢迎来到 ZetaDAO 社区门户</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="gradient-text">探索跨链创新</span>
            <br />
            连接开发者社区
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            ZetaChain以原生跨链I/O统一逻辑，直连BTC等多链，开发更简单、安全高效更省心
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/articles"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors shadow-lg hover:shadow-xl"
            >
              浏览文章
            </a>
            <a
              href="/submit"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border-2 border-primary-500 text-primary-500 font-semibold hover:bg-primary-50 transition-colors"
            >
              立即投稿
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
