const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Patch 1: extractPdfPages
const oldExtractStr = `            const pages: string[] = [];
            
            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 });
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                if (ctx) {
                    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
                    pages.push(canvas.toDataURL('image/jpeg', 0.8));
                }
            }
            
            setPdfPages(pages);
            setStatus("PDF loaded. Please select a page to analyze.");`;

const newExtractStr = `            setPdfPages([]);
            
            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 });
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                if (ctx) {
                    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    setPdfPages(prev => [...prev, dataUrl]);
                    
                    // Allow UI to update
                    await new Promise(r => setTimeout(r, 0));
                }
            }
            
            setStatus("PDF loaded. Please select a page to analyze.");`;

code = code.replace(oldExtractStr, newExtractStr);

// Patch 2: PDF Sidebar display
const oldSidebar = `{isPdfPagesSidebarOpen && pdfPages.length > 0 && (
                    <>
                        <div 
                            onClick={() => setIsPdfPagesSidebarOpen(false)} 
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                        />
                        
                        <div className="fixed md:relative inset-y-0 left-0 w-72 sm:w-80 md:w-80 bg-[#192231] border-r border-white/10 flex flex-col shrink-0 overflow-y-auto z-50 md:z-40 shadow-2xl">`;

const newSidebar = `<div className={isPdfPagesSidebarOpen && pdfPages.length > 0 ? "contents" : "hidden"}>
                        <div 
                            onClick={() => setIsPdfPagesSidebarOpen(false)} 
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                        />
                        
                        <div className="fixed md:relative inset-y-0 left-0 w-72 sm:w-80 md:w-80 bg-[#192231] border-r border-white/10 flex flex-col shrink-0 overflow-y-auto z-50 md:z-40 shadow-2xl">`;

code = code.replace(oldSidebar, newSidebar);

// Don't forget to replace the closing tag of the sidebar
// It was:
//                                     </div>
//                                 ))}
//                             </div>
//                         </div>
//                     </>
//                 )}
const oldSidebarClose = `                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}`;
const newSidebarClose = `                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>`;
code = code.replace(oldSidebarClose, newSidebarClose);

// Also remove "EDURO 2.0" and other name references
code = code.replace(/You are EDURO 2.0 - The Ultimate Living Mentor AI\./g, 'You are an Ultimate Living Mentor AI.');
code = code.replace(/You are EDURO 2.0 - and you are UNSTOPPABLE\./g, 'You are an unstoppable mentor.');
code = code.replace(/EDURO 2\.0/g, 'AI Mentor');

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx");
