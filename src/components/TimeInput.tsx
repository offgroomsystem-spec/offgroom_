import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  allowSingleDigitHour?: boolean;
}

export const TimeInput = ({ value, onChange, placeholder = "00:00", className, allowSingleDigitHour = false }: TimeInputProps) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const formatTime = (input: string) => {
    // Remove tudo que não é número
    const numbers = input.replace(/\D/g, '');
    
    if (numbers.length === 0) return '';
    if (numbers.length === 1) return numbers;
    if (numbers.length === 2) return numbers;
    
    // Se allowSingleDigitHour = true e temos 3 dígitos
    // Formato: "130" -> "1:30" (1 hora e 30 minutos)
    if (allowSingleDigitHour && numbers.length === 3) {
      const hours = numbers.slice(0, 1);
      const minutes = numbers.slice(1, 3);
      return `${hours}:${minutes}`;
    }
    
    // Formato padrão com 4 dígitos: "0130" -> "01:30"
    const hours = numbers.slice(0, 2);
    const minutes = numbers.slice(2, 4);
    
    return `${hours}:${minutes}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const formatted = formatTime(input);
    
    setDisplayValue(formatted);
    onChange(formatted);
  };

  return (
    <Input
      type="text"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      maxLength={allowSingleDigitHour ? 4 : 5}
      className={className}
      style={{
        MozAppearance: 'textfield',
        WebkitAppearance: 'none',
      }}
    />
  );
};
