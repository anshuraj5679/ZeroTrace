import { OrderForm } from "@/components/OrderForm";
import { OrderTable } from "@/components/OrderTable";
import { StatsBar } from "@/components/StatsBar";
import { TradeFeed } from "@/components/TradeFeed";

export default function TradePage() {
  return (
    <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.92fr,1.08fr]">
      <div>
        <OrderForm />
      </div>

      <div className="grid gap-6">
        <StatsBar />
        <OrderTable />
        <TradeFeed />
      </div>
    </div>
  );
}

