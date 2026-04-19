import { Footer } from "@/components/Footer";

export default function TradeLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 pb-12 pt-24 sm:px-6 lg:px-8">
      {children}
      <Footer />
    </div>
  );
}
