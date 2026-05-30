-- ============================================================
--  INDUSTRIAS VENADO — Schema PostgreSQL Optimizado para Supabase
--  Canal Tradicional La Paz — Hackathon InnovaHack
--  Versión: Limpia (Estructura, Funciones y Vistas)
-- ============================================================

-- Extensiones necesarias (Requeridas por Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "postgis";      -- distancias geográficas reales
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- búsquedas de texto rápidas

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('supervisor', 'replenisher');
CREATE TYPE client_category AS ENUM (
    'MAYORISTA',
    'MINORISTA',
    'DETALLISTA'
);
CREATE TYPE route_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'partial'
);
CREATE TYPE stop_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'skipped'
);
CREATE TYPE visit_status AS ENUM (
    'in_progress',
    'completed',
    'abandoned'
);
CREATE TYPE request_urgency AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE request_status  AS ENUM ('pending', 'approved', 'rejected', 'fulfilled');
CREATE TYPE issue_reason    AS ENUM ('expired', 'damaged', 'other');

-- ============================================================
-- 1. USUARIOS
-- ============================================================
CREATE TABLE users (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    role                user_role   NOT NULL,
    name                VARCHAR(120) NOT NULL,
    email               VARCHAR(120) NOT NULL UNIQUE,
    password_hash       TEXT        NOT NULL,
    display_name        VARCHAR(80),
    supervisor_id       UUID        REFERENCES users(id) ON DELETE SET NULL,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_supervisor_has_no_parent
        CHECK (role <> 'supervisor' OR supervisor_id IS NULL)
);
CREATE INDEX idx_users_role        ON users(role);
CREATE INDEX idx_users_supervisor  ON users(supervisor_id) WHERE supervisor_id IS NOT NULL;

-- ============================================================
-- 2. MERCADOS
-- ============================================================
CREATE TABLE markets (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(80) NOT NULL UNIQUE,
    zone        VARCHAR(80),
    city        VARCHAR(60) NOT NULL DEFAULT 'La Paz',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. TIPOS DE CLIENTE
-- ============================================================
CREATE TABLE client_types (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    category                client_category NOT NULL UNIQUE,
    min_purchase_bs         INTEGER         NOT NULL,
    avg_visit_minutes       SMALLINT        NOT NULL,
    attention_profile       TEXT,
    default_microtasks      TEXT[]          NOT NULL DEFAULT '{}'
);

-- ============================================================
-- 4. PUNTOS DE VENTA (PDV)
-- ============================================================
CREATE TABLE pdvs (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    code                    VARCHAR(10)     NOT NULL UNIQUE,
    client_code             VARCHAR(20)     NOT NULL,
    market_id               UUID            NOT NULL REFERENCES markets(id),
    client_type_id          UUID            NOT NULL REFERENCES client_types(id),
    location                GEOGRAPHY(POINT, 4326) NOT NULL,
    visit_mon               BOOLEAN NOT NULL DEFAULT FALSE,
    visit_tue               BOOLEAN NOT NULL DEFAULT FALSE,
    visit_wed               BOOLEAN NOT NULL DEFAULT FALSE,
    visit_thu               BOOLEAN NOT NULL DEFAULT FALSE,
    visit_fri               BOOLEAN NOT NULL DEFAULT FALSE,
    visit_sat               BOOLEAN NOT NULL DEFAULT FALSE,
    visit_minutes_estimated SMALLINT        NOT NULL DEFAULT 20,
    weekly_frequency        SMALLINT        NOT NULL DEFAULT 1,
    monthly_frequency       SMALLINT        NOT NULL DEFAULT 4,
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    notes                   TEXT,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pdvs_location     ON pdvs USING GIST(location);
CREATE INDEX idx_pdvs_market       ON pdvs(market_id);
CREATE INDEX idx_pdvs_client_type  ON pdvs(client_type_id);
CREATE INDEX idx_pdvs_active       ON pdvs(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_pdvs_schedule ON pdvs(visit_mon, visit_tue, visit_wed, visit_thu, visit_fri, visit_sat);

-- ============================================================
-- 5. ASIGNACIONES PDV ↔ REPONEDOR
-- ============================================================
CREATE TABLE pdv_assignments (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    pdv_id          UUID        NOT NULL REFERENCES pdvs(id) ON DELETE CASCADE,
    replenisher_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_from   DATE        NOT NULL DEFAULT CURRENT_DATE,
    assigned_until  DATE,
    created_by      UUID        REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_pdv_active_assignment
        UNIQUE NULLS NOT DISTINCT (pdv_id, assigned_until)
);
CREATE INDEX idx_assignments_replenisher ON pdv_assignments(replenisher_id);
CREATE INDEX idx_assignments_pdv         ON pdv_assignments(pdv_id);
CREATE INDEX idx_assignments_active      ON pdv_assignments(assigned_until) WHERE assigned_until IS NULL;

-- ============================================================
-- 6. MICRO-TAREAS
-- ============================================================
CREATE TABLE microtasks (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(100)    NOT NULL UNIQUE,
    applicable_category     client_category,
    is_required             BOOLEAN         NOT NULL DEFAULT TRUE,
    requires_photo          BOOLEAN         NOT NULL DEFAULT FALSE,
    sort_order              SMALLINT        NOT NULL DEFAULT 0,
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. RUTAS
-- ============================================================
CREATE TABLE routes (
    id                          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    replenisher_id              UUID         NOT NULL REFERENCES users(id),
    route_date                  DATE         NOT NULL,
    status                      route_status NOT NULL DEFAULT 'pending',
    total_pdvs                  SMALLINT     NOT NULL DEFAULT 0,
    total_estimated_minutes     SMALLINT     NOT NULL DEFAULT 0,
    total_distance_km           NUMERIC(8,3) NOT NULL DEFAULT 0,
    total_real_minutes          SMALLINT,
    total_real_distance_km      NUMERIC(8,3),
    algorithm_version           VARCHAR(20)  NOT NULL DEFAULT 'nearest_neighbor_v1',
    started_at                  TIMESTAMPTZ,
    finished_at                 TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_replenisher_route_date UNIQUE (replenisher_id, route_date)
);
CREATE INDEX idx_routes_replenisher ON routes(replenisher_id);
CREATE INDEX idx_routes_date        ON routes(route_date DESC);
CREATE INDEX idx_routes_status      ON routes(status) WHERE status IN ('pending','in_progress');

-- ============================================================
-- 8. PARADAS DE RUTA
-- ============================================================
CREATE TABLE route_stops (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id                UUID        NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    pdv_id                  UUID        NOT NULL REFERENCES pdvs(id),
    stop_order              SMALLINT    NOT NULL,
    estimated_minutes       SMALLINT    NOT NULL,
    distance_from_prev_km   NUMERIC(6,3) NOT NULL DEFAULT 0,
    status                  stop_status NOT NULL DEFAULT 'pending',
    arrived_at              TIMESTAMPTZ,
    finished_at             TIMESTAMPTZ,
    real_minutes            SMALLINT,
    arrival_location        GEOGRAPHY(POINT, 4326),
    distance_to_pdv_m       NUMERIC(8,1),

    CONSTRAINT uq_route_stop_order UNIQUE (route_id, stop_order)
);
CREATE INDEX idx_stops_route  ON route_stops(route_id);
CREATE INDEX idx_stops_pdv    ON route_stops(pdv_id);
CREATE INDEX idx_stops_status ON route_stops(status, route_id);

-- ============================================================
-- 9. VISITAS
-- ============================================================
CREATE TABLE visits (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    route_stop_id       UUID         REFERENCES route_stops(id),
    pdv_id              UUID         NOT NULL REFERENCES pdvs(id),
    replenisher_id      UUID         NOT NULL REFERENCES users(id),
    visit_date          DATE         NOT NULL DEFAULT CURRENT_DATE,
    status              visit_status NOT NULL DEFAULT 'in_progress',
    started_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    finished_at         TIMESTAMPTZ,
    real_duration_min   SMALLINT     GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (finished_at - started_at))::SMALLINT / 60
    ) STORED,
    estimated_minutes   SMALLINT,
    deviation_minutes   SMALLINT     GENERATED ALWAYS AS (
        CASE WHEN finished_at IS NOT NULL
        THEN (EXTRACT(EPOCH FROM (finished_at - started_at))::SMALLINT / 60) - estimated_minutes
        ELSE NULL END
    ) STORED,
    notes               TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_visits_replenisher ON visits(replenisher_id, visit_date DESC);
CREATE INDEX idx_visits_pdv         ON visits(pdv_id, visit_date DESC);
CREATE INDEX idx_visits_date        ON visits(visit_date DESC);
CREATE INDEX idx_visits_status      ON visits(status) WHERE status = 'in_progress';

-- ============================================================
-- 10. MICRO-TAREAS EJECUTADAS
-- ============================================================
CREATE TABLE visit_microtasks (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id        UUID        NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    microtask_id    UUID        NOT NULL REFERENCES microtasks(id),
    started_at      TIMESTAMPTZ,
    finished_at     TIMESTAMPTZ,
    real_minutes    SMALLINT    GENERATED ALWAYS AS (
        CASE WHEN finished_at IS NOT NULL AND started_at IS NOT NULL
        THEN GREATEST(1, EXTRACT(EPOCH FROM (finished_at - started_at))::SMALLINT / 60)
        ELSE NULL END
    ) STORED,
    completed       BOOLEAN     NOT NULL DEFAULT FALSE,
    photo_url       TEXT,
    notes           TEXT,

    CONSTRAINT uq_visit_microtask UNIQUE (visit_id, microtask_id)
);
CREATE INDEX idx_vmicrotasks_visit    ON visit_microtasks(visit_id);
CREATE INDEX idx_vmicrotasks_task     ON visit_microtasks(microtask_id);

-- ============================================================
-- 11. SOLICITUDES DE REPOSICIÓN
-- ============================================================
CREATE TABLE restock_requests (
    id                  UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id            UUID             REFERENCES visits(id),
    pdv_id              UUID             NOT NULL REFERENCES pdvs(id),
    replenisher_id      UUID             NOT NULL REFERENCES users(id),
    product_name        VARCHAR(120)     NOT NULL,
    quantity_requested  SMALLINT,
    urgency             request_urgency  NOT NULL DEFAULT 'medium',
    status              request_status   NOT NULL DEFAULT 'pending',
    notes               TEXT,
    photo_url           TEXT,
    reviewed_by         UUID             REFERENCES users(id),
    supervisor_notes    TEXT,
    created_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    reviewed_at         TIMESTAMPTZ,
    fulfilled_at        TIMESTAMPTZ
);
CREATE INDEX idx_restock_replenisher ON restock_requests(replenisher_id, created_at DESC);
CREATE INDEX idx_restock_pdv         ON restock_requests(pdv_id);
CREATE INDEX idx_restock_status      ON restock_requests(status) WHERE status IN ('pending','approved');
CREATE INDEX idx_restock_urgency     ON restock_requests(urgency, status);

-- ============================================================
-- 12. PRODUCTOS VENCIDOS Y DAÑADOS (INCIDENCIAS)
-- ============================================================
CREATE TABLE product_issues (
    id                  UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id            UUID             REFERENCES visits(id),
    pdv_id              UUID             NOT NULL REFERENCES pdvs(id),
    replenisher_id      UUID             NOT NULL REFERENCES users(id),
    product_name        VARCHAR(120)     NOT NULL,
    quantity            SMALLINT         NOT NULL,
    reason              issue_reason     NOT NULL,
    notes               TEXT,
    photo_url           TEXT,
    created_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_issues_replenisher ON product_issues(replenisher_id, created_at DESC);
CREATE INDEX idx_issues_pdv         ON product_issues(pdv_id);

-- ============================================================
-- 13. HISTORIAL DE TIEMPOS REALES (VISTA MATERIALIZADA)
-- ============================================================
CREATE MATERIALIZED VIEW mv_pdv_real_times AS
    SELECT
        v.pdv_id,
        p.code                          AS pdv_code,
        ct.category                     AS client_category,
        COUNT(v.id)                     AS total_visits,
        ROUND(AVG(v.real_duration_min)) AS avg_real_minutes,
        ROUND(AVG(v.estimated_minutes)) AS avg_estimated_minutes,
        ROUND(AVG(v.deviation_minutes)) AS avg_deviation_minutes,
        MAX(v.visit_date)               AS last_visited
    FROM visits v
    JOIN pdvs p         ON p.id = v.pdv_id
    JOIN client_types ct ON ct.id = p.client_type_id
    WHERE v.status = 'completed'
    GROUP BY v.pdv_id, p.code, ct.category
WITH DATA;
CREATE UNIQUE INDEX ON mv_pdv_real_times(pdv_id);

-- ============================================================
-- 14. TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_pdvs_updated_at  BEFORE UPDATE ON pdvs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 15. FUNCIÓN HELPER — PDVs del día
-- ============================================================
CREATE OR REPLACE FUNCTION get_pdvs_for_replenisher(
    p_replenisher_id UUID,
    p_date           DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    pdv_id          UUID,
    code            VARCHAR,
    client_code     VARCHAR,
    market_name     VARCHAR,
    category        client_category,
    latitude        FLOAT,
    longitude       FLOAT,
    visit_minutes   SMALLINT,
    avg_real_minutes NUMERIC
) LANGUAGE sql STABLE AS $$
    SELECT
        p.id,
        p.code,
        p.client_code,
        m.name,
        ct.category,
        ST_Y(p.location::geometry)  AS latitude,
        ST_X(p.location::geometry)  AS longitude,
        p.visit_minutes_estimated,
        rt.avg_real_minutes
    FROM pdv_assignments pa
    JOIN pdvs p           ON p.id = pa.pdv_id
    JOIN markets m        ON m.id = p.market_id
    JOIN client_types ct  ON ct.id = p.client_type_id
    LEFT JOIN mv_pdv_real_times rt ON rt.pdv_id = p.id
    WHERE
        pa.replenisher_id = p_replenisher_id
        AND pa.assigned_until IS NULL
        AND p.is_active = TRUE
        AND CASE EXTRACT(DOW FROM p_date)
            WHEN 1 THEN p.visit_mon
            WHEN 2 THEN p.visit_tue
            WHEN 3 THEN p.visit_wed
            WHEN 4 THEN p.visit_thu
            WHEN 5 THEN p.visit_fri
            WHEN 6 THEN p.visit_sat
            ELSE FALSE
        END
    ORDER BY p.code;
$$;

-- ============================================================
-- 16. FUNCIÓN HELPER — Ruteo Nearest Neighbor
-- ============================================================
CREATE OR REPLACE FUNCTION generate_route_nearest_neighbor(
    p_replenisher_id UUID,
    p_date           DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    stop_order              INT,
    pdv_id                  UUID,
    pdv_code                VARCHAR,
    estimated_minutes       SMALLINT,
    distance_from_prev_km   NUMERIC
) LANGUAGE plpgsql AS $$
DECLARE
    v_current_location  GEOGRAPHY;
    v_next_id           UUID;
    v_next_location     GEOGRAPHY;
    v_distance          NUMERIC;
    v_order             INT := 1;
    v_visited           UUID[] := '{}';
    v_all_pdvs          UUID[];
BEGIN
    SELECT ARRAY_AGG(pdv_id) INTO v_all_pdvs
    FROM get_pdvs_for_replenisher(p_replenisher_id, p_date);

    IF v_all_pdvs IS NULL THEN RETURN; END IF;

    SELECT p.location INTO v_current_location
    FROM pdvs p WHERE p.id = v_all_pdvs[1];

    WHILE array_length(v_visited, 1) IS DISTINCT FROM array_length(v_all_pdvs, 1) LOOP
        SELECT p.id, p.location,
               ST_Distance(v_current_location, p.location) / 1000
          INTO v_next_id, v_next_location, v_distance
          FROM pdvs p
         WHERE p.id = ANY(v_all_pdvs)
           AND NOT (p.id = ANY(v_visited))
         ORDER BY v_current_location <-> p.location
         LIMIT 1;

        v_visited := v_visited || v_next_id;
        v_current_location := v_next_location;

        RETURN QUERY
            SELECT
                v_order,
                p.id,
                p.code,
                p.visit_minutes_estimated,
                ROUND(v_distance::NUMERIC, 3)
            FROM pdvs p WHERE p.id = v_next_id;

        v_order := v_order + 1;
    END LOOP;
END;
$$;

-- ============================================================
-- 17. VISTA — Dashboard del supervisor
-- ============================================================
CREATE VIEW vw_supervisor_dashboard AS
    SELECT
        u.id                        AS replenisher_id,
        u.display_name              AS replenisher_name,
        r.id                        AS route_id,
        r.route_date,
        r.status                    AS route_status,
        r.total_pdvs,
        COUNT(rs.id) FILTER (WHERE rs.status = 'completed')  AS stops_completed,
        COUNT(rs.id) FILTER (WHERE rs.status = 'pending')    AS stops_pending,
        COUNT(rs.id) FILTER (WHERE rs.status = 'skipped')    AS stops_skipped,
        ROUND(
            COUNT(rs.id) FILTER (WHERE rs.status = 'completed')::NUMERIC
            / NULLIF(r.total_pdvs, 0) * 100, 1
        )                           AS completion_pct,
        r.total_estimated_minutes,
        SUM(rs.real_minutes)        AS total_real_minutes_so_far,
        COUNT(rr.id) FILTER (WHERE rr.status = 'pending' AND rr.urgency = 'critical')
                                    AS critical_restock_requests
    FROM users u
    JOIN routes r  ON r.replenisher_id = u.id AND r.route_date = CURRENT_DATE
    LEFT JOIN route_stops rs ON rs.route_id = r.id
    LEFT JOIN visits v    ON v.route_stop_id = rs.id
    LEFT JOIN restock_requests rr ON rr.replenisher_id = u.id
                                  AND DATE(rr.created_at) = CURRENT_DATE
    WHERE u.role = 'replenisher' AND u.is_active = TRUE
    GROUP BY u.id, u.display_name, r.id, r.route_date, r.status,
             r.total_pdvs, r.total_estimated_minutes;
