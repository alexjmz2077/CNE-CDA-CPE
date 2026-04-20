type SupabaseConfig = {
  url: string
  anonKey: string
}

function readEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]
    if (value && value.trim().length > 0) {
      return value
    }
  }
  return undefined
}

export function getSupabaseConfig(): SupabaseConfig {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL")
  const anonKey = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY")

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_URL and SUPABASE_ANON_KEY).",
    )
  }

  return { url, anonKey }
}