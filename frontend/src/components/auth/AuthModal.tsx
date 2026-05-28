import { useState } from "react";

type AuthMode = "login" | "register";
export type AuthLoginRole = "user" | "caretaker" | "admin";

type AuthModalProps = {
  loading: boolean;
  message: string;
  onClose: () => void;
  onClearMessage: () => void;
  onSubmit: (
    mode: AuthMode,
    username: string,
    email: string,
    password: string,
    loginRole: AuthLoginRole
  ) => void | Promise<void>;
};

const roleOptions: Array<{
  id: AuthLoginRole;
  label: string;
  hint: string;
  email: string;
  password: string;
}> = [
  {
    id: "user",
    label: "Uzytkownik",
    hint: "normalny profil",
    email: "",
    password: "",
  },
  {
    id: "caretaker",
    label: "Opiekun",
    hint: "panel zgloszen",
    email: "opiekun@na-rossie.local",
    password: "opiekun123",
  },
  {
    id: "admin",
    label: "Administrator",
    hint: "pelny dostep",
    email: "admin@na-rossie.local",
    password: "admin123",
  },
];

function AuthModal({
  loading,
  message,
  onClearMessage,
  onClose,
  onSubmit,
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginRole, setLoginRole] = useState<AuthLoginRole>("user");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const activeRole = roleOptions.find((role) => role.id === loginRole) ?? roleOptions[0];
  const title =
    mode === "register"
      ? "Utworz konto"
      : loginRole === "caretaker"
        ? "Logowanie opiekuna"
        : loginRole === "admin"
          ? "Logowanie administratora"
          : "Zaloguj sie";
  const lead =
    mode === "register"
      ? "Utworz zwykle konto uzytkownika. Profil zostanie zapamietany po odswiezeniu strony."
      : loginRole === "user"
        ? "Zaloguj sie jako zwiedzajacy, zeby zapisac ulubione miejsca i historie spacerow."
        : "Ten tryb otwiera panel roboczy dla osob opiekujacych sie Rossa.";

  const submit = () => {
    void onSubmit(mode, username, email, password, loginRole);
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
        <span className="auth-eyebrow">Profil i dostep</span>
        <h2>{title}</h2>
        <p>{lead}</p>

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
              if (loginRole !== "user") {
                setEmail("");
                setPassword("");
              }
              setLoginRole("user");
              onClearMessage();
            }}
            type="button"
          >
            Rejestracja
          </button>
        </div>

        {mode === "login" && (
          <div className="auth-role-switch" aria-label="Tryb logowania">
            {roleOptions.map((role) => (
              <button
                className={loginRole === role.id ? "active" : ""}
                key={role.id}
                onClick={() => {
                  setLoginRole(role.id);
                  if (role.email) {
                    setEmail(role.email);
                    setPassword(role.password);
                  }
                  onClearMessage();
                }}
                type="button"
              >
                <strong>{role.label}</strong>
                <small>{role.hint}</small>
              </button>
            ))}
          </div>
        )}

        {mode === "login" && activeRole.id !== "user" && (
          <div className="auth-demo-note">
            Konto demo: <strong>{activeRole.email}</strong> / {activeRole.password}
          </div>
        )}

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


