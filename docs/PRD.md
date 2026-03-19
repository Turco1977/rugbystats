# Rugby Stats Platform — PRD v0.1

## Club: Los Tordos Rugby Club
## Autor: Martin — VP Sales / Project Developer
## Estado: En revisión — pendiente validación con cuerpo técnico

---

## 1. Visión

Plataforma mobile-first de captura colaborativa en tiempo real, con dashboard web
táctico para análisis en vivo y post-partido.

### Problema
- Captura manual en planilla de papel → datos disponibles horas después
- Sin estandarización entre analistas
- Cero visibilidad en tiempo real
- Partidos simultáneos de distintas divisiones con staff reducido

### Usuarios
| Rol | Dispositivo | Prioridad |
|-----|------------|-----------|
| Analista/Ayudante | Mobile campo | P0 Core |
| Coach (banco) | Mobile/Tablet | P1 |
| Manager/DT (tribuna) | Desktop/Tablet | P1 |
| Jugador | Mobile post-partido | P2 Fase 2 |

---

## 2. Modelo de Dominio

Jerarquía: **Jornada → Partido → Posesión → Evento → Atributos**

### 6 Módulos de Eventos
1. **LINE** — Motivos: T/E/I/P/M | Resultado: Obtenido/Perdido | Robo
2. **SCRUM** — Motivos: P/I/R/G | Resultado: Obtenido/Perdido | Robo
3. **SALIDA** — Motivos: P/I/S/ENF/EF | Resultado: Obtenida/Perdida | Recupero
4. **ATAQUE** — 1ra fase, sistema, puntos, pérdida, quiebre franco, eficiencia 22
5. **DEFENSA** — 1ra fase defensiva, sistema, puntos recibidos, recupero, quiebre rival
6. **PIE** — Motivos: C/R/Penal/FK | Calidad: Eficiente/Deficitario | Territorial

Cada evento con perspectiva dual: **Propio / Rival**

---

## 3. Arquitectura Colaborativa

- Sesión por partido con código de 6 dígitos
- Múltiples cargadores simultáneos sin asignación de módulos
- Roles: Director (cuenta), Cargador (sin login), Viewer (solo lectura)
- Offline-first con sync automático

---

## 4. Épicas MVP

| # | Épica | Prioridad |
|---|-------|-----------|
| E1 | Gestión de Jornada | P0 |
| E2 | Sesión colaborativa | P0 |
| E3 | Captura mobile (4 taps max) | P0 |
| E4 | Dashboard web | P0 |
| E5 | Offline & sync | P1 |
| E6 | Exportación PDF/CSV | P1 |
| E7 | Historial de temporada | P2 |

---

## 5. Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Backend/Real-time | Supabase (PostgreSQL + Realtime) |
| Mobile | React Native + Expo (o PWA) |
| Web Dashboard | Next.js + TailwindCSS |
| Offline sync | WatermelonDB / MMKV |
| Auth | Supabase Auth (solo coordinadores) |
| Hosting | Vercel + Supabase Cloud |

---

_PRD completo original en `/Desktop/LOS TORDOS/CLAUDE RUGBY/PRD_RugbyStats_v01_LosTordos.docx`_
