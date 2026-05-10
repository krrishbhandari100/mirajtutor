"use client"; // Required for client-side interactivity
import { useEffect, useState } from "react";

export default function CreateRoomModal({ isOpen, onClose, onCreate, token }) {
  // 1. State for all three fields
  const [roomName, setRoomName] = useState("");
  const [topic, setTopic] = useState("");
  const [prompt, setPrompt] = useState("");

  // CRITICAL: Prevents the "Invisible Overlay" bug
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    let token = localStorage.getItem('token');

    // Basic validation to ensure fields aren't empty
    if (!roomName.trim() || !topic.trim() || !prompt.trim()) return;

    // Send data back to the parent (Page.js)
    onCreate({
      token: token,
      roomname: roomName,
      topic,
      prompt
    });

    // Clear form and close
    setRoomName("");
    setTopic("");
    setPrompt("");
    onClose();
  };
  return (
    // Background Overlay (Darkens the screen)
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">

      {/* Modal Container */}
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 transform transition-all scale-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()} // Prevents closing when clicking inside the box
      >

        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Create New Room</h2>
            <p className="text-slate-500 text-sm mt-1">Setup your AI Tutor environment.</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-all"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Input 1: Room Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Room Name</label>
            <input
              type="text"
              placeholder="e.g., Quantum Physics 101"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
              autoFocus
            />
          </div>

          {/* Input 2: Topic */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Topic / Subject</label>
            <input
              type="text"
              placeholder="e.g., Science, History, Coding..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Input 3: System Prompt (Textarea) */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Tutor Instructions (Prompt)
              <span className="ml-2 text-xs font-normal text-slate-400">How should the AI behave?</span>
            </label>
            <textarea
              rows="4"
              placeholder="e.g., You are a strict physics professor. Explain things using real-world examples only..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none placeholder:text-slate-400"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={()=>onCreate(roomName, topic, prompt)}
              // Disable button if inputs are empty
              disabled={!roomName || !topic || !prompt}
              className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              Create Room
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}