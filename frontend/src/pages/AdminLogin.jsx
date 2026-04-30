import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiErrorDetail, LOGO_URL } from "@/lib/api";
import { Lock, Mail, LogIn } from "lucide-react";
import { toast } from "sonner";

export default function AdminLogin() {
  const { user, checking, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (checking) return <div className="container-page py-24 text-muted-foreground">A verificar sessão…</div>;
  if (user) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      toast.success("Sessão iniciada.");
      navigate("/admin");
    } catch (err) {
      const msg = formatApiErrorDetail(err?.response?.data?.detail) || "Não foi possível entrar.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-14" data-testid="admin-login-page">
      <div className="w-full max-w-md px-6">
        <div className="bg-white border border-border rounded-2xl p-10 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <img src={LOGO_URL} alt="EPFF-INTEP" className="h-12 w-12 rounded-lg object-contain bg-[#1f3a4a] p-1" />
            <div>
              <div className="font-heading text-2xl text-primary">Painel de Administração</div>
              <div className="text-xs uppercase tracking-[0.22em] font-subheading text-muted-foreground">
                EPFF-INTEP
              </div>
            </div>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.18em] font-subheading text-muted-foreground">
                Email
              </span>
              <div className="mt-2 relative">
                <Mail
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="admin-email-input"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-white focus:outline-none focus:border-primary"
                  placeholder="admin@epff-intep.pt"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.18em] font-subheading text-muted-foreground">
                Palavra-passe
              </span>
              <div className="mt-2 relative">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="admin-password-input"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-white focus:outline-none focus:border-primary"
                  placeholder="••••••••"
                />
              </div>
            </label>
            {error && (
              <div className="text-sm text-destructive" data-testid="admin-login-error">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              data-testid="admin-login-submit"
              className="btn-primary w-full disabled:opacity-60"
            >
              {loading ? "A entrar…" : (<>Entrar <LogIn size={16} /></>)}
            </button>
          </form>
          <Link
            to="/"
            className="block text-center mt-6 text-sm font-subheading text-muted-foreground hover:text-primary"
          >
            Voltar ao site
          </Link>
        </div>
      </div>
    </div>
  );
}
