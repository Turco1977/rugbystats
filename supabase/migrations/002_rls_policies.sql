-- ============================================================
-- Rugby Stats — RLS Policies
-- Open read for all, write requires anon key (v1 - club-only)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE jornadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixture ENABLE ROW LEVEL SECURITY;

-- Teams: read-only for everyone
CREATE POLICY "teams_read" ON teams FOR SELECT USING (true);

-- Jornadas: read all, insert/update for authenticated or anon
CREATE POLICY "jornadas_read" ON jornadas FOR SELECT USING (true);
CREATE POLICY "jornadas_insert" ON jornadas FOR INSERT WITH CHECK (true);
CREATE POLICY "jornadas_update" ON jornadas FOR UPDATE USING (true);

-- Partidos: read all, insert/update for anyone with anon key
CREATE POLICY "partidos_read" ON partidos FOR SELECT USING (true);
CREATE POLICY "partidos_insert" ON partidos FOR INSERT WITH CHECK (true);
CREATE POLICY "partidos_update" ON partidos FOR UPDATE USING (true);

-- Sessions: read all, create for anyone
CREATE POLICY "sessions_read" ON sessions FOR SELECT USING (true);
CREATE POLICY "sessions_insert" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "sessions_update" ON sessions FOR UPDATE USING (true);

-- Session participants: read all, join for anyone
CREATE POLICY "participants_read" ON session_participants FOR SELECT USING (true);
CREATE POLICY "participants_insert" ON session_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "participants_update" ON session_participants FOR UPDATE USING (true);

-- Eventos: read all, insert for anyone (cargadores sin login)
CREATE POLICY "eventos_read" ON eventos FOR SELECT USING (true);
CREATE POLICY "eventos_insert" ON eventos FOR INSERT WITH CHECK (true);
CREATE POLICY "eventos_delete" ON eventos FOR DELETE USING (true);

-- Fixture: read-only
CREATE POLICY "fixture_read" ON fixture FOR SELECT USING (true);
