import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CompareBucket from "@/components/college/CompareBucket";
import AuthModal from "@/components/auth/AuthModal";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] dark:bg-slate-950">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
      <CompareBucket />
      <AuthModal />
    </div>
  );
}
