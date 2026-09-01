import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle, Copy, Loader2, LogOut, MessageSquare, Send, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useSeo } from "@/lib/seo";
import {
  CONTACT_REPLIES, SEED_CONTACTS, findFlagged, segmentText,
} from "@/lib/messaging";

type Conversation = {
  id: string;
  contact_name: string;
  contact_role: string;
  last_message_at: string;
};

type Message = {
  id: string;
  conversation_id: string;
  sender: "me" | "contact";
  body: string;
  flagged_words: string[];
  created_at: string;
};

const initials = (name: string) =>
  name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const Inbox = () => {
  useSeo({
    title: "Fiverr Message Inbox — Write, Screen and Send Safely",
    description:
      "A full Fiverr-style inbox: compose messages, preview flagged forbidden words in real time, and send to your conversations.",
    canonical: "https://fiverr-keyword-checker.lovable.app/inbox",
  });

  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthSession();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const seededRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  const seed = useCallback(async (uid: string) => {
    const rows = SEED_CONTACTS.map((c) => ({
      user_id: uid,
      contact_name: c.name,
      contact_role: c.role,
    }));
    const { data, error } = await supabase.from("conversations").insert(rows).select();
    if (error || !data) return [];
    const openers = data.map((conv, i) => ({
      conversation_id: conv.id,
      user_id: uid,
      sender: "contact" as const,
      body: SEED_CONTACTS[i]?.opener ?? "Hello!",
    }));
    await supabase.from("messages").insert(openers);
    return data as Conversation[];
  }, []);

  // Load conversations (seeding simulated contacts on first visit).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("conversations")
        .select("id, contact_name, contact_role, last_message_at")
        .order("last_message_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      let list = (data ?? []) as Conversation[];
      if (list.length === 0 && !seededRef.current) {
        seededRef.current = true;
        list = await seed(user.id);
      }
      setConversations(list);
      setActiveId((prev) => prev ?? list[0]?.id ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, seed]);

  // Load messages for the active conversation.
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, conversation_id, sender, body, flagged_words, created_at")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        return;
      }
      setMessages((data ?? []) as Message[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const flagged = useMemo(() => findFlagged(draft), [draft]);
  const segments = useMemo(() => segmentText(draft), [draft]);
  const active = conversations.find((c) => c.id === activeId) ?? null;

  const send = async () => {
    const body = draft.trim();
    if (!body || !activeId || !user || sending) return;
    setSending(true);
    const words = findFlagged(body);
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: activeId,
        user_id: user.id,
        sender: "me",
        body,
        flagged_words: words,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      setSending(false);
      return;
    }

    setMessages((m) => [...m, data as Message]);
    setDraft("");
    const now = new Date().toISOString();
    await supabase.from("conversations").update({ last_message_at: now }).eq("id", activeId);
    setConversations((cs) =>
      [...cs.map((c) => (c.id === activeId ? { ...c, last_message_at: now } : c))].sort(
        (a, b) => +new Date(b.last_message_at) - +new Date(a.last_message_at),
      ),
    );
    toast.success(
      words.length ? `Message sent with ${words.length} flagged word(s)` : "Message sent",
    );
    setSending(false);

    // Live AI reply from the contact.
    const convId = activeId;
    const history = [...messages, data as Message].map((m) => ({
      sender: m.sender,
      body: m.body,
    }));
    setReplying(true);
    try {
      const { data: ai, error: aiError } = await supabase.functions.invoke("contact-reply", {
        body: {
          contactName: active?.contact_name,
          contactRole: active?.contact_role,
          messages: history,
        },
      });
      const reply = (ai as { reply?: string } | null)?.reply?.trim();
      if (aiError || !reply) {
        toast.error(aiError?.message ?? "Contact could not reply right now");
      } else {
        const { data: rep } = await supabase
          .from("messages")
          .insert({ conversation_id: convId, user_id: user.id, sender: "contact", body: reply })
          .select()
          .single();
        if (rep) {
          setMessages((m) =>
            m[0]?.conversation_id === convId || m.length === 0 ? [...m, rep as Message] : m,
          );
        }
      }
    } finally {
      setReplying(false);
    }
  };


  const clearThread = async () => {
    if (!activeId) return;
    const { error } = await supabase.from("messages").delete().eq("conversation_id", activeId);
    if (error) return toast.error(error.message);
    setMessages([]);
    toast.success("Conversation cleared");
  };

  const copyDraft = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      toast.success("Draft copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  if (authLoading || (loading && conversations.length === 0)) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neon" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-3 sm:px-4 py-6 sm:py-10">
      <div className="mx-auto w-full" style={{ maxWidth: 1500 }}>
        <header className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--neon))/0.5] bg-[hsl(var(--neon))/0.08] px-4 py-1.5 text-sm text-neon">
            <MessageSquare className="h-4 w-4" /> Message Inbox
          </span>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/" className="text-[hsl(var(--foreground))/0.7] hover:text-neon transition">
              Keyword checker
            </Link>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1.5 text-[hsl(var(--foreground))/0.7] hover:text-neon transition"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </header>

        <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
          Fiverr <span className="text-neon">Message</span> Inbox
        </h1>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4">
          {/* Conversation list */}
          <aside className="panel p-2 h-fit">
            <h2 className="px-2 py-2 text-xs font-bold uppercase tracking-wide text-[hsl(var(--foreground))/0.55]">
              Conversations
            </h2>
            <ul className="space-y-1 max-h-[320px] lg:max-h-[70vh] overflow-y-auto">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setActiveId(c.id)}
                    className={`w-full text-left flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                      c.id === activeId
                        ? "bg-[hsl(var(--neon))/0.12] border border-[hsl(var(--neon))/0.45]"
                        : "border border-transparent hover:bg-[hsl(var(--neon))/0.06]"
                    }`}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[hsl(var(--neon))/0.15] text-xs font-bold text-neon">
                      {initials(c.contact_name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{c.contact_name}</span>
                      <span className="block truncate text-xs text-[hsl(var(--foreground))/0.55]">
                        {c.contact_role}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* Thread + composer */}
          <section className="min-w-0 space-y-4">
            <div className="panel p-4">
              <div className="flex items-center justify-between gap-3 border-b border-[hsl(var(--panel-border))/0.4] pb-3">
                <h2 className="text-sm font-bold text-neon">
                  {active ? active.contact_name : "No conversation"}
                </h2>
                <button
                  onClick={clearThread}
                  disabled={!messages.length}
                  className="inline-flex items-center gap-1.5 text-xs text-[hsl(var(--foreground))/0.7] hover:text-neon transition disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear thread
                </button>
              </div>

              <div ref={threadRef} className="mt-3 max-h-[42vh] overflow-y-auto space-y-3 pr-1">
                {messages.length === 0 && (
                  <p className="py-8 text-center text-sm text-[hsl(var(--foreground))/0.45]">
                    No messages yet — write one below and hit Send.
                  </p>
                )}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.sender === "me" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                        m.sender === "me"
                          ? "bg-[hsl(var(--neon))/0.15] border border-[hsl(var(--neon))/0.4]"
                          : "bg-[hsl(var(--panel))] border border-[hsl(var(--panel-border))/0.5]"
                      }`}
                    >
                      {m.body}
                      <span className="mt-1 block text-[10px] text-[hsl(var(--foreground))/0.45]">
                        {timeLabel(m.created_at)}
                        {m.sender === "me" && m.flagged_words?.length > 0 && (
                          <span className="ml-2 text-[hsl(var(--danger))]">
                            {m.flagged_words.length} flagged
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Composer: input + preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="panel p-4 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-neon">Message Input</h3>
                  <span className="text-xs text-[hsl(var(--foreground))/0.55]">
                    {draft.length} chars
                  </span>
                </div>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write your Fiverr message here…"
                  className="w-full min-h-[200px] flex-1 resize-y bg-transparent outline-none placeholder:text-[hsl(var(--foreground))/0.4]"
                  maxLength={5000}
                />
                <div className="mt-3 flex items-center gap-3 border-t border-[hsl(var(--panel-border))/0.4] pt-3">
                  <button
                    onClick={copyDraft}
                    disabled={!draft}
                    className="inline-flex items-center gap-1.5 text-xs text-[hsl(var(--foreground))/0.75] hover:text-neon transition disabled:opacity-40"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                  <button
                    onClick={() => setDraft("")}
                    disabled={!draft}
                    className="inline-flex items-center gap-1.5 text-xs text-[hsl(var(--foreground))/0.75] hover:text-neon transition disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Clear
                  </button>
                  <button
                    onClick={send}
                    disabled={!draft.trim() || !activeId || sending}
                    className="ml-auto inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--neon))] px-4 py-2 text-sm font-bold text-black hover:bg-[hsl(var(--neon-glow))] transition disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send
                  </button>
                </div>
              </div>

              <div className="panel p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-neon">Preview with Highlights</h3>
                  <span className="text-xs text-[hsl(var(--foreground))/0.55]">
                    {flagged.length} flagged
                  </span>
                </div>

                {flagged.length > 0 && (
                  <div className="mb-3 flex items-start gap-2 rounded-xl border border-[hsl(var(--danger))/0.5] bg-[hsl(var(--danger-bg))] px-3 py-2 text-xs">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-[hsl(var(--danger))]" />
                    <span>
                      Risky words detected: {flagged.join(", ")}. You can still send, but
                      consider rewording first.
                    </span>
                  </div>
                )}

                <div className="min-h-[200px] whitespace-pre-wrap text-sm">
                  {draft ? (
                    segments.map((s, i) =>
                      s.flagged ? (
                        <mark
                          key={i}
                          className="rounded bg-[hsl(var(--danger))/0.25] px-0.5 text-[hsl(var(--foreground))] underline decoration-[hsl(var(--danger))] decoration-2"
                        >
                          {s.text}
                        </mark>
                      ) : (
                        <span key={i}>{s.text}</span>
                      ),
                    )
                  ) : (
                    <span className="text-[hsl(var(--foreground))/0.4]">
                      Your message preview appears here with forbidden words highlighted.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Inbox;
