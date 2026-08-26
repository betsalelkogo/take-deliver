import WelcomeBanner from "@/components/WelcomeBanner";
import PackageBoard from "@/components/PackageBoard";

export default function Home() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <WelcomeBanner />
      <PackageBoard />
    </div>
  );
}
