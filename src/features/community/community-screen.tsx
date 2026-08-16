import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Camera, Heart, ImagePlus, LoaderCircle, MessageCircle, RefreshCw, Send, Trash2, UsersRound } from "lucide-react";
import { EmptyState, Field, Modal, ScreenHeader } from "../../components/ui";
import type { AuthResult, CommunityPost, HydraAccount } from "../../lib/hydra-types";

type Props = {
  account: HydraAccount;
  onBack: () => void;
  publishPost: (text: string, file?: File) => Promise<AuthResult>;
  likePost: (post: CommunityPost) => Promise<void>;
  commentPost: (postId: string, text: string) => Promise<AuthResult>;
  deletePost: (postId: string) => Promise<AuthResult>;
  refreshCommunity: () => Promise<AuthResult>;
  createRequest?: number;
  onRequestHandled?: () => void;
};

type FeedFilter = "all" | "region" | "mine";

export function CommunityScreen({ account, onBack, publishPost, likePost, commentPost, deletePost, refreshCommunity, createRequest, onRequestHandled }: Props) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File>();
  const [imagePreview, setImagePreview] = useState<string>();
  const [comments, setComments] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (createRequest !== undefined) { setComposerOpen(true); onRequestHandled?.(); } }, [createRequest]);

  const filteredPosts = useMemo(() => account.posts.filter((post) => {
    if (filter === "mine") return post.authorId === account.id;
    if (filter === "region") return Boolean(account.property.municipality) && post.municipality === account.property.municipality;
    return true;
  }), [account.id, account.posts, account.property.municipality, filter]);

  function chooseImage(file?: File) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setMessage("A imagem deve ter no máximo 10 MB.");
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setMessage("");
  }

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(undefined);
    setImagePreview(undefined);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() && !imageFile) return;
    setBusy("publish");
    const result = await publishPost(text, imageFile);
    setBusy("");
    setMessage(result.message);
    if (result.ok) {
      setText("");
      clearImage();
      setComposerOpen(false);
    }
  }

  async function addComment(postId: string) {
    const value = comments[postId]?.trim();
    if (!value) return;
    setBusy(`comment-${postId}`);
    const result = await commentPost(postId, value);
    setBusy("");
    setMessage(result.message);
    if (result.ok) setComments((current) => ({ ...current, [postId]: "" }));
  }

  async function remove(postId: string) {
    if (!window.confirm("Excluir esta publicação e seus comentários?")) return;
    setBusy(`delete-${postId}`);
    const result = await deletePost(postId);
    setBusy("");
    setMessage(result.message);
  }

  async function refresh() {
    setBusy("refresh");
    const result = await refreshCommunity();
    setBusy("");
    setMessage(result.message);
  }

  return (
    <div className="screen page-enter extra-screen">
      <ScreenHeader title="Comunidade" subtitle="Experiências reais de quem vive o campo." onBack={onBack} action={<div className="header-action-pair"><button className="icon-button" onClick={() => void refresh()} aria-label="Atualizar comunidade" disabled={busy === "refresh"}>{busy === "refresh" ? <LoaderCircle size={19} className="spin" /> : <RefreshCw size={19} />}</button><button className="icon-button accent" onClick={() => setComposerOpen(true)} aria-label="Nova publicação"><Camera size={20} /></button></div>} />

      <div className="community-tabs">
        <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todos</button>
        <button className={filter === "region" ? "active" : ""} onClick={() => setFilter("region")}>Minha região</button>
        <button className={filter === "mine" ? "active" : ""} onClick={() => setFilter("mine")}>Meus posts</button>
      </div>

      <button className="community-composer" onClick={() => setComposerOpen(true)}>
        {account.profile.avatarUrl ? <img src={account.profile.avatarUrl} alt="Sua foto" /> : <span>{account.profile.name.charAt(0).toUpperCase()}</span>}
        <p>O que aconteceu na sua propriedade?</p>
        <ImagePlus size={21} />
      </button>

      {message && <div className="community-message" role="status">{message}</div>}

      {filteredPosts.length === 0 ? (
        <EmptyState icon={<UsersRound size={27} />} title={account.posts.length ? "Nenhuma publicação neste filtro" : "Ainda não há publicações"} text="O feed começa vazio. Compartilhe algo real quando quiser." action={<button className="primary-button" onClick={() => setComposerOpen(true)}>Criar publicação</button>} />
      ) : (
        <div className="post-list">
          {filteredPosts.map((post) => (
            <article className="post-card" key={post.id}>
              <header>
                {post.authorAvatarUrl ? <img src={post.authorAvatarUrl} alt={`Foto de ${post.author}`} /> : <span>{post.author.charAt(0).toUpperCase()}</span>}
                <div><strong>{post.author}</strong><small>{[post.propertyName, post.municipality].filter(Boolean).join(" · ") || new Date(post.date).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</small></div>
                {post.authorId === account.id && <button className="post-delete" onClick={() => void remove(post.id)} aria-label="Excluir publicação" disabled={busy === `delete-${post.id}`}>{busy === `delete-${post.id}` ? <LoaderCircle size={17} className="spin" /> : <Trash2 size={17} />}</button>}
              </header>
              {post.text && <p>{post.text}</p>}
              {post.image && <img className="post-image" src={post.image} alt="Imagem enviada na publicação" />}
              <div className="post-actions">
                <button className={post.liked ? "liked" : ""} onClick={() => void likePost(post)}><Heart size={18} fill={post.liked ? "currentColor" : "none"} /> {post.likes || "Curtir"}</button>
                <span><MessageCircle size={18} /> {post.comments.length || "Comentar"}</span>
                <time>{new Date(post.date).toLocaleDateString("pt-BR")}</time>
              </div>
              {post.comments.length > 0 && <div className="comment-list">{post.comments.map((comment) => <p key={comment.id}><strong>{comment.author.split(" ")[0]}</strong> {comment.text}</p>)}</div>}
              <div className="comment-form"><input value={comments[post.id] || ""} onChange={(event) => setComments({ ...comments, [post.id]: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void addComment(post.id); } }} placeholder="Escreva um comentário" /><button onClick={() => void addComment(post.id)} aria-label="Enviar comentário" disabled={busy === `comment-${post.id}`}>{busy === `comment-${post.id}` ? <LoaderCircle size={17} className="spin" /> : <Send size={17} />}</button></div>
            </article>
          ))}
        </div>
      )}

      <Modal open={composerOpen} onClose={() => { setComposerOpen(false); setMessage(""); }} eyebrow="COMUNIDADE" title="Nova publicação">
        <form className="modal-form" onSubmit={publish}>
          <Field label="Conte o que aconteceu"><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Compartilhe uma atividade, aprendizado ou conquista..." autoFocus maxLength={1200} /></Field>
          <input className="hidden-file" ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseImage(event.target.files?.[0])} />
          {imagePreview ? <div className="image-preview"><img src={imagePreview} alt="Imagem selecionada" /><button type="button" onClick={clearImage}>Remover</button></div> : <button className="upload-button" type="button" onClick={() => fileRef.current?.click()}><ImagePlus size={20} /> Adicionar imagem</button>}
          {message && <p className="form-notice">{message}</p>}
          <button className="primary-button full" type="submit" disabled={(!text.trim() && !imageFile) || busy === "publish"}>{busy === "publish" ? <><LoaderCircle size={18} className="spin" /> Publicando…</> : "Publicar"}</button>
        </form>
      </Modal>
    </div>
  );
}
