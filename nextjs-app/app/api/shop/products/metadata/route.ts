import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { isAdminFromRequest, getAdminWalletFromRequest } from '@/lib/auth'

// POST /api/shop/products/metadata
// Body: { id?: string; slug?: string; attributes?: Record<string,string|number>; force?: boolean }
// Generates & stores a JSON metadata document for a product and updates metadata_uri.
// Returns: { success, metadata_uri, path, metadata }
export async function POST(req: NextRequest) {
  try {
    if (!isAdminFromRequest(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const body = await req.json().catch(() => ({})) as {
      id?: string
      slug?: string
      attributes?: Record<string, string | number>
      force?: boolean
    }
    const { id, slug, attributes = {}, force = false } = body
    if (!id && !slug) {
      return NextResponse.json({ success: false, error: '缺少 id 或 slug' }, { status: 400 })
    }

    // Fetch product
    const query = supabaseAdmin
      .from('shop_products')
      .select('*')
      .limit(1)
    const { data: rows, error: fetchErr } = id
      ? await query.eq('id', id)
      : await query.eq('slug', slug!)
    if (fetchErr) {
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 })
    }
    const product = rows?.[0]
    if (!product) {
      return NextResponse.json({ success: false, error: '未找到商品' }, { status: 404 })
    }

    if (product.metadata_uri && !force) {
      return NextResponse.json({ success: true, metadata_uri: product.metadata_uri, metadata: null, reused: true })
    }

    // Construct metadata (generic NFT-style schema + custom attributes)
    const appBase = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
    const metadata: any = {
      name: product.name,
      description: product.description || '',
      image: product.image_url || '',
      external_url: product.slug ? `${appBase}/shop/${product.slug}` : appBase,
      slug: product.slug,
      price_wei: product.price_wei?.toString?.() || product.price_wei,
      stock: product.stock?.toString?.() || product.stock,
      created_at: product.created_at,
      updated_at: new Date().toISOString(),
      attributes: [
        { trait_type: 'slug', value: product.slug },
        { trait_type: 'price_wei', value: product.price_wei?.toString?.() || product.price_wei },
        { trait_type: 'stock', value: product.stock?.toString?.() || product.stock },
        ...Object.entries(attributes).map(([k, v]) => ({ trait_type: k, value: v }))
      ]
    }

    const jsonString = JSON.stringify(metadata, null, 2)
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'avatars'
    const filename = `product_meta_${product.slug || product.id}_${Date.now()}.json`
    const { data: up, error: upErr } = await (supabaseAdmin as any).storage
      .from(bucket)
      .upload(filename, jsonString, { contentType: 'application/json', upsert: true })
    if (upErr) {
      return NextResponse.json({ success: false, error: `上传失败: ${upErr.message}` }, { status: 500 })
    }

    // Proxy URL for consistent access (private bucket support)
    const base = process.env.NEXT_PUBLIC_APP_URL || ''
    const proxyUrl = `${base.replace(/\/$/, '')}/api/storage/file?path=${encodeURIComponent(up.path)}`

    // Persist metadata URI back to product
    const { error: updateErr } = await supabaseAdmin
      .from('shop_products')
      .update({ metadata_uri: proxyUrl, updated_at: new Date().toISOString() })
      .eq('id', product.id)
    if (updateErr) {
      return NextResponse.json({ success: false, error: `更新商品失败: ${updateErr.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, metadata_uri: proxyUrl, path: up.path, metadata, forceApplied: force })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || '服务器错误' }, { status: 500 })
  }
}
