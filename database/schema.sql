-- =============================================
-- SCHEMA: VI VIGILIA CC - Sistema de Videovigilancia Inteligente
-- Base de Datos: PostgreSQL 14+
-- Proyecto: Detección de Comportamientos Sospechosos
-- =============================================

-- Eliminar tablas si existen (para recrear)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS alert_comments CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS alert_history CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS cameras CASCADE;
DROP TABLE IF EXISTS zones CASCADE;
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS alert_categories CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;

-- =============================================
-- TABLA: roles
-- Descripción: Roles del sistema (Admin, Supervisor, Vigilante)
-- =============================================
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    can_manage_users BOOLEAN DEFAULT FALSE,
    can_manage_cameras BOOLEAN DEFAULT FALSE,
    can_view_alerts BOOLEAN DEFAULT TRUE,
    can_confirm_alerts BOOLEAN DEFAULT FALSE,
    can_generate_reports BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: users
-- Descripción: Usuarios del sistema
-- =============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: user_permissions
-- Descripción: Permisos específicos por usuario (opcional)
-- =============================================
CREATE TABLE user_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    permission_name VARCHAR(100) NOT NULL,
    granted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: zones
-- Descripción: Zonas de la galería (Entrada, Piso 1, Piso 2, etc.)
-- =============================================
CREATE TABLE zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    floor INTEGER,
    is_critical BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: cameras
-- Descripción: Cámaras IP instaladas
-- =============================================
CREATE TABLE cameras (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) UNIQUE NOT NULL,
    rtsp_url VARCHAR(255),
    zone_id INTEGER REFERENCES zones(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, maintenance
    model VARCHAR(100),
    resolution VARCHAR(20),
    fps INTEGER DEFAULT 30,
    last_ping TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: alert_categories
-- Descripción: Categorías de alertas (robo, merodeo, aglomeración)
-- =============================================
CREATE TABLE alert_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    color_hex VARCHAR(7) DEFAULT '#FFA500',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: alerts
-- Descripción: Alertas detectadas por el modelo IA
-- =============================================
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    camera_id INTEGER REFERENCES cameras(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES alert_categories(id) ON DELETE SET NULL,
    confidence DECIMAL(5,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, discarded, investigating
    image_path VARCHAR(255),
    video_clip_path VARCHAR(255),
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: alert_history
-- Descripción: Historial de cambios de estado de alertas
-- =============================================
CREATE TABLE alert_history (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER REFERENCES alerts(id) ON DELETE CASCADE,
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    change_reason TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: alert_comments
-- Descripción: Comentarios sobre alertas
-- =============================================
CREATE TABLE alert_comments (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER REFERENCES alerts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: incidents
-- Descripción: Incidentes confirmados derivados de alertas
-- =============================================
CREATE TABLE incidents (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER REFERENCES alerts(id) ON DELETE SET NULL,
    incident_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium',
    description TEXT,
    reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: audit_logs
-- Descripción: Trazabilidad de acciones del sistema
-- =============================================
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: system_settings
-- Descripción: Configuraciones del sistema
-- =============================================
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =============================================
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_cameras_zone ON cameras(zone_id);
CREATE INDEX idx_cameras_status ON cameras(status);
CREATE INDEX idx_alerts_camera ON alerts(camera_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_detected ON alerts(detected_at);
CREATE INDEX idx_alert_history_alert ON alert_history(alert_id);
CREATE INDEX idx_incidents_alert ON incidents(alert_id);
CREATE INDEX idx_incidents_resolved ON incidents(resolved);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- =============================================
-- DATOS INICIALES: ROLES
-- =============================================
INSERT INTO roles (name, description, can_manage_users, can_manage_cameras, can_view_alerts, can_confirm_alerts, can_generate_reports) VALUES
('SuperAdmin', 'Administrador del sistema con acceso total', TRUE, TRUE, TRUE, TRUE, TRUE),
('Admin', 'Administrador de galería', FALSE, TRUE, TRUE, TRUE, TRUE),
('Supervisor', 'Supervisor de seguridad', FALSE, FALSE, TRUE, TRUE, TRUE),
('Operator', 'Operador de monitoreo', FALSE, FALSE, TRUE, TRUE, FALSE),
('Viewer', 'Visor de alertas', FALSE, FALSE, TRUE, FALSE, FALSE);

-- =============================================
-- DATOS INICIALES: ZONAS
-- =============================================
INSERT INTO zones (name, description, floor, is_critical) VALUES
('Entrada Principal', 'Acceso principal a la galería', 1, TRUE),
('Pasillo Piso 1', 'Pasillo central del primer piso', 1, FALSE),
('Pasillo Piso 2', 'Pasillo central del segundo piso', 2, FALSE),
('Zona Comercial A', 'Tiendas de tecnología', 1, TRUE),
('Zona Comercial B', 'Tiendas de papelería', 1, FALSE),
('Salida de Emergencia', 'Salida trasera', 1, TRUE),
('Estacionamiento', 'Zona de estacionamiento', 0, FALSE);

-- =============================================
-- DATOS INICIALES: CATEGORÍAS DE ALERTAS
-- =============================================
INSERT INTO alert_categories (name, description, severity, color_hex) VALUES
('Robo', 'Detección de robo en proceso', 'critical', '#FF0000'),
('Merodeo', 'Persona merodeando de manera sospechosa', 'high', '#FF8C00'),
('Aglomeración', 'Aglomeración inusual de personas', 'medium', '#FFA500'),
('Objeto Abandonado', 'Objeto dejado sin supervisión', 'high', '#FFD700'),
('Acceso No Autorizado', 'Intento de acceso a zona restringida', 'critical', '#DC143C'),
('Caída', 'Persona caída o necesitando asistencia', 'high', '#FF6347');

-- =============================================
-- DATOS INICIALES: USUARIOS DE PRUEBA
-- =============================================
INSERT INTO users (username, email, password_hash, full_name, role_id, is_active) VALUES
('admin', 'admin@vigiliacc.com', '$2a$10$example_hash', 'Administrador Principal', 1, TRUE),
('supervisor1', 'supervisor@vigiliacc.com', '$2a$10$example_hash', 'Carlos Méndez', 3, TRUE),
('vigilante1', 'vigilante1@vigiliacc.com', '$2a$10$example_hash', 'Juan Pérez', 4, TRUE),
('vigilante2', 'vigilante2@vigiliacc.com', '$2a$10$example_hash', 'María González', 4, TRUE);

-- =============================================
-- DATOS INICIALES: CÁMARAS
-- =============================================
INSERT INTO cameras (name, ip_address, rtsp_url, zone_id, status, model, resolution, fps) VALUES
('CAM-01-ENTRADA', '192.168.1.101', 'rtsp://192.168.1.101:554/stream', 1, 'active', 'Hikvision DS-2CD2043G0-I', '1080p', 30),
('CAM-02-PASILLO-P1', '192.168.1.102', 'rtsp://192.168.1.102:554/stream', 2, 'active', 'Hikvision DS-2CD2043G0-I', '1080p', 30),
('CAM-03-COMERCIAL-A', '192.168.1.103', 'rtsp://192.168.1.103:554/stream', 4, 'active', 'Hikvision DS-2CD2043G0-I', '1080p', 30),
('CAM-04-SALIDA', '192.168.1.104', 'rtsp://192.168.1.104:554/stream', 6, 'active', 'Hikvision DS-2CD2043G0-I', '1080p', 30);

-- =============================================
-- DATOS INICIALES: CONFIGURACIÓN DEL SISTEMA
-- =============================================
INSERT INTO system_settings (key, value, description) VALUES
('model_confidence_threshold', '0.75', 'Umbral mínimo de confianza para alertas'),
('alert_retention_days', '90', 'Días de retención de alertas'),
('max_concurrent_streams', '8', 'Número máximo de streams simultáneos'),
('notification_email', 'alertas@vigiliacc.com', 'Email para notificaciones'),
('system_timezone', 'America/Lima', 'Zona horaria del sistema');

-- =============================================
-- COMENTARIOS EN TABLAS
-- =============================================
COMMENT ON TABLE roles IS 'Roles del sistema con permisos asociados';
COMMENT ON TABLE users IS 'Usuarios del sistema de vigilancia';
COMMENT ON TABLE zones IS 'Zonas físicas de la galería comercial';
COMMENT ON TABLE cameras IS 'Cámaras IP instaladas en el sistema';
COMMENT ON TABLE alerts IS 'Alertas detectadas por el modelo de IA';
COMMENT ON TABLE alert_history IS 'Historial de cambios de estado de alertas';
COMMENT ON TABLE incidents IS 'Incidentes confirmados y su resolución';
COMMENT ON TABLE audit_logs IS 'Registro de auditoría de acciones del sistema';
COMMENT ON TABLE system_settings

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_token ON password_reset_tokens(token);

-- =============================================
-- FIN DEL SCHEMA
-- =============================================