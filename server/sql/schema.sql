-- Лендинг фитнес-тренера Максима Орлова. PostgreSQL 15+, 3NF.
-- Мягкое удаление: is_deleted + deleted_by. Физическое удаление записей запрещено.

BEGIN;

CREATE TABLE roles (
    id          SMALLSERIAL PRIMARY KEY,
    code        VARCHAR(20)  NOT NULL UNIQUE,      -- admin | manager
    name        VARCHAR(50)  NOT NULL,
    description TEXT
);

CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    role_id       SMALLINT     NOT NULL REFERENCES roles(id),
    login         VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(150) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted    BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_by    INTEGER REFERENCES users(id)
);

CREATE TABLE services (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(150) NOT NULL,
    description TEXT         NOT NULL DEFAULT '',
    format      VARCHAR(10)  NOT NULL CHECK (format IN ('очно', 'онлайн')),
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted  BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_by  INTEGER REFERENCES users(id)
);

CREATE TABLE tariffs (
    id             SERIAL PRIMARY KEY,
    service_id     INTEGER       NOT NULL REFERENCES services(id),
    title          VARCHAR(100)  NOT NULL,
    description    TEXT          NOT NULL DEFAULT '',   -- пункты состава, по одному в строке
    price          NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    sessions_count INTEGER       NOT NULL CHECK (sessions_count > 0),
    is_featured    BOOLEAN       NOT NULL DEFAULT FALSE,
    sort_order     INTEGER       NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    is_deleted     BOOLEAN       NOT NULL DEFAULT FALSE,
    deleted_by     INTEGER REFERENCES users(id)
);

CREATE TABLE leads (
    id           SERIAL PRIMARY KEY,
    service_id   INTEGER REFERENCES services(id),
    tariff_id    INTEGER REFERENCES tariffs(id),
    processed_by INTEGER REFERENCES users(id),
    name         VARCHAR(100) NOT NULL,
    phone        VARCHAR(18)  NOT NULL CHECK (phone ~ '^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$'),
    comment      TEXT         NOT NULL DEFAULT '',
    status       VARCHAR(20)  NOT NULL DEFAULT 'new'
                 CHECK (status IN ('new', 'in_progress', 'done', 'rejected')),
    consent      BOOLEAN      NOT NULL CHECK (consent = TRUE),
    source_url   VARCHAR(255) NOT NULL DEFAULT '',      -- UTM-метки
    ip_address   VARCHAR(45)  NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted   BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_by   INTEGER REFERENCES users(id)
);
CREATE INDEX leads_status_idx  ON leads (status) WHERE NOT is_deleted;
CREATE INDEX leads_phone_idx   ON leads (phone, created_at);
CREATE INDEX leads_ip_idx      ON leads (ip_address, created_at);

CREATE TABLE reviews (
    id           SERIAL PRIMARY KEY,
    client_name  VARCHAR(100) NOT NULL,
    text         TEXT         NOT NULL,
    rating       SMALLINT     NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    is_published BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted   BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_by   INTEGER REFERENCES users(id)
);

-- Журнал действий: кто, когда, какое поле изменил. user_id = NULL — действие посетителя.
CREATE TABLE audit_log (
    id         BIGSERIAL PRIMARY KEY,
    user_id    INTEGER REFERENCES users(id),
    action     VARCHAR(20)  NOT NULL,      -- create | update | delete | login | logout
    table_name VARCHAR(50)  NOT NULL,
    record_id  INTEGER,
    field_name VARCHAR(50),
    old_value  TEXT,
    new_value  TEXT,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_created_idx ON audit_log (created_at DESC);

-- Служебная таблица: защита формы входа от подбора пароля.
CREATE TABLE login_attempts (
    id         BIGSERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    login      VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX login_attempts_idx ON login_attempts (ip_address, created_at);

-- Запрет физического удаления из основных таблиц.
CREATE FUNCTION forbid_hard_delete() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Физическое удаление из таблицы % запрещено, используйте is_deleted', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_no_delete    BEFORE DELETE ON users    FOR EACH ROW EXECUTE FUNCTION forbid_hard_delete();
CREATE TRIGGER services_no_delete BEFORE DELETE ON services FOR EACH ROW EXECUTE FUNCTION forbid_hard_delete();
CREATE TRIGGER tariffs_no_delete  BEFORE DELETE ON tariffs  FOR EACH ROW EXECUTE FUNCTION forbid_hard_delete();
CREATE TRIGGER leads_no_delete    BEFORE DELETE ON leads    FOR EACH ROW EXECUTE FUNCTION forbid_hard_delete();
CREATE TRIGGER reviews_no_delete  BEFORE DELETE ON reviews  FOR EACH ROW EXECUTE FUNCTION forbid_hard_delete();
CREATE TRIGGER audit_no_delete    BEFORE DELETE ON audit_log FOR EACH ROW EXECUTE FUNCTION forbid_hard_delete();

COMMIT;
