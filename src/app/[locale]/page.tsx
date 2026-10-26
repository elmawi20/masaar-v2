import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  return <HomePageContent params={params} />;
}

async function HomePageContent({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeClient />;
}

function HomeClient() {
  const t = useTranslations("common");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 shadow-sm">
        <h1 className="text-xl font-bold text-[var(--text-main)]">{t("appName")}</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{t("appTagline")}</p>
        <div className="mt-6 flex items-center gap-4">
          <span className="badge-status badge-completed">{t("soon")}</span>
          <span className="text-xs text-[var(--text-muted)]">{t("moduleUnderConstruction")}</span>
        </div>
      </div>
    </main>
  );
}
