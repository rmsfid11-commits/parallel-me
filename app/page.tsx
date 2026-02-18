import CosmicCanvas from "@/components/CosmicCanvas";
import LandingContent from "@/components/LandingContent";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <CosmicCanvas />
      <LandingContent />
    </main>
  );
}
