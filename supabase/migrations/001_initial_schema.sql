-- ============================================================
-- Rugby Stats — Initial Schema
-- Los Tordos Rugby Club
-- ============================================================

-- Equipos
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  short_name TEXT,
  zona TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Jornadas (agrupa todos los partidos de un día de torneo)
CREATE TABLE jornadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  season TEXT NOT NULL DEFAULT '2026',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Partidos
CREATE TYPE division_type AS ENUM ('M15', 'M16', 'M17', 'M19');
CREATE TYPE partido_status AS ENUM ('scheduled', 'live', 'finished', 'cancelled');

CREATE TABLE partidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_id UUID REFERENCES jornadas(id) ON DELETE CASCADE,
  division division_type NOT NULL,
  equipo_local_id UUID REFERENCES teams(id),
  equipo_visitante_id UUID REFERENCES teams(id),
  cancha TEXT,
  horario TIME,
  status partido_status DEFAULT 'scheduled',
  puntos_local INT DEFAULT 0,
  puntos_visitante INT DEFAULT 0,
  fecha_numero INT, -- Round number (1-7)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sesiones colaborativas
CREATE TYPE session_role AS ENUM ('director', 'cargador', 'viewer');

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partido_id UUID REFERENCES partidos(id) ON DELETE CASCADE,
  code CHAR(6) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role session_role DEFAULT 'cargador',
  is_connected BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ DEFAULT now()
);

-- Eventos
CREATE TYPE modulo_type AS ENUM ('LINE', 'SCRUM', 'SALIDA', 'ATAQUE', 'DEFENSA', 'PIE');
CREATE TYPE perspectiva_type AS ENUM ('propio', 'rival');

CREATE TABLE eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id),
  modulo modulo_type NOT NULL,
  perspectiva perspectiva_type NOT NULL,
  numero INT NOT NULL, -- Sequential per module per match
  data JSONB NOT NULL DEFAULT '{}', -- Module-specific fields (motivo, resultado, etc.)
  cargado_por TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_partidos_jornada ON partidos(jornada_id);
CREATE INDEX idx_partidos_status ON partidos(status);
CREATE INDEX idx_eventos_partido ON eventos(partido_id);
CREATE INDEX idx_eventos_modulo ON eventos(partido_id, modulo);
CREATE INDEX idx_sessions_code ON sessions(code);
CREATE INDEX idx_sessions_partido ON sessions(partido_id);

-- Fixture (datos precargados del torneo)
CREATE TABLE fixture (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_numero INT NOT NULL,
  date DATE NOT NULL,
  zona TEXT NOT NULL,
  division division_type NOT NULL,
  equipo_local TEXT NOT NULL,
  equipo_visitante TEXT NOT NULL
);

-- Enable Realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE eventos;
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE partidos;
