
import React, { useState, useEffect, useRef } from 'react';
import { WebRTCManager } from './utils/WebRTCManager';
import { Monitor, Smartphone, MousePointer2, Globe } from 'lucide-react';


const translations = {
  uz: {
    title: "RemoteConnect",
    status: "Holat",
    idle: "Kutish",
    shareScreen: "Ekran Ulashish",
    shareDesc: "Boshqa qurilma ushbu qurilmani boshqarishi uchun unikal ID yarating.",
    generateId: "ID Yaratish",
    connectDevice: "Qurilmaga Ulanish",
    connectDesc: "Masofaviy qurilmani boshqarish uchun 6 xonali ID kiriting.",
    enterId: "ID kiriting",
    connect: "Ulanish",
    readyConnect: "Ulanishga Tayyor",
    yourId: "Sizning ID raqamingiz",
    waiting: "Kiruvchi ulanish kutilmoqda...",
    sessionActive: "Sessiya Faol",
    sharing: "Ekran Ulashilmoqda...",
    sharingDesc: "Siz ekraningizni masofaviy qurilma bilan ulashmoqdasiz. Ularning kursor harakatlari ushbu sahifada ko'rinadi.",
    remoteUser: "Masofaviy Foydalanuvchi",
    controlling: "Boshqarilmoqda",
    enterValidId: "ID kiriting",
    footer: "RRG SOFT tomonidan ishlab chiqarilgan"
  },
  ru: {
    title: "RemoteConnect",
    status: "Статус",
    idle: "Ожидание",
    shareScreen: "Поделиться Экраном",
    shareDesc: "Создайте уникальный ID, чтобы разрешить другому устройству управлять этим.",
    generateId: "Создать ID",
    connectDevice: "Подключиться",
    connectDesc: "Введите ID для управления удаленным устройством.",
    enterId: "Введите ID",
    connect: "Подключить",
    readyConnect: "Готов к подключению",
    yourId: "Ваш ID",
    waiting: "Ожидание входящего подключения...",
    sessionActive: "Сессия Активна",
    sharing: "Демонстрация Экрана...",
    sharingDesc: "Вы делитесь экраном с удаленным устройством. Их курсор отображается на этой странице.",
    remoteUser: "Удаленный Пользователь",
    controlling: "Управление",
    enterValidId: "Введите правильный ID",
    footer: "Разработано RRG SOFT"
  },
  en: {
    title: "RemoteConnect",
    status: "Status",
    idle: "Idle",
    shareScreen: "Share Screen",
    shareDesc: "Generate a unique ID to allow another device to control this one.",
    generateId: "Generate Session ID",
    connectDevice: "Connect to Device",
    connectDesc: "Enter the session ID to control a remote device.",
    enterId: "Enter ID",
    connect: "Connect",
    readyConnect: "Ready to Connect",
    yourId: "Your Session ID",
    waiting: "Waiting for incoming connection...",
    sessionActive: "Session Active",
    sharing: "Sharing Screen...",
    sharingDesc: "You are sharing your screen with a remote device. Their cursor movements are shown on this page.",
    remoteUser: "Remote User",
    controlling: "Controlling",
    enterValidId: "Enter a valid ID",
    footer: "Produced by RRG SOFT"
  }
};

function App() {
  const [step, setStep] = useState('home'); // home, hosting, connecting, session
  const [role, setRole] = useState(null); // host, client
  const [sessionId, setSessionId] = useState('');
  const [remoteStream, setRemoteStream] = useState(null);
  const [status, setStatus] = useState('Idle'); // This serves as internal status key
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [lang, setLang] = useState('uz');

  const rtcRef = useRef(null);
  const videoRef = useRef(null);
  const sessionInputRef = useRef(null);

  const t = translations[lang];

  useEffect(() => {
    // Initialize WebRTC Manager
    // Note: No signaling URL needed for PeerJS implementation
    rtcRef.current = new WebRTCManager(
      (status, data) => {
        console.log("RTC Status:", status, data);
        setStatus(status);
        if (status === 'SESSION_CREATED') {
          // Host is ready with ID
          setSessionId(data);
          setStep('hosting');
        }
        if (status === 'SESSION_JOINED') {
          // Client joined (or host received connection)
          setStep('session');
        }
        if (status === 'SESSION_ENDED') {
          setStep('home');
          setRole(null);
          setRemoteStream(null);
          setStatus("Disconnected");
          alert("Ulanish uzildi");
        }
        if (status === "ERROR") {
          alert("Xatolik: " + data);
        }
      },
      (stream) => {
        console.log("Received Remote Stream");
        setRemoteStream(stream);
        setStep('session');
      },
      (msg) => {
        if (msg.type === 'mousemove') {
          setCursorPos({ x: msg.x, y: msg.y });
        }
        if (msg.type === 'click') {
          // Visual feedback for click
          const ripple = document.createElement('div');
          ripple.className = 'fixed w-4 h-4 bg-red-500 rounded-full animate-ping pointer-events-none z-50';
          ripple.style.left = `${msg.x * window.innerWidth}px`;
          ripple.style.top = `${msg.y * window.innerHeight}px`;
          document.body.appendChild(ripple);
          setTimeout(() => ripple.remove(), 500);
        }
      }
    );

    return () => {
      if (rtcRef.current) rtcRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    if (remoteStream && videoRef.current) {
      videoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, step]);

  const startHosting = async () => {
    setRole('host');
    await rtcRef.current.startHosting();
  };

  const joinSession = () => {
    const id = sessionInputRef.current.value;
    if (id) {
      setSessionId(id);
      setRole('client');
      rtcRef.current.joinSession(id);
      setStep('connecting');
    } else {
      alert(t.enterValidId);
    }
  };

  const handleMouseMove = (e) => {
    if (role === 'client' && rtcRef.current) {
      // Send normalized coordinates
      const rect = e.target.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      rtcRef.current.sendMessage({ type: 'mousemove', x, y });
    }
  };

  const handleTouchMove = (e) => {
    if (role === 'client' && rtcRef.current) {
      // Prevent scrolling while controlling
      e.preventDefault();
      const rect = e.target.getBoundingClientRect();
      const touch = e.touches[0];
      const x = (touch.clientX - rect.left) / rect.width;
      const y = (touch.clientY - rect.top) / rect.height;
      rtcRef.current.sendMessage({ type: 'mousemove', x, y });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-blue-500 selection:text-white flex flex-col">

      {/* Navbar */}
      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          <Monitor className="text-blue-400" /> {t.title}
        </div>

        <div className="flex items-center gap-6">
          <div className="text-sm text-gray-400 hidden md:block">
            {t.status}: <span className="text-white">{status}</span>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1 border border-gray-700">
            <Globe className="w-4 h-4 text-gray-400 ml-2" />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="bg-transparent text-sm focus:outline-none p-1 text-gray-300 cursor-pointer"
            >
              <option value="uz">O'zb</option>
              <option value="ru">Рус</option>
              <option value="en">Eng</option>
            </select>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 min-h-[70vh]">

        {step === 'home' && (
          <div className="grid md:grid-cols-2 gap-12 w-full max-w-4xl">

            {/* Host Card */}
            <div className="bg-gray-800/50 p-8 rounded-2xl border border-gray-700 hover:border-blue-500/50 transition-all group backdrop-blur-sm">
              <div className="mb-6 bg-blue-500/10 w-16 h-16 rounded-full flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <Monitor className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{t.shareScreen}</h2>
              <p className="text-gray-400 mb-6">{t.shareDesc}</p>
              <button
                onClick={startHosting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
              >
                {t.generateId}
              </button>
            </div>

            {/* Client Card */}
            <div className="bg-gray-800/50 p-8 rounded-2xl border border-gray-700 hover:border-purple-500/50 transition-all group backdrop-blur-sm">
              <div className="mb-6 bg-purple-500/10 w-16 h-16 rounded-full flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                <Smartphone className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{t.connectDevice}</h2>
              <p className="text-gray-400 mb-6">{t.connectDesc}</p>
              <div className="space-y-4">
                <input
                  ref={sessionInputRef}
                  type="text"
                  placeholder={t.enterId}
                  maxLength={6}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors text-center text-xl tracking-widest placeholder:tracking-normal"
                />
                <button
                  onClick={joinSession}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-purple-900/20"
                >
                  {t.connect}
                </button>
              </div>
            </div>

          </div>
        )}

        {step === 'hosting' && (
          <div className="text-center relative">
            <h2 className="text-3xl font-bold mb-8">{t.readyConnect}</h2>
            <div className="bg-gray-800 p-8 rounded-3xl border border-gray-700 inline-block">
              <p className="text-gray-400 mb-2">{t.yourId}</p>
              <div className="text-6xl font-mono font-bold tracking-wider text-blue-400">
                {sessionId.split('').map((d, i) => <span key={i} className="mx-1">{d}</span>)}
              </div>
            </div>
            <p className="mt-8 text-gray-500 animate-pulse">{t.waiting}</p>

            <div
              className="fixed pointer-events-none transition-all duration-75 z-50"
              style={{
                left: `${cursorPos.x * window.innerWidth}px`,
                top: `${cursorPos.y * window.innerHeight}px`,
                display: (cursorPos.x === 0 && cursorPos.y === 0) ? 'none' : 'block'
              }}
            >
              <MousePointer2 className="w-6 h-6 text-red-500 fill-red-500/20" />
            </div>
          </div>
        )}

        {step === 'session' && role === 'client' && (
          <div className="w-full h-full flex flex-col items-center">
            <div className="relative w-full max-w-6xl aspect-video bg-black rounded-lg overflow-hidden border border-gray-700 shadow-2xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain cursor-crosshair touch-none"
                onMouseMove={handleMouseMove}
                onTouchMove={handleTouchMove}
                onClick={(e) => {
                  if (role === 'client' && rtcRef.current) {
                    const rect = e.target.getBoundingClientRect();
                    const x = (e.clientX - rect.left) / rect.width;
                    const y = (e.clientY - rect.top) / rect.height;
                    rtcRef.current.sendMessage({ type: 'click', x, y });
                  }
                }}
              />
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur px-3 py-1 rounded text-sm text-white/50">
                {t.controlling}: {sessionId}
              </div>
            </div>
          </div>
        )}

        {step === 'session' && role === 'host' && (
          <div className="text-center">
            <div className="bg-green-500/10 text-green-400 px-6 py-2 rounded-full inline-flex items-center gap-2 mb-8">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {t.sessionActive}
            </div>
            <h1 className="text-2xl mb-4">{t.sharing}</h1>
            <p className="text-gray-500 max-w-md mx-auto">
              {t.sharingDesc}
            </p>

            <div
              className="fixed pointer-events-none transition-all duration-75 z-50 flex flex-col items-start"
              style={{
                left: `${cursorPos.x * window.innerWidth}px`,
                top: `${cursorPos.y * window.innerHeight}px`
              }}
            >
              <MousePointer2 className="w-12 h-12 text-red-500 fill-red-500/20 drop-shadow-lg" />
              <div className="bg-red-500 text-white text-sm px-3 py-1 rounded-full shadow-lg font-bold whitespace-nowrap">
                {t.remoteUser}
              </div>
            </div>

            <div className="mt-8 bg-yellow-500/10 border border-yellow-500/50 p-4 rounded-xl max-w-lg mx-auto backdrop-blur-sm">
              <p className="text-yellow-200 text-sm">
                ⚠️ <b>Eslatma:</b> Brauzer xavfsizligi tufayli, bu dastur sichqonchani to'liq boshqara olmaydi.
                Faqatgina masofaviy foydalanuvchi qayerga bosishni ko'rsatib, <b>vizual kursor</b> orqali yordam bera oladi.
              </p>
            </div>
          </div>
        )}

      </main>

      {/* Footer Branding */}
      <footer className="p-6 text-center text-gray-600 text-sm">
        <a h-ref="https://t.me/rrgfcoder" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
          {t.footer}
        </a>
      </footer>

    </div>
  );
}

export default App;
