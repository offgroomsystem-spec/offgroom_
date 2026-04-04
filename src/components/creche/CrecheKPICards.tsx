import { Card, CardContent } from "@/components/ui/card";
import { Dog, Hotel, LogIn, LogOut } from "lucide-react";

interface CrecheKPICardsProps {
  crecheHoje: number;
  hospedadosAtivos: number;
  checkinHoje: number;
  checkoutHoje: number;
}

const CrecheKPICards = ({ crecheHoje, hospedadosAtivos, checkinHoje, checkoutHoje }: CrecheKPICardsProps) => {
  const cards = [
    { label: "Creche Hoje", value: crecheHoje, icon: Dog, color: "text-blue-500" },
    { label: "Hospedados", value: hospedadosAtivos, icon: Hotel, color: "text-purple-500" },
    { label: "Check-ins Hoje", value: checkinHoje, icon: LogIn, color: "text-green-500" },
    { label: "Check-outs Hoje", value: checkoutHoje, icon: LogOut, color: "text-orange-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {cards.map((card) => (
        <Card key={card.label} className="p-0">
          <CardContent className="flex items-center gap-3 p-3">
            <card.icon className={`h-8 w-8 ${card.color} shrink-0`} />
            <div className="min-w-0">
              <p className="text-2xl font-bold leading-none">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{card.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CrecheKPICards;
