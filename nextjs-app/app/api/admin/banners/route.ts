import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { requireAdminFromSession } from '@/lib/auth';

// GET /api/admin/banners - List all banners
export async function GET(req: NextRequest) {
  try {
    requireAdminFromSession(req);

    const { data, error } = await supabaseAdmin
      .from('homepage_banners')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const isAuthError = err.message === 'Unauthorized';
    return NextResponse.json(
      { error: err.message, details: err.toString() },
      { status: isAuthError ? 401 : 500 }
    );
  }
}

// POST /api/admin/banners - Create a new banner
export async function POST(req: NextRequest) {
  try {
    requireAdminFromSession(req);
    const body = await req.json();

    const { content, link_url, status, start_at, end_at } = body;

    if (!content) {
      return NextResponse.json({ error: '内容不能为空' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('homepage_banners')
      .insert({
        content,
        link_url: link_url || null,
        status: status || 'inactive',
        start_at: start_at || null,
        end_at: end_at || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const isAuthError = err.message === 'Unauthorized';
    return NextResponse.json(
      { error: err.message, details: err.toString() },
      { status: isAuthError ? 401 : 500 }
    );
  }
}

