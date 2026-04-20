import { useEffect, useState } from "react";
import { X, AlertTriangle, Info, CheckCircle, AlertOctagon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Color = "info" | "warning" | "danger" | "success";

interface AdminMessage {
  id: string;
  title: string;
  message: string;
  color: Color;
  created_at: string;
}

const styleByColor: Record<Color, { wrap: string; icon: JSX.Element }> = {
  info: {
    wrap: "bg-blue-500/15 border-blue-500/60 text-blue-100",
    icon: <Info className="h-5 w-5 text-blue-300" />,
  },
  warning: {
    wrap: "bg-yellow-500/15 border-yellow-500/60 text-yellow-100 animate-pulse",
    icon: <AlertTriangle className="h-5 w-5 text-yellow-300" />,
  },
  danger: {
    wrap: "bg-red-500/15 border-red-500/70 text-red-100 animate-pulse",
    icon: <AlertOctagon className="h-5 w-5 text-red-300" />,
  },
  success: {
    wrap: "bg-green-500/15 border-green-500/60 text-green-100",
    icon: <CheckCircle className="h-5 w-5 text-green-300" />,
  },
};

const AdminMessagesBanner = ({ userId }: { userId: string }) => {
  const [messages, setMessages] = useState<AdminMessage[]>([]);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    const load = async () => {
      const { data: msgs } = await supabase
        .from("admin_messages")
        .select("id, title, message, color, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (!mounted || !msgs) return;

      const { data: dismissed } = await supabase
        .from("admin_message_dismissals")
        .select("message_id")
        .eq("user_id", userId);
      const dismissedIds = new Set((dismissed || []).map((d: any) => d.message_id));

      setMessages(
        (msgs as AdminMessage[]).filter((m) => !dismissedIds.has(m.id))
      );
    };

    load();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const dismiss = async (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    await supabase.from("admin_message_dismissals").insert({ message_id: id, user_id: userId });
  };

  if (messages.length === 0) return null;

  return (
    <div className="space-y-3">
      {messages.map((m) => {
        const s = styleByColor[m.color] || styleByColor.warning;
        return (
          <div
            key={m.id}
            className={`relative rounded-xl border-2 p-4 pr-12 shadow-lg ${s.wrap}`}
            role="alert"
          >
            <div className="flex gap-3">
              <div className="shrink-0 mt-0.5">{s.icon}</div>
              <div className="flex-1 min-w-0">
                {m.title && <p className="font-bold text-base mb-1">{m.title}</p>}
                <p className="text-sm whitespace-pre-wrap break-words">{m.message}</p>
              </div>
            </div>
            <button
              onClick={() => dismiss(m.id)}
              aria-label="Fechar mensagem"
              className="absolute top-3 right-3 rounded-full p-1 hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default AdminMessagesBanner;
