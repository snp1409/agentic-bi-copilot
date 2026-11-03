import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { FileDown } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';

const MODERN_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

// Helper to format compact values (M / K)
const formatCompactValue = (val, unitType) => {
  const num = Number(val);
  let formatted = num.toLocaleString();

  if (num >= 1000000) {
    formatted = `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  } else if (num >= 1000) {
    formatted = `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }

  if (unitType === 'currency') return `$${formatted}`;
  if (unitType === 'streams') return `${formatted} streams`;
  return formatted;
};

// Formats long tier/track names neatly for the X-axis without dropped ticks or typos
const formatXAxisTick = (tick) => {
  if (!tick) return '';
  const cleaned = tick
    .replace('Premium ', 'Prem. ')
    .replace('Ad-Supported Free', 'Supported Free')
    .replace('Ad-Supported', 'Supported Free');
  return cleaned.length > 15 ? `${cleaned.slice(0, 13)}..` : cleaned;
};

// Standard Tooltip for Bar & Line Charts
const StandardTooltip = ({ active, payload, label, unitType }) => {
  if (active && payload && payload.length) {
    const rawVal = payload[0].value;
    const compactVal = formatCompactValue(rawVal, unitType);
    const exactVal = Number(rawVal).toLocaleString();

    return (
      <div className="bg-[#090d16] border border-slate-700/80 p-2.5 rounded-xl shadow-2xl text-xs">
        <p className="font-semibold text-slate-200 mb-0.5">{label}</p>
        <p className="text-amber-400 font-bold text-sm">{compactVal}</p>
        <p className="text-slate-500 text-[10px] mt-0.5">({exactVal} total)</p>
      </div>
    );
  }
  return null;
};

// Dedicated Tooltip for Pie Chart
const PieTooltip = ({ active, payload, unitType }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const compactVal = formatCompactValue(data.value, unitType);

    return (
      <div className="bg-[#090d16] border border-slate-700/80 p-2.5 rounded-xl shadow-2xl text-xs">
        <p className="font-semibold text-slate-200 mb-0.5">{data.name}</p>
        <p className="text-amber-400 font-bold">
          {compactVal}{' '}
          <span className="text-slate-400 font-normal ml-1">
            ({data.payload.percentShare}%)
          </span>
        </p>
      </div>
    );
  }
  return null;
};

// Custom percentage labels inside pie slices
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentShare }) => {
  if (percentShare < 5) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="#ffffff" 
      textAnchor="middle" 
      dominantBaseline="central" 
      fontSize="10" 
      fontWeight="bold"
    >
      {`${percentShare}%`}
    </text>
  );
};

// Collapsible SQL Inspector Component
function SqlViewer({ sqlQuery }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!sqlQuery) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full mt-4 bg-[#080c14] border border-slate-800/80 rounded-xl overflow-hidden transition-all">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-[11px] font-semibold text-slate-400 hover:text-slate-200 bg-[#0d1321]/60 hover:bg-[#0d1321] transition cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-amber-500 font-mono text-[10px] px-1.5 py-0.5 bg-amber-500/10 rounded border border-amber-500/20">SQL</span>
          <span>Executed Database Query</span>
        </div>
        <span className="text-xs">{isOpen ? '▲ Hide' : '▼ Inspect Query'}</span>
      </button>

      {isOpen && (
        <div className="p-4 bg-[#05080e] border-t border-slate-800/80 relative">
          <button 
            onClick={handleCopy}
            className="absolute top-3 right-3 px-2 py-1 text-[10px] font-medium bg-[#162035] hover:bg-slate-700 text-slate-300 rounded border border-slate-700/60 transition cursor-pointer"
          >
            {copied ? '✓ Copied' : 'Copy SQL'}
          </button>
          <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap pr-16 leading-relaxed">
            {sqlQuery}
          </pre>
        </div>
      )}
    </div>
  );
}

function ChartCard({ chartType, unitType, dataRaw }) {
  const cardRef = useRef(null);
  const formattedData = [];

  if (dataRaw) {
    dataRaw.split(",").forEach(pair => {
      const match = pair.split(":");
      if (match.length === 2) {
        const label = match[0].trim();
        const rawStr = match[1].trim();

        let cleanedString = rawStr.replace(/[\$,]/g, '');
        let numValue = parseFloat(cleanedString) || 0;

        if (rawStr.toLowerCase().includes('k')) {
          numValue = numValue * 1000;
        } else if (rawStr.toLowerCase().includes('m')) {
          numValue = numValue * 1000000;
        }

        formattedData.push({
          name: label,
          value: numValue
        });
      }
    });
  }

  if (formattedData.length === 0) return null;

  const totalValue = formattedData.reduce((acc, curr) => acc + curr.value, 0);
  const dataWithPercentages = formattedData.map(item => ({
    ...item,
    percentShare: totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : 0
  }));

  const handleExport = async () => {
    if (!cardRef.current) return;
    try {
      const btn = cardRef.current.querySelector('.export-btn');
      if (btn) btn.style.opacity = '0';
      const canvas = await html2canvas(cardRef.current, { backgroundColor: '#0d1321', scale: 2, useCORS: true });
      if (btn) btn.style.opacity = '1';
      const uri = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = uri;
      link.download = `Chart_${chartType}_Report.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) { console.error(e); }
  };

  const detectCategory = (dataItems) => {
    const names = dataItems.map(d => d.name.toLowerCase());
    
    const knownArtists = ['weeknd', 'sheeran', 'styles', 'lamar', 'drake', 'swift', 'rahman', 'singh', 'neighbourhood'];
    if (names.some(n => knownArtists.some(artist => n.includes(artist)))) {
      return 'artist';
    }

    const knownRegions = ['north america', 'europe', 'asia pacific', 'latin america'];
    if (names.some(n => knownRegions.some(region => n.includes(region)))) {
      return 'region';
    }

    const knownPlans = ['individual', 'family', 'duo', 'student', 'free', 'ad-supported'];
    if (names.some(n => knownPlans.some(plan => n.includes(plan)))) {
      return 'plan';
    }

    const knownGenres = ['pop', 'hip-hop', 'bollywood', 'r&b', 'indie rock', 'rock'];
    if (names.some(n => knownGenres.some(genre => n.includes(genre)))) {
      return 'genre';
    }

    return 'general';
  };

  const detected = detectCategory(formattedData);

  let readableTitles = {
    bar: 'Volume Distribution Matrix',
    pie: 'Category Share Breakdown',
    line: 'Sequential Trajectory'
  };
  let subtitleText = 'Count • Operational Metrics';

  if (unitType === 'streams') {
    let pieTitle = 'Genre Streaming Share Breakdown';
    if (detected === 'artist') pieTitle = 'Artist Volume Share Breakdown';
    else if (detected === 'genre') pieTitle = 'Genre Streaming Share Breakdown';

    readableTitles = {
      bar: detected === 'artist' ? 'Artist Volume Distribution Matrix' : 'Streaming Volume Distribution Matrix',
      pie: pieTitle,
      line: detected === 'artist' ? 'Sequential Artist Volume Trajectory' : 'Sequential Stream Volume Trajectory'
    };
    subtitleText = 'Streams • Play Count & Catalog Records';
  } else if (unitType === 'currency') {
    readableTitles = {
      bar: 'Revenue Distribution Matrix',
      pie: detected === 'region' ? 'Regional Revenue Breakdown' : 'Monetization Share Breakdown',
      line: 'Sequential Financial Trajectory'
    };
    subtitleText = 'USD • Enterprise Ledger Rows';
  } else if (unitType === 'count') {
    readableTitles = {
      bar: 'Volume Distribution Matrix',
      pie: detected === 'region' ? 'Regional Market Distribution' : (detected === 'plan' ? 'Subscriber Tier Distribution' : 'Category Share Breakdown'),
      line: 'Sequential Trajectory'
    };
    subtitleText = 'Count • Operational Metrics';
  }

  const formatAxisLabel = (v) => {
    if (v >= 1000000) {
      const formatted = (v / 1000000).toFixed(1).replace(/\.0$/, '');
      return unitType === 'currency' ? `$${formatted}M` : `${formatted}M`;
    }
    if (v >= 1000) {
      const formatted = (v / 1000).toFixed(0);
      return unitType === 'currency' ? `$${formatted}K` : `${formatted}K`;
    }
    return unitType === 'currency' ? `$${v}` : v;
  };

  return (
    <div ref={cardRef} className="relative w-full p-5 bg-[#0d1321] border border-slate-800/80 rounded-2xl shadow-2xl flex flex-col items-center overflow-hidden">
      <div className="w-full flex justify-between items-start mb-4">
        <div>
          <h4 className="text-xs font-bold text-slate-200 tracking-wide">{readableTitles[chartType]}</h4>
          <p className="text-[10px] text-slate-500 font-medium">
            {subtitleText}
          </p>
        </div>
        <button onClick={handleExport} className="export-btn px-2.5 py-1 text-[10px] font-bold bg-[#162035] hover:bg-amber-500 hover:text-slate-950 text-slate-300 rounded-lg border border-slate-800/80 cursor-pointer transition">
          Export PNG
        </button>
      </div>

      <div className="w-full flex justify-center h-[230px] pt-1">
        {chartType === 'bar' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formattedData} margin={{ left: 10, right: 15, bottom: 20 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.4}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#64748b" 
                fontSize={9} 
                tickLine={false} 
                interval={0}
                tickFormatter={formatXAxisTick}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={formatAxisLabel} 
              />
              <Tooltip content={<StandardTooltip unitType={unitType} />} />
              <Bar dataKey="value" fill="url(#barGrad)" radius={[6, 6, 0, 0]} barSize={34} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {chartType === 'line' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ left: 10, right: 15, bottom: 20 }}>
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.25}/>
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#64748b" 
                fontSize={9} 
                tickLine={false} 
                interval={0}
                tickFormatter={formatXAxisTick}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={formatAxisLabel} 
              />
              <Tooltip content={<StandardTooltip unitType={unitType} />} />
              <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fill="url(#lineGrad)" dot={{ r: 4, strokeWidth: 1, fill: '#0d1321' }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {chartType === 'pie' && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataWithPercentages}
                cx="40%"
                cy="50%"
                outerRadius={75}
                innerRadius={45}
                paddingAngle={5}
                dataKey="value"
                labelLine={false}
                label={renderCustomizedLabel}
              >
                {dataWithPercentages.map((e, idx) => (
                  <Cell key={`c-${idx}`} fill={MODERN_COLORS[idx % MODERN_COLORS.length]} stroke="#0d1321" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip unitType={unitType} />} />
              <Legend 
                layout="vertical" 
                align="right" 
                verticalAlign="middle" 
                iconType="circle" 
                wrapperStyle={{ fontSize: '10px', color: '#cbd5e1', paddingLeft: '10px' }} 
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function BIChart({ replyText }) {
  const reportRef = useRef(null);
  const [pdfExporting, setPdfExporting] = useState(false);

  if (!replyText) return null;

  const segments = replyText.split("\n");
  let plainTextLines = [];
  let discoveredCharts = [];
  let extractedSql = null;

  segments.forEach(line => {
    if (line.includes("SQL_QUERY|")) {
      extractedSql = line.split("SQL_QUERY|")[1]?.trim();
    } else if (line.includes("CHART_PAYLOAD")) {
      const payload = line.split("CHART_PAYLOAD|")[1];
      if (payload) {
        const subParts = payload.split("|");
        let type = 'bar';
        let unit = 'count';
        let data = '';

        subParts.forEach(part => {
          if (part.startsWith("TYPE:")) type = part.replace("TYPE:", "").toLowerCase().trim();
          if (part.startsWith("UNIT:")) unit = part.replace("UNIT:", "").toLowerCase().trim();
          if (part.startsWith("DATA:")) data = part.replace("DATA:", "").trim();
        });

        if (unit === 'count') {
          if (data.includes("stream") || line.toLowerCase().includes("stream")) unit = 'streams';
          if (data.includes("$") || line.toLowerCase().includes("revenue")) unit = 'currency';
        }

        discoveredCharts.push({ type, unit, data });
      }
    } else {
      plainTextLines.push(line);
    }
  });

  const cleanText = plainTextLines.join("\n").trim();

  const handleExportFullPdf = async () => {
    if (!reportRef.current || pdfExporting) return;
    setPdfExporting(true);

    try {
      const actionButtons = reportRef.current.querySelectorAll('.export-btn, .pdf-btn');
      actionButtons.forEach(b => b.style.opacity = '0');

      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        backgroundColor: '#070b12',
        scale: 3.5, // High supersampling for crisp DPI
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          // Force all cloned SVG elements and text nodes to use geometric precision
          const svgs = clonedDoc.querySelectorAll('svg');
          svgs.forEach((svg) => {
            svg.setAttribute('shape-rendering', 'geometricPrecision');
            svg.setAttribute('text-rendering', 'geometricPrecision');
          });
        }
      });

      actionButtons.forEach(b => b.style.opacity = '1');

      // Use lossless PNG to prevent JPEG compression artifacts around labels
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      const margin = 8;
      const printWidth = pageWidth - (margin * 2);
      const printHeight = (canvas.height * printWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', margin, margin, printWidth, printHeight, undefined, 'FAST');
      pdf.save(`Executive_BI_Report_${Date.now()}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF report:", err);
    } finally {
      setPdfExporting(false);
    }
  };

  return (
    <div ref={reportRef} className="space-y-6 w-full max-w-5xl flex flex-col items-start animate-fade-in p-2">
      {cleanText && (
        <div className="w-full p-5 bg-[#0d1321] border border-slate-800/60 rounded-2xl text-slate-300 text-xs leading-relaxed whitespace-pre-line shadow-2xl relative">
          <div className="flex justify-between items-center mb-2">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span> Executive Analytics Narrative
            </div>

            <button
              onClick={handleExportFullPdf}
              disabled={pdfExporting}
              className="pdf-btn px-2.5 py-1 text-[10px] font-bold bg-[#162035] hover:bg-amber-500 hover:text-slate-950 text-slate-300 rounded-lg border border-slate-800/80 cursor-pointer transition flex items-center gap-1.5"
            >
              <FileDown className="w-3 h-3 text-amber-400" />
              {pdfExporting ? "Compiling PDF..." : "Export Full PDF"}
            </button>
          </div>

          {cleanText}

          {/* Render Collapsible SQL Inspector Drawer */}
          <SqlViewer sqlQuery={extractedSql} />
        </div>
      )}

      {discoveredCharts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full pt-1">
          {discoveredCharts.map((chart, i) => (
            <ChartCard 
              key={i} 
              chartType={chart.type} 
              unitType={chart.unit} 
              dataRaw={chart.data} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default BIChart;