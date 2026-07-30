// Public browser configuration only. Never place a Supabase service_role key here.
export const SUPABASE_URL = 'https://xasxrvzoecohxsjspbwk.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Fw6Cf8VoJKHYKriQUINmDw_3q9FST7j';
export const SUPABASE_REDIRECT_URL = typeof window === 'undefined'
  ? ''
  : `${window.location.origin}${window.location.pathname}`;

export const isSupabaseConfigured = () =>
  SUPABASE_URL.startsWith('https://') && SUPABASE_PUBLISHABLE_KEY.length > 20;
