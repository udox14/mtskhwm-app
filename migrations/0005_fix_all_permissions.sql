-- Grant access to both new and old role slugs for Monitoring Penugasan
INSERT OR IGNORE INTO role_features (role, feature_id) VALUES 
('super_admin', 'monitoring-penugasan'),
('admin', 'monitoring-penugasan'),
('admin_tu', 'monitoring-penugasan'),
('tu', 'monitoring-penugasan'),
('kepsek', 'monitoring-penugasan'),
('kepala_sekolah', 'monitoring-penugasan'),
('wakamad', 'monitoring-penugasan');

-- Grant access to both new and old role slugs for Penugasan
INSERT OR IGNORE INTO role_features (role, feature_id) VALUES 
('super_admin', 'penugasan'),
('admin', 'penugasan'),
('admin_tu', 'penugasan'),
('tu', 'penugasan'),
('kepsek', 'penugasan'),
('kepala_sekolah', 'penugasan'),
('wakamad', 'penugasan'),
('guru', 'penugasan'),
('wali_kelas', 'penugasan'),
('guru_bk', 'penugasan'),
('guru_piket', 'penugasan'),
('guru_ppl', 'penugasan');
