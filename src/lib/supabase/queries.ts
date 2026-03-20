import { createClient } from "./client";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) _supabase = createClient();
  return _supabase;
}

/** Fetch all teams */
export async function getTeams() {
  const { data, error } = await getSupabase()
    .from("teams")
    .select("*")
    .order("name");
  if (error) throw error;
  return data;
}

/** Fetch jornadas for a season */
export async function getJornadas(season = "2026") {
  const { data, error } = await getSupabase()
    .from("jornadas")
    .select("*")
    .eq("season", season)
    .order("date", { ascending: false });
  if (error) throw error;
  return data;
}

/** Fetch partidos for a jornada, including team names */
export async function getPartidosByJornada(jornadaId: string) {
  const { data, error } = await getSupabase()
    .from("partidos")
    .select(`
      *,
      equipo_local:teams!equipo_local_id(id, name, short_name),
      equipo_visitante:teams!equipo_visitante_id(id, name, short_name)
    `)
    .eq("jornada_id", jornadaId)
    .order("division");
  if (error) throw error;
  return data;
}

/** Fetch all active partidos (live) with team names */
export async function getActivePartidos() {
  const { data, error } = await getSupabase()
    .from("partidos")
    .select(`
      *,
      equipo_local:teams!equipo_local_id(id, name, short_name),
      equipo_visitante:teams!equipo_visitante_id(id, name, short_name),
      sessions(code, is_active)
    `)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Fetch a single partido with details */
export async function getPartido(id: string) {
  const { data, error } = await getSupabase()
    .from("partidos")
    .select(`
      *,
      equipo_local:teams!equipo_local_id(id, name, short_name),
      equipo_visitante:teams!equipo_visitante_id(id, name, short_name),
      sessions(id, code, is_active)
    `)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

/** Fetch eventos for a partido */
export async function getEventos(partidoId: string) {
  const { data, error } = await getSupabase()
    .from("eventos")
    .select("*")
    .eq("partido_id", partidoId)
    .order("timestamp", { ascending: false });
  if (error) throw error;
  return data;
}

/** Insert a new evento */
export async function insertEvento(evento: {
  partido_id: string;
  session_id?: string;
  modulo: string;
  perspectiva: string;
  numero: number;
  data: Record<string, unknown>;
  cargado_por: string;
}) {
  const { data, error } = await getSupabase()
    .from("eventos")
    .insert(evento)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Find session by code */
export async function getSessionByCode(code: string) {
  const { data, error } = await getSupabase()
    .from("sessions")
    .select(`
      *,
      partidos(
        *,
        equipo_local:teams!equipo_local_id(id, name, short_name),
        equipo_visitante:teams!equipo_visitante_id(id, name, short_name)
      )
    `)
    .eq("code", code)
    .eq("is_active", true)
    .single();
  if (error) throw error;
  return data;
}

/** Create a new session for a partido */
export async function createSession(partidoId: string, code: string, createdBy: string) {
  const { data, error } = await getSupabase()
    .from("sessions")
    .insert({ partido_id: partidoId, code, created_by: createdBy })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Join a session as participant */
export async function joinSession(sessionId: string, displayName: string) {
  const { data, error } = await getSupabase()
    .from("session_participants")
    .insert({ session_id: sessionId, display_name: displayName })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Get session participants */
export async function getSessionParticipants(sessionId: string) {
  const { data, error } = await getSupabase()
    .from("session_participants")
    .select("*")
    .eq("session_id", sessionId)
    .eq("is_connected", true);
  if (error) throw error;
  return data;
}

/** Fetch fixture matches */
export async function getFixture(zona?: string) {
  let query = getSupabase()
    .from("fixture")
    .select("*")
    .order("fecha_numero")
    .order("equipo_local");
  if (zona) query = query.eq("zona", zona);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** Create a jornada with partidos from fixture */
export async function createJornadaFromFixture(
  name: string,
  date: string,
  fechaNumero: number,
  zona: string,
  division: string
) {
  // 1. Create jornada
  const { data: jornada, error: jError } = await getSupabase()
    .from("jornadas")
    .insert({ name, date })
    .select()
    .single();
  if (jError) throw jError;

  // 2. Get fixture for this fecha
  const { data: fixtures, error: fError } = await getSupabase()
    .from("fixture")
    .select("*")
    .eq("fecha_numero", fechaNumero)
    .eq("zona", zona)
    .eq("division", division);
  if (fError) throw fError;

  // 3. Get all teams
  const { data: teams, error: tError } = await getSupabase()
    .from("teams")
    .select("id, name");
  if (tError) throw tError;

  const teamMap = new Map(teams.map((t) => [t.name, t.id]));

  // 4. Create partidos
  const partidos = fixtures
    .filter((f) => f.equipo_local !== "LIBRE" && f.equipo_visitante !== "LIBRE")
    .map((f) => ({
      jornada_id: jornada.id,
      division: f.division,
      equipo_local_id: teamMap.get(f.equipo_local),
      equipo_visitante_id: teamMap.get(f.equipo_visitante),
      fecha_numero: f.fecha_numero,
    }));

  if (partidos.length > 0) {
    const { error: pError } = await getSupabase().from("partidos").insert(partidos);
    if (pError) throw pError;
  }

  return jornada;
}

/** Fetch all eventos for a module, with partido division and jornada info */
export async function getEventosByModulo(modulo: string, _season = "2026") {
  const { data, error } = await getSupabase()
    .from("eventos")
    .select(`
      *,
      partidos(
        id,
        division,
        equipo_local:teams!equipo_local_id(id, name, short_name),
        equipo_visitante:teams!equipo_visitante_id(id, name, short_name),
        puntos_local,
        puntos_visitante,
        fecha_numero,
        jornadas:jornadas!jornada_id(id, name, date)
      )
    `)
    .eq("modulo", modulo)
    .eq("partidos.status", "finished")
    .order("created_at", { ascending: true });
  if (error) throw error;
  // Filter out eventos without partido (orphaned)
  return (data || []).filter((e: Record<string, unknown>) => e.partidos !== null);
}
