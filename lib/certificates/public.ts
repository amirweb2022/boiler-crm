import { query } from "../db/postgres";

// Uploads use random UUID keys. Only exact, database-referenced keys can be shared.
export function isCertificateFile(file: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(pdf|png|jpe?g)$/i.test(file);
}

export async function certificateExists(file: string): Promise<boolean> {
  if (!isCertificateFile(file)) return false;
  const { rowCount } = await query(
    "SELECT 1 FROM test_records WHERE certificate_path=$1 UNION ALL SELECT 1 FROM certificate_history WHERE certificate_path=$1 LIMIT 1",
    [`certificates/${file}`],
  );
  return Boolean(rowCount);
}
