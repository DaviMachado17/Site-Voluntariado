import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api, formatApiErrorDetail } from "@/lib/api";
import { Plus, Edit2, Trash2, Check, X, FileText, Users, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const TABS = [
  { key: "posts", label: "Artigos", icon: FileText },
  { key: "turmas", label: "Turmas", icon: Users },
  { key: "comments", label: "Comentários", icon: MessageSquare },
];

export default function AdminDashboard() {
  const { user, checking } = useAuth();
  const [tab, setTab] = useState("posts");

  if (checking) return <div className="container-page py-24 text-muted-foreground">A verificar sessão…</div>;
  if (!user) return <Navigate to="/admin/login" replace />;

  return (
    <div className="container-page py-14" data-testid="admin-dashboard">
      <div className="flex items-center justify-between mb-10">
        <div>
          <div className="eyebrow mb-2">Painel</div>
          <h1 className="font-heading text-4xl md:text-5xl font-medium text-primary">
            Bem-vindo, {user.name}
          </h1>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border mb-10" data-testid="admin-tabs">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              data-testid={`admin-tab-${t.key}`}
              className={`px-5 py-3 font-subheading text-sm inline-flex items-center gap-2 border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? "border-brand-orange text-primary"
                  : "border-transparent text-muted-foreground hover:text-primary"
              }`}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "posts" && <PostsAdmin />}
      {tab === "turmas" && <TurmasAdmin />}
      {tab === "comments" && <CommentsAdmin />}
    </div>
  );
}

/* ----------------------------- POSTS ----------------------------- */
function PostsAdmin() {
  const [posts, setPosts] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const [p, t] = await Promise.all([api.get("/posts"), api.get("/turmas")]);
    setPosts(p.data);
    setTurmas(t.data);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!window.confirm("Apagar este artigo?")) return;
    try {
      await api.delete(`/posts/${id}`);
      toast.success("Artigo apagado.");
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail));
    }
  };

  return (
    <div data-testid="admin-posts">
      <div className="flex justify-end mb-6">
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="btn-primary"
          data-testid="admin-new-post"
        >
          <Plus size={16} /> Novo artigo
        </button>
      </div>

      {showForm && (
        <PostForm
          turmas={turmas}
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 font-subheading">
            <tr>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Turma</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} className="border-t border-border" data-testid={`admin-post-row-${p.slug}`}>
                <td className="px-4 py-3 font-medium text-primary">{p.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.turma_name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {p.date && format(new Date(p.date), "d MMM yyyy", { locale: pt })}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => { setEditing(p); setShowForm(true); }}
                    className="inline-flex items-center gap-1 text-primary hover:text-brand-orange"
                    data-testid={`admin-edit-post-${p.slug}`}
                  >
                    <Edit2 size={14} /> Editar
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="inline-flex items-center gap-1 text-destructive hover:opacity-80"
                    data-testid={`admin-delete-post-${p.slug}`}
                  >
                    <Trash2 size={14} /> Apagar
                  </button>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">Sem artigos.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PostForm({ turmas, initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: initial?.title || "",
    excerpt: initial?.excerpt || "",
    content: initial?.content || "",
    image: initial?.image || "",
    turma_slug: initial?.turma_slug || turmas[0]?.slug || "",
    author: initial?.author || "Redação EPFF-INTEP",
    featured: initial?.featured || false,
  });
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial) await api.put(`/posts/${initial.id}`, form);
      else await api.post("/posts", form);
      toast.success("Artigo guardado.");
      onSaved();
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const update = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  return (
    <form onSubmit={save} className="mb-8 p-6 rounded-xl bg-white border border-border space-y-4" data-testid="post-form">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-2xl text-primary">{initial ? "Editar artigo" : "Novo artigo"}</h3>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-destructive">
          <X size={18} />
        </button>
      </div>
      <Field label="Título"><input required value={form.title} onChange={update("title")} className={inputCls} data-testid="post-title-input" /></Field>
      <Field label="Resumo"><textarea required value={form.excerpt} onChange={update("excerpt")} rows={2} className={inputCls} data-testid="post-excerpt-input" /></Field>
      <Field label="Conteúdo"><textarea required value={form.content} onChange={update("content")} rows={6} className={inputCls} data-testid="post-content-input" /></Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="URL da imagem"><input value={form.image} onChange={update("image")} className={inputCls} data-testid="post-image-input" /></Field>
        <Field label="Autor"><input value={form.author} onChange={update("author")} className={inputCls} data-testid="post-author-input" /></Field>
        <Field label="Turma">
          <select value={form.turma_slug} onChange={update("turma_slug")} className={inputCls} data-testid="post-turma-select">
            {turmas.map((t) => <option key={t.id} value={t.slug}>{t.name}</option>)}
          </select>
        </Field>
        <label className="flex items-center gap-2 mt-7 font-subheading text-sm">
          <input type="checkbox" checked={form.featured} onChange={update("featured")} data-testid="post-featured-checkbox" />
          Destacar na página inicial
        </label>
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} className="btn-outline">Cancelar</button>
        <button type="submit" disabled={saving} className="btn-primary" data-testid="post-save-button">
          {saving ? "A guardar…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

/* ----------------------------- TURMAS ----------------------------- */
function TurmasAdmin() {
  const [turmas, setTurmas] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const r = await api.get("/turmas");
    setTurmas(r.data);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!window.confirm("Apagar esta turma?")) return;
    try {
      await api.delete(`/turmas/${id}`);
      toast.success("Turma apagada.");
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail));
    }
  };

  return (
    <div data-testid="admin-turmas">
      <div className="flex justify-end mb-6">
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary" data-testid="admin-new-turma">
          <Plus size={16} /> Nova turma
        </button>
      </div>
      {showForm && (
        <TurmaForm
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 font-subheading">
            <tr>
              <th className="px-4 py-3">Turma</th>
              <th className="px-4 py-3">Ano</th>
              <th className="px-4 py-3">Alunos</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {turmas.map((t) => (
              <tr key={t.id} className="border-t border-border" data-testid={`admin-turma-row-${t.slug}`}>
                <td className="px-4 py-3 font-medium text-primary">{t.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.year}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.members_count}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => { setEditing(t); setShowForm(true); }}
                    className="inline-flex items-center gap-1 text-primary hover:text-brand-orange"
                    data-testid={`admin-edit-turma-${t.slug}`}
                  >
                    <Edit2 size={14} /> Editar
                  </button>
                  <button
                    onClick={() => remove(t.id)}
                    className="inline-flex items-center gap-1 text-destructive hover:opacity-80"
                    data-testid={`admin-delete-turma-${t.slug}`}
                  >
                    <Trash2 size={14} /> Apagar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TurmaForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    course: initial?.course || "",
    year: initial?.year || "2024/2025",
    description: initial?.description || "",
    members_count: initial?.members_count || 0,
    image: initial?.image || "",
  });
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, members_count: Number(form.members_count) || 0 };
      if (initial) await api.put(`/turmas/${initial.id}`, payload);
      else await api.post("/turmas", payload);
      toast.success("Turma guardada.");
      onSaved();
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={save} className="mb-8 p-6 rounded-xl bg-white border border-border space-y-4" data-testid="turma-form">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-2xl text-primary">{initial ? "Editar turma" : "Nova turma"}</h3>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-destructive">
          <X size={18} />
        </button>
      </div>
      <Field label="Nome"><input required value={form.name} onChange={update("name")} className={inputCls} data-testid="turma-name-input" /></Field>
      <Field label="Curso completo"><input required value={form.course} onChange={update("course")} className={inputCls} data-testid="turma-course-input" /></Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Ano letivo"><input value={form.year} onChange={update("year")} className={inputCls} data-testid="turma-year-input" /></Field>
        <Field label="Nº de alunos"><input type="number" value={form.members_count} onChange={update("members_count")} className={inputCls} data-testid="turma-members-input" /></Field>
      </div>
      <Field label="Descrição"><textarea required value={form.description} onChange={update("description")} rows={3} className={inputCls} data-testid="turma-description-input" /></Field>
      <Field label="URL da imagem"><input value={form.image} onChange={update("image")} className={inputCls} data-testid="turma-image-input" /></Field>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} className="btn-outline">Cancelar</button>
        <button type="submit" disabled={saving} className="btn-primary" data-testid="turma-save-button">
          {saving ? "A guardar…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

/* --------------------------- COMMENTS --------------------------- */
function CommentsAdmin() {
  const [comments, setComments] = useState([]);
  const [filter, setFilter] = useState("pending");

  const load = async () => {
    const url = filter === "all" ? "/admin/comments" : `/admin/comments?approved=${filter === "approved"}`;
    const r = await api.get(url);
    setComments(r.data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const approve = async (id, approved) => {
    try {
      await api.put(`/admin/comments/${id}?approved=${approved}`);
      toast.success(approved ? "Aprovado." : "Rejeitado.");
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail));
    }
  };
  const remove = async (id) => {
    if (!window.confirm("Apagar este comentário?")) return;
    try {
      await api.delete(`/admin/comments/${id}`);
      toast.success("Comentário apagado.");
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail));
    }
  };

  return (
    <div data-testid="admin-comments">
      <div className="flex items-center gap-2 mb-6">
        {[
          { k: "pending", l: "Pendentes" },
          { k: "approved", l: "Aprovados" },
          { k: "all", l: "Todos" },
        ].map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            data-testid={`admin-comments-filter-${f.k}`}
            className={`px-4 py-2 rounded-full text-sm font-subheading transition-colors ${
              filter === f.k
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:text-primary"
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>

      {comments.length === 0 ? (
        <div className="text-muted-foreground font-subheading" data-testid="admin-comments-empty">
          Sem comentários nesta categoria.
        </div>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="p-5 rounded-xl bg-white border border-border" data-testid={`admin-comment-${c.id}`}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="font-subheading font-medium text-primary">{c.author_name}</div>
                  <div className="text-xs text-muted-foreground">
                    em <span className="text-brand-orange">“{c.post_title}”</span> ·{" "}
                    {format(new Date(c.date), "d MMM yyyy, HH:mm", { locale: pt })}
                  </div>
                </div>
                <span
                  className={`text-[10px] uppercase tracking-[0.22em] font-subheading px-3 py-1 rounded-full ${
                    c.approved ? "bg-brand-green/15 text-brand-green" : "bg-brand-orange/15 text-brand-orange"
                  }`}
                >
                  {c.approved ? "Aprovado" : "Pendente"}
                </span>
              </div>
              <p className="text-foreground/80 leading-relaxed">{c.message}</p>
              <div className="flex gap-3 mt-4">
                {!c.approved && (
                  <button
                    onClick={() => approve(c.id, true)}
                    className="inline-flex items-center gap-1 text-sm font-subheading text-brand-green hover:opacity-80"
                    data-testid={`admin-approve-comment-${c.id}`}
                  >
                    <Check size={14} /> Aprovar
                  </button>
                )}
                {c.approved && (
                  <button
                    onClick={() => approve(c.id, false)}
                    className="inline-flex items-center gap-1 text-sm font-subheading text-brand-orange hover:opacity-80"
                    data-testid={`admin-unapprove-comment-${c.id}`}
                  >
                    <X size={14} /> Remover aprovação
                  </button>
                )}
                <button
                  onClick={() => remove(c.id)}
                  className="inline-flex items-center gap-1 text-sm font-subheading text-destructive hover:opacity-80"
                  data-testid={`admin-delete-comment-${c.id}`}
                >
                  <Trash2 size={14} /> Apagar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------- shared ------------------------- */
const inputCls =
  "w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:border-primary font-body text-sm";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.18em] font-subheading text-muted-foreground">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
