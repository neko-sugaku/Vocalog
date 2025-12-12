import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  Music, 
  User, 
  FileText, 
  Edit3, 
  Check, 
  Plus, 
  X,
  ChevronUp,
  ChevronDown,
  Mic,
  Dice5,
  Download,
  Upload,
  Trash2,
  AlertCircle,
  FileSpreadsheet,
  Info,
  Sparkles,
  Lightbulb,
  BrainCircuit,
  KeyRound 
} from 'lucide-react';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously, 
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  getDocs,
  onSnapshot, 
  serverTimestamp, 
  query, 
  orderBy 
} from 'firebase/firestore';

// --- Firebase Configuration & Initialization ---
// 【重要】ここの中身を、あなたのFirebaseコンソールからコピーした内容に書き換えてください！
const firebaseConfig = {
  apiKey: "AIzaSyBHfWncijNrKBKgUIdOVuyA5WDI9Vj_Z4A",
  authDomain: "karaoke-app-b7e0a.firebaseapp.com",
  projectId: "karaoke-app-b7e0a",
  storageBucket: "karaoke-app-b7e0a.firebasestorage.app",
  messagingSenderId: "1085274180598",
  appId: "1:1085274180598:web:df306dcbe9ee748c6955d7",
  measurementId: "G-3W9LNHSPND"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'my-karaoke-app';

// ★ここが変更点！データを共有するための「共通ID」を定義
const SHARED_USER_ID = 'shared_vocalog_data'; 

// --- Constants & Helpers ---
const SCORES = ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1', '-'];
const KEYS = ['+6', '+5', '+4', '+3', '+2', '+1', '0', '-1', '-2', '-3', '-4', '-5', '-6'];
const STATUSES = ['済', '未'];

const getScoreValue = (score) => {
  if (score === '-') return -1;
  return parseInt(score, 10);
};

const getKeyValue = (key) => {
  return parseInt(key, 10);
};

// Gemini API Call Helper
const callGemini = async (prompt, apiKey) => {
  if (!apiKey) throw new Error("APIキーが設定されていません");
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json", 
          }
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

// XLSX Library Loader
const loadXLSX = () => {
  return new Promise((resolve, reject) => {
    if (window.XLSX) {
      resolve(window.XLSX);
      return;
    }
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => reject(new Error("Excelライブラリの読み込みに失敗しました。"));
    document.head.appendChild(script);
  });
};

// --- Sub-Components ---

// EditableText
const EditableText = ({ value, onSave, className, placeholder }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    if (localValue !== value) {
      onSave(localValue);
    }
  };

  const handleClick = (e) => {
    e.stopPropagation();
    setIsFocused(true);
  };

  if (isFocused) {
    return (
      <textarea
        ref={inputRef}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onClick={(e) => e.stopPropagation()}
        className={`${className} resize-none overflow-y-auto leading-tight absolute inset-0 z-10 shadow-md bg-white border-2 border-pink-300 rounded`}
        placeholder={placeholder}
        style={{ height: '100%', minHeight: '3rem', padding: '4px' }}
      />
    );
  }

  return (
    <div 
      onClick={handleClick}
      className={`${className} truncate cursor-text flex items-center h-full w-full hover:bg-gray-50 rounded px-1`}
      title={localValue || placeholder}
    >
      {localValue || <span className="text-gray-300">{placeholder}</span>}
    </div>
  );
};

// HeaderButton
const HeaderButton = ({ mode, label, colorClass, icon: Icon, activeMode, onClick, animationClass }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    if (onClick) onClick(mode);
    setTimeout(() => setIsAnimating(false), 500);
  };

  return (
    <button
      onClick={handleClick}
      className={`flex-1 flex items-center justify-center gap-1 md:gap-2 px-2 py-3 font-bold transition-all duration-200 min-w-[60px] md:min-w-[80px]
        ${activeMode === mode 
          ? `${colorClass} text-white shadow-md transform scale-95 ring-2 ring-white/50` 
          : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm'
        } rounded-xl text-xs md:text-base`}
    >
      {Icon && (
        <Icon 
          size={18} 
          className={`transition-transform ${isAnimating ? animationClass : ''}`} 
        />
      )}
      <span className="hidden md:inline whitespace-nowrap">{label}</span>
      <span className="md:hidden whitespace-nowrap">
        {label === 'リスト編集' ? '編集' : 
         label === 'おまかせ10選' ? '10選' : 
         label === '何でも検索' ? '検索' : 
         label === 'AI分析' ? 'AI' : 
         label.slice(0,2)}
      </span>
    </button>
  );
};

export default function App() {
  // --- State ---
  const [user, setUser] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchMode, setSearchMode] = useState('all');
  const [searchText, setSearchText] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [frozenOrder, setFrozenOrder] = useState(null); 
  
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedSong, setSelectedSong] = useState(null);

  const [isRouletteSpinning, setIsRouletteSpinning] = useState(false);
  const [rouletteResults, setRouletteResults] = useState(null); 

  // API Key State
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // AI Analysis States
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null, 
    title: '',
    message: '',
    data: null
  });

  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  const fileInputRef = useRef(null);

  const showMessage = (text, type = 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage({ text: '', type: '' }), 5000);
  };

  // --- Auth & API Key Check ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "AIzaSy...") {
          console.warn("Firebase Config not set properly");
          return;
        }
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth Error:", error);
        showMessage("認証エラーが発生しました", "error");
      }
    };
    initAuth();
    
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setGeminiApiKey(savedKey);
    }

    const unsubscribe = onAuthStateChanged(auth, setUser);
    loadXLSX().catch(err => console.error(err));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // 【修正点】user.uid ではなく SHARED_USER_ID を使う
    const q = query(
      collection(db, 'artifacts', appId, 'users', SHARED_USER_ID, 'songs'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedSongs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSongs(fetchedSongs);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      showMessage("データの読み込みに失敗しました", "error");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // --- AI Analysis Function ---
  const handleAiAnalysis = async () => {
    if (!geminiApiKey) {
      setShowApiKeyModal(true);
      return;
    }

    if (songs.length === 0) {
      showMessage("データがありません。まずは曲を登録してください。", "error");
      return;
    }

    setAiAnalysisLoading(true);
    
    const analyzedSongs = songs
      .filter(s => s.score !== '-' || s.memo.length > 0)
      .slice(0, 20)
      .map(s => `- 曲名:「${s.title}」 歌手:${s.artist} 点数:${s.score} メモ:${s.memo}`)
      .join("\n");

    const prompt = `
      あなたはプロのボイストレーナー兼カラオケ選曲アドバイザーです。
      以下のユーザーの歌唱リスト（点数とメモ）を詳細に分析してください。

      [ユーザーの歌唱データ]
      ${analyzedSongs}

      以下の2つの情報をJSON形式で出力してください。
      
      1. "recommendations": このユーザーが好みそうな、まだリストにない曲を5曲。
         各曲は { "title": "曲名", "artist": "歌手名", "reason": "一言おすすめ理由" } の形式。
      
      2. "advice": 歌唱データとメモの内容から、ユーザーの歌声の特徴や癖、意識している点を分析し、
         より上手くなるための具体的で優しいアドバイス。
         具体的かつ明るく励ますような口調で、300文字程度。

      出力JSONフォーマット:
      {
        "recommendations": [...],
        "advice": "..."
      }
    `;

    try {
      const jsonString = await callGemini(prompt, geminiApiKey);
      if (jsonString) {
        const cleanJson = jsonString.replace(/```json|```/g, '').trim();
        const result = JSON.parse(cleanJson);
        setAiAnalysisResult(result);
      } else {
        throw new Error("AIからの応答が空でした");
      }
    } catch (error) {
      console.error("AI Analysis Error:", error);
      showMessage("分析に失敗しました。APIキーが正しいか確認してください。", "error");
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  const saveApiKey = (key) => {
    if (!key) return;
    localStorage.setItem('gemini_api_key', key);
    setGeminiApiKey(key);
    setShowApiKeyModal(false);
    showMessage("APIキーを保存しました！", "success");
  };

  // --- Layout & Scaling Logic ---
  const containerStyle = {
    width: '100%',
    padding: '0 0.5rem',
  };

  const gridTemplateColumns = isEditing 
    ? '3em 2fr 1.5fr 3.5em 2fr 2fr 3em 3em'
    : '3em 2fr 1.5fr 3.5em 2fr 2fr 3em';

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: gridTemplateColumns,
    gap: '4px',
    alignItems: 'center'
  };

  const itemStyle = {
    ...gridStyle,
    height: '3.5rem',
    position: 'relative'
  };

  const scrollContainerStyle = {
    width: '100%',
    minWidth: '600px'
  };

  // --- Sorting & Freezing Logic ---
  const baseSortedSongs = useMemo(() => {
    let sortable = [...songs];
    if (sortConfig.key) {
      sortable.sort((a, b) => {
        let aValue = a[sortConfig.key] || '';
        let bValue = b[sortConfig.key] || '';

        if (sortConfig.key === 'score') {
          aValue = getScoreValue(aValue);
          bValue = getScoreValue(bValue);
        } else if (sortConfig.key === 'key') {
          aValue = getKeyValue(aValue);
          bValue = getKeyValue(bValue);
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [songs, sortConfig]);

  const handleToggleEdit = () => {
    if (!isEditing) {
      setFrozenOrder(baseSortedSongs.map(s => s.id));
    } else {
      setFrozenOrder(null);
    }
    setIsEditing(!isEditing);
  };

  const displaySongs = useMemo(() => {
    let orderedList = [];

    if (isEditing && frozenOrder) {
      const songMap = new Map(songs.map(s => [s.id, s]));
      const newSongs = songs.filter(s => !frozenOrder.includes(s.id));
      const frozenSongs = frozenOrder
        .map(id => songMap.get(id))
        .filter(s => s !== undefined);

      orderedList = [...newSongs, ...frozenSongs];
    } else {
      orderedList = baseSortedSongs;
    }

    if (searchText) {
      const lowerText = searchText.toLowerCase();
      orderedList = orderedList.filter(song => {
        const matchTitle = song.title?.toLowerCase().includes(lowerText);
        const matchArtist = song.artist?.toLowerCase().includes(lowerText);
        const matchLyrics = song.lyrics?.toLowerCase().includes(lowerText);
        const matchMemo = song.memo?.toLowerCase().includes(lowerText);

        if (searchMode === 'title') return matchTitle;
        if (searchMode === 'artist') return matchArtist;
        if (searchMode === 'lyrics') return matchLyrics;
        return matchTitle || matchArtist || matchLyrics || matchMemo;
      });
    }

    return orderedList;
  }, [baseSortedSongs, songs, isEditing, frozenOrder, searchText, searchMode]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      if (key === 'score' || key === 'key' || key === 'status') {
        direction = 'desc';
      } else {
        direction = 'asc';
      }
    }
    setSortConfig({ key, direction });
  };

  // CRUD Actions (Update SHARED_USER_ID)
  const updateSong = async (id, field, value) => {
    if (!user) return;
    const ref = doc(db, 'artifacts', appId, 'users', SHARED_USER_ID, 'songs', id);
    await updateDoc(ref, { [field]: value });
  };

  const addNewSong = async () => {
    if (!user) return;
    await addDoc(collection(db, 'artifacts', appId, 'users', SHARED_USER_ID, 'songs'), {
      title: '',
      artist: '',
      score: '-',
      key: '0',
      memo: '',
      lyrics: '',
      status: '未',
      createdAt: serverTimestamp()
    });
  };

  const handleDeleteClick = (e, id, title) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault(); 
    }
    setConfirmModal({
      isOpen: true,
      type: 'delete',
      title: '楽曲の削除',
      message: `「${title}」を削除してもよろしいですか？\nこの操作は元に戻せません。`,
      data: id
    });
  };

  const executeDelete = async () => {
    const id = confirmModal.data;
    setConfirmModal({ ...confirmModal, isOpen: false });
    
    if (!user) return;
    
    try {
      const ref = doc(db, 'artifacts', appId, 'users', SHARED_USER_ID, 'songs', id);
      await deleteDoc(ref);
      showMessage(`削除しました`, "success");
    } catch (error) {
      console.error("削除エラー:", error);
      showMessage("削除に失敗しました", "error");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const XLSX = await loadXLSX();
      const templateData = [
        {
          "点数": "10",
          "曲名": "サンプル曲",
          "歌手": "サンプル歌手",
          "キー": "0",
          "メモ": "これはサンプルです",
          "歌詞": "サンプル歌詞",
          "状態": "済"
        }
      ];
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Songs");
      XLSX.writeFile(wb, "karaoke_list_template.xlsx");
    } catch (error) {
      console.error("Template Download Error:", error);
      showMessage("ライブラリの読み込みに失敗しました", "error");
    }
  };

  const triggerImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; 
      fileInputRef.current.click();
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setConfirmModal({
      isOpen: true,
      type: 'import',
      title: 'インポート確認',
      message: `「${file.name}」を読み込みます。\n現在のリストはすべて消去され、上書きされます。\nよろしいですか？`,
      data: file
    });
  };

  const executeImport = async () => {
    const file = confirmModal.data;
    setConfirmModal({ ...confirmModal, isOpen: false });
    setLoading(true);
    showMessage("インポート処理を開始します...", "info");

    try {
      const XLSX = await loadXLSX();
      const reader = new FileReader();
      
      reader.onload = async (evt) => {
        try {
          const data = new Uint8Array(evt.target.result);
          const wb = XLSX.read(data, { type: 'array' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const jsonData = XLSX.utils.sheet_to_json(ws);

          if (!jsonData || jsonData.length === 0) {
            showMessage("データが見つかりませんでした。", "error");
            setLoading(false);
            return;
          }

          const songsRef = collection(db, 'artifacts', appId, 'users', SHARED_USER_ID, 'songs');
          const snapshot = await getDocs(songsRef);
          const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deletePromises);

          for (const row of jsonData) {
            await addDoc(songsRef, {
              score: row['点数'] ? String(row['点数']) : '-',
              title: row['曲名'] ? String(row['曲名']) : '',
              artist: row['歌手'] ? String(row['歌手']) : '',
              key: row['キー'] ? String(row['キー']) : '0',
              memo: row['メモ'] ? String(row['メモ']) : '',
              lyrics: row['歌詞'] ? String(row['歌詞']) : '',
              status: row['状態'] ? String(row['状態']) : '未',
              createdAt: serverTimestamp()
            });
          }
          
          showMessage('インポート完了しました！', "success");
          
        } catch (innerError) {
          console.error('Process Error:', innerError);
          showMessage(`処理エラー: ${innerError.message}`, "error");
        } finally {
          setLoading(false);
        }
      };
      
      reader.readAsArrayBuffer(file);

    } catch (error) {
      console.error('Import Error:', error);
      showMessage(`初期化エラー: ${error.message}`, "error");
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const XLSX = await loadXLSX();
      const data = displaySongs.map(s => ({
        点数: s.score,
        曲名: s.title,
        歌手: s.artist,
        キー: s.key,
        メモ: s.memo,
        歌詞: s.lyrics,
        状態: s.status
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Songs");
      XLSX.writeFile(wb, "karaoke_list.xlsx");
      showMessage("エクスポートしました", "success");
    } catch (error) {
      console.error("Export Error:", error);
      showMessage("エクスポートに失敗しました", "error");
    }
  };

  const startRoulette = () => {
    if (songs.length === 0) return;
    setIsRouletteSpinning(true);
    setTimeout(() => {
      const shuffled = [...songs].sort(() => 0.5 - Math.random());
      const picked = shuffled.slice(0, 10);
      setRouletteResults(picked);
      setIsRouletteSpinning(false);
    }, 800);
  };

  const getRecommendations = (currentSong) => {
    if (!currentSong) return { sameScore: [], sameArtist: [] };
    const shuffle = (array) => array.sort(() => 0.5 - Math.random());
    const sameScore = songs.filter(s => s.id !== currentSong.id && s.score === currentSong.score && s.score !== '-');
    const sameArtist = songs.filter(s => s.id !== currentSong.id && s.artist === currentSong.artist && s.artist !== '');
    return {
      sameScore: shuffle(sameScore).slice(0, 8),
      sameArtist: shuffle(sameArtist).slice(0, 8)
    };
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <span className="text-gray-300 text-[10px] ml-1">▼</span>;
    return sortConfig.direction === 'asc' 
      ? <ChevronUp size={14} className="inline ml-1" /> 
      : <ChevronDown size={14} className="inline ml-1" />;
  };

  return (
    <div className="min-h-screen bg-pink-50 font-sans text-gray-800 pb-10 relative">
      
      {/* Status Message Bar */}
      {statusMessage.text && (
        <div className={`fixed top-0 left-0 right-0 z-[100] p-4 text-white font-bold text-center shadow-lg animate-fade-in-down
          ${statusMessage.type === 'error' ? 'bg-red-500' : 
            statusMessage.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}>
          <div className="flex items-center justify-center gap-2">
            {statusMessage.type === 'error' ? <AlertCircle size={20} /> : 
             statusMessage.type === 'success' ? <Check size={20} /> : <Info size={20} />}
            {statusMessage.text}
          </div>
        </div>
      )}

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 border-4 border-indigo-300">
            <h3 className="text-xl font-bold text-indigo-800 mb-2 flex items-center gap-2">
              <KeyRound /> APIキー設定
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              AI分析機能を使用するには、Google GeminiのAPIキーが必要です。キーはブラウザに保存され、次回以降は入力不要です。
            </p>
            <input 
              type="password"
              placeholder="APIキーを入力..."
              className="w-full p-2 border rounded mb-4"
              onChange={(e) => setGeminiApiKey(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowApiKeyModal(false)}
                className="px-4 py-2 text-gray-500 hover:text-gray-700"
              >
                キャンセル
              </button>
              <button 
                onClick={() => saveApiKey(geminiApiKey)}
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 font-bold"
              >
                保存して開始
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center border-4 border-pink-200">
            <div className="flex justify-center mb-4 text-pink-500">
              {confirmModal.type === 'delete' ? <Trash2 size={48} /> : <Upload size={48} />}
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{confirmModal.title}</h3>
            <p className="text-gray-600 mb-6 whitespace-pre-wrap leading-relaxed">{confirmModal.message}</p>
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="px-6 py-2 rounded-full bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 transition-colors"
              >
                キャンセル
              </button>
              <button 
                onClick={confirmModal.type === 'delete' ? executeDelete : executeImport}
                className={`px-6 py-2 rounded-full text-white font-bold shadow-md transition-colors
                  ${confirmModal.type === 'delete' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
              >
                {confirmModal.type === 'delete' ? '削除する' : 'インポート実行'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Search Area */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 pt-4 px-2 pb-2 shadow-lg w-full">
        {/* Header Buttons Container */}
        <div className="flex w-full gap-2 overflow-x-auto px-2 mb-2" style={containerStyle}>
          <HeaderButton mode="title" label="曲名" colorClass="bg-blue-500" icon={Music} activeMode={searchMode} onClick={setSearchMode} animationClass="animate-swing" />
          <HeaderButton mode="artist" label="歌手" colorClass="bg-red-500" icon={User} activeMode={searchMode} onClick={setSearchMode} animationClass="animate-jump" />
          <HeaderButton mode="lyrics" label="歌詞" colorClass="bg-yellow-500" icon={FileText} activeMode={searchMode} onClick={setSearchMode} animationClass="animate-shake" />
          <HeaderButton mode="all" label="何でも検索" colorClass="bg-green-500" icon={Search} activeMode={searchMode} onClick={setSearchMode} animationClass="animate-pop" />
          
          <button
            onClick={startRoulette}
            disabled={isRouletteSpinning}
            className={`flex-1 flex items-center justify-center gap-1 md:gap-2 px-2 py-3 font-bold transition-all duration-200 min-w-[60px] md:min-w-[80px]
              bg-orange-500 text-white hover:bg-orange-600 shadow-md group rounded-xl text-xs md:text-base
              ${isRouletteSpinning ? 'cursor-wait' : ''}`}
            title="おまかせ10選"
          >
            <Dice5 size={18} className={`group-hover:rotate-180 transition-transform duration-500 ${isRouletteSpinning ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline whitespace-nowrap">おまかせ10選</span>
            <span className="md:hidden whitespace-nowrap text-[10px]">10選</span>
          </button>

          {/* AI Analysis Button */}
          <button
            onClick={handleAiAnalysis}
            disabled={aiAnalysisLoading}
            className={`flex-1 flex items-center justify-center gap-1 md:gap-2 px-2 py-3 font-bold transition-all duration-200 min-w-[60px] md:min-w-[80px]
              bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 shadow-md group rounded-xl text-xs md:text-base
              ${aiAnalysisLoading ? 'cursor-wait' : ''}`}
            title="AI分析"
          >
            <BrainCircuit size={18} className={`group-hover:scale-110 transition-transform duration-300 ${aiAnalysisLoading ? 'animate-pulse' : ''}`} />
            <span className="hidden md:inline whitespace-nowrap">AI分析</span>
            <span className="md:hidden whitespace-nowrap text-[10px]">AI</span>
          </button>

          <button
            onClick={handleToggleEdit}
            className={`flex-1 flex items-center justify-center gap-1 md:gap-2 px-2 py-3 font-bold transition-all duration-200 min-w-[60px] md:min-w-[80px]
              ${isEditing 
                ? 'bg-purple-600 text-white shadow-md ring-2 ring-white/50' 
                : 'bg-white text-purple-600 hover:bg-purple-50 shadow-sm'
              } rounded-xl text-xs md:text-base`}
          >
            {isEditing ? <Check size={18} className="animate-bounce" /> : <Edit3 size={18} />}
            <span className="hidden md:inline whitespace-nowrap">{isEditing ? '編集完了' : 'リスト編集'}</span>
            <span className="md:hidden whitespace-nowrap text-[10px]">{isEditing ? '完了' : '編集'}</span>
          </button>
        </div>

        {/* Search Input & Edit Toolbar Area */}
        <div style={containerStyle}>
          <div className="flex flex-col md:flex-row gap-2 items-center overflow-hidden w-full mt-1">
            <div 
              className="relative transition-all duration-500 ease-in-out"
              style={{ width: isEditing ? '40%' : '100%' }}
            >
              <div className={`absolute left-3 top-1/2 transform -translate-y-1/2 
                ${searchMode === 'title' ? 'text-blue-500' : 
                  searchMode === 'artist' ? 'text-red-500' : 
                  searchMode === 'lyrics' ? 'text-yellow-500' : 
                  'text-green-500'}`}>
                <Search size={20} />
              </div>
              <input
                type="text"
                placeholder="検索..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-full bg-white border-2 border-white focus:border-pink-300 shadow-md transition-colors"
              />
            </div>

            {/* 編集ツールバー */}
            <div 
              className={`flex gap-2 overflow-x-auto pb-1 md:pb-0 items-center justify-end flex-1 transition-all duration-500 ease-in-out
                ${isEditing ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 w-0 pointer-events-none'}`}
            >
              <button onClick={addNewSong} className="flex items-center gap-1 bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 shadow whitespace-nowrap font-bold text-sm transform active:scale-95 transition-transform">
                <Plus size={16} /> <span className="hidden sm:inline">曲を追加</span>
              </button>
              
              <button onClick={handleDownloadTemplate} className="flex items-center gap-1 bg-gray-500 text-white px-4 py-2 rounded-full hover:bg-gray-600 shadow cursor-pointer whitespace-nowrap font-bold text-sm transform active:scale-95 transition-transform" title="インポート用雛形をダウンロード">
                <FileSpreadsheet size={16} /> <span className="hidden sm:inline">雛形</span>
              </button>

              <button onClick={triggerImport} className="flex items-center gap-1 bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 shadow cursor-pointer whitespace-nowrap font-bold text-sm transform active:scale-95 transition-transform">
                <Upload size={16} /> <span className="hidden sm:inline">インポート</span>
              </button>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                onChange={handleImportFile} 
                className="hidden" 
                ref={fileInputRef} 
              />
              
              <button onClick={handleExport} className="flex items-center gap-1 bg-orange-500 text-white px-4 py-2 rounded-full hover:bg-orange-600 shadow whitespace-nowrap font-bold text-sm transform active:scale-95 transition-transform">
                <Download size={16} /> <span className="hidden sm:inline">エクスポート</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* List View */}
      <div className="mt-4 overflow-x-auto pb-20 w-full" style={containerStyle}>
        <div className="bg-white rounded-xl shadow-xl border-2 border-pink-200 w-full" style={scrollContainerStyle}>
          
          {/* Header */}
          <div className="bg-pink-100 p-2 font-bold text-gray-700 text-sm border-b-2 border-pink-200 sticky top-0 z-10" style={gridStyle}>
            <button onClick={() => handleSort('score')} className="hover:bg-pink-200 rounded py-1 text-center active:scale-95 transition-transform">点<SortIcon columnKey="score"/></button>
            <button onClick={() => handleSort('title')} className="hover:bg-pink-200 rounded py-1 text-left pl-2 active:scale-95 transition-transform">曲名<SortIcon columnKey="title"/></button>
            <button onClick={() => handleSort('artist')} className="hover:bg-pink-200 rounded py-1 text-left pl-2 active:scale-95 transition-transform">歌手<SortIcon columnKey="artist"/></button>
            <button onClick={() => handleSort('key')} className="hover:bg-pink-200 rounded py-1 text-center active:scale-95 transition-transform">ｷｰ<SortIcon columnKey="key"/></button>
            <button onClick={() => handleSort('memo')} className="hover:bg-pink-200 rounded py-1 text-left pl-2 active:scale-95 transition-transform">メモ<SortIcon columnKey="memo"/></button>
            <button onClick={() => handleSort('lyrics')} className="hover:bg-pink-200 rounded py-1 text-left pl-2 active:scale-95 transition-transform">歌詞<SortIcon columnKey="lyrics"/></button>
            <button onClick={() => handleSort('status')} className="hover:bg-pink-200 rounded py-1 text-center active:scale-95 transition-transform">済<SortIcon columnKey="status"/></button>
            {isEditing && <div className="text-center text-red-500 font-bold">消</div>}
          </div>

          {/* Body */}
          <div className="divide-y divide-pink-100">
            {loading ? (
              <div className="p-10 text-center text-gray-500">読み込み中...</div>
            ) : displaySongs.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                {isEditing ? '曲を追加してください' : '条件に一致する曲がありません'}
              </div>
            ) : (
              displaySongs.map((song) => (
                <div 
                  key={song.id} 
                  onClick={() => {
                    if (!isEditing) {
                      setSelectedSong(song);
                    }
                  }}
                  className={`p-2 text-sm transition-colors relative
                    ${isEditing ? '' : 'cursor-pointer active:bg-pink-100 hover:bg-pink-50'}`}
                  style={itemStyle}
                >
                  {/* Score */}
                  <div className="text-center h-full flex items-center justify-center">
                    {isEditing ? (
                      <select 
                        value={song.score} 
                        onChange={(e) => updateSong(song.id, 'score', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full p-1 rounded border border-pink-200 text-center focus:outline-none focus:ring-2 focus:ring-pink-400 text-xs"
                      >
                        {SCORES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className={`font-bold ${song.score === '10' ? 'text-red-500 text-lg' : 'text-gray-700'}`}>{song.score}</span>
                    )}
                  </div>

                  {/* Title */}
                  <div className="px-1 h-full flex items-center relative">
                    {isEditing ? (
                      <EditableText 
                        value={song.title}
                        onSave={(val) => updateSong(song.id, 'title', val)}
                        className="w-full text-sm"
                        placeholder="曲名"
                      />
                    ) : (
                      <span className="font-medium text-gray-900 truncate w-full">{song.title}</span>
                    )}
                  </div>

                  {/* Artist */}
                  <div className="px-1 h-full flex items-center relative">
                    {isEditing ? (
                      <EditableText 
                        value={song.artist}
                        onSave={(val) => updateSong(song.id, 'artist', val)}
                        className="w-full text-sm"
                        placeholder="歌手"
                      />
                    ) : (
                      <span className="text-gray-600 truncate w-full">{song.artist}</span>
                    )}
                  </div>

                  {/* Key */}
                  <div className="text-center h-full flex items-center justify-center">
                    {isEditing ? (
                      <select 
                        value={song.key} 
                        onChange={(e) => updateSong(song.id, 'key', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full p-1 rounded border border-pink-200 text-center text-xs focus:outline-none focus:ring-2 focus:ring-pink-400"
                      >
                        {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    ) : (
                      <span className={`text-xs px-1 py-0.5 rounded-full ${song.key !== '0' ? 'bg-gray-200' : ''}`}>{song.key}</span>
                    )}
                  </div>

                  {/* Memo */}
                  <div className="px-1 text-gray-500 h-full flex items-center overflow-hidden relative">
                    {isEditing ? (
                      <EditableText 
                        value={song.memo}
                        onSave={(val) => updateSong(song.id, 'memo', val)}
                        className="w-full text-xs"
                        placeholder="メモ"
                      />
                    ) : (
                      <span className="truncate w-full">{song.memo}</span>
                    )}
                  </div>

                  {/* Lyrics */}
                  <div className="px-1 text-gray-400 text-xs h-full flex items-center overflow-hidden relative">
                     {isEditing ? (
                      <EditableText 
                        value={song.lyrics}
                        onSave={(val) => updateSong(song.id, 'lyrics', val)}
                        className="w-full text-xs"
                        placeholder="歌詞"
                      />
                    ) : (
                      <span className="truncate w-full">{song.lyrics}</span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="text-center h-full flex items-center justify-center">
                    {isEditing ? (
                      <select 
                        value={song.status} 
                        onChange={(e) => updateSong(song.id, 'status', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full p-1 rounded border border-pink-200 text-center text-xs focus:outline-none focus:ring-2 focus:ring-pink-400"
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs font-bold text-white ${song.status === '済' ? 'bg-green-400' : 'bg-gray-300'}`}>
                        {song.status}
                      </span>
                    )}
                  </div>
                  
                  {/* 削除ボタン */}
                  {isEditing && (
                    <div className="text-center h-full flex items-center justify-center">
                      <button 
                        onClick={(e) => handleDeleteClick(e, song.id, song.title)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-100 p-2 rounded-full transition-colors"
                        title="削除する"
                      >
                         <Trash2 size={20} />
                      </button>
                    </div>
                  )}

                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI Analysis Modal */}
      {aiAnalysisResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col border-4 border-indigo-300 overflow-hidden relative max-h-[90vh]">
            <div className="bg-indigo-500 p-4 text-white shrink-0 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <BrainCircuit size={24} /> AI分析レポート
              </h2>
              <button 
                onClick={() => setAiAnalysisResult(null)}
                className="bg-white/20 hover:bg-white/40 p-1 rounded-full text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-indigo-50 flex-grow grid md:grid-cols-2 gap-6">
              {/* おすすめ選曲 */}
              <div className="space-y-4">
                <h3 className="font-bold text-indigo-800 flex items-center gap-2 border-b-2 border-indigo-200 pb-2">
                  <Sparkles size={20} /> あなたへのおすすめ曲
                </h3>
                <div className="space-y-3">
                  {aiAnalysisResult.recommendations?.map((rec, index) => (
                    <div 
                      key={index}
                      className="bg-white p-3 rounded-xl shadow-sm border border-indigo-100 animate-fade-in-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="font-bold text-gray-800">{rec.title}</div>
                      <div className="text-xs text-gray-500 mb-1">{rec.artist}</div>
                      <div className="text-sm text-indigo-600 bg-indigo-50 p-2 rounded">{rec.reason}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 歌唱アドバイス */}
              <div className="space-y-4">
                <h3 className="font-bold text-indigo-800 flex items-center gap-2 border-b-2 border-indigo-200 pb-2">
                  <Lightbulb size={20} /> 歌唱アドバイス
                </h3>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-indigo-100 leading-relaxed text-gray-700 whitespace-pre-wrap">
                  {aiAnalysisResult.advice}
                </div>
                <div className="text-center mt-4">
                  <Info size={16} className="inline text-gray-400 mr-1" />
                  <span className="text-xs text-gray-400">分析は直近のデータを元に行われます</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-white border-t border-indigo-100 text-center">
               <button 
                 onClick={() => setAiAnalysisResult(null)}
                 className="bg-indigo-500 text-white px-8 py-2 rounded-full font-bold hover:bg-indigo-600 shadow-md transition-colors"
               >
                 閉じる
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Roulette Results Modal */}
      {rouletteResults && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col border-4 border-orange-300 overflow-hidden relative max-h-[90vh]">
            <div className="bg-orange-500 p-4 text-white shrink-0 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Dice5 size={24} className="animate-spin-slow" /> おまかせ10選
              </h2>
              <button 
                onClick={() => setRouletteResults(null)}
                className="bg-white/20 hover:bg-white/40 p-1 rounded-full text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto bg-orange-50 flex-grow">
              <div className="space-y-2">
                {rouletteResults.map((song, index) => (
                  <div 
                    key={song.id}
                    onClick={() => setSelectedSong(song)}
                    className="bg-white p-3 rounded-xl shadow-sm border border-orange-200 flex items-center gap-3 cursor-pointer hover:bg-orange-100 transition-colors animate-fade-in-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <span className="font-black text-orange-400 w-6 text-center">{index + 1}</span>
                    <div className="flex-grow min-w-0">
                      <div className="font-bold text-gray-800 truncate">{song.title}</div>
                      <div className="text-xs text-gray-500 truncate">{song.artist}</div>
                    </div>
                    <div className="text-lg font-bold text-orange-500">{song.score}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 bg-white border-t border-orange-100 text-center">
               <button 
                 onClick={startRoulette}
                 className="bg-orange-500 text-white px-6 py-2 rounded-full font-bold hover:bg-orange-600 shadow-md transition-colors"
               >
                 もう一回まわす
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedSong && !isEditing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border-4 border-pink-300 overflow-hidden relative">
            
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-4 text-white shrink-0 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold drop-shadow-md flex items-center gap-2">
                  <Music size={24} /> {selectedSong.title}
                </h2>
                <p className="text-pink-100 font-medium flex items-center gap-2 mt-1">
                  <User size={16} /> {selectedSong.artist}
                </p>
              </div>
              <button 
                onClick={() => setSelectedSong(null)}
                className="bg-white/20 hover:bg-white/40 p-2 rounded-full text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto bg-pink-50/50 grow space-y-6">
              {/* Score & Info Area */}
              <div className="flex justify-center my-2">
                <div className="bg-white p-4 rounded-xl shadow-lg border-2 border-yellow-300 flex flex-col items-center w-full max-w-md">
                  <div className="flex justify-around w-full items-center gap-4">
                    
                    {/* SCORE */}
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-500 font-bold tracking-widest">SCORE</span>
                      <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-red-500 to-orange-500">
                        {selectedSong.score}
                      </span>
                    </div>

                    {/* KEY */}
                    <div className="flex flex-col items-center border-l border-gray-200 pl-4">
                      <span className="text-xs text-gray-500 font-bold tracking-widest mb-1">KEY</span>
                      <div className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full">
                         <span className="font-bold text-xl text-gray-700">{selectedSong.key}</span>
                      </div>
                    </div>

                    {/* STATUS */}
                    <div className="flex flex-col items-center border-l border-gray-200 pl-4">
                      <span className="text-xs text-gray-500 font-bold tracking-widest mb-1">STATUS</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold text-white ${selectedSong.status === '済' ? 'bg-green-500' : 'bg-gray-400'}`}>
                        {selectedSong.status === '済' ? '歌唱済' : '未歌唱'}
                      </span>
                    </div>

                  </div>
                </div>
              </div>

              {/* Memo (Left) - Lyrics (Right) */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Memo Area */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-pink-100">
                  <h3 className="flex items-center gap-2 font-bold text-gray-700 mb-2 border-b pb-1 border-pink-100">
                    <Edit3 size={18} className="text-blue-500" /> メモ
                  </h3>
                  <div className="h-32 overflow-y-auto text-sm text-gray-600 leading-relaxed whitespace-pre-wrap scrollbar-thin scrollbar-thumb-pink-200">
                    {selectedSong.memo || 'メモはありません。'}
                  </div>
                </div>

                {/* Lyrics Area */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-pink-100">
                  <h3 className="flex items-center gap-2 font-bold text-gray-700 mb-2 border-b pb-1 border-pink-100">
                    <FileText size={18} className="text-yellow-500" /> 歌詞
                  </h3>
                  <div className="h-32 overflow-y-auto text-sm text-gray-600 leading-relaxed whitespace-pre-wrap scrollbar-thin scrollbar-thumb-pink-200">
                    {selectedSong.lyrics || '歌詞の登録はありません。'}
                  </div>
                </div>
              </div>

              {(() => {
                const { sameScore, sameArtist } = getRecommendations(selectedSong);
                return (
                  <div className="space-y-4">
                    {sameScore.length > 0 && (
                      <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                        <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                          <Mic size={16} /> 同じ点数({selectedSong.score}点)の曲
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {sameScore.map(s => (
                            <button 
                              key={s.id}
                              onClick={() => setSelectedSong(s)}
                              className="bg-white px-3 py-1 rounded-full text-xs font-medium text-gray-600 shadow-sm hover:bg-orange-200 hover:text-orange-900 transition-all"
                            >
                              {s.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {sameArtist.length > 0 && (
                      <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                        <h4 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
                          <User size={16} /> {selectedSong.artist} の他の曲
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {sameArtist.map(s => (
                            <button 
                              key={s.id}
                              onClick={() => setSelectedSong(s)}
                              className="bg-white px-3 py-1 rounded-full text-xs font-medium text-gray-600 shadow-sm hover:bg-purple-200 hover:text-purple-900 transition-all"
                            >
                              {s.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.3s ease-out forwards;
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
          opacity: 0;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: #fbcfe8;
          border-radius: 20px;
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Custom Animations for Buttons */
        @keyframes swing {
          20% { transform: rotate(15deg); }
          40% { transform: rotate(-10deg); }
          60% { transform: rotate(5deg); }
          80% { transform: rotate(-5deg); }
          100% { transform: rotate(0deg); }
        }
        .animate-swing {
          animation: swing 0.5s ease-in-out;
        }

        @keyframes jump {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20%); }
        }
        .animate-jump {
          animation: jump 0.5s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }

        @keyframes pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        .animate-pop {
          animation: pop 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}