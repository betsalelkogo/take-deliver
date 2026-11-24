import type { Metadata } from "next";
import LegalPage, { Section } from "@/components/LegalPage";
import { APP_NAME } from "@/lib/brand";
import { ACCESSIBILITY_CONTACT, CONTACT_EMAIL, LEGAL_UPDATED, OPERATOR_NAME } from "@/lib/legal";

export const metadata: Metadata = { title: `הצהרת נגישות — ${APP_NAME}` };

export default function AccessibilityPage() {
  return (
    <LegalPage title="הצהרת נגישות">
      <Section title="המחויבות שלנו">
        <p>
          {OPERATOR_NAME} רואה חשיבות בכך שכל השכנים, כולל אנשים עם מוגבלות, יוכלו להשתמש
          ב{APP_NAME}. אנו פועלים להתאים את האתר לתקנות שוויון זכויות לאנשים עם מוגבלות
          (התאמות נגישות לשירות), התשע״ג–2013, ולתקן הישראלי ת״י 5568 המבוסס על הנחיות
          WCAG 2.0 ברמה AA.
        </p>
      </Section>

      <Section title="מה עשינו">
        <ul className="list-disc space-y-1 ps-5">
          <li>האתר מוגדר בעברית ובכיוון ימין-לשמאל, כך שקוראי מסך מקריאים אותו נכון.</li>
          <li>קישור &quot;דלג לתוכן הראשי&quot; בראש כל עמוד.</li>
          <li>אפשר לנווט ולהפעיל את כל הפעולות במקלדת, עם סימון פוקוס בולט.</li>
          <li>ניגודיות צבעים גבוהה בין טקסט לרקע, ושדות טופס עם תוויות.</li>
          <li>האתר מכבד את הגדרת המערכת &quot;הפחתת תנועה&quot; ומבטל אנימציות.</li>
          <li>אפשר להגדיל את הטקסט בדפדפן בלי שהתוכן ייחתך.</li>
          <li>האתר מותאם לטלפונים ולמסכים בגדלים שונים.</li>
        </ul>
      </Section>

      <Section title="מגבלות ידועות">
        <p>
          ייתכן שחלקים מסוימים עדיין אינם נגישים במלואם, למשל אנימציות קישוט קצרות או
          אמוג׳ים שמשמשים כסמלים. אנחנו ממשיכים לשפר. אם נתקלתם בבעיה, נשמח לדעת.
        </p>
      </Section>

      <Section title="פנייה בנושא נגישות">
        <p>
          רכז/ת הנגישות: {ACCESSIBILITY_CONTACT}. מייל: {CONTACT_EMAIL}. נשמח לקבל תיאור של
          הבעיה, העמוד שבו נתקלתם בה והדפדפן או הטכנולוגיה המסייעת שבה השתמשתם.
        </p>
      </Section>

      <p className="text-xs text-soft">ההצהרה עודכנה ב{LEGAL_UPDATED}.</p>
    </LegalPage>
  );
}
