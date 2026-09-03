import "dotenv/config";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { promisify } from "util";

const execAsync = promisify(exec);

const RETENTION_DAYS = 7;
const BACKUP_DIR = path.join(process.cwd(), "backups");

function parseDatabaseUrl(urlStr: string) {
  try {
    const u = new URL(urlStr);
    return {
      host: u.hostname || "localhost",
      port: u.port || "3306",
      user: decodeURIComponent(u.username || "root"),
      password: u.password ? decodeURIComponent(u.password) : "",
      database: u.pathname.replace(/^\//, ""),
    };
  } catch (e) {
    throw new Error(`DATABASE_URL tidak valid: ${e}`);
  }
}

async function cleanOldBackups(dir: string, maxDays: number) {
  if (!fs.existsSync(dir)) return;
  const now = Date.now();
  const maxAgeMs = maxDays * 24 * 60 * 60 * 1000;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.endsWith(".sql.gz") || file.endsWith(".sql")) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        console.log(`[CLEANUP] Menghapus backup usang (> ${maxDays} hari): ${file}`);
      }
    }
  }
}

async function runBackup() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("[ERROR] DATABASE_URL tidak ditemukan di .env");
    process.exit(1);
  }

  const { host, port, user, password, database } = parseDatabaseUrl(dbUrl);
  if (!database) {
    console.error("[ERROR] Nama database tidak ditemukan di DATABASE_URL");
    process.exit(1);
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
  const rawSqlPath = path.join(BACKUP_DIR, `${database}_${timestamp}.sql`);
  const gzPath = `${rawSqlPath}.gz`;

  console.log("==================================================");
  console.log("    JOGJADOELAN PRODUCTION DATABASE BACKUP        ");
  console.log("==================================================");
  console.log(`Host     : ${host}:${port}`);
  console.log(`Database : ${database}`);
  console.log(`User     : ${user}`);
  console.log(`Target   : ${gzPath}`);
  console.log("--------------------------------------------------");

  // Buat dump menggunakan mysqldump non-locking (--single-transaction)
  const pwdArg = password ? `-p"${password}"` : "";
  const dumpCmd = `mysqldump -h ${host} -P ${port} -u ${user} ${pwdArg} --single-transaction --quick --routines --triggers --set-gtid-purged=OFF ${database} > "${rawSqlPath}"`;

  try {
    console.log("[1/3] Menjalankan mysqldump non-locking...");
    await execAsync(dumpCmd);

    console.log("[2/3] Mengompresi file dump dengan Gzip...");
    const readStream = fs.createReadStream(rawSqlPath);
    const writeStream = fs.createWriteStream(gzPath);
    const gzip = zlib.createGzip({ level: 9 });

    await new Promise<void>((resolve, reject) => {
      readStream
        .pipe(gzip)
        .pipe(writeStream)
        .on("finish", () => resolve())
        .on("error", (err) => reject(err));
    });

    // Hapus file raw .sql setelah kompresi berhasil
    if (fs.existsSync(rawSqlPath)) {
      fs.unlinkSync(rawSqlPath);
    }

    const stat = fs.statSync(gzPath);
    const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
    console.log(`[3/3] Selesai! Ukuran backup terkompresi: ${sizeMb} MB (${stat.size} bytes)`);

    // Bersihkan backup yang melebihi batas retensi
    await cleanOldBackups(BACKUP_DIR, RETENTION_DAYS);

    console.log("--------------------------------------------------");
    console.log("Backup berhasil disimpan dan siap untuk Disaster Recovery.");
    console.log("Untuk offsite backup, pasang cron sync ke AWS S3 / Cloudflare R2:");
    console.log(`  aws s3 sync "${BACKUP_DIR}" s3://jogjadoelan-backups/ --delete`);
    console.log("==================================================");
  } catch (err: unknown) {
    console.error("[FAILED] Backup gagal:", (err as Error).message || err);
    if (fs.existsSync(rawSqlPath)) fs.unlinkSync(rawSqlPath);
    process.exit(1);
  }
}

runBackup();
