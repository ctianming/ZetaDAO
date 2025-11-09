export const dynamic = 'force-dynamic'
export const revalidate = 0
import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/db'
import { requireAdminFromRequest } from '@/lib/auth'

// GET /api/categories?search=kw
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  try {
    let query = supabase.from('article_categories').select('*').order('name', { ascending: true })
    if (search) query = query.ilike('name', `%${search}%`)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('List categories error:', error)
    return NextResponse.json({ error: '获取分类失败' }, { status: 500 })
  }
}

// POST /api/categories  body: { slug, name, description }
export async function POST(request: NextRequest) {
  try {
    requireAdminFromRequest(request)
    const body = await request.json()
    const { slug, name, description } = body || {}
    if (!slug || !name) return NextResponse.json({ error: '缺少必要字段' }, { status: 400 })
    const { data, error } = await supabaseAdmin
      .from('article_categories')
      .insert({ slug, name, description: description || null })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Create category error:', error)
    return NextResponse.json({ error: '创建分类失败' }, { status: 500 })
  }
}

// PUT /api/categories  body: { id|slug, name?, description? }
export async function PUT(request: NextRequest) {
  try {
    requireAdminFromRequest(request)
    const body = await request.json()
    const { id, slug, name, description } = body || {}
    if (!id && !slug) return NextResponse.json({ error: '缺少标识符' }, { status: 400 })
    let query = supabaseAdmin.from('article_categories').update({
      name: name ?? undefined,
      description: description ?? undefined,
    })
    if (id) query = query.eq('id', id)
    if (slug) query = query.eq('slug', slug)
    const { data, error } = await query.select().single()
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Update category error:', error)
    return NextResponse.json({ error: '更新分类失败' }, { status: 500 })
  }
}

// DELETE /api/categories?id=... | slug=...
export async function DELETE(request: NextRequest) {
  try {
    requireAdminFromRequest(request)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const slug = searchParams.get('slug')
    if (!id && !slug) return NextResponse.json({ error: '缺少标识符' }, { status: 400 })
    let query = supabaseAdmin.from('article_categories').delete()
    if (id) query = query.eq('id', id)
    if (slug) query = query.eq('slug', slug)
    const { error } = await query
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete category error:', error)
    return NextResponse.json({ error: '删除分类失败' }, { status: 500 })
  }
}
