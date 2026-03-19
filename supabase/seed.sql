-- ============================================================
-- Seed: Equipos + Fixture 2026 (Zona 1 & Zona 2)
-- Extraído de las imágenes del fixture oficial
-- ============================================================

-- Equipos Zona 1 (M15/16/17/19)
INSERT INTO teams (name, short_name, zona) VALUES
  ('LOS TORDOS R.C. A', 'Tordos A', 'Zona 1'),
  ('PEUMAYEN R.C.', 'Peumayen', 'Zona 1'),
  ('MARISTA R.C.A', 'Marista A', 'Zona 1'),
  ('BANCO R.C.', 'Banco', 'Zona 1'),
  ('LICEO R.C. A', 'Liceo A', 'Zona 1'),
  ('TEQUE R.C.', 'Teque', 'Zona 1'),
  ('C.P.B.M.', 'CPBM', 'Zona 1'),
  ('MENDOZA R.C.', 'Mendoza', 'Zona 1');

-- Equipos Zona 2 (M19)
INSERT INTO teams (name, short_name, zona) VALUES
  ('UNIVERSITARIO R.C.', 'Universitario', 'Zona 2'),
  ('TACURU R.C.', 'Tacuru', 'Zona 2'),
  ('SAN JORGE R.C.', 'San Jorge', 'Zona 2'),
  ('LICEO R.C. B', 'Liceo B', 'Zona 2'),
  ('LOS TORDOS R.C. C', 'Tordos C', 'Zona 2'),
  ('MARISTA R.C. C', 'Marista C', 'Zona 2'),
  ('MARISTA R.C. B', 'Marista B', 'Zona 2'),
  ('LOS TORDOS R.C. B', 'Tordos B', 'Zona 2'),
  ('C.P.B.M. B', 'CPBM B', 'Zona 2');

-- ============================================================
-- FIXTURE ZONA 1 — M15/16/17/19
-- ============================================================

-- Fecha #1 — 7/3/2026
INSERT INTO fixture (fecha_numero, date, zona, division, equipo_local, equipo_visitante) VALUES
  (1, '2026-03-07', 'Zona 1', 'M19', 'LOS TORDOS R.C. A', 'PEUMAYEN R.C.'),
  (1, '2026-03-07', 'Zona 1', 'M19', 'MARISTA R.C.A', 'BANCO R.C.'),
  (1, '2026-03-07', 'Zona 1', 'M19', 'LICEO R.C. A', 'TEQUE R.C.'),
  (1, '2026-03-07', 'Zona 1', 'M19', 'C.P.B.M.', 'MENDOZA R.C.');

-- Fecha #2 — 21/3/2026
INSERT INTO fixture (fecha_numero, date, zona, division, equipo_local, equipo_visitante) VALUES
  (2, '2026-03-21', 'Zona 1', 'M19', 'LOS TORDOS R.C. A', 'MARISTA R.C.A'),
  (2, '2026-03-21', 'Zona 1', 'M19', 'BANCO R.C.', 'LICEO R.C. A'),
  (2, '2026-03-21', 'Zona 1', 'M19', 'TEQUE R.C.', 'C.P.B.M.'),
  (2, '2026-03-21', 'Zona 1', 'M19', 'PEUMAYEN R.C.', 'MENDOZA R.C.');

-- Fecha #3 — 28/3/2026
INSERT INTO fixture (fecha_numero, date, zona, division, equipo_local, equipo_visitante) VALUES
  (3, '2026-03-28', 'Zona 1', 'M19', 'LICEO R.C. A', 'LOS TORDOS R.C. A'),
  (3, '2026-03-28', 'Zona 1', 'M19', 'MARISTA R.C.A', 'PEUMAYEN R.C.'),
  (3, '2026-03-28', 'Zona 1', 'M19', 'C.P.B.M.', 'BANCO R.C.'),
  (3, '2026-03-28', 'Zona 1', 'M19', 'MENDOZA R.C.', 'TEQUE R.C.');

-- Fecha #4 — 11/4/2026
INSERT INTO fixture (fecha_numero, date, zona, division, equipo_local, equipo_visitante) VALUES
  (4, '2026-04-11', 'Zona 1', 'M19', 'LOS TORDOS R.C. A', 'C.P.B.M.'),
  (4, '2026-04-11', 'Zona 1', 'M19', 'MARISTA R.C.A', 'LICEO R.C. A'),
  (4, '2026-04-11', 'Zona 1', 'M19', 'BANCO R.C.', 'MENDOZA R.C.'),
  (4, '2026-04-11', 'Zona 1', 'M19', 'PEUMAYEN R.C.', 'TEQUE R.C.');

-- Fecha #5 — 18/4/2026
INSERT INTO fixture (fecha_numero, date, zona, division, equipo_local, equipo_visitante) VALUES
  (5, '2026-04-18', 'Zona 1', 'M19', 'MENDOZA R.C.', 'LOS TORDOS R.C. A'),
  (5, '2026-04-18', 'Zona 1', 'M19', 'C.P.B.M.', 'MARISTA R.C.A'),
  (5, '2026-04-18', 'Zona 1', 'M19', 'LICEO R.C. A', 'PEUMAYEN R.C.'),
  (5, '2026-04-18', 'Zona 1', 'M19', 'TEQUE R.C.', 'BANCO R.C.');

-- Fecha #6 — 25/4/2026
INSERT INTO fixture (fecha_numero, date, zona, division, equipo_local, equipo_visitante) VALUES
  (6, '2026-04-25', 'Zona 1', 'M19', 'LOS TORDOS R.C. A', 'TEQUE R.C.'),
  (6, '2026-04-25', 'Zona 1', 'M19', 'MARISTA R.C.A', 'MENDOZA R.C.'),
  (6, '2026-04-25', 'Zona 1', 'M19', 'LICEO R.C. A', 'C.P.B.M.'),
  (6, '2026-04-25', 'Zona 1', 'M19', 'PEUMAYEN R.C.', 'BANCO R.C.');

-- Fecha #7 — 9/5/2026
INSERT INTO fixture (fecha_numero, date, zona, division, equipo_local, equipo_visitante) VALUES
  (7, '2026-05-09', 'Zona 1', 'M19', 'BANCO R.C.', 'LOS TORDOS R.C. A'),
  (7, '2026-05-09', 'Zona 1', 'M19', 'TEQUE R.C.', 'MARISTA R.C.A'),
  (7, '2026-05-09', 'Zona 1', 'M19', 'MENDOZA R.C.', 'LICEO R.C. A'),
  (7, '2026-05-09', 'Zona 1', 'M19', 'C.P.B.M.', 'PEUMAYEN R.C.');

-- ============================================================
-- FIXTURE ZONA 2 — M19
-- ============================================================

-- Fecha #1 — 7/3/2026
INSERT INTO fixture (fecha_numero, date, zona, division, equipo_local, equipo_visitante) VALUES
  (1, '2026-03-07', 'Zona 2', 'M19', 'UNIVERSITARIO R.C.', 'MARISTA R.C. C'),
  (1, '2026-03-07', 'Zona 2', 'M19', 'TACURU R.C.', 'MARISTA R.C. B'),
  (1, '2026-03-07', 'Zona 2', 'M19', 'SAN JORGE R.C.', 'LOS TORDOS R.C. B'),
  (1, '2026-03-07', 'Zona 2', 'M19', 'LICEO R.C. B', 'LIBRE'),
  (1, '2026-03-07', 'Zona 2', 'M19', 'LOS TORDOS R.C. C', 'C.P.B.M. B');

-- Fecha #2 — 21/3/2026
INSERT INTO fixture (fecha_numero, date, zona, division, equipo_local, equipo_visitante) VALUES
  (2, '2026-03-21', 'Zona 2', 'M19', 'MARISTA R.C. C', 'C.P.B.M. B'),
  (2, '2026-03-21', 'Zona 2', 'M19', 'LOS TORDOS R.C. B', 'LICEO R.C. B'),
  (2, '2026-03-21', 'Zona 2', 'M19', 'LOS TORDOS R.C. C', 'LIBRE'),
  (2, '2026-03-21', 'Zona 2', 'M19', 'MARISTA R.C. B', 'SAN JORGE R.C.'),
  (2, '2026-03-21', 'Zona 2', 'M19', 'UNIVERSITARIO R.C.', 'TACURU R.C.');

-- Fecha #3 — 28/3/2026
INSERT INTO fixture (fecha_numero, date, zona, division, equipo_local, equipo_visitante) VALUES
  (3, '2026-03-28', 'Zona 2', 'M19', 'TACURU R.C.', 'MARISTA R.C. C'),
  (3, '2026-03-28', 'Zona 2', 'M19', 'SAN JORGE R.C.', 'UNIVERSITARIO R.C.'),
  (3, '2026-03-28', 'Zona 2', 'M19', 'LICEO R.C. B', 'MARISTA R.C. B'),
  (3, '2026-03-28', 'Zona 2', 'M19', 'LOS TORDOS R.C. C', 'LOS TORDOS R.C. B'),
  (3, '2026-03-28', 'Zona 2', 'M19', 'LIBRE', 'C.P.B.M. B');

-- Fecha #4 — 11/4/2026
INSERT INTO fixture (fecha_numero, date, zona, division, equipo_local, equipo_visitante) VALUES
  (4, '2026-04-11', 'Zona 2', 'M19', 'MARISTA R.C. C', 'LIBRE'),
  (4, '2026-04-11', 'Zona 2', 'M19', 'C.P.B.M. B', 'LOS TORDOS R.C. B'),
  (4, '2026-04-11', 'Zona 2', 'M19', 'MARISTA R.C. B', 'LOS TORDOS R.C. C'),
  (4, '2026-04-11', 'Zona 2', 'M19', 'UNIVERSITARIO R.C.', 'LICEO R.C. B'),
  (4, '2026-04-11', 'Zona 2', 'M19', 'TACURU R.C.', 'SAN JORGE R.C.');

-- Fecha #5 — 18/4/2026
INSERT INTO fixture (fecha_numero, date, zona, division, equipo_local, equipo_visitante) VALUES
  (5, '2026-04-18', 'Zona 2', 'M19', 'LICEO R.C. B', 'MARISTA R.C. C'),
  (5, '2026-04-18', 'Zona 2', 'M19', 'SAN JORGE R.C.', 'LOS TORDOS R.C. C'),
  (5, '2026-04-18', 'Zona 2', 'M19', 'C.P.B.M. B', 'TACURU R.C.'),
  (5, '2026-04-18', 'Zona 2', 'M19', 'LIBRE', 'UNIVERSITARIO R.C.'),
  (5, '2026-04-18', 'Zona 2', 'M19', 'LOS TORDOS R.C. B', 'MARISTA R.C. B');

-- Fecha #6 — 25/4/2026
INSERT INTO fixture (fecha_numero, date, zona, division, equipo_local, equipo_visitante) VALUES
  (6, '2026-04-25', 'Zona 2', 'M19', 'MARISTA R.C. C', 'MARISTA R.C. B'),
  (6, '2026-04-25', 'Zona 2', 'M19', 'UNIVERSITARIO R.C.', 'LOS TORDOS R.C. B'),
  (6, '2026-04-25', 'Zona 2', 'M19', 'LIBRE', 'TACURU R.C.'),
  (6, '2026-04-25', 'Zona 2', 'M19', 'SAN JORGE R.C.', 'C.P.B.M. B'),
  (6, '2026-04-25', 'Zona 2', 'M19', 'LOS TORDOS R.C. C', 'LICEO R.C. B');

-- Fecha #7 — 9/5/2026
INSERT INTO fixture (fecha_numero, date, zona, division, equipo_local, equipo_visitante) VALUES
  (7, '2026-05-09', 'Zona 2', 'M19', 'LOS TORDOS R.C. C', 'MARISTA R.C. C'),
  (7, '2026-05-09', 'Zona 2', 'M19', 'C.P.B.M. B', 'LICEO R.C. B'),
  (7, '2026-05-09', 'Zona 2', 'M19', 'LIBRE', 'SAN JORGE R.C.'),
  (7, '2026-05-09', 'Zona 2', 'M19', 'LOS TORDOS R.C. B', 'TACURU R.C.'),
  (7, '2026-05-09', 'Zona 2', 'M19', 'MARISTA R.C. B', 'UNIVERSITARIO R.C.');
