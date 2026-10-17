import { ExternalLink, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { certificateExists } from "../../../lib/certificates/public";

export const dynamic = "force-dynamic";
export const metadata = { title: "مشاهده گواهی", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function CertificatePage({ params }: { params: { file: string } }) {
  if (!await certificateExists(params.file)) notFound();
  const source = `/api/certificates/certificates/${encodeURIComponent(params.file)}`;
  return <main dir="rtl" className="min-h-screen bg-background p-4 text-foreground sm:p-6">
    <header className="mx-auto mb-4 flex max-w-5xl items-center justify-between rounded-2xl border bg-card px-4 py-3 shadow-sm sm:px-5">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="size-5" /></span><div><h1 className="text-base font-bold sm:text-lg">مشاهده گواهی</h1><p className="hidden text-xs text-muted-foreground sm:block">دسترسی به سند بازرسی</p></div></div>
      <a href={source} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-sm font-semibold text-foreground transition hover:bg-accent"><ExternalLink className="size-4" /><span className="hidden sm:inline">باز کردن فایل</span></a>
    </header>
    <iframe title="گواهی PDF" src={source} className="mx-auto h-[calc(100vh-7rem)] min-h-[32rem] w-full max-w-5xl rounded-2xl border bg-white shadow-lg" />
  </main>;
}
