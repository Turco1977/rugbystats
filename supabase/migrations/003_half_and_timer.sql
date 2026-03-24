-- Migration 003: Add half (tiempo) support, match timer, and rama field
-- SAFE: Only adds new columns with defaults. Zero risk to existing data.

-- partidos: add rama field (A, B, C) to distinguish sub-teams within a division
-- Existing partidos get 'A' by default (safe assumption for historical data)
ALTER TABLE partidos ADD COLUMN rama TEXT NOT NULL DEFAULT 'A';
CREATE INDEX idx_partidos_rama ON partidos(division, rama);

-- partidos: track current half and timer timestamps
ALTER TABLE partidos ADD COLUMN tiempo_actual TEXT NOT NULL DEFAULT '1T';
ALTER TABLE partidos ADD COLUMN tiempo_inicio_1t TIMESTAMPTZ;
ALTER TABLE partidos ADD COLUMN tiempo_fin_1t TIMESTAMPTZ;
ALTER TABLE partidos ADD COLUMN tiempo_inicio_2t TIMESTAMPTZ;
ALTER TABLE partidos ADD COLUMN tiempo_fin_2t TIMESTAMPTZ;

-- eventos: tag each event with which half it belongs to
ALTER TABLE eventos ADD COLUMN tiempo TEXT NOT NULL DEFAULT '1T';

-- Index for efficient half-filtered queries
CREATE INDEX idx_eventos_tiempo ON eventos(partido_id, tiempo);
