export const ClientLogos = () => {
  const clients = [
    "Cliente 1",
    "Cliente 2", 
    "Cliente 3",
    "Cliente 4",
    "Cliente 5",
    "Cliente 6"
  ];

  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <p className="text-center text-sm text-muted-foreground mb-8 uppercase tracking-wider">
          Mais de 500+ pet shops confiam no Offgroom
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center">
          {clients.map((client, index) => (
            <div
              key={index}
              className="flex items-center justify-center p-4 grayscale hover:grayscale-0 transition-all duration-300 opacity-60 hover:opacity-100"
            >
              <div className="text-center font-semibold text-muted-foreground">
                {client}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
