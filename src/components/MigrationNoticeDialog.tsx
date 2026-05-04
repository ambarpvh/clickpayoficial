import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, AlertTriangle } from "lucide-react";

const STORAGE_KEY = "migration-notice-dismissed-v1";

export default function MigrationNoticeDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const handleClose = (val: boolean) => {
    setOpen(val);
    if (!val) sessionStorage.setItem(STORAGE_KEY, "1");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span aria-hidden>🚨</span> Aviso Importante
          </DialogTitle>
          <DialogDescription className="sr-only">
            Aviso sobre migração de servidores
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm text-foreground">
          <p>
            Nosso sistema atingiu a incrível marca de mais de{" "}
            <strong>600 usuários cadastrados</strong> em menos de 30 dias.
          </p>
          <p>
            Devido a esse crescimento, estamos realizando a migração para
            servidores mais robustos, localizados no maior data center da
            América Latina, a <strong>Scala Data Centers</strong>, em Barueri (SP).
          </p>
          <div className="flex items-start gap-2 rounded-md border border-accent/40 bg-accent/10 p-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-accent shrink-0" />
            <p>
              Durante esse processo, o sistema pode apresentar instabilidades
              até o dia <strong>07/05</strong>.
            </p>
          </div>

          <div className="space-y-2 pt-1">
            <p className="font-medium flex items-center gap-2">
              📩 Em caso de dúvidas, entre em contato:
            </p>
            <a
              href="mailto:oficialclickpay@gmail.com"
              className="flex items-center gap-2 text-primary hover:underline break-all"
            >
              <Mail className="h-4 w-4 shrink-0" />
              oficialclickpay@gmail.com
            </a>
            <a
              href="https://www.whatsapp.com/channel/0029VbCuUim96H4TKNzguw1B"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:underline break-all"
            >
              <MessageCircle className="h-4 w-4 shrink-0" />
              Canal no WhatsApp
            </a>
          </div>

          <p className="pt-2 text-muted-foreground">
            Agradecemos a compreensão!
          </p>
        </div>

        <DialogFooter>
          <Button onClick={() => handleClose(false)} className="w-full sm:w-auto">
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
