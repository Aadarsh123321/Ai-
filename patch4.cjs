const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Patch 1: Desktop button
const dtButtonStr = '<button onClick={processUpload} disabled={isAnalyzing} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-full font-semibold transition-colors shadow-lg text-sm shrink-0">\n                        {isAnalyzing ? "Analyzing..." : "Analyze & Start"}\n                    </button>';
const dtButtonNew = '<button onClick={processUpload} disabled={isAnalyzing || isExtractingPdf} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-full font-semibold transition-colors shadow-lg text-sm shrink-0">\n                        {isExtractingPdf ? "Loading PDF..." : isAnalyzing ? "Analyzing..." : "Analyze & Start"}\n                    </button>';
code = code.replace(dtButtonStr, dtButtonNew);

// Patch 2: Mobile button
const mobButtonStr = `<button 
                            onClick={processUpload} 
                            disabled={isAnalyzing} 
                            className="px-4 py-2 bg-indigo-600 active:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-bold transition-all shadow-lg text-xs shrink-0 flex items-center gap-1.5 active:scale-95"
                        >
                            {isAnalyzing ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Analyzing...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[16px]">play_circle</span>
                                    <span>Analyze & Start</span>
                                </>
                            )}
                        </button>`;
const mobButtonNew = `<button 
                            onClick={processUpload} 
                            disabled={isAnalyzing || isExtractingPdf} 
                            className="px-4 py-2 bg-indigo-600 active:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-bold transition-all shadow-lg text-xs shrink-0 flex items-center gap-1.5 active:scale-95"
                        >
                            {isAnalyzing || isExtractingPdf ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>{isExtractingPdf ? "Loading..." : "Analyzing..."}</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[16px]">play_circle</span>
                                    <span>Analyze & Start</span>
                                </>
                            )}
                        </button>`;
code = code.replace(mobButtonStr, mobButtonNew);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched buttons");
