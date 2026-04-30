import { Link } from "react-router-dom";
import { LOGO_URL } from "@/lib/api";
import { Heart, MapPin, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground mt-20" data-testid="site-footer">
      <div className="container-page py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 mb-5">
            <img
              src={LOGO_URL}
              alt="EPFF-INTEP"
              className="h-14 w-14 rounded-lg object-contain bg-white/10 p-1"
            />
            <div>
              <div className="font-heading text-2xl font-semibold">EPFF-INTEP</div>
              <div className="text-[11px] uppercase tracking-[0.22em] font-subheading text-white/70">
                Figueira da Foz
              </div>
            </div>
          </div>
          <p className="text-white/75 max-w-md leading-relaxed">
            Escola de cursos profissionais dedicada a formar jovens com competência
            técnica e consciência social. Este blog documenta o trabalho das nossas
            turmas ao serviço da comunidade.
          </p>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] font-subheading text-brand-orange mb-4">
            Explorar
          </div>
          <ul className="space-y-2 font-subheading text-sm">
            <li><Link to="/" className="hover:text-brand-orange transition-colors">Início</Link></li>
            <li><Link to="/blog" className="hover:text-brand-orange transition-colors">Blog</Link></li>
            <li><Link to="/turmas" className="hover:text-brand-orange transition-colors">Turmas</Link></li>
            <li><Link to="/sobre" className="hover:text-brand-orange transition-colors">Sobre</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] font-subheading text-brand-orange mb-4">
            Contactos
          </div>
          <ul className="space-y-3 text-sm text-white/80">
            <li className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 text-brand-green" /> Figueira da Foz, Portugal</li>
            <li className="flex items-start gap-2"><Mail size={16} className="mt-0.5 text-brand-green" /> geral@epff-intep.pt</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/60 font-subheading">
          <div>© {new Date().getFullYear()} EPFF-INTEP · Todos os direitos reservados.</div>
          <div className="flex items-center gap-1">
            Feito com <Heart size={14} className="text-brand-orange" fill="currentColor" /> pela comunidade escolar
          </div>
        </div>
      </div>
    </footer>
  );
}
