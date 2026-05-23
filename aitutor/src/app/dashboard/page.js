"use client"
import React, { useEffect, useState } from 'react'
import CreateRoomModal from './RoomAddModel';
import Link from 'next/link';


const Page = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [deleteConfirm, setDeleteConfirm] = useState(null)

    const handleCreateRoom = async (roomData) => {
        let res = await fetch("http://localhost:8000/add_rooms", {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify(roomData)
        });

        let data = await res.json();
        console.log("Room data is ", data);
        if(data.status == "success"){
            setRooms(data.allRooms);
        }
        
    };

    const handleDeleteRoom = async (roomId) => {
        let token = localStorage.getItem('token');
        let res = await fetch("http://localhost:8000/delete_room", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, room_id: roomId })
        });
        let data = await res.json();
        if (data.status === "success") {
            setRooms(prev => prev.filter(r => r.roomId !== roomId));
        }
        setDeleteConfirm(null);
    };

    useEffect(()=>{
        let token = localStorage.getItem('token');
        if(token){
            fetch(`http://localhost:8000/fetch_rooms?token=${token}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            }).then(res=>{
                return res.json();
            }).then(data =>{
                setRooms(data['allRooms']);
                console.log("Data yaha hai", data['allRooms']);
            });
            
        }
    }, [])

    return (
        // min-h-screen ensures the background covers the whole page
        // pt-16 is CRITICAL so the content starts below your h-16 Header
        <div className="min-h-screen bg-slate-50 pt-16 flex">

            {/* 1. SIDEBAR: Matching your Indigo-600 Branding */}
            <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col fixed h-[calc(100vh-64px)]">
                <div className="p-6 flex flex-col h-full">
                    <nav className="space-y-1 flex-1">
                        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Workspace</h2>

                        <button className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-50 text-indigo-700 rounded-2xl font-bold border border-indigo-100">
                            <span className="text-lg">📁</span> My Rooms
                        </button>

                        <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-2xl transition-all">
                            <span className="text-lg">📈</span> Progress
                        </button>
                    </nav>

                    {/* Bottom Sidebar Action */}
                    <div className="mt-auto p-4 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
                        <p className="text-xs font-medium opacity-80">Pro Plan</p>
                        <p className="text-sm font-bold">Unlimited PDFs</p>
                    </div>
                </div>
            </aside>

            {/* 2. MAIN CONTENT AREA */}
            <main className="flex-1 md:ml-64 p-6 md:p-10">

                {/* Welcome Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
                        <p className="text-slate-500 mt-1">Select a room to start learning with MirajTutor.</p>
                    </div>

                    <button onClick={(e)=>{setIsModalOpen(true); console.log("Clicked");}} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center gap-2 w-fit">
                        <span className="text-xl">+</span> Create New Room
                    </button>
                </div>

                {/* 3. THE ROOM GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                    {rooms.map((room, index) => (
                        <RoomCard key={index} room={room} onDelete={() => setDeleteConfirm(room)} />
                    ))}
                </div>

                {deleteConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Room</h3>
                            <p className="text-slate-500 text-sm mb-6">
                                Are you sure you want to delete <span className="font-semibold text-slate-700">{deleteConfirm.roomname}</span>? This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                                <button onClick={() => handleDeleteRoom(deleteConfirm.roomId)} className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95">Delete</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
            <CreateRoomModal
                userId=""
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={handleCreateRoom}
            />
        </div>
    )
}


function RoomCard({ room, onDelete }) {
  return (
    <div className="relative group/card">
      <Link 
        href={`/dashboard/room?roomId=${room.roomId}`} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block"
      >
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-100 transition-all cursor-pointer group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110"></div>
          
          <div className="relative">
            <div className="h-14 w-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-200 mb-6">
              {room.roomname ? room.roomname[0].toUpperCase() : 'R'}
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              {room.roomname}
            </h3>
            <p className="text-sm font-medium text-slate-400 mb-6">{room.topic}</p>
            
            <div className="flex items-center justify-between pt-6 border-t border-slate-50">
              <div className="flex items-center gap-2">
                 <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                 <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                   ID: {room.roomId.substring(0, 8)}...
                 </span>
              </div>
              <span className="text-indigo-600 font-bold text-sm group-hover:translate-x-1 transition-transform inline-block">Open →</span>
            </div>
          </div>
        </div>
      </Link>

      <button
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }}
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-full border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 opacity-0 group-hover/card:opacity-100 transition-all shadow-sm"
        title="Delete room"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </button>
    </div>
  );
}

export default Page
