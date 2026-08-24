const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace mobile nav header buttons
const mobileNavStart = code.indexOf('<div className="flex items-center gap-1.5">');
const mobileNavEnd = code.indexOf('</div>', mobileNavStart + 100);

if (mobileNavStart !== -1) {
    const mobileReplacement = `<div className="flex items-center gap-1.5">
                        <button 
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-semibold text-indigo-300 flex items-center gap-1 shadow-sm active:scale-95"
                            title="View Slides"
                        >
                            <span className="material-symbols-outlined text-[16px]">view_sidebar</span>
                            <span>Slides ({stepsList.length})</span>
                        </button>
                        {pdfPages.length > 0 && (
                            <button 
                                onClick={() => setIsPdfPagesSidebarOpen(!isPdfPagesSidebarOpen)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-semibold text-indigo-300 flex items-center gap-1 shadow-sm active:scale-95"
                                title="View Pages"
                            >
                                <span className="material-symbols-outlined text-[16px]">menu_book</span>
                                <span>Pages</span>
                            </button>
                        )}
                        <button 
                            onClick={toggleFullscreen} 
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-white flex items-center justify-center active:scale-95" 
                            title="Fullscreen"
                        >
                            <span className="material-symbols-outlined text-[18px]">
                                {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                            </span>
                        </button>
                    </div>`;
    // We have to be careful with mobileNavEnd because there is a nested button structure... wait, 
    // it's better to just string-replace the exact block
}
