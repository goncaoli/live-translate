import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="page">
      <span className="eyebrow">Tradução ao vivo</span>
      <h1>Live Translate</h1>
      <p className="subtitle">
        Cada pessoa lê a tradução no próprio telemóvel, em tempo real, através de um QR Code — sem ecrã partilhado.
      </p>
      <Link className="button" to="/speak">
        Criar sessão <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
