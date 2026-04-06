import sqlite3

db_path = r'C:\DATA\mtskhwm\.wrangler\state\v3\d1\miniflare-D1DatabaseObject\1df56170f2243878bcdeda1b7a59f2e7a4b245bd2e2f3259cbe7009f290b6acf.sqlite'
print(f"Connecting to {db_path}...")
try:
    db = sqlite3.connect(db_path)
    print("Executing role_features insert...")
    db.execute("INSERT OR IGNORE INTO role_features (role, feature_id) VALUES ('super_admin', 'sarpras'), ('admin_tu', 'sarpras')")

    print("Creating sarpras_kategori...")
    db.execute("""
      CREATE TABLE IF NOT EXISTS sarpras_kategori (
        id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        nama        TEXT NOT NULL UNIQUE,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      )
    """)

    print("Creating sarpras_aset...")
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

    print("Creating index...")
    db.execute("CREATE INDEX IF NOT EXISTS idx_sarpras_aset_kategori ON sarpras_aset(kategori_id)")

    db.commit()
    print("Success: Appended sarpras schema and role_features directly into node local memory sqlite!")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
