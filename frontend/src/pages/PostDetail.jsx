import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

export default function PostDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [authorName, setAuthorName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await api.get(`/posts/${slug}`);
        setPost(res.data);
        const c = await api.get(`/posts/${res.data.id}/comments`);
        setComments(c.data);
      } catch (e) {
        if (e?.response?.status === 404) setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const submit = async (e) => {
    e.preventDefault();
    if (!authorName.trim() || !message.trim()) {
      toast.error("Preencha o nome e a mensagem.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/posts/${post.id}/comments`, {
        author_name: authorName.trim(),
        message: message.trim(),
      });
      toast.success("Comentário enviado! Ficará visível após aprovação.");
      setAuthorName("");
      setMessage("");
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="container-page py-24 text-muted-foreground">A carregar…</div>;
  }
  if (notFound || !post) {
    return (
      <div className="container-page py-24" data-testid="post-not-found">
        <h2 className="font-heading text-3xl text-primary mb-4">Artigo não encontrado</h2>
        <Link to="/blog" className="btn-outline">Voltar ao blog</Link>
      </div>
    );
  }

  return (
    <article data-testid="post-detail-page">
      <div className="container-page pt-14 pb-8">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-sm font-subheading text-muted-foreground hover:text-primary transition-colors"
          data-testid="post-back-link"
        >
          <ArrowLeft size={16} /> Voltar ao blog
        </Link>
      </div>

      <header className="container-page grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">
        <div className="md:col-span-8 md:col-start-3 text-center">
          <div className="text-[11px] uppercase tracking-[0.22em] font-subheading text-brand-orange mb-5">
            {post.turma_name}
          </div>
          <h1 className="font-heading text-4xl md:text-6xl font-medium text-primary leading-[1.08] tracking-tight mb-6">
            {post.title}
          </h1>
          <div className="text-sm text-muted-foreground font-subheading">
            Por {post.author} ·{" "}
            {post.date && format(new Date(post.date), "d 'de' MMMM yyyy", { locale: pt })}
          </div>
        </div>
      </header>

      {post.image && (
        <div className="container-page mb-16">
          <div className="rounded-2xl overflow-hidden aspect-[16/9]">
            <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      <div className="container-page grid grid-cols-1 md:grid-cols-12 pb-16">
        <div className="md:col-span-8 md:col-start-3 prose-content">
          <p className="text-2xl md:text-3xl font-heading italic text-primary border-l-4 border-brand-green pl-6 mb-10">
            {post.excerpt}
          </p>
          {post.content.split("\n").filter(Boolean).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </div>

      {/* COMMENTS */}
      <section className="bg-muted/60 py-20">
        <div className="container-page max-w-3xl">
          <div className="flex items-center gap-3 mb-8">
            <MessageCircle className="text-brand-green" size={22} />
            <h3 className="font-heading text-3xl font-medium text-primary">
              Comentários ({comments.length})
            </h3>
          </div>

          <form onSubmit={submit} className="space-y-4 mb-12" data-testid="comment-form">
            <input
              type="text"
              placeholder="O seu nome"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              data-testid="comment-author-input"
              maxLength={60}
              className="w-full px-5 py-3 rounded-xl border border-border bg-white focus:outline-none focus:border-primary font-body"
            />
            <textarea
              placeholder="Partilhe a sua mensagem de apoio…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              data-testid="comment-message-input"
              rows={4}
              maxLength={1000}
              className="w-full px-5 py-3 rounded-xl border border-border bg-white focus:outline-none focus:border-primary font-body resize-none"
            />
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">
                Os comentários são moderados antes de aparecerem no site.
              </span>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary disabled:opacity-60"
                data-testid="comment-submit-button"
              >
                {submitting ? "A enviar…" : (<>Enviar <Send size={16} /></>)}
              </button>
            </div>
          </form>

          {comments.length === 0 ? (
            <div className="text-muted-foreground font-subheading" data-testid="comments-empty">
              Seja o primeiro a comentar este artigo.
            </div>
          ) : (
            <ul className="space-y-6" data-testid="comments-list">
              {comments.map((c) => (
                <li key={c.id} className="p-6 rounded-xl bg-white border border-border">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-9 w-9 rounded-full bg-brand-orange/20 flex items-center justify-center text-brand-orange font-subheading font-semibold">
                      {c.author_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-subheading font-medium text-primary">{c.author_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(c.date), "d MMM yyyy, HH:mm", { locale: pt })}
                      </div>
                    </div>
                  </div>
                  <p className="text-foreground/80 leading-relaxed">{c.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </article>
  );
}
