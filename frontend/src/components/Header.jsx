import { Link, NavLink, useNavigate } from "react-router-dom";
import { LOGO_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Menu, X, LogOut } from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/", label: "Início", testId: "nav-link-home" },
  { to: "/blog", label: "Blog", testId: "nav-link-blog" },
  { to: "/turmas", label: "Turmas", testId: "nav-link-turmas" },
  { to: "/sobre", label: "Sobre", testId: "nav-link-sobre" },
];

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header
      data-testid="site-header"
      className="sticky top-0 z-50 bg-background/85 backdrop-blur-xl border-b border-border/60"
    >
      <div className="container-page flex items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-3" data-testid="header-logo-link">
          <img
            src={LOGO_URL}
            alt="EPFF-INTEP"
            className="h-12 w-12 rounded-lg object-contain bg-[#1f3a4a] p-1"
          />
          <div className="leading-tight hidden sm:block">
            <div className="font-heading text-xl font-semibold text-primary">EPFF-INTEP</div>
            <div className="text-[11px] uppercase tracking-[0.22em] font-subheading text-muted-foreground">
              Voluntariado
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              data-testid={item.testId}
              className={({ isActive }) =>
                `font-subheading text-sm transition-colors relative pb-1 ${
                  isActive
                    ? "text-primary after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-[2px] after:bg-brand-orange"
                    : "text-foreground/70 hover:text-primary"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/admin"
                data-testid="nav-link-admin"
                className="hidden md:inline-flex items-center gap-2 font-subheading text-sm text-primary hover:text-brand-orange transition-colors"
              >
                Painel
              </Link>
              <button
                onClick={handleLogout}
                data-testid="header-logout-button"
                className="hidden md:inline-flex items-center gap-2 text-sm font-subheading text-muted-foreground hover:text-destructive transition-colors"
              >
                <LogOut size={16} /> Sair
              </button>
            </>
          ) : (
            <Link
              to="/admin/login"
              data-testid="nav-link-admin-login"
              className="hidden md:inline-flex text-sm font-subheading text-muted-foreground hover:text-primary transition-colors"
            >
              Entrar
            </Link>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden p-2 text-primary"
            aria-label="Menu"
            data-testid="mobile-menu-toggle"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background" data-testid="mobile-menu">
          <div className="container-page py-4 flex flex-col gap-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `font-subheading ${isActive ? "text-primary" : "text-foreground/70"}`
                }
              >
                {item.label}
              </NavLink>
            ))}
            {user ? (
              <>
                <Link to="/admin" onClick={() => setOpen(false)} className="font-subheading text-primary">
                  Painel
                </Link>
                <button onClick={handleLogout} className="text-left font-subheading text-destructive">
                  Sair
                </button>
              </>
            ) : (
              <Link to="/admin/login" onClick={() => setOpen(false)} className="font-subheading text-muted-foreground">
                Entrar (admin)
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
