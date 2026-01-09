import React, { useState, useEffect } from 'react';
// 假設你已引入 GoogleDriveService

export default function App() {
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState('offline'); // 'offline', 'syncing', 'synced'

  // 當歷史紀錄改變時，除了 localStorage，也嘗試同步到雲端
  useEffect(() => {
    if (history.length > 0 && isDriveConnected) {
      handleCloudSync();
    }
  }, [history]);

  const handleCloudSync = async () => {
    setSyncStatus('syncing');
    try {
      // 呼叫 Google Drive API 儲存
      // await saveToDrive({ reference, history });
      setSyncStatus('synced');
    } catch (err) {
      setSyncStatus('error');
    }
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-200 font-sans">
      {/* 頂部同步狀態條 */}
      <div className="fixed top-0 right-0 p-2 flex items-center gap-2 z-50">
        <div className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
          {syncStatus === 'synced' ? 'Cloud Synced' : 'Local Only'}
        </span>
        {!isDriveConnected && (
          <button className="text-[10px] bg-white border border-black px-2 py-1 hover:bg-blue-50">
            CONNECT DRIVE
          </button>
        )}
      </div>
    <div className="flex bg-white mb-6 border border-black shadow-sm overflow-hidden">
      {/* 左側：刻度與通道 */}
      <div className="w-32 border-r-2 border-black flex flex-col bg-gray-50">
        <div className="p-1 border-b border-gray-300 text-center font-black text-xs uppercase bg-gray-100">
          {title}
        </div>
        <div className="flex-1 relative flex">
          <div className="w-12 relative text-[9px] font-mono border-r border-gray-200">
            {[config.yMax, 0, config.yMin].map((val) => (
              <div
                key={val}
                className="absolute w-full text-right pr-1 font-bold"
                style={{ top: getY(val) - 5 }}
              >
                {val > 0
                  ? `+${val.toFixed(2)}`
                  : val === 0
                  ? '0'
                  : val.toFixed(2)}
              </div>
            ))}
          </div>
          <div className="flex-1 flex flex-col justify-around px-1 text-[8px] font-bold">
            {channels.map((c: string) => (
              <div key={c} className="flex justify-between items-center">
                <span>{c[0]}</span>
                <div className="w-2 h-[1px] bg-gray-400"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右側：座標紙 */}
      <div className="relative flex-1 h-[140px] bg-white">
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <pattern
              id="smallGrid"
              width="10"
              height={0.01 * scaleY}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M 10 0 L 0 0 0 10`}
                fill="none"
                stroke="#f1f1f1"
                strokeWidth="0.5"
              />
            </pattern>
            <pattern
              id="grid"
              width="10"
              height={0.05 * scaleY}
              patternUnits="userSpaceOnUse"
            >
              <rect width="10" height={0.05 * scaleY} fill="url(#smallGrid)" />
              <path
                d={`M 10 0 L 0 0 0 10`}
                fill="none"
                stroke="#e0e0e0"
                strokeWidth="0.8"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <line
            x1="0"
            y1={getY(0)}
            x2="100%"
            y2={getY(0)}
            stroke="black"
            strokeWidth="1.2"
            strokeDasharray="3 1"
          />

          {colorBands.map((band: any, i: number) => (
            <rect
              key={i}
              x="0"
              y={getY(band.max)}
              width="100%"
              height={(band.max - band.min) * scaleY}
              fill={band.color}
              fillOpacity="0.3"
            />
          ))}

          {channels.map((channel: string) => {
            const colors: any = {
              RED: '#dc2626',
              GREEN: '#16a34a',
              BLUE: '#2563eb',
            };
            const points = data
              .map(
                (d: any, i: number) => `${i * 45 + 25},${getY(d[channel] || 0)}`
              )
              .join(' ');
            return (
              <g key={channel}>
                <polyline
                  fill="none"
                  stroke={colors[channel]}
                  strokeWidth="1.5"
                  points={points}
                />
                {data.map((d: any, i: number) => (
                  <circle
                    key={i}
                    cx={i * 45 + 25}
                    cy={getY(d[channel] || 0)}
                    r="3"
                    fill="white"
                    stroke={colors[channel]}
                    strokeWidth="1.5"
                  />
                ))}
              </g>
            );
          })}
        </svg>
{/* 在左側面板底部加入匯出按鈕作為備案 */}
<div className="mt-auto p-4 border-t border-gray-200">
        <button 
          onClick={() => {
            const blob = new Blob([JSON.stringify({ reference, history })], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `E6_Backup_${new Date().toISOString().slice(0,10)}.json`;
            a.click();
          }}
          className="w-full text-[10px] border border-dashed border-gray-400 py-2 text-gray-500 hover:border-black hover:text-black"
        >
          DOWNLOAD MANUAL BACKUP (.JSON)
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'input' | 'reference'>('input');
  const [history, setHistory] = useState<any[]>([]);

  // 參考值與目前輸入值的狀態
  const [reference, setReference] = useState<any>(() => {
    const saved = localStorage.getItem('e6_reference');
    return saved
      ? JSON.parse(saved)
      : {
          DMAX_R: 3.0,
          DMAX_G: 3.0,
          DMAX_B: 3.0,
          HD_R: 1.8,
          HD_G: 1.8,
          HD_B: 1.8,
          LD_R: 0.4,
          LD_G: 0.4,
          LD_B: 0.4,
          DMIN_R: 0.1,
          DMIN_G: 0.1,
          DMIN_B: 0.1,
        };
  });

  const [formData, setFormData] = useState<any>({});

  // 當 Reference 改變時儲存到本地
  useEffect(() => {
    localStorage.setItem('e6_reference', JSON.stringify(reference));
  }, [reference]);

  const handleInput = (e: any, type: 'form' | 'ref') => {
    const val = parseFloat(e.target.value) || 0;
    if (type === 'form') setFormData({ ...formData, [e.target.name]: val });
    else setReference({ ...reference, [e.target.name]: val });
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    // 計算偏差值：Input - Reference
    const calculateDelta = (sec: string, ch: string) => {
      const input = formData[`${sec}_${ch}`] || 0;
      const ref = reference[`${sec}_${ch}`] || 0;
      return parseFloat((input - ref).toFixed(3)); // 四捨五入到千分位
    };

    const entry = {
      'D-MAX': {
        RED: calculateDelta('DMAX', 'R'),
        GREEN: calculateDelta('DMAX', 'G'),
        BLUE: calculateDelta('DMAX', 'B'),
      },
      HD: {
        RED: calculateDelta('HD', 'R'),
        GREEN: calculateDelta('HD', 'G'),
        BLUE: calculateDelta('HD', 'B'),
      },
      LD: {
        RED: calculateDelta('LD', 'R'),
        GREEN: calculateDelta('LD', 'G'),
        BLUE: calculateDelta('LD', 'B'),
      },
      'D-MIN': {
        RED: calculateDelta('DMIN', 'R'),
        GREEN: calculateDelta('DMIN', 'G'),
        BLUE: calculateDelta('DMIN', 'B'),
      },
      date: new Date().toLocaleDateString('zh-HK', {
        month: 'numeric',
        day: 'numeric',
      }),
    };
    setHistory([...history, entry]);
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-200 font-sans text-zinc-900">
      {/* 左側面板 */}
      <div className="w-80 bg-white border-r border-black flex flex-col shadow-2xl overflow-hidden">
        <div className="flex border-b border-black">
          <button
            onClick={() => setActiveTab('input')}
            className={`flex-1 py-3 font-bold text-xs ${
              activeTab === 'input' ? 'bg-red-600 text-white' : 'bg-gray-100'
            }`}
          >
            BATCH ENTRY
          </button>
          <button
            onClick={() => setActiveTab('reference')}
            className={`flex-1 py-3 font-bold text-xs ${
              activeTab === 'reference'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100'
            }`}
          >
            REF SETUP
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {activeTab === 'input' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-[10px] bg-yellow-50 p-2 border border-yellow-200 mb-4 italic">
                注意：系統將自動繪製 (輸入值 - 參考值) 的偏差量。
              </div>
              {['DMAX', 'HD', 'LD', 'DMIN'].map((sec) => (
                <div key={sec} className="space-y-2">
                  <h3 className="text-xs font-black border-b border-gray-200">
                    {sec} (Measured)
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {['R', 'G', 'B'].map((c) => (
                      <input
                        key={c}
                        name={`${sec}_${c}`}
                        type="number"
                        step="0.01"
                        onChange={(e) => handleInput(e, 'form')}
                        className="border p-1 text-xs font-mono w-full"
                        placeholder={c}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <button
                type="submit"
                className="w-full bg-black text-white py-3 font-black tracking-widest hover:bg-red-700"
              >
                PLOT DEVIATION
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <h2 className="text-sm font-black text-blue-700 uppercase">
                Reference Script Values
              </h2>
              <p className="text-[10px] text-gray-500">
                輸入 Control Strip 所附帶的標稱數值 (Nominal Values)
              </p>
              {['DMAX', 'HD', 'LD', 'DMIN'].map((sec) => (
                <div key={sec} className="space-y-2">
                  <h3 className="text-xs font-bold">{sec}</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {['R', 'G', 'B'].map((c) => (
                      <input
                        key={c}
                        name={`${sec}_${c}`}
                        value={reference[`${sec}_${c}`] || ''}
                        type="number"
                        step="0.01"
                        onChange={(e) => handleInput(e, 'ref')}
                        className="border-b-2 border-blue-200 p-1 text-xs font-mono w-full focus:border-blue-600 outline-none"
                        placeholder={c}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 右側文件 */}
      <div className="flex-1 p-8 overflow-auto bg-zinc-400 flex justify-center">
        <div className="w-[850px] bg-white p-10 shadow-2xl border border-black min-h-fit">
          <header className="flex justify-between items-end mb-8 border-b-2 border-black pb-2">
            <div>
              <h1 className="text-2xl font-black italic">
                KODAK PROCESS E-6 DEVIATION PLOT
              </h1>
              <p className="text-[9px] font-bold text-gray-400">
                Values shown as: Δ (Measured - Reference)
              </p>
            </div>
            <div className="text-right text-[10px] font-mono">
              Y-33 / MODIFIED
            </div>
          </header>

          <PlotSection
            title="D-MAX"
            channels={['RED', 'GREEN', 'BLUE']}
            data={history.map((h) => h['D-MAX'])}
            config={SECTION_CONFIGS['D-MAX']}
            colorBands={[
              { min: -0.1, max: -0.05, color: '#fbbf24' },
              { min: 0.15, max: 0.2, color: '#fbbf24' },
            ]}
          />
          <PlotSection
            title="HD"
            channels={['RED', 'GREEN', 'BLUE']}
            data={history.map((h) => h['HD'])}
            config={SECTION_CONFIGS['HD']}
            colorBands={[
              { min: 0.1, max: 0.15, color: '#f97316' },
              { min: 0.05, max: 0.1, color: '#fbbf24' },
            ]}
          />
          <PlotSection
            title="LD"
            channels={['RED', 'GREEN', 'BLUE']}
            data={history.map((h) => h['LD'])}
            config={SECTION_CONFIGS['LD']}
            colorBands={[
              { min: 0.05, max: 0.1, color: '#f97316' },
              { min: -0.1, max: -0.05, color: '#f97316' },
            ]}
          />
          <PlotSection
            title="D-MIN"
            channels={['RED', 'GREEN', 'BLUE']}
            data={history.map((h) => h['D-MIN'])}
            config={SECTION_CONFIGS['D-MIN']}
            colorBands={[{ min: 0.05, max: 0.1, color: '#fbbf24' }]}
          />
        </div>
      </div>
    </div>
  );
}
