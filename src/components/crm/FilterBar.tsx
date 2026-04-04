import { Search } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useRef, useEffect } from "react";

interface FilterBarProps {
  value: string;
  onChange: (value: string) => void;
}

const FilterBar = ({ value, onChange }: FilterBarProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMultiLine = value.includes('\n');

  // Auto-ajustar altura
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 150);
      textareaRef.current.style.height = `${Math.max(38, newHeight)}px`;
    }
  }, [value]);

  return (
    <div className="relative min-w-[300px] max-w-md">
      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
      <Textarea
        ref={textareaRef}
        placeholder={isMultiLine 
          ? "Cole os números aqui (um por linha)..." 
          : "Buscar por telefone, empresa ou dono... (Cole múltiplos números)"
        }
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 min-h-[38px] max-h-[150px] resize-none overflow-y-auto"
        rows={1}
      />
    </div>
  );
};

export default FilterBar;
