(async () => {
  const fs = require('fs')
  const path = require('path')
  // load .env.local if present (simple parser)
  const envFile = path.resolve(__dirname, '..', '.env.local')
  const env = {}
  if (fs.existsSync(envFile)) {
    const raw = fs.readFileSync(envFile, 'utf8')
    raw.split(/\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/)
      if (m) {
        let v = m[2]
        // strip surrounding quotes
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
        env[m[1]] = v
      }
    })
  }
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Please ensure nextjs-app/.env.local exists or set env vars.')
    process.exit(1)
  }

  // dynamic import to support both ESM/CJS environments
  const { createClient } = await import('@supabase/supabase-js')
  const { marked } = require('marked')

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // article files
  const articlesDir = path.resolve(__dirname, '..', 'articles')
  const files = [
    'ZetaChain：开启原生跨链的新篇章.md',
    'ZetaChain的通用应用.md',
  ].map((f) => path.join(articlesDir, f))

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) {
      console.warn('Article file not found:', filePath)
      continue
    }
    const md = fs.readFileSync(filePath, 'utf8')
    const html = marked(md)
    const titleLine = md.split('\n').find((l) => l.trim().length > 0) || 'Untitled'
    const title = titleLine.replace(/^#\s*/, '').trim()
    try {
      const now = new Date().toISOString()
      const { data, error } = await supabaseAdmin.from('published_content').insert({
        title,
        content: html,
        category: 'article',
        author_wallet: '0x0000000000000000000000000000000000000000',
        author_name: 'Emergency Publisher',
        metadata: { imported_via: 'publish_emergency_script' },
        published_at: now,
      }).select('id').single()
      if (error) {
        console.error('Failed to insert article:', filePath, error.message)
      } else {
        console.log('Inserted article', filePath, 'id=', data.id)
      }
    } catch (e) {
      console.error('Exception inserting article', filePath, e)
    }
  }

  // videos to publish
  const videos = [
    {
      title: 'Gluck 第二季 AMA',
      url: 'https://www.youtube.com/watch?v=V-iQOMwgTns',
      description: 'Gluck 第二季 AMA',
    },
    {
      title: '美联储降息与高Beta资产新周期',
      url: 'https://www.youtube.com/watch?v=KL_nlg8K0pg',
      description: '美联储降息与高Beta资产新周期',
    },
  ]

  for (const v of videos) {
    try {
      const now = new Date().toISOString()
      const contentHtml = `<p>${v.description}</p><iframe width="560" height="315" src="https://www.youtube.com/embed/${(new URL(v.url)).searchParams.get('v')}" title="${v.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
      const { data, error } = await supabaseAdmin.from('published_content').insert({
        title: v.title,
        content: contentHtml,
        category: 'video',
        author_wallet: '0x0000000000000000000000000000000000000000',
        author_name: 'Emergency Publisher',
        metadata: { imported_via: 'publish_emergency_script' },
        published_at: now,
        video_url: v.url,
        external_url: v.url,
      }).select('id').single()
      if (error) {
        console.error('Failed to insert video', v.title, error.message)
      } else {
        console.log('Inserted video', v.title, 'id=', data.id)
      }
    } catch (e) {
      console.error('Exception inserting video', v.title, e)
    }
  }

  console.log('Done')
  process.exit(0)
})()
