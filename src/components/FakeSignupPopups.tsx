import { useState, useEffect } from "react";
import { Users } from "lucide-react";

const firstNames = [
  "José Carlos", "Fernando", "Ana Paula", "Marcos", "Luciana", "Pedro",
  "Camila", "Rafael", "Juliana", "Thiago", "Beatriz", "Diego",
  "Mariana", "Lucas", "Gabriela", "Bruno", "Letícia", "Vinícius",
  "Larissa", "Gustavo", "Patrícia", "Roberto", "Tatiana", "André",
  "Carla", "Felipe", "Aline", "Renato", "Priscila", "Fábio",
];

const lastNames = [
  "Santos", "Oliveira", "Silva", "Souza", "Pereira", "Costa",
  "Ferreira", "Almeida", "Nascimento", "Lima", "Araújo", "Melo",
  "Barbosa", "Ribeiro", "Martins", "Rocha", "Carvalho", "Gomes",
];

const plans = ["Free", "Bronze", "Prata", "Ouro"];

const cities = [
  "São Paulo, SP", "Rio de Janeiro, RJ", "Belo Horizonte, MG",
  "Salvador, BA", "Curitiba, PR", "Recife, PE", "Manaus, AM",
  "Porto Alegre, RS", "Goiânia, GO", "Fortaleza, CE",
  "Belém, PA", "Brasília, DF", "Campinas, SP", "Florianópolis, SC",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateFakeSignup() {
  return {
    name: `${randomItem(firstNames)} ${randomItem(lastNames)}`,
    plan: randomItem(plans),
    city: randomItem(cities),
    id: Math.random(),
  };
}

const FakeSignupPopups = () => {
  const [popup, setPopup] = useState<ReturnType<typeof generateFakeSignup> | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showPopup = () => {
      const fake = generateFakeSignup();
      setPopup(fake);
      setVisible(true);

      setTimeout(() => setVisible(false), 4000);
    };

    // First popup after 3s
    const initial = setTimeout(showPopup, 3000);
    // Then every 6-12s
    const interval = setInterval(showPopup, 6000 + Math.random() * 6000);

    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, []);

  if (!popup) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 z-50 max-w-xs transition-all duration-500 ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-8 opacity-0 pointer-events-none"
      }`}
    >
      <div className="glass-card rounded-xl p-4 border border-primary/30 shadow-lg flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <Users className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{popup.name}</p>
          <p className="text-xs text-muted-foreground">
            acabou de se cadastrar no plano <span className="text-primary font-semibold">{popup.plan}</span>
          </p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">{popup.city}</p>
        </div>
      </div>
    </div>
  );
};

export default FakeSignupPopups;
