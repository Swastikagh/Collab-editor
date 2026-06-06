import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import './Dashboard.css';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [joinId, setJoinId] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Load rooms on mount
  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms');
      setRooms(res.data.rooms);
    } catch (err) {
      setError('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/rooms', { name: newRoomName });
      setRooms(prev => [res.data.room, ...prev]);
      setNewRoomName('');
    } catch (err) {
      setError('Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinId.trim()) return;
    try {
      await api.post(`/rooms/${joinId.trim()}/join`);
      navigate(`/room/${joinId.trim()}`);
    } catch (err) {
      setError('Room not found or failed to join');
    }
  };

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-logo">
          <span>⌨</span>
          <span>CollabCode</span>
        </div>
        <div className="dash-user">
          <span className="dash-username">{user?.name}</span>
          <button className="btn btn-ghost" onClick={logout}>Sign out</button>
        </div>
      </header>

      <main className="dash-main">
        <div className="dash-welcome">
          <h1>Good to see you, <span>{user?.name?.split(' ')[0]}</span></h1>
          <p>Pick up where you left off or start something new.</p>
        </div>

        {error && <p className="error-msg">{error}</p>}

        <div className="dash-actions">
          {/* Create room */}
          <div className="dash-card">
            <h2>New Room</h2>
            <p>Start a fresh collaborative session</p>
            <form onSubmit={handleCreate} className="dash-form">
              <input
                type="text"
                placeholder="Room name (e.g. Backend Interview Prep)"
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
              />
              <button className="btn btn-primary" disabled={creating}>
                {creating ? 'Creating...' : '+ Create'}
              </button>
            </form>
          </div>

          {/* Join room */}
          <div className="dash-card">
            <h2>Join Room</h2>
            <p>Enter a room ID shared by a teammate</p>
            <form onSubmit={handleJoin} className="dash-form">
              <input
                type="text"
                placeholder="Paste room ID here"
                value={joinId}
                onChange={e => setJoinId(e.target.value)}
              />
              <button className="btn btn-ghost">Join →</button>
            </form>
          </div>
        </div>

        {/* Room list */}
        <section className="dash-rooms">
          <h2>Your Rooms</h2>
          {loading ? (
            <p className="dash-loading">Loading rooms...</p>
          ) : rooms.length === 0 ? (
            <p className="dash-empty">No rooms yet. Create one above.</p>
          ) : (
            <div className="rooms-grid">
              {rooms.map(room => (
                <div
                  key={room.id}
                  className="room-card"
                  onClick={() => navigate(`/room/${room.id}`)}
                >
                  <div className="room-card-header">
                    <span className="room-icon">{'</>'}</span>
                    <span className="room-members">
                      {room.members?.length || 0} member{room.members?.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <h3 className="room-name">{room.name}</h3>
                  <p className="room-files">
                    {room.files?.length || 0} file{room.files?.length !== 1 ? 's' : ''}
                  </p>
                  <div className="room-id">
                    <span>ID: {room.id.slice(0, 8)}...</span>
                    <button
                      className="copy-btn"
                      onClick={e => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(room.id);
                      }}
                    >
                      Copy ID
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
