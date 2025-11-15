import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

// GET /api/banners - Get active banners for the homepage
export async function GET(req: NextRequest) {
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
    console.error('Error fetching active banners:', err);
    return NextResponse.json(
      { error: 'Failed to fetch banners', details: err.message },
      { status: 500 }
    );
  }
}

