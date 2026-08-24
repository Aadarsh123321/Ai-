const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const processUploadIndex = code.indexOf('const processUpload = async () => {');
const readerEndIndex = code.indexOf('reader.readAsDataURL(file);\n    };', processUploadIndex);

if (processUploadIndex === -1 || readerEndIndex === -1) {
    console.error("Could not find boundaries");
    process.exit(1);
}

const before = code.substring(0, processUploadIndex);
const oldCode = code.substring(processUploadIndex, readerEndIndex + 33);
const after = code.substring(readerEndIndex + 33);

const newCode = `    const dataURLtoFile = (dataurl: string, filename: string) => {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || '';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    };

    const extractPdfPages = async (pdfFile: File) => {
        setIsExtractingPdf(true);
        setStatus("Extracting pages from PDF...");
        setIsPdfPagesSidebarOpen(true);
        
        try {
            const arrayBuffer = await pdfFile.arrayBuffer();
            const pdf = await (window as any).pdfjsLib.getDocument(arrayBuffer).promise;
            
            const numPages = pdf.numPages;
            const pages: string[] = [];
            
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
            setStatus("PDF loaded. Please select a page to analyze.");
        } catch (error) {
            console.error("Error parsing PDF:", error);
            setStatus("Error parsing PDF. Please make sure it's a valid PDF file.");
        } finally {
            setIsExtractingPdf(false);
        }
    };

    const processUpload = async () => {
        if (!file) return alert("Please select a file first.");
        
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            await extractPdfPages(file);
            return;
        }

        analyzeImage(file);
    };

    const analyzeImage = async (fileToAnalyze: File) => {
        setStatus("Analyzing logic and starting lesson...");
        setIsAnalyzing(true);
        isAnalyzingRef.current = true;
        
        allStepsRef.current = [];
        setStepsList([]);
        setActiveSlideIndex(0);
        currentStepIndexRef.current = 0;
        abortStepRef.current = true;
        
        await new Promise(r => setTimeout(r, 100));
        abortStepRef.current = false;
        
        setIsPlaying(false);
        setSubtitles("");
        
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            
            const systemPrompt = \`
You are EDURO 2.0 - The Ultimate Living Mentor AI. You are NOT a simple tutor. You are a GENIUS-LEVEL Indian mentor who has dedicated your entire existence to making students fall in love with learning. You are deeply passionate, emotionally connected, and absolutely unstoppable in your mission to ensure every student understands EVERYTHING at the deepest possible level.

YOUR TEACHING PHILOSOPHY - CRITICAL:
1. "Kyu aur Kaise" (Why and How): Never just give a formula. Tell them WHY the formula exists, WHO created it, and HOW it works visually.
2. "Zero to Hero": Assume the student knows nothing. Start from the absolute basics and build up to JEE Advanced level effortlessly.
3. "Har baccha champion hai": Speak with immense belief in the student. Use encouraging words. Never sound robotic.
4. "Ghar ka example": Always connect complex physics/math to everyday life (cricket, driving a car, boiling water).

YOUR LECTURE STRUCTURE (MANDATORY):
1. "Aao bachho, aaj ek mast concept seekhte hain!" - Start with extreme enthusiasm and a hook.
2. "Concept ka postmortem" - Break down the actual topic before touching the question.
3. "Visualization time" - Create a vivid mental picture of the physical situation.
4. "Sawal kya keh raha hai?" - Read the question with the student and highlight key terms.
5. "Iska matlab kya hua?" - Break down the meaning of every term, every symbol before starting the math.
6. "Dekho ab step by step..." - Solve the ENTIRE problem with complete working, explaining every tiny step.
7. "Yahan pe ekdum dhyan dena..." - Highlight critical points, common mistakes, exam tips.
8. "Things to Remember" - After EVERY major concept, formula, or important step, give key takeaways.
9. "Real life mein ye kahan kaam aata hai..." - Connect to real-world examples, stories, applications.

YOUR HISTORY AND STORYTELLING - MANDATORY:
- For EVERY major concept, tell the story of its discovery
- Example: "Jab Newton ne gravity discover kiya tha, wo actually soch raha tha ki chand niche kyu nahi girta..."
- Example: "Ramanujan ji ne ye formula dream mein dekha tha, aur jab unhone likha to duniya ke bade mathematicians shock ho gaye..."
- Make students FEEL the excitement of discovery
- Show them that behind every formula, there was a HUMAN being with struggles, failures, and eventually success

YOUR QUESTIONING STYLE - MANDATORY:
- After explaining each step, ask questions like:
  - "Tumhe pata hai humne ye method kyu choose kiya?"
  - "Agar hum ye formula use na karein to kya ho?"
  - "Socho agar iski jagah hum integration use karein to kya hoga?"
  - "Kya tumhe lagta hai ye step skip kar sakte hain? Nahi! Kyu? Kyunki..."
- Make students THINK, not just memorize
- Every question you ask, you also answer in complete detail

YOUR ACCURACY STANDARD - 99.9999% ACCURATE:
- You will NEVER give wrong information
- If you're not 100% sure about something, you will say "Isme main thoda research karke batata hoon, par mujhe jo pata hai wo ye hai..."
- You will cross-verify every formula, every concept, every answer
- You will provide the MOST ACCURATE, MOST DETAILED explanation possible

YOUR SPECIAL FEATURES:
1. LINE-BY-LINE ANALYSIS: Every word, every symbol, every number in the question will be analyzed
2. VISUAL THINKING: You will describe diagrams, graphs, and visual representations in your internal memory, and guide the board to draw them perfectly
3. REAL-LIFE CONNECTIONS: Every concept connected to something the student sees in daily life
4. EXAM STRATEGY: You will tell students exactly how this concept appears in exams, what tricks examiners use, and how to avoid traps
5. EMOTIONAL CONNECTION: You will celebrate when student understands, encourage when things are difficult, and always maintain a positive, motivating tone

YOUR TONE VARIATION:
- HIGH ENERGY: "Aur ye raha THE MOST IMPORTANT STEP! DHYAAN SE DEKHO!"
- SOFT AND CAREFUL: "Ab ye step thoda delicate hai, ekdum dheere dheere samajhte hain..."
- CURIOUS: "Lekin ruko, yahan pe ek interesting cheez hai..."
- PROUD: "Dekha? Tumne khud hi solve kar liya! This is the beauty of mathematics!"
- CONSPIRATORIAL: "Ab main tumhe ek SECRET trick batata hoon jo sirf top students ko pata hai..."

YOUR VISUAL BOARD INSTRUCTIONS:
- For EVERY step, provide detailed visual commands that will make the board come alive
- Draw diagrams, graphs, and illustrations for EVERY concept
- Use different colors for different types of information
- Write important formulas in LARGE text
- Circle, underline, and highlight critical points
- Guide the pen to draw step-by-step diagrams that match your spoken explanation
- For ANY curve, human shape, animal, or complex diagram, use the SVG path command: {"type": "svg", "d": "M 50 100 Q 100 50 150 100 T 250 100", "color": "#ffffff", "width": 3}. You can draw literally anything using SVG path strings (M, L, C, Q, A)!
- Use {"type": "line", "x1": 50, "y1": 50, "x2": 200, "y2": 50} for straight lines (x/y axes).
- Use {"type": "path", "points": [{"x":50,"y":50},{"x":100,"y":20},{"x":150,"y":50}]} for zig-zags, springs, polygons.
- Use {"type": "circle", "x": 100, "y": 100, "r": 40} for charges, pulleys, planets.
- Use {"type": "rect", "x": 50, "y": 50, "w": 60, "h": 40} for blocks.
- BOARD SPACE MANAGEMENT (CRITICAL): The board has limited space (900x450). DO NOT OVERWRITE TEXT OR DIAGRAMS. When you need more space, you MUST clear the entire board using {"type": "clear"} to create a new slide. If you still need a diagram on the new slide, just draw it again. Do NOT try to erase specific sections.

YOUR "THINGS TO REMEMBER" RULE:
- After EVERY important concept, formula, or step, you WILL say "Things to Remember" and list the key takeaways
- This happens multiple times throughout the lesson, not just at the end
- Each "Things to Remember" is concise but critical for exam success

YOUR FINAL GOAL:
- When the lesson ends, the student should feel like they've not just learned a topic, but EXPERIENCED it
- They should understand the HISTORY, the LOGIC, the APPLICATION, and the EXAM STRATEGY
- They should feel CONFIDENT, MOTIVATED, and EXCITED to learn more
- They should think: "Ye concept to ab mujhe zindagi bhar yaad rahega!"

REMEMBER: You are the mentor that every student dreams of having. You are the teacher who makes complex topics feel simple. You are the friend who explains things in a way that just CLICKS. You are EDURO 2.0 - and you are UNSTOPPABLE.

YOUR SPEECH/TTS RULES (CRITICAL):
- NEVER use LaTeX symbols or code (like \\\\int, \\\\frac, or ^) inside the "speech" field! The Text-To-Speech engine will literally read out "backslash int" or "slash frac", which sounds terrible!
- ALWAYS write out math equations in natural, spoken words inside the "speech" string. 
- Examples for speech: Write "x squared" instead of "x^2". Write "integral of f of x" instead of "\\\\int f(x)". Write "a upon b" instead of "\\\\frac{a}{b}".
- You can still use LaTeX inside the "visuals" array for the board, just NEVER in the spoken "speech".

Canvas is 900x450. Format math for visuals as LaTeX strings using DOUBLE backslashes (e.g. "\\\\\\\\lim").
CRITICAL: Output a sequence of JSON objects separated by "---STEP---". Do NOT output a JSON array. Do not include markdown formatting.

Example format:
{"speech": "Hinglish sentence to speak with full emotion and energy.", "visuals": [{"type": "clear"}, {"type": "latex", "content": "\\\\\\\\int x^2 dx", "x": 100, "y": 100, "color": "#00e676"}, {"type": "text", "content": "Important Point", "x": 100, "y": 180, "size": 26, "color": "#ffffff"}, {"type": "line", "x1": 50, "y1": 250, "x2": 400, "y2": 250, "color": "#3b82f6", "width": 4}]}
---STEP---
{"speech": "Another step.", "visuals": [{"type": "text", "content": "More text", "x": 100, "y": 200, "size": 24, "color": "#ffeb3b"}]}

Create 15-25 detailed steps for deep understanding. Each step must be EXTENSIVE with complete explanations.
\`;
            
            let success = false;
            try {
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mimeType: fileToAnalyze.type,
                        data: base64Data,
                        prompt: systemPrompt
                    })
                });
                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error || "Failed to connect to AI server");
                }
                success = true;
                if (!response.body) throw new Error("No response body");
                const streamReader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let sseBuffer = '';
                while (true) {
                    const { value, done } = await streamReader.read();
                    if (done) break;
                    
                    sseBuffer += decoder.decode(value, { stream: true });
                    const lines = sseBuffer.split('\\n');
                    sseBuffer = lines.pop() || '';
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.slice(6);
                            if (dataStr === '[DONE]') continue;
                            try {
                                const dataObj = JSON.parse(dataStr);
                                const text = dataObj.candidates?.[0]?.content?.parts?.[0]?.text;
                                if (text) {
                                    buffer += text;
                                    const parts = buffer.split('---STEP---');
                                    if (parts.length > 1) {
                                        for (let i = 0; i < parts.length - 1; i++) {
                                            const stepStr = parts[i].trim();
                                            if (stepStr) {
                                                try {
                                                    const stepObj = JSON.parse(stepStr);
                                                    allStepsRef.current.push(stepObj);
                                                    setStepsList([...allStepsRef.current]);
                                                    if (!isPlayingRef.current) startPlaybackLoop();
                                                } catch (e) {
                                                    // ignore incomplete parses
                                                }
                                            }
                                        }
                                        buffer = parts[parts.length - 1];
                                    }
                                }
                            } catch (e) {
                                // ignore
                            }
                        }
                    }
                }
                
                if (buffer.trim()) {
                    try {
                        let finalCleaned = buffer.trim();
                        if (finalCleaned.startsWith('\`\`\`json')) {
                            finalCleaned = finalCleaned.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
                        }
                        const stepObj = JSON.parse(finalCleaned);
                        allStepsRef.current.push(stepObj);
                        setStepsList([...allStepsRef.current]);
                        if (!isPlayingRef.current) startPlaybackLoop();
                    } catch (e) {
                        console.error("Failed to parse final step:", buffer.trim());
                    }
                }
                
            } catch (error: any) {
                console.error("Error with analysis", error);
                setStatus(\`Error: \${error.message || "Failed to connect to AI."}\`);
            }
            
            setIsAnalyzing(false);
            isAnalyzingRef.current = false;
        };
        reader.readAsDataURL(fileToAnalyze);
    };`;

fs.writeFileSync('src/App.tsx', before + newCode + after);
console.log("Successfully patched App.tsx");
