import { useState } from "react";

type AuthMode = "login" | "register";

type AuthModalProps = {
  loading: boolean;
  message: string;
  onClose: () => void;
  onClearMessage: () => void;
  onSubmit: (
    mode: AuthMode,
    username: string,
    email: string,
    password: string
  ) => void | Promise<void>;
};

function AuthModal({
  loading,
  message,
  onClearMessage,
  onClose,
  onSubmit,
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = () => {
    void onSubmit(mode, username, email, password);
  };

  return (
    <div className="auth-shell" role="dialog" aria-modal="true">
      <button className="auth-backdrop" onClick={onClose} type="button" />
      <section className="auth-card">
        <button
          aria-label="Zamknij"
          className="auth-close"
          onClick={onClose}
          type="button"
        >
          x
        </button>
        <span className="auth-eyebrow">Profil uzytkownika</span>
        <h2>{mode === "login" ? "Zaloguj sie" : "Utworz konto"}</h2>
        <p>
          Konto dziala na Vercel i telefonie z QR. Gdy publiczny backend nie jest
          ustawiony, profil zapisuje sie lokalnie w tej przegladarce.
        </p>

        <div className="auth-tabs">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              onClearMessage();
            }}
            type="button"
          >
            Logowanie
          </button>
          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              onClearMessage();
            }}
            type="button"
          >
            Rejestracja
          </button>
        </div>

        {mode === "register" && (
          <label>
            Nazwa uzytkownika
            <input
              autoComplete="name"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="np. Kamila"
              value={username}
            />
          </label>
        )}
        <label>
          Email
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="twoj@email.pl"
            type="email"
            value={email}
          />
        </label>
        <label>
          Haslo
          <input
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimum 4 znaki"
            type="password"
            value={password}
          />
        </label>

        {message && <strong className="auth-message">{message}</strong>}

        <button
          className="auth-primary"
          disabled={loading}
          onClick={submit}
          type="button"
        >
          {loading
            ? "Logowanie..."
            : mode === "login"
              ? "Zaloguj"
              : "Zarejestruj"}
        </button>
      </section>
    </div>
  );
}

export default AuthModal;


