import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ArrowRight, Sparkles, Users, HeartHandshake } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const HERO_IMG =
  "https://images.unsplash.com/photo-1758599667729-a6f0f8bd213b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzV8MHwxfHNlYXJjaHwzfHx2b2x1bnRlZXJpbmclMjBzdHVkZW50cyUyMGNvbW11bml0eXxlbnwwfHx8fDE3Nzc1NTIyMzV8MA&ixlib=rb-4.1.0&q=85";

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [stats, setStats] = useState({ turmas: 0, posts: 0, comments: 0 });

  useEffect(() => {
    (async () => {
      try {
        const [postsRes, turmasRes, statsRes] = await Promise.all([
          api.get("/posts?limit=6"),
          api.get("/turmas"),
          api.get("/stats"),
        ]);
        setPosts(postsRes.data);
        setTurmas(turmasRes.data);
        setStats(statsRes.data);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const featured = posts.find((p) => p.featured) || posts[0];
  const rest = posts.filter((p) => p.id !== featured?.id).slice(0, 4);

  return (
    <div data-testid="home-page">
      {/* HERO */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground hero-grain">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url(${HERO_IMG})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary/60" />
        <div className="relative container-page py-24 md:py-36 grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-8 animate-fade-up">
            <div className="eyebrow text-brand-orange mb-6">EPFF-INTEP · Figueira da Foz</div>
            <h1 className="font-heading text-5xl md:text-7xl leading-[1.02] font-medium tracking-tight mb-8">
              Voluntariado <span className="italic text-brand-green">que</span> <br />
              transforma <span className="italic text-brand-orange">comunidades</span>.
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl leading-relaxed mb-10">
              Histórias, projetos e testemunhos das nossas turmas que põem as mãos à obra por
              causas sociais, ambientais e solidárias na Figueira da Foz.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/blog" className="btn-accent" data-testid="hero-cta-blog">
                Ler o blog <ArrowRight size={18} />
              </Link>
              <Link
                to="/turmas"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full border border-white/30 font-subheading hover:bg-white/10 transition-colors"
                data-testid="hero-cta-turmas"
              >
                Conhecer as turmas
              </Link>
            </div>
          </div>

          <div className="md:col-span-4 grid grid-cols-3 md:grid-cols-1 gap-6 self-end">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
              <Users className="text-brand-green mb-2" size={22} />
              <div className="font-heading text-4xl font-medium">{stats.turmas}</div>
              <div className="text-[11px] uppercase tracking-[0.22em] font-subheading text-white/60">Turmas</div>
            </div>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
              <Sparkles className="text-brand-orange mb-2" size={22} />
              <div className="font-heading text-4xl font-medium">{stats.posts}</div>
              <div className="text-[11px] uppercase tracking-[0.22em] font-subheading text-white/60">Artigos</div>
            </div>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
              <HeartHandshake className="text-brand-green mb-2" size={22} />
              <div className="font-heading text-4xl font-medium">{stats.comments}</div>
              <div className="text-[11px] uppercase tracking-[0.22em] font-subheading text-white/60">Partilhas</div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED + RECENT */}
      <section className="container-page py-24 md:py-32">
        <div className="flex items-end justify-between mb-12 gap-6">
          <div>
            <div className="eyebrow mb-3">Últimas histórias</div>
            <h2 className="font-heading text-4xl md:text-5xl font-medium text-primary tracking-tight">
              Em destaque
            </h2>
          </div>
          <Link to="/blog" className="hidden md:inline-flex items-center gap-2 text-sm font-subheading text-primary hover:text-brand-orange transition-colors" data-testid="home-see-all-posts">
            Ver todos os artigos <ArrowRight size={16} />
          </Link>
        </div>

        {featured && (
          <Link
            to={`/blog/${featured.slug}`}
            data-testid="featured-post-link"
            className="group grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 mb-16"
          >
            <div className="md:col-span-7 relative overflow-hidden rounded-2xl aspect-[4/3] md:aspect-[5/4]">
              <img
                src={featured.image}
                alt={featured.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            </div>
            <div className="md:col-span-5 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] uppercase tracking-[0.22em] font-subheading bg-brand-orange/15 text-brand-orange px-3 py-1 rounded-full">
                  Em destaque
                </span>
                <span className="text-xs text-muted-foreground font-subheading">
                  {featured.turma_name}
                </span>
              </div>
              <h3 className="font-heading text-3xl md:text-4xl font-medium text-primary mb-4 group-hover:text-brand-orange transition-colors">
                {featured.title}
              </h3>
              <p className="text-foreground/75 leading-relaxed mb-5">{featured.excerpt}</p>
              <div className="text-xs text-muted-foreground font-subheading uppercase tracking-widest">
                {featured.date &&
                  format(new Date(featured.date), "d 'de' MMMM yyyy", { locale: pt })}{" "}
                · {featured.author}
              </div>
            </div>
          </Link>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {rest.map((p) => (
            <Link
              to={`/blog/${p.slug}`}
              key={p.id}
              data-testid={`home-post-card-${p.slug}`}
              className="group flex flex-col gap-4"
            >
              <div className="overflow-hidden rounded-xl aspect-[4/3]">
                <img
                  src={p.image}
                  alt={p.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] font-subheading text-brand-green mb-2">
                  {p.turma_name}
                </div>
                <h4 className="font-heading text-xl font-medium text-primary group-hover:text-brand-orange transition-colors leading-snug">
                  {p.title}
                </h4>
                <div className="text-xs text-muted-foreground font-subheading mt-3">
                  {p.date && format(new Date(p.date), "d MMM yyyy", { locale: pt })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* TURMAS STRIP */}
      <section className="bg-muted/60 py-24">
        <div className="container-page">
          <div className="mb-12">
            <div className="eyebrow mb-3">As nossas turmas</div>
            <h2 className="font-heading text-4xl md:text-5xl font-medium text-primary max-w-2xl">
              Cinco turmas, <span className="italic text-brand-green">uma</span> missão comum.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {turmas.slice(0, 3).map((t) => (
              <Link
                to={`/turmas/${t.slug}`}
                key={t.id}
                data-testid={`home-turma-card-${t.slug}`}
                className="group relative overflow-hidden rounded-2xl bg-white border border-border hover:shadow-xl transition-all"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={t.image}
                    alt={t.name}
                    style={{ objectPosition: t.image_position || "center" }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="p-6">
                  <div className="text-[11px] uppercase tracking-[0.22em] font-subheading text-brand-orange mb-2">
                    {t.year}
                  </div>
                  <h3 className="font-heading text-2xl font-medium text-primary group-hover:text-brand-orange transition-colors mb-2">
                    {t.name}
                  </h3>
                  <p className="text-sm text-foreground/70 line-clamp-2">{t.description}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Link to="/turmas" className="btn-outline" data-testid="home-all-turmas">
              Ver todas as turmas <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
