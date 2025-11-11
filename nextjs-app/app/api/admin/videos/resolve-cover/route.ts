import { NextRequest, NextResponse } from 'next/server'

// Simple HTML meta parser to extract og:title / og:image from bilibili pages
async function parseBilibili(url: string) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ZetaDAO/1.0; +https://zetadao.example)' }, cache: 'no-store' })
    if (!res.ok) return null
    const html = await res.text()
    const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["'][^>]*>/i)
    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i)
    const title = ogTitleMatch?.[1]
    let image = ogImageMatch?.[1]
    // Normalize protocol-less URLs
    if (image && image.startsWith('//')) image = 'https:' + image
    // Some bilibili images have @ suffix; strip size modifiers for higher quality
    if (image) image = image.replace(/@.+$/,'')
    return { title, image_url: image, platform: 'bilibili' }
  } catch (e) {
    console.error('bilibili parse failed', e)
    return null
  }
}

function parseYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      return v || null
    }
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.split('/').filter(Boolean)[0]
      return id || null
    }
    return null
  } catch { return null }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const url = String(body.url || '')
  if (!url) return NextResponse.json({ success: false, error: '缺少 url' }, { status: 400 })

  // Try YouTube fast-path
  const yt = parseYouTubeId(url)
  if (yt) {
    const coverHD = `https://i.ytimg.com/vi/${yt}/maxresdefault.jpg`
    const cover = `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`
    // Try fetch oEmbed for title
    let title: string | undefined
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { cache: 'no-store' })
      if (res.ok) {
        const j = await res.json()
        title = j?.title
      }
    } catch {}
    return NextResponse.json({ success: true, platform: 'youtube', title, image_url: coverHD, fallback_image_url: cover })
  }

  // Bilibili support
  if (/bilibili\.com\/video\//.test(url) || /b23\.tv\//.test(url)) {
    // Expand b23.tv short links first
    let targetUrl = url
    if (/b23\.tv\//.test(url)) {
      try {
        const head = await fetch(url, { redirect: 'manual' })
        if (head.status >= 300 && head.status < 400) {
          const loc = head.headers.get('location')
          if (loc) targetUrl = loc.startsWith('http') ? loc : `https://www.bilibili.com${loc}`
        }
      } catch {}
    }
    const parsed = await parseBilibili(targetUrl)
    if (parsed) {
      return NextResponse.json({ success: true, platform: parsed.platform, title: parsed.title, image_url: parsed.image_url })
    }
    return NextResponse.json({ success: false, error: 'Bilibili 解析失败，请手动填写封面' }, { status: 200 })
  }

  return NextResponse.json({ success: false, error: '暂不支持该平台自动解析，请手动提供封面' }, { status: 200 })
}
