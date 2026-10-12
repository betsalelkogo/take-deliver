import WelcomeBanner from "@/components/WelcomeBanner";
import HomeBoards from "@/components/HomeBoards";

export default function Home() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <WelcomeBanner />
      <HomeBoards />
    </div>
  );
}
