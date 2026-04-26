import { useState, useRef, useEffect } from "react";
import { Brain, Send, Sparkles } from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { GlassCard } from "@/components/med/GlassCard";
import {
  NEURO_RESPONSES,
  NEURO_DEFAULT_REPLY,
  findNeuroResponse,
} from "@/data/neuroAIResponses";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  topic?: string;
}

const SUGGESTED = [
  "What is myasthenia gravis?",
  "Tell me about ALS",
  "Explain Guillain-Barré syndrome",
  "Duchenne muscular dystrophy?",
  "Lambert-Eaton vs MG",
];

export default function NeuromuscularAI() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "ai",
      text:
        "Hi — I'm the Neuromuscular AI assistant. Ask me about neuromuscular conditions like myasthenia gravis, ALS, Guillain-Barré, muscular dystrophies, neuropathies, or myopathies. Responses come from a pre-loaded clinical knowledge base — no external API needed.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = (text: string) => {
    const q = text.trim();
    if (!q) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: q,
    };
    const match = findNeuroResponse(q);
    const aiMsg: ChatMessage = {
      id: `a-${Date.now()}`,
      role: "ai",
      text: match?.answer ?? NEURO_DEFAULT_REPLY,
      topic: match?.topic,
    };
    setMessages((m) => [...m, userMsg, aiMsg]);
    setInput("");
  };

  return (
    <PageWrapper>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(237 97% 75% / 0.2), hsl(191 100% 50% / 0.2))",
            }}
          >
            <Brain className="w-5 h-5 text-med-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Neuromuscular AI</h1>
            <p className="text-xs text-text-secondary">
              Offline clinical knowledge base · {NEURO_RESPONSES.length} topics
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6 mt-6">
          <GlassCard className="flex flex-col" padding="p-0">
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-5 space-y-4"
              style={{ maxHeight: "60vh", minHeight: "420px" }}
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-med-primary/15 text-text-primary border border-med-primary/30"
                        : "bg-card/60 text-text-secondary border border-border/50"
                    }`}
                  >
                    {m.topic && (
                      <p className="text-[10px] font-mono uppercase tracking-wider text-med-primary mb-1">
                        {m.topic}
                      </p>
                    )}
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="border-t border-border/60 p-3 flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about a neuromuscular condition…"
                className="flex-1 bg-transparent border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-med-primary/60"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-med-primary/15 text-med-primary hover:bg-med-primary/25 transition-colors flex items-center gap-1 text-sm font-medium"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </form>
          </GlassCard>

          <div className="space-y-3">
            <GlassCard padding="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-med-primary" />
                <h3 className="text-sm font-semibold">Try asking</h3>
              </div>
              <div className="flex flex-col gap-2">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left text-xs text-text-secondary hover:text-text-primary border border-border/50 hover:border-med-primary/40 rounded-lg px-3 py-2 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </GlassCard>
            <GlassCard padding="p-4">
              <h3 className="text-sm font-semibold mb-2">Topics covered</h3>
              <ul className="space-y-1 text-[11px] text-text-muted">
                {NEURO_RESPONSES.map((r) => (
                  <li key={r.topic}>• {r.topic}</li>
                ))}
              </ul>
            </GlassCard>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
