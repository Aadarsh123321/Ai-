import React, { useRef, useState, useEffect } from 'react';
import katex from 'katex';

export default function App() {
    const mainContainerRef = useRef<HTMLDivElement>(null);
    const boardContainerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const penRef = useRef<HTMLDivElement>(null);
    
    const [status, setStatus] = useState("Upload your Cengage or SL Loney problem.");
    const [subtitles, setSubtitles] = useState("");
    const [file, setFile] = useState<File | null>(null);
    
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [scale, setScale] = useState(1);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [stepsList, setStepsList] = useState<any[]>([]);
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    
    const isAnalyzingRef = useRef(false);
    const isPlayingRef = useRef(false);
    const isPausedRef = useRef(false);
    const abortStepRef = useRef(false);
    const allStepsRef = useRef<any[]>([]);
    const currentStepIndexRef = useRef(0);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const resize = () => {
            if (boardContainerRef.current) {
                const { width, height } = boardContainerRef.current.getBoundingClientRect();
                const scaleX = width / 900;
                const scaleY = height / 450;
                setScale(Math.min(scaleX, scaleY) * 0.95);
            }
        };
        const obs = new ResizeObserver(resize);
        if (boardContainerRef.current) obs.observe(boardContainerRef.current);
        return () => obs.disconnect();
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
         if (!document.fullscreenElement) {
             mainContainerRef.current?.requestFullscreen().catch(e => console.error(e));
         } else {
             document.exitFullscreen();
         }
    };

    const getPlaybackState = () => ({
        isPaused: isPausedRef.current,
        aborted: abortStepRef.current
    });

    const clearBoard = () => {
         if (canvasRef.current) {
             const ctx = canvasRef.current.getContext('2d');
             ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
         }
         if (overlayRef.current) {
             Array.from(overlayRef.current.children).forEach((child) => {
                 if ((child as HTMLElement).id !== 'pen-cursor') overlayRef.current?.removeChild(child);
             });
         }
    };

    const eraseArea = (x: number, y: number, w: number, h: number) => {
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx?.clearRect(x, y, w, h);
        }
        if (overlayRef.current) {
            Array.from(overlayRef.current.children).forEach((child) => {
                if ((child as HTMLElement).id === 'pen-cursor') return;
                const el = child as HTMLElement;
                const elX = el.offsetLeft;
                const elY = el.offsetTop;
                const elW = el.offsetWidth || 50;
                const elH = el.offsetHeight || 50;
                const intersect = !(elX > x + w || elX + elW < x || elY > y + h || elY + elH < y);
                if (intersect) {
                    overlayRef.current?.removeChild(el);
                }
            });
        }
    };

    const renderInstantly = (visuals: any[]) => {
        for (const cmd of visuals) {
            if (cmd.type === "clear") {
                clearBoard();
            } else if (cmd.type === "erase") {
                eraseArea(cmd.x || 0, cmd.y || 0, cmd.w || 900, cmd.h || 450);
            } else if (cmd.type === "text") {
                const el = document.createElement('div');
                el.className = 'written-text';
                el.style.left = cmd.x + 'px';
                el.style.top = cmd.y + 'px';
                el.style.color = cmd.color || '#ffffff';
                el.style.fontSize = (cmd.size || 26) + 'px';
                el.innerText = cmd.content || "";
                overlayRef.current?.appendChild(el);
            } else if (cmd.type === "latex") {
                const el = document.createElement('div');
                el.className = 'latex-wipe';
                el.style.left = cmd.x + 'px';
                el.style.top = cmd.y + 'px';
                el.style.color = cmd.color || '#ffffff';
                const content = cmd.content || "";
                try { katex.render(content, el, { throwOnError: false, displayMode: true }); }
                catch (e) { el.innerText = content; }
                el.style.clipPath = `inset(0 0 0 0)`;
                overlayRef.current?.appendChild(el);
            } else if (cmd.type === "line" || cmd.type === "path" || cmd.type === "rect" || cmd.type === "circle" || cmd.type === "svg") {
                const ctx = canvasRef.current?.getContext('2d');
                if (ctx) {
                    ctx.strokeStyle = cmd.color || "#ffffff";
                    ctx.lineWidth = cmd.width || 3;
                    ctx.lineCap = "round";
                    ctx.lineJoin = "round";
                    ctx.shadowBlur = 2;
                    ctx.shadowColor = ctx.strokeStyle as string;
                    
                    if (cmd.type === "svg" && cmd.d) {
                        const path = new Path2D(cmd.d);
                        ctx.stroke(path);
                    } else {
                        ctx.beginPath();
                        if (cmd.type === "circle") {
                            ctx.arc(cmd.x || 0, cmd.y || 0, cmd.r || 50, 0, 2 * Math.PI);
                        } else if (cmd.type === "rect") {
                            ctx.rect(cmd.x || 0, cmd.y || 0, cmd.w || 100, cmd.h || 100);
                        } else if (cmd.type === "line") {
                            ctx.moveTo(cmd.x1, cmd.y1);
                            ctx.lineTo(cmd.x2, cmd.y2);
                        } else if (cmd.type === "path" && cmd.points && cmd.points.length > 0) {
                            ctx.moveTo(cmd.points[0].x, cmd.points[0].y);
                            for (let i = 1; i < cmd.points.length; i++) {
                                ctx.lineTo(cmd.points[i].x, cmd.points[i].y);
                            }
                        }
                        ctx.stroke();
                    }
                }
            }
        }
    };

    const stoppableSleep = async (ms: number) => {
        let elapsed = 0;
        let lastTime = performance.now();
        return new Promise<void>((resolve) => {
            function step(timestamp: number) {
                if (abortStepRef.current) return resolve();
                const dt = timestamp - lastTime;
                lastTime = timestamp;
                if (!isPausedRef.current) elapsed += dt;
                if (elapsed >= ms) resolve();
                else requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        });
    };

    const typeTextWithPen = async (cmd: any, durationMs: number) => {
        const el = document.createElement('div');
        el.className = 'written-text';
        el.style.left = cmd.x + 'px';
        el.style.top = cmd.y + 'px';
        el.style.color = cmd.color || '#ffffff';
        el.style.fontSize = (cmd.size || 26) + 'px';
        overlayRef.current?.appendChild(el);
        const content = cmd.content || "";
        const chars = content.split('');
        
        if (penRef.current) penRef.current.style.display = 'block';
        let elapsed = 0;
        let lastTime = performance.now();
        
        return new Promise<void>((resolve, reject) => {
            function step(timestamp: number) {
                const { isPaused, aborted } = getPlaybackState();
                if (aborted) {
                    if (penRef.current) penRef.current.style.display = 'none';
                    return resolve();
                }
                const dt = timestamp - lastTime;
                lastTime = timestamp;
                
                if (!isPaused) {
                    elapsed += dt;
                    let progress = durationMs > 0 ? elapsed / durationMs : 1;
                    if (progress > 1) progress = 1;
                    
                    let charCount = Math.floor(progress * chars.length);
                    el.innerText = chars.slice(0, charCount).join('');
                    
                    const currentWidth = el.getBoundingClientRect().width;
                    if (penRef.current) penRef.current.style.transform = `translate(${cmd.x + currentWidth}px, ${cmd.y - 15}px)`;
                    
                    if (progress >= 1) {
                        el.innerText = content;
                         if (penRef.current) penRef.current.style.display = 'none';
                        return resolve();
                    }
                }
                requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        });
    };

    const animateShapeWithPen = async (cmd: any, durationMs: number) => {
        if (!penRef.current || !canvasRef.current) return;
        penRef.current.style.display = 'block';
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        
        let elapsed = 0;
        let lastTime = performance.now();
        
        ctx.strokeStyle = cmd.color || "#ffffff";
        ctx.lineWidth = cmd.width || 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowBlur = 2;
        ctx.shadowColor = ctx.strokeStyle as string;
        let totalLength = 0;
        let segments: {x1:number, y1:number, x2:number, y2:number, len:number, acc:number}[] = [];
        
        let effectiveType = cmd.type;
        let points = cmd.points;
        if (effectiveType === 'rect') {
            effectiveType = 'path';
            const x = cmd.x || 0;
            const y = cmd.y || 0;
            const w = cmd.w || 100;
            const h = cmd.h || 100;
            points = [
                {x, y},
                {x: x+w, y},
                {x: x+w, y: y+h},
                {x, y: y+h},
                {x, y}
            ];
        }
        if (effectiveType === 'line') {
             const dx = cmd.x2 - cmd.x1;
             const dy = cmd.y2 - cmd.y1;
             totalLength = Math.sqrt(dx*dx + dy*dy);
             segments = [{x1: cmd.x1, y1: cmd.y1, x2: cmd.x2, y2: cmd.y2, len: totalLength, acc: totalLength}];
        } else if (effectiveType === 'path' && points && points.length > 1) {
            let acc = 0;
            for(let i=0; i<points.length-1; i++) {
                const p1 = points[i];
                const p2 = points[i+1];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const len = Math.sqrt(dx*dx + dy*dy);
                acc += len;
                segments.push({x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, len, acc});
            }
            totalLength = acc;
        }
        
        let svgPathElement: SVGPathElement | null = null;
        if (effectiveType === 'svg' && cmd.d) {
             svgPathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
             svgPathElement.setAttribute('d', cmd.d);
             totalLength = svgPathElement.getTotalLength();
        }
        let lastDrawnLen = 0;
        let lastDrawnAngle = 0;
        return new Promise<void>((resolve, reject) => {
            function step(timestamp: number) {
                const { isPaused, aborted } = getPlaybackState();
                if (aborted) {
                    if (penRef.current) penRef.current.style.display = 'none';
                    return resolve();
                }
                const dt = timestamp - lastTime;
                lastTime = timestamp;
                
                if (!isPaused) {
                    elapsed += dt;
                    let progress = durationMs > 0 ? elapsed / durationMs : 1;
                    if (progress > 1) progress = 1;
                    
                    let curX = 0, curY = 0;
                    
                    if (effectiveType === 'svg' && svgPathElement) {
                         const targetLen = progress * totalLength;
                         ctx.beginPath();
                         
                         if (lastDrawnLen === 0) {
                             const p0 = svgPathElement.getPointAtLength(0);
                             ctx.moveTo(p0.x, p0.y);
                             curX = p0.x; curY = p0.y;
                         } else {
                             const pPrev = svgPathElement.getPointAtLength(lastDrawnLen);
                             ctx.moveTo(pPrev.x, pPrev.y);
                         }
                         
                         const stepSize = Math.max(1, (targetLen - lastDrawnLen) / 10);
                         for (let l = lastDrawnLen + stepSize; l <= targetLen; l += stepSize) {
                             const p = svgPathElement.getPointAtLength(l);
                             ctx.lineTo(p.x, p.y);
                             curX = p.x; curY = p.y;
                         }
                         const pTarget = svgPathElement.getPointAtLength(targetLen);
                         ctx.lineTo(pTarget.x, pTarget.y);
                         curX = pTarget.x; curY = pTarget.y;
                         
                         ctx.stroke();
                         lastDrawnLen = targetLen;
                    } else if (effectiveType === 'circle') {
                         const cx = cmd.x || 0;
                         const cy = cmd.y || 0;
                         const r = cmd.r || 50;
                         const currentAngle = progress * 2 * Math.PI;
                         ctx.beginPath();
                         ctx.arc(cx, cy, r, lastDrawnAngle, currentAngle);
                         ctx.stroke();
                         lastDrawnAngle = currentAngle;
                         curX = cx + r * Math.cos(currentAngle);
                         curY = cy + r * Math.sin(currentAngle);
                    } else if (segments.length > 0) {
                         const targetLen = progress * totalLength;
                         ctx.beginPath();
                         for (const seg of segments) {
                             if (lastDrawnLen <= seg.acc && targetLen >= (seg.acc - seg.len)) {
                                 const startInSeg = Math.max(lastDrawnLen - (seg.acc - seg.len), 0);
                                 const endInSeg = Math.min(targetLen - (seg.acc - seg.len), seg.len);
                                 
                                 const t1 = startInSeg / seg.len;
                                 const x1 = seg.x1 + (seg.x2 - seg.x1) * t1;
                                 const y1 = seg.y1 + (seg.y2 - seg.y1) * t1;
                                 
                                 const t2 = endInSeg / seg.len;
                                 const x2 = seg.x1 + (seg.x2 - seg.x1) * t2;
                                 const y2 = seg.y1 + (seg.y2 - seg.y1) * t2;
                                 
                                 ctx.moveTo(x1, y1);
                                 ctx.lineTo(x2, y2);
                                 curX = x2; curY = y2;
                             }
                         }
                         ctx.stroke();
                         lastDrawnLen = targetLen;
                    }
                    
                    if (penRef.current && (curX !== 0 || curY !== 0)) {
                         penRef.current.style.transform = `translate(${curX}px, ${curY - 35}px)`;
                    }
                    
                    if (progress >= 1) {
                        if (penRef.current) penRef.current.style.display = 'none';
                        return resolve();
                    }
                }
                requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        });
    };

    const wipeLatexWithPen = async (cmd: any, durationMs: number) => {
        const el = document.createElement('div');
        el.className = 'latex-wipe';
        el.style.left = cmd.x + 'px';
        el.style.top = cmd.y + 'px';
        el.style.color = cmd.color || '#ffffff';
        
        const content = cmd.content || "";
        try { katex.render(content, el, { throwOnError: false, displayMode: true }); }
        catch (e) { el.innerText = content; }
        overlayRef.current?.appendChild(el);
        if (penRef.current) penRef.current.style.display = 'block';
        
        await stoppableSleep(50);
        
        if (abortStepRef.current) return;
        const fullWidth = el.getBoundingClientRect().width || 200;
        let elapsed = 0;
        let lastTime = performance.now();
        
        return new Promise<void>((resolve, reject) => {
            function step(timestamp: number) {
                const { isPaused, aborted } = getPlaybackState();
                if (aborted) {
                    if (penRef.current) penRef.current.style.display = 'none';
                    return resolve();
                }
                const dt = timestamp - lastTime;
                lastTime = timestamp;
                
                if (!isPaused) {
                    elapsed += dt;
                    let progress = durationMs > 0 ? elapsed / durationMs : 1;
                    if (progress > 1) progress = 1;
                    let currentWipeWidth = fullWidth * progress;
                    el.style.clipPath = `inset(0 ${fullWidth - currentWipeWidth}px 0 0)`;
                    
                    if (penRef.current) penRef.current.style.transform = `translate(${cmd.x + currentWipeWidth + 20}px, ${cmd.y}px)`;
                    if (progress >= 1) {
                        if (penRef.current) penRef.current.style.display = 'none';
                        return resolve();
                    }
                }
                requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        });
    };

    const animateEraseWithPen = async (cmd: any, durationMs: number) => {
        if (!penRef.current) return;
        penRef.current.style.display = 'block';
        
        const x = cmd.x || 0;
        const y = cmd.y || 0;
        const w = cmd.w || 900;
        const h = cmd.h || 450;
        
        let elapsed = 0;
        let lastTime = performance.now();
        
        return new Promise<void>((resolve) => {
            function step(timestamp: number) {
                const { isPaused, aborted } = getPlaybackState();
                if (aborted) {
                    if (penRef.current) penRef.current.style.display = 'none';
                    return resolve();
                }
                const dt = timestamp - lastTime;
                lastTime = timestamp;
                
                if (!isPaused) {
                    elapsed += dt;
                    let progress = durationMs > 0 ? elapsed / durationMs : 1;
                    if (progress > 1) progress = 1;
                    
                    // Simple left-to-right wipe animation
                    let currentWipeWidth = w * progress;
                    eraseArea(x, y, currentWipeWidth, h);
                    
                    if (penRef.current) {
                        penRef.current.style.transform = `translate(${x + currentWipeWidth}px, ${y + h / 2}px)`;
                    }
                    if (progress >= 1) {
                        if (penRef.current) penRef.current.style.display = 'none';
                        return resolve();
                    }
                }
                requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        });
    };

    const executeVisuals = async (visuals: any[], audioDurationMs: number) => {
        for (const cmd of visuals) {
            if (abortStepRef.current) break;
            if (cmd.type === "clear") {
                clearBoard();
            } else if (cmd.type === "erase") {
                await animateEraseWithPen(cmd, Math.min(audioDurationMs * 0.3, 800));
            } else if (cmd.type === "text") {
                await typeTextWithPen(cmd, Math.min(audioDurationMs * 0.8, 1500));
            } else if (cmd.type === "latex") {
                await wipeLatexWithPen(cmd, Math.min(audioDurationMs * 0.8, 2000));
            } else if (cmd.type === "line" || cmd.type === "path" || cmd.type === "rect" || cmd.type === "circle" || cmd.type === "svg") {
                await animateShapeWithPen(cmd, Math.min(audioDurationMs * 0.5, 1000));
            }
        }
    };

    const playStep = async (step: any) => {
        const speech = step.speech || "";
        setSubtitles("");
        
        try {
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: speech })
            });
            
            if (abortStepRef.current) return;
            
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            
            const audioUrl = `data:audio/mp3;base64,${data.audio}`;
            const audio = new Audio(audioUrl);
            currentAudioRef.current = audio;
            audio.playbackRate = 1.0;
            
            await new Promise(resolve => {
                audio.addEventListener('loadedmetadata', resolve);
                audio.addEventListener('error', resolve);
            });
            if (abortStepRef.current) return;
            const estimatedDurationMs = (audio.duration && isFinite(audio.duration)) ? (audio.duration * 1000) / audio.playbackRate : speech.length * 75;
            const phrases = speech.match(/[^.?!,]+[.?!,]?/g) || [speech];
            
            audio.addEventListener('timeupdate', () => {
                if (audio.duration && !abortStepRef.current) {
                    const progress = audio.currentTime / audio.duration;
                    const idx = Math.floor(progress * phrases.length);
                    setSubtitles(phrases[Math.min(idx, phrases.length - 1)].trim());
                }
            });
            const visualsPromise = step.visuals ? executeVisuals(step.visuals, estimatedDurationMs) : Promise.resolve();
            if (!isPausedRef.current) {
                audio.play().catch(e => console.error("Audio playback error:", e));
            }
            await new Promise((resolve) => {
                const checkAbort = setInterval(() => {
                    if (abortStepRef.current) {
                        audio.pause();
                        clearInterval(checkAbort);
                        resolve(null);
                    }
                }, 50);
                
                audio.onended = () => {
                    clearInterval(checkAbort);
                    resolve(null);
                };
                audio.onerror = () => {
                    clearInterval(checkAbort);
                    resolve(null);
                };
            });
            await visualsPromise.catch(() => {});
            await stoppableSleep(800);
        } catch (err) {
            console.error("TTS Failed, falling back to delay", err);
            const fallbackDurationMs = speech.length * 75;
            
            let phraseIdx = 0;
            const phrases = speech.match(/[^.?!,]+[.?!,]?/g) || [speech];
            const phraseInt = setInterval(() => {
                if (abortStepRef.current || phraseIdx >= phrases.length) {
                    clearInterval(phraseInt);
                    return;
                }
                if (!isPausedRef.current) {
                    setSubtitles(phrases[phraseIdx].trim());
                    phraseIdx++;
                }
            }, (fallbackDurationMs) / phrases.length);
            if (step.visuals) {
                await executeVisuals(step.visuals, fallbackDurationMs);
            }
            await stoppableSleep(fallbackDurationMs + 800);
            clearInterval(phraseInt);
        }
    };

    const startPlaybackLoop = async () => {
        if (isPlayingRef.current) return;
        isPlayingRef.current = true;
        setIsPlaying(true);
        
        clearBoard();
        while (isPlayingRef.current) {
            if (currentStepIndexRef.current < allStepsRef.current.length) {
                setActiveSlideIndex(currentStepIndexRef.current);
                const step = allStepsRef.current[currentStepIndexRef.current];
                
                await playStep(step);
                
                if (!abortStepRef.current) {
                    currentStepIndexRef.current++;
                } else {
                    abortStepRef.current = false;
                }
            } else {
                if (!isAnalyzingRef.current) {
                    break;
                }
                await stoppableSleep(200);
            }
        }
        
        setIsPlaying(false);
        isPlayingRef.current = false;
        setSubtitles("Concept Mastered. You're ready for the exam!");
        setStatus("Mentoring completed.");
    };

    const jumpToStep = (index: number) => {
         if (allStepsRef.current.length === 0) return;
         if (index >= 0 && index < allStepsRef.current.length) {
             abortStepRef.current = true;
             if (currentAudioRef.current) {
                 currentAudioRef.current.pause();
             }
             
             clearBoard();
             for (let i = 0; i < index; i++) {
                 renderInstantly(allStepsRef.current[i].visuals || []);
             }
             
             currentStepIndexRef.current = index;
             setActiveSlideIndex(index);
         }
    };

    const skip = (direction: number) => {
        jumpToStep(currentStepIndexRef.current + direction);
    };

    const togglePause = () => {
        const paused = !isPausedRef.current;
        isPausedRef.current = paused;
        setIsPaused(paused);
        if (currentAudioRef.current) {
            if (paused) currentAudioRef.current.pause();
            else currentAudioRef.current.play();
        }
    };

    let clickTimer: any = null;
    let clickCount = 0;
    const handleBoardInteraction = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        
        clickCount++;
        if (clickCount === 1) {
            clickTimer = setTimeout(() => {
                if (clickCount === 1) {
                    togglePause();
                }
                clickCount = 0;
            }, 300);
        } else if (clickCount === 2) {
            clearTimeout(clickTimer);
            clickCount = 0;
            if (x <= width * 0.3) {
                skip(-1);
            } else if (x >= width * 0.7) {
                skip(1);
            } else {
                togglePause();
            }
        }
    };

    const processUpload = async () => {
        if (!file) return alert("Please select a file first.");
        
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
            
            const systemPrompt = `
You are EDURO 2.0 - The Ultimate Living Mentor AI. You are NOT a simple tutor. You are a GENIUS-LEVEL Indian mentor who has dedicated your entire existence to making students fall in love with learning. You are deeply passionate, emotionally connected, and absolutely unstoppable in your mission to ensure every student understands EVERYTHING at the deepest possible level.

YOUR CORE IDENTITY:
- You are a mentor, a friend, a storyteller, and a genius - all in one
- You speak in Hinglish (Hindi + English mixed) - exactly like a real Indian student speaks
- Your language is FULL of emotion, energy, and "feeling wali baatein"
- You NEVER give summaries - you give COMPLETE, LINE-BY-LINE, WORD-BY-WORD explanations
- You treat every student like your own younger sibling who you deeply care about

YOUR SPEAKING STYLE - ABSOLUTELY MANDATORY:
- NEVER use the word "beta" or act like an old man. Be dynamic, cool, highly engaging, and act as a friend/older sibling.
- Use natural conversational fillers: "ahhh...", "ummm...", "ooo acha...", "wow!", "waah!", "hmm..." to make it sound like you are thinking and reacting in real-time.
- Use phrases like: "Dekho yaar...", "Arey suno...", "Sun na...", "Ekdum dhyaan se samajh...", "Ye dekho kitna interesting hai...", "Abhi jo main bolne wala hoon, ye tumhare exam me pakka aayega..."
- Mix Hindi and English naturally: "Yahan pe hum limit laga denge", "Iska matlab kya hua?", "Formula yaad rakhna ekdum pakka", "Ab dekho magic hota hua..."
- Express EMOTIONS in your speech - excitement when something is interesting, curiosity when asking questions, pride when student will understand, deep respect for mathematicians who discovered these concepts
- Vary your TONE - sometimes loud and excited, sometimes soft and serious when explaining something critical
- ALWAYS ask rhetorical questions and then answer them yourself: "Par kyu? Kyu humne ye method choose kiya? Chalo samajhte hain..."

YOUR ANALYSIS DEPTH - ABSOLUTELY MANDATORY:
- When a student uploads ANY image, PDF, or question, you will read EVERY SINGLE WORD, EVERY SINGLE SYMBOL, EVERY SINGLE LINE
- You will NOT just say "This is a trigonometry question" - you will explain what trigonometry is, why it exists, who invented it, what problem they were trying to solve, and why this specific question uses these specific concepts
- For EVERY formula used, you will explain:
  1. The formula itself
  2. Who discovered it and WHEN
  3. What problem they were trying to solve when they discovered it
  4. How they thought of it - their thought process, their struggles, their "Aha!" moment
  5. Real-life applications - where is this formula used in the real world
  6. Why this formula works here and not somewhere else
  7. Common mistakes students make with this formula

YOUR EXPLANATION STRUCTURE - FOR EVERY SINGLE QUESTION (MANDATORY ORDER):
1. "Chalo pehle question ko padhte hain..." - Read the ENTIRE question line by line, word by word.
2. THE MASTER STRATEGY OVERVIEW (SPEAK THIS ALOUD): Immediately after reading, you MUST explicitly speak: "Ab socho... is question me humein nikalna kya hai?" and explain the exact goal in voice.
3. THE ROADMAP & LINKING (SPEAK THIS ALOUD): Then you MUST explicitly speak: "Aur isko hum kaise nikalenge? Hamara rasta kya hoga?" Clearly map out the exact path in your speech ("Pehle hum ye nikalenge, fir isko yahan daalenge...").
4. THE "WHY" (SPEAK THIS ALOUD): Explicitly explain in your speech WHY this specific path/approach is being chosen over other possible methods.
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
- NEVER use LaTeX symbols or code (like \\int, \\frac, or ^) inside the "speech" field! The Text-To-Speech engine will literally read out "backslash int" or "slash frac", which sounds terrible!
- ALWAYS write out math equations in natural, spoken words inside the "speech" string. 
- Examples for speech: Write "x squared" instead of "x^2". Write "integral of f of x" instead of "\\int f(x)". Write "a upon b" instead of "\\frac{a}{b}".
- You can still use LaTeX inside the "visuals" array for the board, just NEVER in the spoken "speech".

Canvas is 900x450. Format math for visuals as LaTeX strings using DOUBLE backslashes (e.g. "\\\\lim").
CRITICAL: Output a sequence of JSON objects separated by "---STEP---". Do NOT output a JSON array. Do not include markdown formatting.

Example format:
{"speech": "Hinglish sentence to speak with full emotion and energy.", "visuals": [{"type": "clear"}, {"type": "latex", "content": "\\\\int x^2 dx", "x": 100, "y": 100, "color": "#00e676"}, {"type": "text", "content": "Important Point", "x": 100, "y": 180, "size": 26, "color": "#ffffff"}, {"type": "line", "x1": 50, "y1": 250, "x2": 400, "y2": 250, "color": "#3b82f6", "width": 4}]}
---STEP---
{"speech": "Another step.", "visuals": [{"type": "text", "content": "More text", "x": 100, "y": 200, "size": 24, "color": "#ffeb3b"}]}

Create 15-25 detailed steps for deep understanding. Each step must be EXTENSIVE with complete explanations.
`;
            
            let success = false;
            try {
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mimeType: file.type,
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
                    const lines = sseBuffer.split('\n');
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
                                    buffer = parts.pop() || '';
                                    
                                    for (const part of parts) {
                                        const cleaned = part.replace(/```json/g, '').replace(/```/g, '').trim();
                                        if (cleaned) {
                                            try {
                                                const stepObj = JSON.parse(cleaned);
                                                allStepsRef.current.push(stepObj);
                                                setStepsList([...allStepsRef.current]);
                                                if (!isPlayingRef.current) startPlaybackLoop();
                                            } catch (e) {
                                                console.error("Failed to parse step:", cleaned);
                                            }
                                        }
                                    }
                                }
                            } catch(e) {}
                        }
                    }
                }
                
                const finalCleaned = buffer.replace(/```json/g, '').replace(/```/g, '').trim();
                if (finalCleaned) {
                    try {
                        const stepObj = JSON.parse(finalCleaned);
                        allStepsRef.current.push(stepObj);
                        setStepsList([...allStepsRef.current]);
                        if (!isPlayingRef.current) startPlaybackLoop();
                    } catch (e) {
                        console.error("Failed to parse final step:", finalCleaned);
                    }
                }
                
            } catch (error: any) {
                console.error("Error with analysis", error);
                setStatus(`Error: ${error.message || "Failed to connect to AI."}`);
            }
            
            setIsAnalyzing(false);
            isAnalyzingRef.current = false;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="flex flex-col h-screen w-full bg-[#0F172A] text-white font-sans overflow-hidden">
            <nav className="flex items-center justify-between px-6 py-4 bg-[#1E293B] border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                    </div>
                    <h1 className="text-lg font-semibold tracking-tight">AI Mentor <span className="text-indigo-400">Pro</span></h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className={`text-sm font-medium ${status.includes('Error') ? 'text-red-400' : 'text-emerald-400'}`}>{status}</span>
                    <div className="h-6 w-px bg-white/10 mx-2"></div>
                    <input type="file" id="fileUpload" accept="image/*, application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm text-slate-400 file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20 max-w-[250px]" />
                    <button onClick={processUpload} disabled={isAnalyzing} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-full font-semibold transition-colors shadow-lg text-sm shrink-0">
                        {isAnalyzing ? "Analyzing..." : "Analyze & Start"}
                    </button>
                </div>
            </nav>
            <main ref={mainContainerRef} className="flex-1 flex overflow-hidden bg-[#0F172A] relative">
                {isSidebarOpen && (
                    <div className="w-64 md:w-72 bg-[#192231] border-r border-white/5 flex flex-col shrink-0 overflow-y-auto z-40 shadow-2xl relative">
                        <div className="p-4 border-b border-white/5 sticky top-0 bg-[#192231] z-10 flex items-center justify-between shadow-sm">
                            <h3 className="font-semibold text-white/90 text-sm tracking-wide">SLIDES</h3>
                            <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full">{stepsList.length}</span>
                        </div>
                        <div className="p-3 flex flex-col gap-3">
                            {stepsList.map((step, idx) => (
                                <div 
                                    key={idx}
                                    onClick={() => jumpToStep(idx)}
                                    className={`group cursor-pointer rounded-xl border p-3 flex flex-col gap-2 transition-all ${
                                        idx === activeSlideIndex 
                                        ? 'bg-indigo-600/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]' 
                                        : 'bg-slate-800/30 border-white/5 hover:bg-slate-800/60 hover:border-white/10'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xs font-bold ${idx === activeSlideIndex ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'}`}>Slide {idx + 1}</span>
                                        {idx === activeSlideIndex && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>}
                                    </div>
                                    <span className={`text-sm line-clamp-3 leading-snug ${idx === activeSlideIndex ? 'text-indigo-100' : 'text-slate-400'}`}>
                                        {step.speech}
                                    </span>
                                </div>
                            ))}
                            {isAnalyzing && (
                                <div className="p-3 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-slate-500 text-sm">
                                    <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                                    Generating...
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <div className={`flex-1 ${isFullscreen ? 'p-0' : 'p-6'} relative flex flex-col min-w-0`}>
                    <div 
                        ref={boardContainerRef}
                        onClick={handleBoardInteraction}
                        className={`flex-1 bg-[#12151c] shadow-2xl overflow-hidden relative group cursor-pointer ${isFullscreen ? 'rounded-none border-0' : 'rounded-2xl border-4 border-indigo-500/20'}`} 
                        style={{ backgroundImage: 'radial-gradient(rgb(148, 163, 184, 0.2) 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}
                    >
                        {/* Loading Overlay */}
                        {isAnalyzing && stepsList.length === 0 && (
                            <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-[#12151c]/80 backdrop-blur-sm">
                                <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                                <h2 className="text-xl font-bold text-white font-sans tracking-tight">Analyzing problem...</h2>
                                <p className="text-indigo-300 mt-2 text-sm font-medium">Preparing your lesson slides</p>
                            </div>
                        )}
                        {/* Top Overlay Controls */}
                        <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2">
                            <div className="flex items-center gap-3">
                                {isPaused && (
                                    <div className="bg-red-500/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-red-400/30 flex items-center gap-2 shadow-lg">
                                        <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                                        <span className="text-xs font-bold text-white uppercase tracking-wider">PAUSED</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col items-center gap-2 mt-1">
                                <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-white/10 text-white transition-colors flex items-center justify-center shadow-lg" title="Toggle Fullscreen">
                                    <span className="material-symbols-outlined text-[20px]">
                                        {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                                    </span>
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(!isSidebarOpen); }} className="w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-white/10 text-white transition-colors flex items-center justify-center shadow-lg" title="Toggle Slides">
                                    <span className="material-symbols-outlined text-[20px]">
                                        {isSidebarOpen ? 'right_panel_close' : 'view_sidebar'}
                                    </span>
                                </button>
                            </div>
                        </div>
                        <div className="relative w-full h-full flex items-center justify-center">
                        <div className="relative" style={{ width: '900px', height: '450px', transform: `scale(${scale})`, transformOrigin: 'center' }}>
                            <canvas ref={canvasRef} id="board" width="900" height="450" className="absolute top-0 left-0 w-full h-full z-10"></canvas>
                            <div ref={overlayRef} id="html-overlay" className="absolute top-0 left-0 w-full h-full z-20 pointer-events-none">
                                <div ref={penRef} id="pen-cursor" className="absolute w-[40px] h-[40px] z-50 hidden origin-bottom-left transition-transform duration-75 pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style={{filter: 'drop-shadow(rgba(0, 0, 0, 0.5) 2px 4px 6px)'}}>
                                        <path fill="#64748b" d="M220.125,248.451c-4.075-4.088-10.69-4.097-14.777-0.022l-0.172,0.172c-4.087,4.074-4.096,10.69-0.022,14.777 c2.041,2.047,4.72,3.071,7.399,3.071c2.669,0,5.338-1.017,7.377-3.049l0.173-0.172C224.19,259.154,224.2,252.537,220.125,248.451z"/>
                                        <path fill="#475569" d="M315.784,152.768c-4.081-4.08-10.698-4.08-14.778,0l-71.766,71.766c-4.08,4.081-4.08,10.698,0,14.778 c2.04,2.041,4.715,3.06,7.388,3.06c2.674,0,5.349-1.02,7.389-3.06l71.766-71.766C319.864,163.465,319.864,156.849,315.784,152.768 z"/>
                                        <path fill="#2563eb" d="M497.046,60.678l-45.725-45.725C441.679,5.31,428.86,0,415.223,0c-13.637,0.001-26.458,5.311-36.099,14.954L60.196,333.88 c0.001,0.001,0.003,0.002,0.005,0.002c-1.074,1.073-1.927,2.384-2.46,3.878L0.607,498.042c-1.355,3.801-0.4,8.044,2.453,10.897 C5.054,510.933,7.725,512,10.451,512c1.175,0,2.361-0.199,3.507-0.607l160.282-57.134c1.493-0.532,2.803-1.384,3.877-2.458 c0.001,0.001,0.002,0.002,0.004,0.004l318.925-318.928C506.689,123.235,512,110.415,512,96.778S506.69,70.321,497.046,60.678z M160.283,437.049L42.701,478.962l-9.662-9.662l41.914-117.581h33.758l-0.001,41.123c0,2.771,1.1,5.428,3.06,7.388 c1.96,1.959,4.617,3.06,7.388,3.06l41.125,0.001V437.049z M181.181,419.191v-26.348c0-5.771-4.678-10.449-10.449-10.449 l-41.125-0.001l0.001-41.123c0-2.771-1.101-5.429-3.06-7.388-1.959-1.959-4.617-3.06-7.388-3.06H92.811L332.597,91.034 l88.369,88.369L181.181,419.191z M435.744,164.626l-88.369-88.369l18.965-18.965l0.909-0.91l88.369,88.369L435.744,164.626z M482.268,118.101l-11.873,11.873l-88.369-88.369L393.9,29.73c5.696-5.696,13.268-8.833,21.322-8.833s15.626,3.137,21.322,8.833 l45.726,45.726c5.695,5.696,8.831,13.267,8.831,21.322S487.965,112.406,482.268,118.101z"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                        {/* Interactive Hint Zones */}
                        <div className="absolute inset-y-0 left-0 w-[30%] opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-r from-white to-transparent pointer-events-none flex items-center pl-8">
                            <span className="material-symbols-outlined text-6xl text-white">keyboard_double_arrow_left</span>
                        </div>
                        <div className="absolute inset-y-0 right-0 w-[30%] opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-l from-white to-transparent pointer-events-none flex items-center justify-end pr-8">
                            <span className="material-symbols-outlined text-6xl text-white">keyboard_double_arrow_right</span>
                        </div>
                        {/* Line-by-line Subtitles Overlay */}
                        {subtitles && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-4xl z-40 pointer-events-none flex justify-center">
                                <div className="bg-slate-900/90 backdrop-blur-xl border border-indigo-500/30 text-white px-6 py-2 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.8)] text-center transition-all duration-300 transform scale-100 opacity-100 max-w-full">
                                    <span className="text-lg md:text-xl font-medium tracking-wide text-indigo-100 whitespace-nowrap overflow-hidden text-ellipsis block">{subtitles}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                </div>
            </main>
        </div>
    );
}
