import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { ArrowLeft, Users } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function TurmaDetail() {
  const { slug } = useParams();
  const [turma, setTurma] = useState(null);
  const [posts, setPosts] = useState([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const t = await api.get(`/turmas/${slug}`);
        setTurma(t.data);
        const p = await api.get(`/posts?turma=${slug}`);
        setPosts(p.data);
      } catch (e) {
        if (e?.response?.status === 404) setNotFound(true);
      }
    })();
  }, [slug]);

  if (notFound) {
    return (
      <div className="container-page py-24">
        <h2 className="font-heading text-3xl text-primary mb-4">Turma não encontrada</h2>
        <Link to="/turmas" className="btn-outline">Ver todas as turmas</Link>
      </div>
    );
  }
  if (!turma) return <div className="container-page py-24 text-muted-foreground">A carregar…</div>;

  return (
    <div data-testid="turma-detail-page">
      <div className="container-page pt-14 pb-6">
        <Link
          to="/turmas"
          className="inline-flex items-center gap-2 text-sm font-subheading text-muted-foreground hover:text-primary transition-colors"
          data-testid="turma-back-link"
        >
          <ArrowLeft size={16} /> Todas as turmas
        </Link>
      </div>

      <section className="container-page grid grid-cols-1 md:grid-cols-12 gap-10 pb-16">
        <div className="md:col-span-7 order-2 md:order-1">
          <div className="eyebrow mb-4">{turma.year}</div>
          <h1 className="font-heading text-5xl md:text-6xl font-medium text-primary tracking-tight leading-[1.05] mb-6">
            {turma.name}
          </h1>
          <p className="text-lg text-foreground/80 leading-relaxed mb-8">{turma.description}</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm font-subheading text-muted-foreground">
              <Users size={16} className="text-brand-green" /> {turma.members_count} alunos
            </div>
            <div className="text-sm font-subheading text-muted-foreground">{turma.course}</div>
          </div>
        </div>
        <div className="md:col-span-5 order-1 md:order-2">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden">
            <img
              src={turma.image}
              alt={turma.name}
              style={{ objectPosition: turma.image_position || "center" }}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="bg-muted/60 py-20">
        <div className="container-page">
          <h2 className="font-heading text-3xl md:text-4xl font-medium text-primary mb-10">
            Artigos desta turma
          </h2>
          {posts.length === 0 ? (
            <div className="text-muted-foreground font-subheading" data-testid="turma-posts-empty">
              Esta turma ainda não tem artigos publicados.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((p) => (
                <Link
                  to={`/blog/${p.slug}`}
                  key={p.id}
                  data-testid={`turma-post-${p.slug}`}
                  className="group flex flex-col gap-4"
                >
                  <div className="overflow-hidden rounded-xl aspect-[4/3]">
                    <img
                      src={p.image}
                      alt={p.title}
                      style={{ objectPosition: p.image_position || "center" }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-subheading mb-2">
                      {p.date && format(new Date(p.date), "d MMM yyyy", { locale: pt })}
                    </div>
                    <h4 className="font-heading text-xl font-medium text-primary group-hover:text-brand-orange transition-colors leading-snug">
                      {p.title}
                    </h4>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
