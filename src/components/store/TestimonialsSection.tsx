import { Quote, Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const testimonials = [
  {
    name: "Maria Silva",
    role: "Proprietária - PetShop Amigo Fiel",
    text: "O Offgroom transformou completamente a gestão do meu petshop. Consigo acompanhar tudo de forma simples e organizada.",
  },
  {
    name: "João Santos",
    role: "Gerente - Banho & Tosa Elite",
    text: "Sistema muito intuitivo e completo. A equipe se adaptou rapidamente e os resultados apareceram logo no primeiro mês.",
  },
  {
    name: "Ana Costa",
    role: "Dona - PetCare Premium",
    text: "Melhor investimento que fiz para o negócio. O suporte é excelente e as funcionalidades atendem perfeitamente nossas necessidades.",
  },
];

export const TestimonialsSection = () => {
  return (
    <section className="bg-card py-16 md:py-24">
      <div className="container max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Quem usa, recomenda
          </h2>
          <p className="text-lg text-muted-foreground">
            Veja o que nossos clientes dizem sobre o Offgroom
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-muted rounded-2xl p-8 border border-border">
              {/* Aspas decorativas */}
              <Quote className="h-8 w-8 text-blue-200 mb-4" />
              
              {/* Texto do depoimento */}
              <p className="text-card-foreground mb-6 leading-relaxed">
                {testimonial.text}
              </p>
              
              {/* Avaliação (estrelas) */}
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              {/* Autor */}
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-blue-100 text-primary font-semibold">
                    {testimonial.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
