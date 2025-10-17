import { useEffect, useState } from "react";
import ReCaptchaCheckbox from "./components/ReCaptchaCheckbox";

const API_USER = import.meta.env.VITE_API_BASE + "/user";
const API_AUTH = import.meta.env.VITE_API_BASE + "/auth";
const AFTER_LOGIN = import.meta.env.VITE_AFTER_LOGIN_URL || "/";

export default function App() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [msg, setMsg] = useState("");

  async function login() {
    if (!identifier || !password) {
      return setMsg("Ingresa apodo/email y contraseña");
    }
    if (!captcha) return setMsg("Por favor marca el reCAPTCHA.");

    setMsg("Enviando…");
    try {
      const res = await fetch(`${API_USER}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password,
          recaptchaToken: captcha, // <-- nombre que espera tu backend
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = AFTER_LOGIN; // temporal: a tu user.html del backend
      } else {
        setMsg(data.message || `Error ${res.status}`);
      }
    } catch (e) {
      setMsg("Error de conexión.");
    } finally {
      setCaptcha(""); // el componente limpia al expirar/recargar
    }
  }

  // Google Sign-In
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const callback = async (response) => {
      try {
        const r = await fetch(`${API_AUTH}/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_token: response.credential }),
        });
        const data = await r.json();
        if (data.ok) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          window.location.href = AFTER_LOGIN;
        } else {
          alert(data.message || "Error con Google");
        }
      } catch {
        alert("Fallo conexión con /api/auth/google");
      }
    };

    const t = setInterval(() => {
      if (window.google && clientId) {
        clearInterval(t);
        window.google.accounts.id.initialize({ client_id: clientId, callback });
        window.google.accounts.id.renderButton(
          document.getElementById("googleBtn"),
          { theme: "outline", size: "large", text: "continue_with" }
        );
      }
    }, 120);

    return () => clearInterval(t);
  }, []);

  return (
    <div className="card" style={{ maxWidth: 420, margin: "40px auto" }}>
      <h2>Iniciar sesión</h2>

      <div className="form-group">
        <label>Apodo o Email</label>
        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="tu apodo o email"
        />
      </div>

      <div className="form-group">
        <label>Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="******"
        />
      </div>

      <div style={{ margin: "10px 0" }}>
        <ReCaptchaCheckbox onChange={setCaptcha} />
      </div>

      <button className="btn primary" onClick={login}>Entrar</button>
      <div className="msg" style={{ marginTop: 8 }}>{msg}</div>

      <div className="divider"><span>o</span></div>

      <div id="googleBtn" style={{ display: "flex", justifyContent: "center" }} />
      <p className="muted" style={{ marginTop: 16 }}>
        ¿No tienes cuenta? <a href="/register.html">Crear cuenta</a>
      </p>
    </div>
  );
}
