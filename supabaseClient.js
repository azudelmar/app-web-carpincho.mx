import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://xdnkfxgywveposvnedry.supabase.co'
const supabaseKey = 'sb_publishable_xDoG8Gcdnvgy1CHbvMWCyg_j1i08vLp'

export const supabase = createClient(supabaseUrl, supabaseKey)



