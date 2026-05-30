-- ============================================================
--  INDUSTRIAS VENADO — Schema PostgreSQL Optimizado
--  Canal Tradicional La Paz — Hackathon InnovaHack
--  Versión: 1.0
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "postgis";      -- distancias geográficas reales
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- búsquedas de texto rápidas

-- ============================================================
-- ENUMS  (evitan tablas lookup innecesarias para valores fijos)
-- ============================================================

CREATE TYPE user_role AS ENUM ('supervisor', 'replenisher');

CREATE TYPE client_category AS ENUM (
    'MAYORISTA',   -- > Bs 50.000   | ~28 min avg
    'MINORISTA',   -- > Bs  5.000   | ~23 min avg
    'DETALLISTA'   -- > Bs     70   | ~13.5 min avg
);

CREATE TYPE route_status AS ENUM (
    'pending',      -- generada, no iniciada
    'in_progress',  -- reponedor en camino
    'completed',    -- todas las paradas visitadas
    'partial'       -- día terminado con paradas pendientes
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

-- ============================================================
-- 1. USUARIOS  (supervisores y reponedores en una sola tabla)
-- ============================================================

CREATE TABLE users (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    role                user_role   NOT NULL,
    name                VARCHAR(120) NOT NULL,
    email               VARCHAR(120) NOT NULL UNIQUE,
    password_hash       TEXT        NOT NULL,
    -- número interno del archivo de Venado (SUPERVISOR 1, REPONEDOR 3, etc.)
    internal_number     SMALLINT,
    -- alias legible para la UI (ej: "Reponedor 1", "Apoyo 8")
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
-- 2. MERCADOS  (zonas geográficas del archivo de Venado)
-- ============================================================

CREATE TABLE markets (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(80) NOT NULL UNIQUE,   -- CHASQUIPAMPA, RODRIGUEZ, etc.
    zone        VARCHAR(80),                   -- agrupación mayor si se necesita
    city        VARCHAR(60) NOT NULL DEFAULT 'La Paz',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. CATEGORÍAS DE PRODUCTOS VENADO
-- ============================================================

CREATE TABLE product_categories (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(80) NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. TIPOS DE CLIENTE  (segmentación con umbrales de Venado)
-- ============================================================

CREATE TABLE client_types (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    category                client_category NOT NULL UNIQUE,
    min_purchase_bs         INTEGER         NOT NULL,   -- umbral mínimo de compra
    avg_visit_minutes       SMALLINT        NOT NULL,   -- tiempo promedio real de Venado
    attention_profile       TEXT,                       -- descripción del perfil
    -- checklist base para este tipo (array de nombres de micro-tarea)
    default_microtasks      TEXT[]          NOT NULL DEFAULT '{}'
);

-- Seed directo de Categorías Venado
INSERT INTO product_categories (name, description) VALUES
    ('Alimentos Salados', 'Salsas, caldos, conservas'),
    ('Alimentos Dulces', 'Postres, cereales, bebidas en polvo'),
    ('Panificación', 'Levaduras, polvos de hornear'),
    ('Cuidado Personal y del Hogar', 'Limpieza e higiene');

-- Seed directo del PDF de Venado
INSERT INTO client_types (category, min_purchase_bs, avg_visit_minutes, attention_profile, default_microtasks) VALUES
    ('MAYORISTA',  50000, 28, 'Gestión intermedia; enfoque en volumen y rotación.',
     ARRAY['Limpieza de espacio', 'Bandeo', 'Colocación POP', 'Conteo de stock', 'Control Vencidos y Dañados', 'Foto evidencia']),
    ('MINORISTA',   5000, 23, 'Foco en capilaridad y orden de estantería básico.',
     ARRAY['Limpieza de estantería', 'Reposición', 'Bandeo', 'Control Vencidos y Dañados', 'Foto evidencia']),
    ('DETALLISTA',    70, 14, 'Visitas rápidas de reposición puntual.',
     ARRAY['Reposición puntual', 'Control Vencidos y Dañados', 'Foto evidencia']);

-- ============================================================
-- 5. PDV — Puntos de Venta  (carga directa del archivo Venado)
-- ============================================================

CREATE TABLE pdvs (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Campos del archivo de Venado
    code                    VARCHAR(10)     NOT NULL UNIQUE,   -- GV001 … GV474
    client_code             VARCHAR(20)     NOT NULL,          -- 111886, AUTO VENTA, etc.
    market_id               UUID            NOT NULL REFERENCES markets(id),
    client_type_id          UUID            NOT NULL REFERENCES client_types(id),
    -- Geolocalización (PostGIS para cálculos de distancia reales)
    location                GEOGRAPHY(POINT, 4326) NOT NULL,
    -- Visitas por día (columnas booleanas del archivo)
    visit_mon               BOOLEAN NOT NULL DEFAULT FALSE,
    visit_tue               BOOLEAN NOT NULL DEFAULT FALSE,
    visit_wed               BOOLEAN NOT NULL DEFAULT FALSE,
    visit_thu               BOOLEAN NOT NULL DEFAULT FALSE,
    visit_fri               BOOLEAN NOT NULL DEFAULT FALSE,
    visit_sat               BOOLEAN NOT NULL DEFAULT FALSE,
    -- Tiempo estimado de visita (del archivo)
    visit_minutes_estimated SMALLINT        NOT NULL DEFAULT 20,
    -- Frecuencias del archivo
    weekly_frequency        SMALLINT        NOT NULL DEFAULT 1,
    monthly_frequency       SMALLINT        NOT NULL DEFAULT 4,
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    drive_folder_url    TEXT,
    notes               TEXT,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Índice espacial para consultas de vecinos cercanos (motor de ruteo)
CREATE INDEX idx_pdvs_location     ON pdvs USING GIST(location);
CREATE INDEX idx_pdvs_market       ON pdvs(market_id);
CREATE INDEX idx_pdvs_client_type  ON pdvs(client_type_id);
CREATE INDEX idx_pdvs_active       ON pdvs(is_active) WHERE is_active = TRUE;

-- Índice compuesto para filtrar PDVs del día rápido
CREATE INDEX idx_pdvs_schedule ON pdvs(visit_mon, visit_tue, visit_wed, visit_thu, visit_fri, visit_sat);

-- ============================================================
-- 5. ASIGNACIONES PDV ↔ REPONEDOR
--    Permite reasignaciones sin modificar el PDV
-- ============================================================

CREATE TABLE pdv_assignments (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    pdv_id          UUID        NOT NULL REFERENCES pdvs(id) ON DELETE CASCADE,
    replenisher_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_from   DATE        NOT NULL DEFAULT CURRENT_DATE,
    assigned_until  DATE,       -- NULL = vigente
    created_by      UUID        REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Un PDV solo puede tener un reponedor activo a la vez
    CONSTRAINT uq_pdv_active_assignment
        UNIQUE NULLS NOT DISTINCT (pdv_id, assigned_until)
);

CREATE INDEX idx_assignments_replenisher ON pdv_assignments(replenisher_id);
CREATE INDEX idx_assignments_pdv         ON pdv_assignments(pdv_id);
CREATE INDEX idx_assignments_active      ON pdv_assignments(assigned_until) WHERE assigned_until IS NULL;

-- ============================================================
-- 7. MICRO-TAREAS (El checklist a completar)
-- ============================================================

CREATE TABLE microtasks (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(100)    NOT NULL UNIQUE,
    -- NULL = aplica a todos los tipos de cliente
    applicable_category     client_category,
    is_required             BOOLEAN         NOT NULL DEFAULT TRUE,
    requires_photo          BOOLEAN         NOT NULL DEFAULT FALSE,
    sort_order              SMALLINT        NOT NULL DEFAULT 0,
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

INSERT INTO microtasks (name, applicable_category, is_required, requires_photo, sort_order) VALUES
    ('Limpieza de espacio',      'MAYORISTA',  TRUE,  FALSE, 1),
    ('Bandeo Mayorista',         'MAYORISTA',  TRUE,  FALSE, 2),
    ('Colocación POP',           'MAYORISTA',  TRUE,  FALSE, 3),
    ('Conteo de stock',          'MAYORISTA',  TRUE,  FALSE, 4),
    ('Limpieza de estantería',   'MINORISTA',  TRUE,  FALSE, 1),
    ('Reposición de producto',    NULL,         TRUE,  FALSE, 2),
    ('Bandeo Minorista',         'MINORISTA',  TRUE,  FALSE, 3),
    ('Reposición puntual',       'DETALLISTA', TRUE,  FALSE, 1),
    ('Control Vencidos y Dañados',NULL,        FALSE, TRUE,  10),
    ('Foto evidencia',            NULL,         TRUE,  TRUE,  99);

-- ============================================================
-- 8. RUTAS (Asignación diaria de PDVs al reponedor)
-- ============================================================

CREATE TABLE routes (
    id                          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    replenisher_id              UUID         NOT NULL REFERENCES users(id),
    route_date                  DATE         NOT NULL,
    status                      route_status NOT NULL DEFAULT 'pending',
    -- Métricas calculadas al generar la ruta
    total_pdvs                  SMALLINT     NOT NULL DEFAULT 0,
    total_estimated_minutes     SMALLINT     NOT NULL DEFAULT 0,
    total_distance_km           NUMERIC(8,3) NOT NULL DEFAULT 0,
    -- Métricas reales al cerrar la ruta
    total_real_minutes          SMALLINT,
    total_real_distance_km      NUMERIC(8,3),
    -- Algoritmo usado (para el feedback loop)
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
-- 9. PARADAS DE RUTA (Orden y estado dentro de la ruta)
-- ============================================================

CREATE TABLE route_stops (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id                UUID        NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    pdv_id                  UUID        NOT NULL REFERENCES pdvs(id),
    stop_order              SMALLINT    NOT NULL,   -- orden sugerido por el algoritmo
    -- Estimaciones al generar la ruta
    estimated_minutes       SMALLINT    NOT NULL,
    distance_from_prev_km   NUMERIC(6,3) NOT NULL DEFAULT 0,
    -- Estado de ejecución
    status                  stop_status NOT NULL DEFAULT 'pending',
    arrived_at              TIMESTAMPTZ,
    finished_at             TIMESTAMPTZ,
    real_minutes            SMALLINT,
    -- Coordenada de llegada real (para validar presencia en campo)
    arrival_location        GEOGRAPHY(POINT, 4326),
    distance_to_pdv_m       NUMERIC(8,1),   -- metros de diferencia al llegar

    CONSTRAINT uq_route_stop_order UNIQUE (route_id, stop_order)
);

CREATE INDEX idx_stops_route  ON route_stops(route_id);
CREATE INDEX idx_stops_pdv    ON route_stops(pdv_id);
CREATE INDEX idx_stops_status ON route_stops(status, route_id);

-- ============================================================
-- 10. VISITAS (Ejecución real en el PDV)
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
    -- Desviación vs estimado (alimenta el feedback loop)
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
-- 11. MICRO-TAREAS EJECUTADAS
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
    -- URL en S3/Cloudinary de la foto evidencia
    drive_file_url  TEXT,
    notes           TEXT,
    form_data       JSONB       DEFAULT '{}'::jsonb,

    CONSTRAINT uq_visit_microtask UNIQUE (visit_id, microtask_id)
);

CREATE INDEX idx_vmicrotasks_visit    ON visit_microtasks(visit_id);
CREATE INDEX idx_vmicrotasks_task     ON visit_microtasks(microtask_id);

-- ============================================================
-- 12. SOLICITUDES DE REPOSICIÓN
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
    drive_file_url      TEXT,
    -- Revisión por supervisor
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
-- 13. HISTORIAL DE TIEMPOS REALES  (feedback loop / BI)
--     Vista materializada que agrega tiempos por PDV + tipo de tarea
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
-- 14. TRIGGER — actualizar updated_at automáticamente
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
-- 15. FUNCIÓN HELPER — PDVs del día para un reponedor
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
    avg_real_minutes NUMERIC   -- del historial real, NULL si no hay datos
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
        AND pa.assigned_until IS NULL          -- asignación activa
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
-- 16. FUNCIÓN HELPER — Vecino más cercano (Nearest Neighbor TSP)
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
    -- Obtener todos los PDVs del día para este reponedor
    SELECT ARRAY_AGG(pdv_id) INTO v_all_pdvs
    FROM get_pdvs_for_replenisher(p_replenisher_id, p_date);

    IF v_all_pdvs IS NULL THEN RETURN; END IF;

    -- Punto de inicio: primer PDV en orden de código
    SELECT p.location INTO v_current_location
    FROM pdvs p WHERE p.id = v_all_pdvs[1];

    WHILE array_length(v_visited, 1) IS DISTINCT FROM array_length(v_all_pdvs, 1) LOOP
        -- Buscar el PDV más cercano no visitado
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

-- ============================================================
-- 18. SEED — Supervisores y reponedores del archivo de Venado
-- ============================================================

INSERT INTO users (role, name, email, password_hash, internal_number, display_name) VALUES
    ('supervisor', 'Supervisor 1', 'supervisor1@venado.com', crypt('venado2024', gen_salt('bf')), 1, 'Supervisor 1'),
    ('supervisor', 'Supervisor 2', 'supervisor2@venado.com', crypt('venado2024', gen_salt('bf')), 2, 'Supervisor 2'),
    ('supervisor', 'Supervisor 3', 'supervisor3@venado.com', crypt('venado2024', gen_salt('bf')), 3, 'Supervisor 3');

-- Reponedores (se actualiza supervisor_id en el siguiente paso)
INSERT INTO users (role, name, email, password_hash, internal_number, display_name, supervisor_id)
SELECT
    'replenisher',
    'Reponedor ' || n,
    'reponedor' || n || '@venado.com',
    crypt('venado2024', gen_salt('bf')),
    n,
    CASE WHEN n IN (8) THEN 'Reponedor ' || n || ' (Apoyo)' ELSE 'Reponedor ' || n END,
    CASE
        WHEN n IN (1,2,3,4,5,6,7,8,9,10,11,12,13) THEN
            (SELECT id FROM users WHERE internal_number = 1 AND role = 'supervisor')
        ELSE
            (SELECT id FROM users WHERE internal_number = 2 AND role = 'supervisor')
    END
FROM generate_series(1, 23) AS n;

-- ============================================================
-- 19. SEED — Mercados del archivo de Venado
-- ============================================================

INSERT INTO markets (name) VALUES
    ('CHASQUIPAMPA'), ('ALTO PAMPAHASI'), ('10 DE ENERO'), ('SAN ANTONIO'),
    ('KOLLASUYO'), ('CRUCE DE VILLAS'), ('VILLA ARMONIA'), ('ACHUMANI'),
    ('LOS PINOS'), ('IRPAVI'), ('OVEJUYO'), ('YUNGAS'), ('MIRAFLORES'),
    ('VILLA EL CARMEN'), ('OBRAJES'), ('ALTO OBRAJES'), ('STRONGEST'),
    ('BOLIVAR'), ('VITA'), ('OBELISCO'), ('ARCE'), ('SOPOCACHI'),
    ('HINOJOSA'), ('CAMACHO'), ('ACHACHICALA'), ('LANZA'), ('SAN JOSE'),
    ('RODRIGUEZ'), ('VILLA FATIMA'), ('GARCILAZO'), ('TEJAR');

-- ============================================================
-- 20. SEED — Muestra de PDVs reales del archivo (primeros 20)
-- ============================================================

-- Helper temporal para insertar PDVs fácilmente
CREATE OR REPLACE FUNCTION seed_pdv(
    p_code VARCHAR, p_client_code VARCHAR, p_market VARCHAR,
    p_category client_category, p_lat FLOAT, p_lng FLOAT,
    p_minutes INTEGER,
    p_mon BOOL, p_tue BOOL, p_wed BOOL, p_thu BOOL, p_fri BOOL, p_sat BOOL,
    p_weekly INTEGER, p_monthly INTEGER
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO pdvs (code, client_code, market_id, client_type_id, location,
                      visit_minutes_estimated,
                      visit_mon, visit_tue, visit_wed, visit_thu, visit_fri, visit_sat,
                      weekly_frequency, monthly_frequency)
    VALUES (
        p_code, p_client_code,
        (SELECT id FROM markets WHERE name = p_market),
        (SELECT id FROM client_types WHERE category = p_category),
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        p_minutes,
        p_mon, p_tue, p_wed, p_thu, p_fri, p_sat,
        p_weekly, p_monthly
    );
END;
$$;

SELECT seed_pdv('GV001','111886','CHASQUIPAMPA','MINORISTA',-16.53678674,-68.04696858,40, TRUE,FALSE,TRUE,FALSE,FALSE,FALSE,2,8);
SELECT seed_pdv('GV002','29849','CHASQUIPAMPA','MINORISTA',-16.5360361,-68.0458746,30, FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,1,4);
SELECT seed_pdv('GV003','121652','CHASQUIPAMPA','MINORISTA',-16.5372816,-68.0481013,20, FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,1,4);
SELECT seed_pdv('GV004','121652','CHASQUIPAMPA','MINORISTA',-16.5374663,-68.0485621,20, FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,1,4);
SELECT seed_pdv('GV005','39702','CHASQUIPAMPA','MINORISTA',-16.5371804,-68.0481663,40, FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,1,4);
SELECT seed_pdv('GV006','75182','CHASQUIPAMPA','MINORISTA',-16.537521,-68.0482,15, FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,1,4);
SELECT seed_pdv('GV007','82768','CHASQUIPAMPA','MINORISTA',-16.5374514,-68.0484989,20, FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,1,4);
SELECT seed_pdv('GV008','130051','CHASQUIPAMPA','MINORISTA',-16.5377087,-68.0500336,10, FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,1,4);
SELECT seed_pdv('GV009','109861','ALTO PAMPAHASI','MINORISTA',-16.49544574,-68.1034628,20, FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,1,4);
SELECT seed_pdv('GV010','38180','ALTO PAMPAHASI','MINORISTA',-16.4954428,-68.1020593,25, FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,1,4);
SELECT seed_pdv('GV011','82728','10 DE ENERO','MINORISTA',-16.5019009,-68.1046631,25, FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,1,4);
SELECT seed_pdv('GV012','99137','10 DE ENERO','MINORISTA',-16.5017024,-68.1042295,25, FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,1,4);
SELECT seed_pdv('GV013','111538','10 DE ENERO','MINORISTA',-16.50172437,-68.10421574,20, FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,1,4);
SELECT seed_pdv('GV014','101854','10 DE ENERO','MINORISTA',-16.5019859,-68.1037724,70, FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,1,4);
SELECT seed_pdv('GV015','74076','10 DE ENERO','MINORISTA',-16.5008563,-68.1053203,30, FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,1,4);
SELECT seed_pdv('GV049','107855','ACHUMANI','MAYORISTA',-16.5313167,-68.07484436,50, FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,1,4);
SELECT seed_pdv('GV101','106248','STRONGEST','MINORISTA',-16.5151922,-68.1395053,90, TRUE,FALSE,TRUE,FALSE,FALSE,FALSE,2,4);
SELECT seed_pdv('GV112','107855','VITA','MAYORISTA',-16.4932266,-68.14419,120, TRUE,FALSE,TRUE,FALSE,FALSE,FALSE,2,4);
SELECT seed_pdv('GV113','107855','OBELISCO','MAYORISTA',-16.4999613,-68.1348082,120, TRUE,FALSE,TRUE,FALSE,FALSE,FALSE,2,4);
SELECT seed_pdv('GV114','120906','ARCE','MAYORISTA',-16.5113081,-68.1238442,120, TRUE,FALSE,TRUE,FALSE,FALSE,FALSE,2,4);

-- Limpiar helper temporal
DROP FUNCTION seed_pdv;

-- ============================================================
-- 21. ASIGNACIONES INICIALES  (basadas en el archivo de Venado)
-- ============================================================

-- Reponedor 1 → PDVs GV001–GV100 (SUPERVISOR 1 / REPONEDOR 1 del archivo)
INSERT INTO pdv_assignments (pdv_id, replenisher_id)
SELECT p.id, u.id
FROM pdvs p, users u
WHERE u.internal_number = 1 AND u.role = 'replenisher'
  AND p.code IN ('GV001','GV002','GV003','GV004','GV005','GV006','GV007',
                 'GV008','GV009','GV010','GV011','GV012','GV013','GV014','GV015');

-- Reponedor 2 → PDVs STRONGEST, VITA, OBELISCO, ARCE
INSERT INTO pdv_assignments (pdv_id, replenisher_id)
SELECT p.id, u.id
FROM pdvs p, users u
WHERE u.internal_number = 2 AND u.role = 'replenisher'
  AND p.code IN ('GV101','GV112','GV113','GV114');

-- ============================================================
-- FIN DEL SCHEMA
-- ============================================================
