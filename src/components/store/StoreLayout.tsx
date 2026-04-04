import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logoOffgroom from "@/assets/logo-offgroom.png";
interface StoreLayoutProps {
  children: React.ReactNode;
}
export const abrirHotmart = () => {
  window.location.href = '/cadastro';
};
export const StoreLayout = ({
  children
}: StoreLayoutProps) => {
  return <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/store" className="flex items-center">
            <img alt="Offgroom" className="h-8" src="/lovable-uploads/a80c99d4-dc35-46ff-a448-fe1e7a34437f.png" />
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
                Entrar
              </Link>
            </Button>
            <Button onClick={abrirHotmart} size="sm" className="bg-primary text-sm text-primary-foreground hover:bg-primary/90">
              Comprar
            </Button>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>;
};