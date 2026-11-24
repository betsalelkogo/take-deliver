import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { Section } from "@/components/LegalPage";
import { APP_NAME } from "@/lib/brand";
import { CONTACT_EMAIL, OPERATOR_NAME } from "@/lib/legal";

export const metadata: Metadata = { title: `תנאי שימוש — ${APP_NAME}` };

export default function TermsPage() {
  return (
    <LegalPage title="תנאי שימוש">
      <Section title="מה השירות">
        <p>
          {APP_NAME} הוא לוח מודעות קהילתי שמאפשר לשכנים לבקש ולהציע עזרה באיסוף חבילות
          ובהעברות. האתר מופעל על ידי {OPERATOR_NAME} וניתן בחינם, כמו שהוא (AS IS).
        </p>
      </Section>

      <Section title="האחריות שלכם">
        <ul className="list-disc space-y-1 ps-5">
          <li>פרסמו רק פרטים נכונים, ורק פרטים שלכם או של מי שהסכים לכך.</li>
          <li>אל תפרסמו תוכן פוגעני, מטעה, פרסומי או לא חוקי, ואל תבקשו להעביר פריטים אסורים.</li>
          <li>אל תנסו לעקוף את מנגנוני האבטחה, להציף את הלוח או לאסוף פרטים של אחרים.</li>
          <li>התיאום, המסירה וההתחשבנות (אם יש) נעשים ישירות ביניכם ובאחריותכם.</li>
        </ul>
      </Section>

      <Section title="האחריות שלנו">
        <p>
          אנחנו מספקים רק את הלוח. איננו צד להעברה, איננו בודקים את המפרסמים או את
          החבילות, ואיננו אחראים לנזק, אובדן, איחור או מחלוקת בין משתמשים, במידה המותרת
          בחוק.
        </p>
      </Section>

      <Section title="הסרת תוכן">
        <p>
          אנחנו רשאים להסיר מודעות או לחסום שימוש שמפר את התנאים האלה. מודעות ישנות נמחקות
          אוטומטית, כמפורט ב<Link href="/privacy">מדיניות הפרטיות</Link>.
        </p>
      </Section>

      <Section title="שינויים ויצירת קשר">
        <p>
          ייתכן שנעדכן את התנאים מעת לעת; הגרסה העדכנית תמיד מופיעה כאן. לשאלות ולדיווח על
          תוכן בעייתי: {CONTACT_EMAIL}.
        </p>
      </Section>
    </LegalPage>
  );
}
