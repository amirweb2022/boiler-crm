import { notFound } from "next/navigation";
import { certificateExists } from "../../../lib/certificates/public";

export const dynamic = "force-dynamic";
export const metadata = { title: "مشاهده گواهی", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function CertificatePage({ params }: { params: { file: string } }) {
  if (!await certificateExists(params.file)) notFound();
  const source = `/api/certificates/certificates/${encodeURIComponent(params.file)}`;
  return (
    <main dir="rtl" className="min-h-screen bg-slate-100 p-4 text-slate-900">
      <header className="mx-auto mb-4 flex max-w-5xl items-center justify-between">
        <h1 className="text-xl font-bold">مشاهده گواهی</h1>
        <a href={source} target="_blank" rel="noreferrer" className="text-blue-700 underline">باز کردن فایل</a>
      </header>
      <iframe title="گواهی PDF" src={source} className="mx-auto h-[85vh] w-full max-w-5xl border-0" />
    </main>
  );
}
