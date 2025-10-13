import Header from '@/components/layout/Header'
import Hero from '@/components/home/Hero'
import NewsTicker from '@/components/home/NewsTicker'
import QuickLinks from '@/components/home/QuickLinks'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />
      <NewsTicker />
      <main className="container mx-auto px-4 py-8">
        <Hero />
        <QuickLinks />
      </main>
    </div>
  )
}
