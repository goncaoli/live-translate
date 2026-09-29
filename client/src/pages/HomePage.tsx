import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="page">
      <h1>Live Translate</h1>
      <p>Legendas em tempo real no telemóvel de cada participante, via QR Code.</p>
      <Link className="button" to="/speak">
        Criar sessão como orador
      </Link>
    </div>
  );
}
