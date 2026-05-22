import { createClient } from "@supabase/supabase-api"; // o la librería que uses

// SUSTITUYE LOS VALORES DE ABAJO POR TUS LLAVES REALES DE SUPABASE
// Puedes encontrarlas en Settings > API en tu panel de Supabase
const supabaseUrl = "TU_SUPABASE_URL_AQUI";
const supabaseAnonKey = "TU_SUPABASE_ANON_KEY_AQUI";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
