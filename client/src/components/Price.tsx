import { cn } from "@/lib/utils";

interface PriceProps {
  amount: number | string | null | undefined;
  className?: string;
}

export default function Price({ amount, className }: PriceProps) {
  const value = amount ? Number(amount) : 0;
  const formatted = (value / 100).toFixed(2);

  return (
    <span className={cn("font-mono", className)}>
      ¥{formatted}
    </span>
  );
}
