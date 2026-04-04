import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";

interface KPICardProps {
  titulo: string;
  valor: string | number;
  subtitulo?: string;
  icon?: ReactNode;
  cor?: "default" | "green" | "red" | "yellow";
  periodo?: string;
  destaque?: boolean;
  onClick?: () => void;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const KPICard = ({ titulo, valor, subtitulo, icon, cor = "default", periodo, destaque, onClick }: KPICardProps) => {
  const corClasses = {
    default: "text-foreground",
    green: "text-green-600",
    red: "text-red-600",
    yellow: "text-yellow-600",
  };

  return (
    <Card
      className={`flex flex-col justify-between rounded-2xl shadow-sm border border-gray-200 ${
        destaque ? "border-2 border-primary" : ""
      } ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={onClick}
    >
      {/* HEADER - título colado à borda */}
      <CardHeader className="p-3 pb-1">
        <div className="flex items-start justify-between">
          <div className="flex flex-row items-baseline space-x-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground leading-tight">{titulo}</CardTitle>
            {periodo && <CardDescription className="text-xs text-muted-foreground">{periodo}</CardDescription>}
          </div>
          {icon && <div className="text-muted-foreground text-lg">{icon}</div>}
        </div>
      </CardHeader>

      {/* CONTENT - valor e subtítulo */}
      <CardContent className="p-3 pt-1">
        <div className={`text-2xl font-bold ${corClasses[cor]}`}>
          {typeof valor === "number" ? formatCurrency(valor) : valor}
        </div>
        {subtitulo && <p className="text-xs text-muted-foreground mt-1 leading-snug">{subtitulo}</p>}
      </CardContent>
    </Card>
  );
};
