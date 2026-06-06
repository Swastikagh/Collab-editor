import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import api from '../api';
import './Room.css';

export default function Room() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const socketRef = useSocket(roomId);

  const [room, setRoom] = useState(null);
  const [activeFile, setActiveFile] = useState(null);
  const [code, setCode] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chat'); // chat | output | users
  const messagesEndRef = useRef(null);
  const isRemoteChange = useRef(false);
  const saveTimer = useRef(null);

  // ── LOAD ROOM DATA ──────────────────────────────────────────
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await api.get(`/rooms/${roomId}`);
        const roomData = res.data.room;
        setRoom(roomData);
        setMessages(roomData.messages || []);

        if (roomData.files?.length > 0) {
          setActiveFile(roomData.files[0]);
          setCode(roomData.files[0].content);
        }
      } catch {
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [roomId]);

  // ── SOCKET EVENTS ───────────────────────────────────────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !room) return;

    // Join the room's socket channel
    socket.emit('join_room', { roomId, userName: user.name });

    // Someone else changed the code — update our editor
    socket.on('code_update', ({ fileId, content }) => {
      if (fileId === activeFile?.id) {
        isRemoteChange.current = true; // flag so we don't re-emit this change
        setCode(content);
      }
    });

    // Who is online in this room
    socket.on('online_users', (users) => {
      setOnlineUsers(users);
    });

    // New chat message arrived
    socket.on('new_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      socket.off('code_update');
      socket.off('online_users');
      socket.off('new_message');
    };
  }, [room, activeFile]);

  // ── HANDLE CODE CHANGE ──────────────────────────────────────
  const handleCodeChange = useCallback((value) => {
    // If this change came from a remote user, don't re-emit it
    if (isRemoteChange.current) {
      isRemoteChange.current = false;
      return;
    }

    setCode(value);

    // Debounce: wait 1.5s after user stops typing before sending
    // This prevents flooding the server with every keystroke
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      socketRef.current?.emit('code_change', {
        roomId,
        fileId: activeFile.id,
        content: value,
        userId: user.id
      });
    }, 1500);
  }, [activeFile, roomId, user]);

  // ── SEND CHAT MESSAGE ───────────────────────────────────────
  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    socketRef.current?.emit('send_message', {
      roomId,
      content: newMessage,
      userName: user.name
    });
    setNewMessage('');
  };

  // ── RUN CODE ────────────────────────────────────────────────
  // Calls our backend which runs code in a Docker container
  const runCode = async () => {
    setRunning(true);
    setActiveTab('output');
    setOutput('Running...');
    try {
      const res = await api.post('/rooms/execute', {
        code,
        language: activeFile?.language || 'javascript'
      });
      setOutput(res.data.output || 'No output');
    } catch (err) {
      setOutput(err.response?.data?.error || 'Execution failed');
    } finally {
      setRunning(false);
    }
  };

  // Auto scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) return <div className="room-loading">Loading room...</div>;

  return (
    <div className="room">
      {/* ── TOP BAR ── */}
      <header className="room-header">
        <div className="room-header-left">
          <button className="btn btn-ghost back-btn" onClick={() => navigate('/dashboard')}>
            ← Dashboard
          </button>
          <span className="room-title">{room?.name}</span>
        </div>
        <div className="room-header-right">
          <div className="online-pills">
            {onlineUsers.map(u => (
              <span key={u.userId} className="online-pill" title={u.name}>
                {u.name?.charAt(0).toUpperCase()}
              </span>
            ))}
          </div>
          <button
            className="btn btn-primary run-btn"
            onClick={runCode}
            disabled={running}
          >
            {running ? '⏳ Running...' : '▶ Run'}
          </button>
        </div>
      </header>

      <div className="room-body">
        {/* ── FILE SIDEBAR ── */}
        <aside className="file-sidebar">
          <div className="file-sidebar-header">FILES</div>
          {room?.files?.map(file => (
            <div
              key={file.id}
              className={`file-item ${activeFile?.id === file.id ? 'active' : ''}`}
              onClick={() => {
                setActiveFile(file);
                setCode(file.content);
              }}
            >
              <span className="file-icon">📄</span>
              <span className="file-name">{file.name}</span>
            </div>
          ))}
        </aside>

        {/* ── EDITOR ── */}
        <main className="editor-area">
          <div className="editor-tab-bar">
            <span className="editor-filename">
              {activeFile?.name}
            </span>
            <span className="editor-lang">{activeFile?.language}</span>
          </div>
          <Editor
            height="100%"
            language={activeFile?.language || 'javascript'}
            value={code}
            onChange={handleCodeChange}
            theme="vs-dark"
            options={{
              fontSize: 14,
              fontFamily: 'JetBrains Mono, monospace',
              minimap: { enabled: false },
              padding: { top: 16 },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              lineNumbers: 'on',
              wordWrap: 'on',
            }}
          />
        </main>

        {/* ── RIGHT PANEL ── */}
        <aside className="right-panel">
          <div className="panel-tabs">
            {['chat', 'output', 'users'].map(tab => (
              <button
                key={tab}
                className={`panel-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'chat' ? '💬' : tab === 'output' ? '⚡' : '👥'}
                {' '}{tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Chat */}
          {activeTab === 'chat' && (
            <div className="panel-content chat-panel">
              <div className="messages">
                {messages.map((msg, i) => (
                  <div key={i} className={`message ${msg.user?.id === user.id ? 'own' : ''}`}>
                    <span className="msg-author">{msg.user?.name}</span>
                    <span className="msg-content">{msg.content}</span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={sendMessage} className="chat-form">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Send a message..."
                />
                <button className="btn btn-primary" type="submit">→</button>
              </form>
            </div>
          )}

          {/* Output */}
          {activeTab === 'output' && (
            <div className="panel-content output-panel">
              <pre className="output-text">
                {output || 'Click ▶ Run to execute your code'}
              </pre>
            </div>
          )}

          {/* Users */}
          {activeTab === 'users' && (
            <div className="panel-content users-panel">
              <p className="panel-label">ONLINE NOW</p>
              {onlineUsers.map(u => (
                <div key={u.userId} className="user-item">
                  <span className="user-avatar">{u.name?.charAt(0).toUpperCase()}</span>
                  <span className="user-name">{u.name}</span>
                  <span className="online-dot" />
                </div>
              ))}
              <p className="panel-label" style={{ marginTop: 20 }}>ALL MEMBERS</p>
              {room?.members?.map(m => (
                <div key={m.id} className="user-item">
                  <span className="user-avatar">{m.user?.name?.charAt(0).toUpperCase()}</span>
                  <span className="user-name">{m.user?.name}</span>
                </div>
              ))}
              <div className="room-id-box">
                <p className="panel-label">ROOM ID (share to invite)</p>
                <div className="room-id-value">
                  <span>{roomId}</span>
                  <button onClick={() => navigator.clipboard.writeText(roomId)}>
                    Copy
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
