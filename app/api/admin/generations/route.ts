import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-middleware';
import { supabaseAdmin } from '@/lib/supabase';

export const GET = withAdminAuth(async (req, { adminId }) => {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const page = parseInt(searchParams.get('page') || '1');
  const offset = (page - 1) * limit;
  const userEmail = searchParams.get('userEmail');

  let query = supabaseAdmin
    .from('projects')
    .select(`
      *,
      user:user_id (email, name)
    `, { count: 'exact' });

  if (userEmail) {
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id')
      .ilike('email', `%${userEmail}%`)
      .single();

    if (userData) {
      query = query.eq('user_id', userData.id);
    } else {
      return NextResponse.json({ projects: [], pagination: { total: 0 } });
    }
  }

  const { data: projects, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    projects,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil((count || 0) / limit)
    }
  });
});
