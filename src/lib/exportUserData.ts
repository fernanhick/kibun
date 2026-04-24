import { supabase } from '@lib/supabase';

const USER_TABLES = [
  'mood_entries',
  'ai_reports',
  'profiles',
  'notification_preferences',
  'life_events',
  'habits',
  'habit_logs',
  'custom_moods',
  'user_achievements',
  'streak_freezes',
] as const;

type TableName = (typeof USER_TABLES)[number];

export interface KibunExport {
  kibun_export_version: 1;
  exported_at: string;
  user: {
    id: string;
    email: string | null;
    created_at: string | null;
  };
  tables: Record<TableName, unknown[]>;
}

export async function exportUserData(): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw new Error('Not authenticated');

  const results = await Promise.all(
    USER_TABLES.map(async (table) => {
      const { data, error } = await supabase!.from(table).select('*');
      if (error) throw new Error(`Failed to export ${table}: ${error.message}`);
      return [table, data ?? []] as const;
    })
  );

  const payload: KibunExport = {
    kibun_export_version: 1,
    exported_at: new Date().toISOString(),
    user: {
      id: userData.user.id,
      email: userData.user.email ?? null,
      created_at: userData.user.created_at ?? null,
    },
    tables: Object.fromEntries(results) as Record<TableName, unknown[]>,
  };

  return JSON.stringify(payload, null, 2);
}
