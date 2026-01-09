import { useState, useEffect } from 'react';

// 宣告全域 gapi 變數，解決 TypeScript 找不到名稱的問題
declare const gapi: any;

// 1. 設定你的 Google Drive 資料夾 ID
const TARGET_FOLDER_ID = '1TLN39CRrKw2i5489p73omwG3vzuC6awh';

const SECTION_CONFIGS: any = {
  'D-MAX': { yMax: 0.20, yMin: -0.20, label: 'D-MAX' },
  'HD':    { yMax: 0.15, yMin: -0.15, label: 'HD' },
  'LD':    { yMax: 0.15, yMin: -0.15, label: 'LD' },
  'D-MIN': { yMax: 0.10, yMin: -0.10, label: 'D-MIN' },
};

const PlotSection = ({ title, data, colorBands, channels, config }: any) => {
  const height = 140;
  const scaleY = height / (config.yMax - config.yMin);
  const getY = (val: number) => (config.yMax - val) * scaleY;

  return (
    <div className="flex bg-white mb-6 border border-black shadow-sm overflow-hidden text-left">
      <div className="w-32 border-r-2 border-black flex flex-col bg-gray-50">
        <div className="p-1 border-b border-gray-300 text-center font-black text-xs uppercase bg-gray-100">{title}</div>
        <div className="flex-1 relative flex">
          <div className="w-12 relative text-[9px] font-mono border-r border-gray-200">
            {[config.yMax, 0, config.yMin].map((val) => (
              <div key={val} className="absolute w-full text-right pr-1 font-bold" style={{ top: getY(val) - 5 }}>
                {val > 0 ? `+${val.toFixed(2)}` : val === 0 ? '0' : val.toFixed(2)}
              </div>
            ))}
          </div>
          <div className="flex-1 flex flex-col justify-around px-1 text-[8px] font-bold py-2">
            {channels.map((c: string) => (
              <div key={c} className="flex justify-between items-center text-gray-500">
                <span>{c[0]}</span><div className="w-2 h-[1px] bg-gray-300"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="relative flex-1 h-[140px] bg-white">
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <pattern id="smallGrid" width="10" height={0.01 * scaleY} patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f1f1f1" strokeWidth="0.5" />
            </pattern>
            <pattern id="grid" width="10" height={0.05 * scaleY} patternUnits="userSpaceOnUse">
              <rect width="10" height={0.05 * scaleY} fill="url(#smallGrid)" />
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e0e0e0" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <line x1="0" y1={getY(0)} x2="100%" y2={getY(0)} stroke="black" strokeWidth="1.2" strokeDasharray="4 2" />
          {colorBands.map((band: any, i: number) => (
            <rect key={i} x="0" y={getY(band.max)} width="100%" height={(band.max - band.min) * scaleY} fill={band.color} fillOpacity="0.3" />
          ))}
          {channels.map((channel: string) => {
            const colors: any = { RED: '#dc2626', GREEN: '#16a34a', BLUE: '#2563eb' };
            const points = data.map((d: any, i: number) => `${i * 50 + 25},${getY(d[channel] || 0)}`).join(' ');
            return (
              <g key={channel}>
                <polyline fill="none" stroke={colors[channel]} strokeWidth="2" points={points} />
                {data.map((d: any, i: number) => (
                  <circle key={i} cx={i * 50 + 25} cy={getY(d[channel] || 0)} r="3.5" fill="white" stroke={colors[channel]} strokeWidth="2" />
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'input' | 'reference'>('input');
  const [history, setHistory] = useState<any[]>([]);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState('offline');
  const [isSyncing, setIsSyncing] = useState(false); // 新增狀態

  const [reference, setReference] = useState<any>(() => {
    const saved = localStorage.getItem('e6_reference');
    return saved ? JSON.parse(saved) : { 
      DMAX_R: 3.0, DMAX_G: 3.0, DMAX_B: 3.0, 
      HD_R: 1.8, HD_G: 1.8, HD_B: 1.8, 
      LD_R: 0.4, LD_G: 0.4, LD_B: 0.4, 
      DMIN_R: 0.1, DMIN_G: 0.1, DMIN_B: 0.1 
    };
  });

  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    localStorage.setItem('e6_reference', JSON.stringify(reference));
  }, [reference]);

  // 將同步邏輯移入組件內部，這樣它才能訪問到 setIsSyncing
  const syncToCloud = async (dataToSync: any) => {
    if (!isDriveConnected || typeof gapi === 'undefined') return;
    
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      const searchResponse = await gapi.client.drive.files.list({
        q: `name = 'e6_control_data.json' and '${TARGET_FOLDER_ID}' in parents and trashed = false`,
        fields: 'files(id)',
      });

      const existingFile = searchResponse.result.files[0];
      const fileContent = JSON.stringify(dataToSync);

      if (existingFile) {
        await gapi.client.request({
          path: `/upload/drive/v3/files/${existingFile.id}`,
          method: 'PATCH',
          params: { uploadType: 'media' },
          body: fileContent,
        });
      } else {
        const metadata = {
          name: 'e6_control_data.json',
          mimeType: 'application/json',
          parents: [TARGET_FOLDER_ID],
        };
        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";
        const multipartRequestBody = delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata) + delimiter + 'Content-Type: application/json\r\n\r\n' + fileContent + close_delim;

        await gapi.client.request({
          path: '/upload/drive/v3/files',
          method: 'POST',
          params: { uploadType: 'multipart' },
          headers: { 'Content-Type': 'multipart/related; boundary="' + boundary + '"' },
          body: multipartRequestBody,
        });
      }
      setSyncStatus('synced');
    } catch (error) {
      console.error('同步失敗：', error);
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleInput = (e: any, type: 'form' | 'ref') => {
    const val = parseFloat(e.target.value) || 0;
    if (type === 'form') setFormData({ ...formData, [e.target.name]: val });
    else setReference({ ...reference, [e.target.name]: val });
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    const calculateDelta = (sec: string, ch: string) => {
      const input = formData[`${sec}_${ch}`] || 0;
      const ref = reference[`${sec}_${ch}`] || 0;
      return parseFloat((input - ref).toFixed(3));
    };

    const entry = {
      'D-MAX': { RED: calculateDelta('DMAX', 'R'), GREEN: calculateDelta('DMAX', 'G'), BLUE: calculateDelta('DMAX', 'B') },
      'HD':    { RED: calculateDelta('HD', 'R'), GREEN: calculateDelta('HD', 'G'), BLUE: calculateDelta('HD', 'B') },
      'LD':    { RED: calculateDelta('LD', 'R'), GREEN: calculateDelta('LD', 'G'), BLUE: calculateDelta('LD', 'B') },
      'D-MIN': { RED: calculateDelta('DMIN', 'R'), GREEN: calculateDelta('DMIN', 'G'), BLUE: calculateDelta('DMIN', 'B') },
      date: new Date().toLocaleDateString('zh-HK', { month: 'numeric', day: 'numeric' })
    };
    
    const newHistory = [...history, entry];
    setHistory(newHistory);
    if (isDriveConnected) syncToCloud({ history: newHistory, reference });
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-200 font-sans text-zinc-900 overflow-hidden">
      <div className="fixed top-0 right-0 p-2 flex items-center gap-2 z-50">
        <div className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-green-500' : syncStatus === 'syncing' ? 'bg-yellow-500' : 'bg-gray-400'}`}></div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
          {isSyncing ? 'Syncing...' : syncStatus === 'synced' ? 'Cloud Synced' : 'Local Only'}
        </span>
        {!isDriveConnected && (
          <button onClick={() => {setIsDriveConnected(true); syncToCloud({ history, reference });}} className="text-[10px] bg-white border border-black px-2 py-1 hover:bg-blue-50">
            CONNECT DRIVE
          </button>
        )}
      </div>

      <div className="w-80 bg-white border-r border-black flex flex-col shadow-2xl overflow-hidden text-left">
        <div className="flex border-b border-black">
          <button onClick={() => setActiveTab('input')} className={`flex-1 py-3 font-bold text-xs ${activeTab === 'input' ? 'bg-red-600 text-white' : 'bg-gray-100'}`}>BATCH ENTRY</button>
          <button onClick={() => setActiveTab('reference')} className={`flex-1 py-3 font-bold text-xs ${activeTab === 'reference' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>REF SETUP</button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {activeTab === 'input' ? (
            <form onSubmit={handleSubmit} className="space-y-6 text-left">
              <div className="text-[10px] bg-yellow-50 p-2 border border-yellow-200 mb-4 italic">自動計算 (實測值 - 參考值) 偏差。</div>
              {['DMAX', 'HD', 'LD', 'DMIN'].map(sec => (
                <div key={sec} className="space-y-2">
                  <h3 className="text-xs font-black border-b border-gray-200">{sec} (Measured)</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {['R', 'G', 'B'].map(c => (
                      <input key={c} name={`${sec}_${c}`} type="number" step="0.01" onChange={(e)=>handleInput(e,'form')} className="border p-1 text-xs font-mono w-full" placeholder={c} />
                    ))}
                  </div>
                </div>
              ))}
              <button type="submit" className="w-full bg-black text-white py-3 font-black tracking-widest hover:bg-red-700 uppercase">Plot Deviation</button>
            </form>
          ) : (
            <div className="space-y-6 text-left">
              <h2 className="text-sm font-black text-blue-700 uppercase">Reference Values</h2>
              {['DMAX', 'HD', 'LD', 'DMIN'].map(sec => (
                <div key={sec} className="space-y-2">
                  <h3 className="text-xs font-bold">{sec}</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {['R', 'G', 'B'].map(c => (
                      <input key={c} name={`${sec}_${c}`} value={reference[`${sec}_${c}`] || ''} type="number" step="0.01" onChange={(e)=>handleInput(e,'ref')} className="border-b-2 border-blue-200 p-1 text-xs font-mono w-full" placeholder={c} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-auto p-4 border-t border-gray-200">
          <button 
            onClick={() => {
              const blob = new Blob([JSON.stringify({ reference, history })], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `E6_Backup_${new Date().toISOString().slice(0,10)}.json`; a.click();
            }}
            className="w-full text-[10px] border border-dashed border-gray-400 py-2 text-gray-500 hover:text-black uppercase"
          >
            Download Backup (.JSON)
          </button>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-auto bg-zinc-400 flex justify-center">
        <div className="w-[850px] bg-white p-10 shadow-2xl border border-black min-h-fit">
          <header className="flex justify-between items-end mb-8 border-b-2 border-black pb-2 text-left">
            <div>
              <h1 className="text-2xl font-black italic uppercase">Kodak Process E-6 Deviation Plot</h1>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Values: Δ (Measured - Reference)</p>
            </div>
            <div className="text-right text-[10px] font-mono">Y-33 MOD</div>
          </header>

          <PlotSection title="D-MAX" channels={['RED','GREEN','BLUE']} data={history.map(h => h['D-MAX'])} config={SECTION_CONFIGS['D-MAX']}
            colorBands={[{min: -0.10, max: -0.05, color: '#fbbf24'}, {min: 0.15, max: 0.20, color: '#fbbf24'}]} />
          <PlotSection title="HD" channels={['RED','GREEN','BLUE']} data={history.map(h => h['HD'])} config={SECTION_CONFIGS['HD']}
            colorBands={[{min: 0.10, max: 0.15, color: '#f97316'}, {min: 0.05, max: 0.10, color: '#fbbf24'}]} />
          <PlotSection title="LD" channels={['RED','GREEN','BLUE']} data={history.map(h => h['LD'])} config={SECTION_CONFIGS['LD']}
            colorBands={[{min: 0.05, max: 0.10, color: '#f97316'}, {min: -0.10, max: -0.05, color: '#f97316'}]} />
          <PlotSection title="D-MIN" channels={['RED','GREEN','BLUE']} data={history.map(h => h['D-MIN'])} config={SECTION_CONFIGS['D-MIN']}
            colorBands={[{min: 0.05, max: 0.10, color: '#fbbf24'}]} />

          <div className="mt-4 flex border-t-2 border-black bg-gray-50 h-10">
            <div className="w-32 border-r-2 border-black flex items-center justify-center text-xs font-black italic uppercase">Date / Batch</div>
            <div className="flex-1 flex overflow-x-auto">
              {history.map((h, i) => (
                <div key={i} className="min-w-[50px] border-r border-gray-300 flex items-center justify-center text-[10px] font-bold">{h.date}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}