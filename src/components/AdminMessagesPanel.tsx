import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Megaphone, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Color = "info" | "warning" | "danger" | "success";

interface AdminMessage {
  id: string;
  title: string;
  message: string;
  color: Color;
  is_active: boolean;
  created_at: string;
}

const colorOptions: { value: Color; label: string; preview: string }[] = [
  { value: "info", label: "Azul (Info)", preview: "bg-blue-500" },
  { value: "warning", label: "Amarelo (Aviso)", preview: "bg-yellow-500" },
  { value: "danger", label: "Vermelho (Alerta)", preview: "bg-red-500" },
  { value: "success", label: "Verde (Sucesso)", preview: "bg-green-500" },
];

const AdminMessagesPanel = ({ adminId }: { adminId: string }) => {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [color, setColor] = useState<Color>("warning");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_messages")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar mensagens");
    setMessages((data as AdminMessage[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setEditingId(null);
    setTitle("");
    setMessage("");
    setColor("warning");
    setIsActive(true);
  };

  const submit = async () => {
    if (!message.trim()) {
      toast.error("Digite a mensagem");
      return;
    }
    setSubmitting(true);
    if (editingId) {
      const { error } = await supabase
        .from("admin_messages")
        .update({ title, message, color, is_active: isActive })
        .eq("id", editingId);
      if (error) toast.error("Erro ao atualizar");
      else toast.success("Mensagem atualizada");
    } else {
      const { error } = await supabase
        .from("admin_messages")
        .insert({ title, message, color, is_active: isActive, created_by: adminId });
      if (error) toast.error("Erro ao enviar");
      else toast.success("Mensagem enviada aos afiliados");
    }
    setSubmitting(false);
    reset();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta mensagem? Todos os afiliados deixarão de vê-la.")) return;
    const { error } = await supabase.from("admin_messages").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else {
      toast.success("Mensagem excluída");
      load();
    }
  };

  const toggleActive = async (m: AdminMessage) => {
    const { error } = await supabase
      .from("admin_messages")
      .update({ is_active: !m.is_active })
      .eq("id", m.id);
    if (error) toast.error("Erro ao atualizar");
    else load();
  };

  const startEdit = (m: AdminMessage) => {
    setEditingId(m.id);
    setTitle(m.title || "");
    setMessage(m.message);
    setColor(m.color);
    setIsActive(m.is_active);
  };

  const colorBadge: Record<Color, string> = {
    info: "bg-blue-500/20 border-blue-500/50 text-blue-200",
    warning: "bg-yellow-500/20 border-yellow-500/50 text-yellow-200",
    danger: "bg-red-500/20 border-red-500/50 text-red-200",
    success: "bg-green-500/20 border-green-500/50 text-green-200",
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-xl font-bold">Mensagens para Afiliados</h2>
      </div>

      {/* Form */}
      <div className="glass-card rounded-xl p-6 space-y-4">
        <h3 className="font-semibold">{editingId ? "Editar mensagem" : "Nova mensagem"}</h3>
        <div>
          <Label className="text-sm">Título (opcional)</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Manutenção programada"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-sm">Mensagem *</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite o aviso que aparecerá no painel dos afiliados..."
            rows={3}
            className="mt-1"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">Cor de destaque</Label>
            <Select value={color} onValueChange={(v) => setColor(v as Color)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <span className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${c.preview}`} />
                      {c.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label className="text-sm">{isActive ? "Ativa" : "Inativa"}</Label>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={submit} disabled={submitting} className="gap-2">
            <Plus className="h-4 w-4" />
            {submitting ? "Enviando..." : editingId ? "Atualizar" : "Enviar mensagem"}
          </Button>
          {editingId && (
            <Button variant="ghost" onClick={reset}>Cancelar</Button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-muted-foreground">
          Mensagens cadastradas ({messages.length})
        </h3>
        {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!loading && messages.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma mensagem cadastrada.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-xl border-2 p-4 ${colorBadge[m.color]} ${!m.is_active ? "opacity-50" : ""}`}
          >
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                {m.title && <p className="font-bold mb-1">{m.title}</p>}
                <p className="text-sm whitespace-pre-wrap break-words">{m.message}</p>
                <p className="text-xs opacity-75 mt-2">
                  {new Date(m.created_at).toLocaleString("pt-BR")}
                  {!m.is_active && " · Inativa"}
                </p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <div className="flex items-center gap-1">
                  <Switch checked={m.is_active} onCheckedChange={() => toggleActive(m)} />
                </div>
                <Button size="sm" variant="ghost" onClick={() => startEdit(m)} className="h-7 px-2">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(m.id)} className="h-7 px-2 text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminMessagesPanel;
