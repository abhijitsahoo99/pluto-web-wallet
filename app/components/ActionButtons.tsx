import { Send, ArrowDownToLine } from "lucide-react";

export default function ActionButtons() {
  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      {/* Send Button - Glassmorphism as per reference */}
      <button className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 group">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
            <Send size={24} className="text-white" />
          </div>
          <span className="text-white font-semibold text-lg">Send</span>
        </div>
      </button>

      {/* Receive Button - Glassmorphism as per reference */}
      <button className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 group">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
            <ArrowDownToLine size={24} className="text-white" />
          </div>
          <span className="text-white font-semibold text-lg">Receive</span>
        </div>
      </button>
    </div>
  );
}
