import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { isAdminFromSession } from '@/lib/auth'

// POST /api/debug/create-sample-article
// 管理员调试接口：快速创建一篇已发布的示例文章，方便前端查看展示效果。
// 返回 { success, data: { id } }
export async function POST(req: NextRequest) {
  if (!isAdminFromSession(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json().catch(() => ({}))
    const title: string = body.title || 'ZetaChain 原生跨链的价值与演进趋势'
    const content: string = body.content || `
<h2>背景</h2>
<p>ZetaChain 通过原生跨链消息与去中心化中继，提供统一的跨链 I/O 能力，开发者可以以极低的复杂度访问多链资源。</p>
<h2>核心优势</h2>
<ul>
  <li>无需桥合约的自定义部署，降低集成门槛</li>
  <li>跨链调用保证数据与状态的一致性</li>
  <li>简化开发栈，缩短上线周期</li>
</ul>
<h2>未来展望</h2>
<p>随着主网与更多生态集成推进，将进一步释放多链协同组合式应用的潜力。</p>
<blockquote>“跨链不再是附加功能，而是底层默认能力。”</blockquote>
`
    const authorWallet = body.author_wallet || '0x0000000000000000000000000000000000000000'
    const now = new Date().toISOString()

    // Insert directly into published content (simulate already approved submission)
    const { data, error } = await supabaseAdmin.from('published_content').insert({
      title,
      content,
      category: 'article',
      author_wallet: authorWallet,
      author_name: 'ZetaDAO Admin',
      metadata: { tags: ['zetachain','cross-chain','architecture'], sample: true },
      published_at: now,
    }).select('id').single()
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || '服务器错误' }, { status: 500 })
  }
}
