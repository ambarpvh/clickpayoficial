import { MessageCircle } from "lucide-react";

const WhatsAppBanner = () => {
  return (
    <a
      href="https://whatsapp.com/channel/0029VbCuUim96H4TKNzguw1B"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#25D366] text-white py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium hover:bg-[#128C7E] transition-colors"
    >
      <MessageCircle className="h-4 w-4 animate-bounce" />
      <span className="animate-pulse">
        Entre em nosso canal do WhatsApp e fique por dentro das novidades
      </span>
      <MessageCircle className="h-4 w-4 animate-bounce" />
    </a>
  );
};

export default WhatsAppBanner;
