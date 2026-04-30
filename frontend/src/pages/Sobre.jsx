import { HeartHandshake, Sparkles, Users } from "lucide-react";
import { LOGO_URL } from "@/lib/api";

export default function Sobre() {
  return (
    <div data-testid="sobre-page">
      <section className="container-page py-20 md:py-28 grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
        <div className="md:col-span-7">
          <div className="eyebrow mb-4">Sobre o projeto</div>
          <h1 className="font-heading text-5xl md:text-6xl font-medium text-primary tracking-tight leading-[1.05] mb-6">
            Educação que <span className="italic text-brand-green">serve</span> a comunidade.
          </h1>
          <p className="text-lg text-foreground/80 leading-relaxed mb-5">
            A Escola Profissional da Figueira da Foz — INTEP acredita que a formação
            técnica só cumpre o seu propósito quando se traduz em impacto real. Por isso,
            cada turma é desafiada a pegar no que aprende e devolvê-lo à comunidade.
          </p>
          <p className="text-lg text-foreground/80 leading-relaxed">
            Este blog foi criado pelos alunos para reunir, num só lugar, as histórias dos
            projetos de voluntariado e solidariedade que nascem dentro das salas de aula —
            e que fazem diferença fora delas.
          </p>
        </div>
        <div className="md:col-span-5">
          <div className="bg-primary rounded-2xl p-10 text-primary-foreground relative overflow-hidden">
            <img
              src={LOGO_URL}
              alt="EPFF-INTEP"
              className="h-24 w-24 mb-6 rounded-xl object-contain bg-white/5 p-2"
            />
            <div className="font-heading text-3xl font-medium mb-1">EPFF-INTEP</div>
            <div className="text-sm text-white/70 font-subheading uppercase tracking-[0.2em]">
              Figueira da Foz
            </div>
            <p className="mt-6 text-white/80 leading-relaxed">
              Escola de cursos profissionais com tradição na formação de jovens para a
              vida ativa, para o prosseguimento de estudos e para a cidadania.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-muted/60 py-20">
        <div className="container-page grid grid-cols-1 md:grid-cols-3 gap-10">
          <Pillar
            icon={<Users className="text-brand-green" size={26} />}
            title="Turmas envolvidas"
            body="As 4 turmas em destaque neste blog representam cursos distintos mas partilham o mesmo compromisso: pôr o conhecimento técnico ao serviço das pessoas."
          />
          <Pillar
            icon={<HeartHandshake className="text-brand-orange" size={26} />}
            title="Parcerias locais"
            body="Trabalhamos com instituições da Figueira da Foz — lares, associações, escolas, autarquia — para garantir que as ações chegam a quem delas mais precisa."
          />
          <Pillar
            icon={<Sparkles className="text-brand-green" size={26} />}
            title="Aprender a servir"
            body="Cada projeto é também uma oportunidade de aprender. Os alunos documentam, refletem e avaliam cada iniciativa como parte do seu percurso formativo."
          />
        </div>
      </section>
    </div>
  );
}

function Pillar({ icon, title, body }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-8">
      <div className="mb-4">{icon}</div>
      <h3 className="font-heading text-2xl font-medium text-primary mb-3">{title}</h3>
      <p className="text-foreground/75 leading-relaxed">{body}</p>
    </div>
  );
}
