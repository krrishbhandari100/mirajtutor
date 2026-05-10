"use client"
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react'
import CreateRoomModal from './RoomAddModel';
import Link from 'next/link';


const Page = () => {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [rooms, setRooms] = useState([]);

    const handleCreateRoom = async (roomData) => {
        // Add to local list (Later, this will be an API call to your Backend)
        
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
                        <RoomCard key={index} room={room} />
                    ))}

                    
                </div>
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


function RoomCard({ room }) {
  return (
    // Wrap with Link and target="_blank" for an external/new tab
    <Link 
      href={`/dashboard/room?roomId=${room.roomId}`} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block"
    >
      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-100 transition-all cursor-pointer group relative overflow-hidden">
        {/* Decorative Accent */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110"></div>
        
        <div className="relative">
          <div className="h-14 w-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-200 mb-6">
            {/* Displaying the first letter of the room name */}
            {room.roomname ? room.roomname[0].toUpperCase() : 'R'}
          </div>
          
          <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
            {room.roomname}
          </h3>
          <p className="text-sm font-medium text-slate-400 mb-6">{room.topic}</p>
          
          <div className="flex items-center justify-between pt-6 border-t border-slate-50">
            <div className="flex items-center gap-2">
               <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
               {/* Displaying a shortened version of the roomId */}
               <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                 ID: {room.roomId.substring(0, 8)}...
               </span>
            </div>
            <span className="text-indigo-600 font-bold text-sm group-hover:translate-x-1 transition-transform inline-block">Open →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default Page
