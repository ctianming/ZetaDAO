import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

// Force dynamic rendering to avoid build-time fetch errors
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/banners - Get active banners for the homepage
export async function GET() {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('homepage_banners')
      .select('content, link_url')
      .eq('status', 'active')
      .lte('start_at', now)
      .gte('end_at', now)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // If there are no banners that meet the criteria, try to find banners that are active and have no start/end date.
    if (!data || data.length === 0) {
      const { data: timelessData, error: timelessError } = await supabase
        .from('homepage_banners')
        .select('content, link_url')
        .eq('status', 'active')
        .is('start_at', null)
        .is('end_at', null)
        .order('created_at', { ascending: false });

      if (timelessError) throw timelessError;
      return NextResponse.json({ success: true, data: timelessData });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Error fetching active banners:', {
      message: err?.message || 'Unknown error',
      details: err?.toString() || '',
      hint: err?.hint || '',
      code: err?.code || '',
    });
    // Return empty array instead of error to prevent page crashes
    return NextResponse.json({ success: true, data: [] });
  }
}

