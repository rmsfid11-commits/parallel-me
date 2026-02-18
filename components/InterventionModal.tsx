"use client";

import { useState, useRef, useEffect } from "react";

interface InterventionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

export default function InterventionModal({
  isOpen,
  onClose,
  onSubmit,
}: InterventionModalProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
    if (!isOpen) {
      setText("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-[#0d0d35] border border-amber-500/30 rounded-2xl p-6 shadow-2xl shadow-amber-500/10 animate-slideUp">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          <h3 className="text-lg font-bold text-white">우주에 개입하기</h3>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          이 시점에서 당신은 어떤 선택을 하시겠습니까?
          <br />
          당신의 개입이 새로운 우주를 만듭니다.
        </p>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="예: 난 여기서 퇴사하고 창업할 거야..."
          rows={4}
          className="w-full px-4 py-3 bg-indigo-950/50 border border-indigo-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleSubmit();
            }
          }}
        />

        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-indigo-950/50 border border-indigo-700/30 text-gray-300 rounded-xl hover:bg-indigo-900/50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="flex-1 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            ⚡ 우주 분기!
          </button>
        </div>
        <p className="text-xs text-gray-500 text-center mt-2">
          Ctrl+Enter로 빠르게 제출
        </p>
      </div>
    </div>
  );
}
