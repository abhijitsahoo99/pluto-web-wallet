import { Send, ArrowDownToLine, ArrowLeftRight } from "lucide-react";
import { memo } from "react";

interface ActionButtonsProps {
  onSendClick?: () => void;
}

function ActionButtons({ onSendClick }: ActionButtonsProps) {
  return (
    <div className="flex justify-center items-center gap-8 mb-8 px-4">
      {/* Send Button */}
      <button
        onClick={onSendClick}
        className="flex flex-col items-center gap-2 group"
      >
        <div className="w-16 h-16 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center transition-all duration-300 hover:bg-white/15 hover:scale-105 active:scale-95 shadow-lg shadow-black/10">
          <Send size={22} className="text-white" />
        </div>
        <span className="text-white/90 text-sm font-medium">Send</span>
      </button>

      {/* Receive Button */}
      <button className="flex flex-col items-center gap-2 group">
        <div className="w-16 h-16 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center transition-all duration-300 hover:bg-white/15 hover:scale-105 active:scale-95 shadow-lg shadow-black/10">
          <ArrowDownToLine size={22} className="text-white" />
        </div>
        <span className="text-white/90 text-sm font-medium">Receive</span>
      </button>

      {/* Swap Button */}
      <button className="flex flex-col items-center gap-2 group">
        <div className="w-16 h-16 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center transition-all duration-300 hover:bg-white/15 hover:scale-105 active:scale-95 shadow-lg shadow-black/10">
          <ArrowLeftRight size={22} className="text-white" />
        </div>
        <span className="text-white/90 text-sm font-medium">Swap</span>
      </button>
    </div>
  );
}

export default memo(ActionButtons);
