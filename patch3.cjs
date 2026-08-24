const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const mainContainerStr = '<main ref={mainContainerRef} className="flex-1 flex overflow-hidden bg-[#0F172A] relative">';
const insertIndex = code.indexOf(mainContainerStr) + mainContainerStr.length;

const newSidebar = `
                {isPdfPagesSidebarOpen && pdfPages.length > 0 && (
                    <>
                        <div 
                            onClick={() => setIsPdfPagesSidebarOpen(false)} 
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                        />
                        
                        <div className="fixed md:relative inset-y-0 left-0 w-72 sm:w-80 md:w-80 bg-[#192231] border-r border-white/10 flex flex-col shrink-0 overflow-y-auto z-50 md:z-40 shadow-2xl">
                            <div className="p-4 border-b border-white/10 sticky top-0 bg-[#192231] z-10 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-white/90 text-sm tracking-wide">PDF PAGES</h3>
                                    <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">{pdfPages.length}</span>
                                </div>
                                <button 
                                    onClick={() => setIsPdfPagesSidebarOpen(false)} 
                                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>
                            <div className="p-3 grid grid-cols-2 gap-3">
                                {pdfPages.map((pageDataUrl, idx) => (
                                    <div 
                                        key={idx}
                                        className="group relative rounded-lg border border-white/10 overflow-hidden bg-slate-800 hover:border-indigo-500 transition-colors cursor-pointer aspect-[3/4]"
                                    >
                                        <img src={pageDataUrl} alt={\`Page \${idx + 1}\`} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    analyzeImage(dataURLtoFile(pageDataUrl, \`page-\${idx + 1}.jpg\`));
                                                    setIsPdfPagesSidebarOpen(false);
                                                }}
                                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs shadow-lg flex items-center gap-1"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                                                Analyze
                                            </button>
                                        </div>
                                        <div className="absolute top-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-[10px] font-bold text-white">
                                            {idx + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
`;

code = code.slice(0, insertIndex) + newSidebar + code.slice(insertIndex);
fs.writeFileSync('src/App.tsx', code);
console.log("Patched sidebars");
