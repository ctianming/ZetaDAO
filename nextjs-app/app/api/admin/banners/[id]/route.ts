import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { requireAdminFromSession } from '@/lib/auth';

// PUT /api/admin/banners/[id] - Update a banner
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAdminFromSession(req);
    const { id } = params;
    const body = await req.json();

    const { content, link_url, status, start_at, end_at } = body;

    const { data, error } = await supabaseAdmin
      .from('homepage_banners')
      .update({
        content,
        link_url,
        status,
        start_at,
        end_at,
      })
      .eq('id', id)
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

// DELETE /api/admin/banners/[id] - Delete a banner
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAdminFromSession(req);
    const { id } = params;

    const { error } = await supabaseAdmin
      .from('homepage_banners')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const isAuthError = err.message === 'Unauthorized';
    return NextResponse.json(
      { error: err.message, details: err.toString() },
      { status: isAuthError ? 401 : 500 }
    );
  }
}

