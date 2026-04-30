import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Users, ArrowRight } from "lucide-react";

export default function Turmas() {
  const [turmas, setTurmas] = useState([]);

  useEffect(() => {
    api.get("/turmas").then((r) => setTurmas(r.data));
  }, []);

  return (
    <div data-testid="turmas-page">
      <section className="container-page py-20 md:py-28">
        <div className="eyebrow mb-4">As nossas turmas</div>
        <h1 className="font-heading text-5xl md:text-7xl font-medium text-primary tracking-tight max-w-4xl leading-[1.05]">
          Gente que faz <span className="italic text-brand-orange">acontecer.</span>
        </h1>
        <p className="mt-6 text-lg text-foreground/70 max-w-2xl">
          Cada turma traz uma identidade própria e um projeto de voluntariado que reflete o seu
          curso. Conheça quem está por trás das histórias.
        </p>
      </section>

      <section className="container-page pb-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {turmas.map((t, i) => (
          <Link
            to={`/turmas/${t.slug}`}
            key={t.id}
            data-testid={`turma-card-${t.slug}`}
            className="group relative overflow-hidden rounded-2xl bg-white border border-border hover:shadow-xl transition-all flex flex-col"
          >
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src={t.image}
                alt={t.name}
                style={{ objectPosition: t.image_position || "center" }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            </div>
            <div className="p-7 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-[0.22em] font-subheading text-brand-orange">
                  Turma 0{i + 1}
                </span>
                <span className="text-[11px] uppercase tracking-[0.22em] font-subheading text-muted-foreground">
                  {t.year}
                </span>
              </div>
              <h3 className="font-heading text-2xl font-medium text-primary group-hover:text-brand-orange transition-colors mb-2">
                {t.name}
              </h3>
              <p className="text-sm text-foreground/70 flex-1 mb-4">{t.description}</p>
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-subheading">
                  <Users size={15} className="text-brand-green" /> {t.members_count} alunos
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-subheading text-primary group-hover:text-brand-orange transition-colors">
                  Ver <ArrowRight size={14} />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
