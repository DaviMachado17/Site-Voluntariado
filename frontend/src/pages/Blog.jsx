import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useSearchParams();
  const activeTurma = params.get("turma") || "";

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [postsRes, turmasRes] = await Promise.all([
          api.get(`/posts${activeTurma ? `?turma=${activeTurma}` : ""}`),
          api.get("/turmas"),
        ]);
        setPosts(postsRes.data);
        setTurmas(turmasRes.data);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeTurma]);

  const setFilter = (slug) => {
    if (slug) setParams({ turma: slug });
    else setParams({});
  };

  return (
    <div data-testid="blog-page">
      <section className="container-page py-20 md:py-28">
        <div className="eyebrow mb-4">Blog · Voluntariado & Solidariedade</div>
        <h1 className="font-heading text-5xl md:text-7xl font-medium text-primary tracking-tight max-w-4xl leading-[1.05]">
          Todas as histórias <br />
          <span className="italic text-brand-green">em um só lugar.</span>
        </h1>

        <div className="mt-12 flex flex-wrap gap-3" data-testid="blog-filters">
          <button
            onClick={() => setFilter("")}
            data-testid="blog-filter-all"
            className={`px-5 py-2 rounded-full font-subheading text-sm transition-colors ${
              !activeTurma
                ? "bg-primary text-primary-foreground"
                : "border border-border text-foreground/70 hover:border-primary hover:text-primary"
            }`}
          >
            Todas
          </button>
          {turmas.map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.slug)}
              data-testid={`blog-filter-${t.slug}`}
              className={`px-5 py-2 rounded-full font-subheading text-sm transition-colors ${
                activeTurma === t.slug
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-foreground/70 hover:border-primary hover:text-primary"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </section>

      <section className="container-page pb-24">
        {loading ? (
          <div className="text-muted-foreground">A carregar…</div>
        ) : posts.length === 0 ? (
          <div
            className="text-center py-20 font-subheading text-muted-foreground"
            data-testid="blog-empty"
          >
            Ainda não existem artigos nesta categoria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            {posts.map((p, i) => {
              const isWide = i % 5 === 0;
              return (
                <Link
                  to={`/blog/${p.slug}`}
                  key={p.id}
                  data-testid={`blog-post-${p.slug}`}
                  className={`group flex flex-col gap-5 ${
                    isWide ? "md:col-span-12" : "md:col-span-6 lg:col-span-4"
                  }`}
                >
                  <div
                    className={`overflow-hidden rounded-2xl ${
                      isWide ? "aspect-[21/9]" : "aspect-[4/3]"
                    }`}
                  >
                    <img
                      src={p.image}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-3 text-[11px] uppercase tracking-[0.22em] font-subheading">
                      <span className="text-brand-orange">{p.turma_name}</span>
                      <span className="text-muted-foreground">
                        {p.date && format(new Date(p.date), "d MMM yyyy", { locale: pt })}
                      </span>
                    </div>
                    <h3
                      className={`font-heading font-medium text-primary group-hover:text-brand-orange transition-colors leading-snug ${
                        isWide ? "text-3xl md:text-4xl max-w-3xl" : "text-xl md:text-2xl"
                      }`}
                    >
                      {p.title}
                    </h3>
                    {isWide && (
                      <p className="mt-4 text-foreground/75 max-w-2xl">{p.excerpt}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
