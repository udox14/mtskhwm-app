import sqlite3
import glob

db_files = glob.glob(r'C:\DATA\mtskhwm\.wrangler\state\v3\d1\**\*.sqlite', recursive=True)

for db_path in db_files:
    print(f"Patching {db_path}...")
    try:
        db = sqlite3.connect(db_path)
        
        db.execute("""
        CREATE TABLE IF NOT EXISTS role_features (
          role        TEXT NOT NULL,
          feature_id  TEXT NOT NULL,
          PRIMARY KEY (role, feature_id)
        )
        """)

        db.execute("INSERT OR IGNORE INTO role_features (role, feature_id) VALUES ('super_admin', 'sarpras'), ('admin_tu', 'sarpras')")

        db.execute("""
          CREATE TABLE IF NOT EXISTS sarpras_kategori (
            id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            nama        TEXT NOT NULL UNIQUE,
            created_at  TEXT NOT NULL DEFAULT (datetime('now'))
          )
        """)

        db.execute("""
          CREATE TABLE IF NOT EXISTS sarpras_aset (
            id                 TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            tanggal_pembukuan  TEXT NOT NULL,
            kategori_id        TEXT NOT NULL REFERENCES sarpras_kategori(id),
            nama_barang        TEXT NOT NULL,
            merek              TEXT,
            kuantitas          INTEGER NOT NULL DEFAULT 1,
            tahun_pembuatan    TEXT,
            asal_anggaran      TEXT,
            keadaan_barang     TEXT,
            harga              INTEGER,
            foto_url           TEXT,
            keterangan         TEXT,
            diinput_oleh       TEXT REFERENCES "user"(id),
            created_at         TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
          )
        """)

        db.execute("CREATE INDEX IF NOT EXISTS idx_sarpras_aset_kategori ON sarpras_aset(kategori_id)")
        
        db.commit()
        db.close()
        print("Success for", db_path)
    except Exception as e:
        print("Error on", db_path, ":", e)

print("Done patching all local databases!")
