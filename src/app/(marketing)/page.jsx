import AboutSection from "@/app/components/about";
import Footer from "@/app/components/footer";

export const metadata = {
  title: "About | AlgoBuddy",
  description:
    "Learn about AlgoBuddy — the interactive DSA visualization platform built to bridge the gap between theory and practical understanding.",
};

export default function AboutPage() {
  return (
    <>
      <AboutSection />
      <Footer />
    </>
  );
}