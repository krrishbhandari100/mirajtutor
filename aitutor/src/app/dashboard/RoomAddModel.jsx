"use client";
import { useEffect, useState } from "react";

export default function CreateRoomModal({ isOpen, onClose, onCreate }) {
  const [roomName, setRoomName] = useState("");
  const [topic, setTopic] = useState("");
  const [prompt, setPrompt] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    let token = localStorage.getItem('token');

    if (!roomName.trim() || !topic.trim() || !prompt.trim()) return;

    onCreate({
      token: token,
      roomname: roomName,
      topic,
      prompt
    });

    setRoomName("");
    setTopic("");
    setPrompt("");
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0F]/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">

      <div
        className="w-full max-w-lg backdrop-blur-2xl bg-white/[0.02] rounded-2xl shadow-2xl p-8 border border-white/[0.04] transform transition-all scale-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >

        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-amber-100">Create New Room</h2>
            <p className="text-amber-200/50 text-sm mt-1">Setup your AI Tutor environment.</p>
          </div>
          <button
            onClick={onClose}
            className="text-amber-200/40 hover:text-amber-200/70 hover:bg-white/[0.03] p-2 rounded-full transition-all"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label className="block text-sm font-semibold text-amber-200/70 mb-2">Room Name</label>
            <input
              type="text"
              placeholder="e.g., Quantum Physics 101"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400/40 outline-none transition-all placeholder:text-amber-200/30 text-amber-100"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-amber-200/70 mb-2">Topic / Subject</label>
            <input
              type="text"
              placeholder="e.g., Science, History, Coding..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400/40 outline-none transition-all placeholder:text-amber-200/30 text-amber-100"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-amber-200/70 mb-2">
              Tutor Instructions (Prompt)
              <span className="ml-2 text-xs font-normal text-amber-200/30">How should the AI behave?</span>
            </label>
            <textarea
              rows="4"
              placeholder="e.g., You are a strict physics professor. Explain things using real-world examples only..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400/40 outline-none transition-all resize-none placeholder:text-amber-200/30 text-amber-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.03] mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-amber-200/60 font-medium hover:bg-white/[0.03] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={()=>onCreate(roomName, topic, prompt)}
              disabled={!roomName || !topic || !prompt}
              className="px-6 py-2.5 bg-white text-[#0A0A0F] font-bold rounded-xl hover:bg-white/90 shadow-lg shadow-amber-500/15 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              Create Room
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
