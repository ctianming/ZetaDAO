import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { mapAmbassadorRows } from '@/lib/transform'

export const revalidate = 0

export async function GET(_req: NextRequest) {
  const { data, error } = await supabase
    .from('ambassadors')
    .select('*')
    .eq('status', 'active')
    .order('contributions', { ascending: false })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: mapAmbassadorRows(data) })
}
