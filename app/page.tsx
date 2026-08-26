import PackageBoard from "@/components/PackageBoard";

export default function Home() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white sm:p-6">
        <h2 className="text-lg font-bold sm:text-xl">צריכים שמישהו יאסוף חבילה?</h2>
        <p className="mt-1 max-w-2xl text-sm text-brand-50">
          פרסמו אותה עם מיקום האיסוף והפרטים. כל מי שבדרך לשם יכול לסמן את עצמו
          כאוסף החבילה ולקחת את כל החבילות שמחכות באותו מקום — בלי עוד הודעות
          &quot;מישהו מגיע ל___?&quot;.
        </p>
      </section>
      <PackageBoard />
    </div>
  );
}
