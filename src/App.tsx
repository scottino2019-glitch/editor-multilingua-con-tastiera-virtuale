import React, { useState, useEffect, useRef } from "react";
import { 
  Languages, 
  Keyboard, 
  Download, 
  Type, 
  FileText, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Brush, 
  Eraser, 
  RotateCcw, 
  Sparkles, 
  Globe, 
  Printer, 
  Grid3X3, 
  ListCollapse, 
  HelpCircle,
  Clock,
  ArrowRight
} from "lucide-react";
import { jsPDF } from "jspdf";
import { 
  SUPPORTED_LANGUAGES, 
  RU_KEYBOARD, 
  AR_KEYBOARD, 
  HI_KEYBOARD, 
  TH_KEYBOARD, 
  IT_KEYBOARD, 
  KO_KEYBOARD, 
  ZH_PINYIN_DICT, 
  ZH_QUICK_PHRASES, 
  JA_KANA_ROWS, 
  JA_CONVERSION_DICT, 
  JA_QUICK_PHRASES, 
  assembleHangul 
} from "./keyboardsData";

export default function App() {
  // Application Primary States
  const [activeLang, setActiveLang] = useState(SUPPORTED_LANGUAGES[0]); // Italian / Latin standard by default
  const [editorText, setEditorText] = useState("");
  const [writingStyle, setWritingStyle] = useState<"cursive" | "print">("cursive");
  const [paperStyle, setPaperStyle] = useState<"lined" | "squared" | "blank">("lined");
  
  // Virtual Keyboard specific states
  const [isShifted, setIsShifted] = useState(false);
  const [pinyinInput, setPinyinInput] = useState(""); // For Chinese IME
  const [japaneseBuffer, setJapaneseBuffer] = useState(""); // For Japanese IME
  const [koreanJamos, setKoreanJamos] = useState<string[]>([]); // For Korean Jamo accumulator
  
  // Candidate arrays for Chinese/Japanese typing conversion
  const [chineseCandidates, setChineseCandidates] = useState<string[]>([]);
  const [japaneseCandidates, setJapaneseCandidates] = useState<string[]>([]);

  // Drawing Brush / Tracing states
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [brushColor, setBrushColor] = useState("#0000ff"); // Blue ink by default
  const [brushWidth, setBrushWidth] = useState(3);
  
  // Translation States
  const [targetLangName, setTargetLangName] = useState("Italiano");
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [instantTranslate, setInstantTranslate] = useState(false);
  const [translationError, setTranslationError] = useState("");
  const [translationInfo, setTranslationInfo] = useState("");

  // Links & Multimedia States
  const [imageUrl, setImageUrl] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [linksList, setLinksList] = useState<{ id: string; type: "image" | "link"; url: string; label?: string }[]>([]);
  
  // Textarea reference for cursor-targeted virtual inserts
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null); // Interactive tracing canvas
  const isDrawingRef = useRef(false);

  // Time indicator state
  const [currentTime, setCurrentTime] = useState("");

  // Update real-time clock indicator
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync Pinyin Chinese input candidates
  useEffect(() => {
    if (pinyinInput) {
      const cleanPinyin = pinyinInput.toLowerCase().trim();
      if (ZH_PINYIN_DICT[cleanPinyin]) {
        setChineseCandidates(ZH_PINYIN_DICT[cleanPinyin]);
      } else {
        // Simple search containing prefix
        const found = Object.keys(ZH_PINYIN_DICT).find(key => key.startsWith(cleanPinyin));
        if (found) {
          setChineseCandidates(ZH_PINYIN_DICT[found]);
        } else {
          setChineseCandidates([]);
        }
      }
    } else {
      setChineseCandidates([]);
    }
  }, [pinyinInput]);

  // Sync Japanese Kana input conversion
  useEffect(() => {
    if (japaneseBuffer) {
      if (JA_CONVERSION_DICT[japaneseBuffer]) {
        setJapaneseCandidates(JA_CONVERSION_DICT[japaneseBuffer]);
      } else {
        // check partial conversion
        const foundKey = Object.keys(JA_CONVERSION_DICT).find(k => k.startsWith(japaneseBuffer));
        if (foundKey) {
          setJapaneseCandidates(JA_CONVERSION_DICT[foundKey]);
        } else {
          setJapaneseCandidates([japaneseBuffer]);
        }
      }
    } else {
      setJapaneseCandidates([]);
    }
  }, [japaneseBuffer]);

  // Trigger Instant Translation when text changes
  useEffect(() => {
    if (instantTranslate && editorText.trim().length > 3) {
      const delayDebounceFn = setTimeout(() => {
        handleTranslate();
      }, 1200); // 1.2s debounce to prevent API rate limits
      return () => clearTimeout(delayDebounceFn);
    }
  }, [editorText, targetLangName]);

  // Insert virtual keyboard string at the correct cursor location
  const insertTextAtCursor = (char: string) => {
    const textEl = textareaRef.current;
    if (!textEl) {
      setEditorText(prev => prev + char);
      return;
    }

    const start = textEl.selectionStart;
    const end = textEl.selectionEnd;
    const currentText = textEl.value;

    const updatedText = currentText.substring(0, start) + char + currentText.substring(end);
    setEditorText(updatedText);

    // Reposition cursor right after inserted character
    setTimeout(() => {
      textEl.focus();
      textEl.selectionStart = textEl.selectionEnd = start + char.length;
    }, 10);
  };

  // Convert and insert Korean blocks
  const handleKoreanInsert = (jamo: string) => {
    const newJamos = [...koreanJamos, jamo];
    setKoreanJamos(newJamos);
    
    // Assemble the Hangul syllable and update text
    const assembled = assembleHangul(newJamos);
    if (assembled) {
      // Replace the last character if we are typing continuously, or just insert
      // Let's make continuous Jamo typing replace the building block cleanly
      if (koreanJamos.length > 1) {
        // Backspace once internally then insert assembled string
        setEditorText(prev => {
          const prevAssembled = assembleHangul(koreanJamos.slice(0, -1));
          if (prev.endsWith(prevAssembled)) {
            return prev.slice(0, -prevAssembled.length) + assembled;
          }
          return prev + assembled;
        });
      } else {
        insertTextAtCursor(assembled);
      }
    }
  };

  const handleKoreanBackspace = () => {
    if (koreanJamos.length > 0) {
      const lastAssembled = assembleHangul(koreanJamos);
      const remainingJamos = koreanJamos.slice(0, -1);
      setKoreanJamos(remainingJamos);
      
      const nextAssembled = assembleHangul(remainingJamos);
      setEditorText(prev => {
        if (prev.endsWith(lastAssembled)) {
          return prev.slice(0, -lastAssembled.length) + nextAssembled;
        }
        return prev;
      });
    } else {
      // Standard backspace
      setEditorText(prev => prev.slice(0, -1));
    }
  };

  const clearKoreanBuffer = () => {
    setKoreanJamos([]);
  };

  // Chinese Selection Choose
  const chooseChineseCandidate = (char: string) => {
    insertTextAtCursor(char);
    setPinyinInput("");
    setChineseCandidates([]);
  };

  // Japanese Selection Choose
  const chooseJapaneseCandidate = (char: string) => {
    insertTextAtCursor(char);
    setJapaneseBuffer("");
    setJapaneseCandidates([]);
  };

  // Keyboard Click handler
  const handleKeyClick = (char: string) => {
    insertTextAtCursor(char);
    if (!isShifted && activeLang.id === "ru" || activeLang.id === "it") {
      // Auto-release Shift unless explicitly sticky
    }
  };

  // Add customized link or media elements
  const addLinkElement = (type: "image" | "link") => {
    const sourceUrl = type === "image" ? imageUrl : externalUrl;
    if (!sourceUrl || !sourceUrl.startsWith("http")) {
      alert("Inserire un URL valido che inizia con http:// o https://");
      return;
    }
    
    const label = type === "image" ? "Immagine Allegata" : (prompt("Inserisci un'etichetta per questo link:") || "Sito Esterno");
    const newMedia = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      url: sourceUrl,
      label
    };

    setLinksList(prev => [...prev, newMedia]);
    
    // Auto insert Markdown helper snippet into editor for live rendering reference
    if (type === "image") {
      insertTextAtCursor(`\n![${label}](${sourceUrl})`);
      setImageUrl("");
    } else {
      insertTextAtCursor(`\n[${label}](${sourceUrl})`);
      setExternalUrl("");
    }
  };

  const removeMedia = (id: string) => {
    setLinksList(prev => prev.filter(m => m.id !== id));
  };

  // Direct Translate API invocation
  const handleTranslate = async () => {
    if (!editorText.trim()) return;
    setIsTranslating(true);
    setTranslationError("");
    setTranslationInfo("");

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: editorText,
          sourceLang: activeLang.name,
          targetLang: targetLangName
        })
      });

      let responseData: any = null;
      try {
        responseData = await res.json();
      } catch (jsonErr) {
        // Fallback if no valid JSON
      }

      if (!res.ok) {
        throw new Error(responseData?.message || responseData?.error || "Impossibile connettersi al servizio di traduzione.");
      }

      if (responseData && responseData.error) {
        throw new Error(responseData?.message || responseData?.error);
      }

      setTranslatedText(responseData?.translated || "");
      setTranslationInfo(responseData?.info || "");
    } catch (err: any) {
      console.error("Translation Client Error:", err);
      const errMsg = err?.message || "";
      if (
        errMsg.includes("429") || 
        errMsg.includes("quota") || 
        errMsg.includes("RESOURCE_EXHAUSTED") || 
        errMsg.includes("exceeded") ||
        errMsg.includes("limit")
      ) {
        setTranslationError(errMsg || "Limite di traduzioni per minuto raggiunto (quota Gemini superata). Attendi circa 30 secondi prima di cliccare nuovamente su 'Traduci Ora'.");
      } else {
        setTranslationError(errMsg || "Errore di connessione o traduzione. Riprova più tardi.");
      }
    } finally {
      setIsTranslating(false);
    }
  };

  // Canvas Drawing routines (Calligraphy & Tracing practice)
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions relative to its container
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        clearCanvas(); // Clear when resizing
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [isDrawingMode]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    isDrawingRef.current = true;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushWidth;

    const pos = getEventCoords(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !isDrawingMode) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Prevent scrolling when drawing on mobile touch devices
    if (e.cancelable) e.preventDefault();

    const pos = getEventCoords(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const getEventCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      if (e.touches.length > 0) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top
        };
      }
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top
    };
  };

  const clearCanvas = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Convert written text with custom styles into a gorgeous image-compatible UTF8-preserved PDF
  // This uses standard HTML Canvas rendering to draw the letters in the selected cursive/print font beautifully
  // rendering Arabic, Chinese characters, Russian Cyrillic cursive perfectly on physical-looking notebook grids.
  const handleExportPDF = async () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // We instantiate an offscreen canvas to render high-DPI paper look with true local loaded Google fonts
      const drawCanvas = document.createElement("canvas");
      // Standard A4 aspect: 210mm x 297mm. At 150DPI, that is approx 1240 x 1754 px
      drawCanvas.width = 1240;
      drawCanvas.height = 1754;

      const ctx = drawCanvas.getContext("2d");
      if (!ctx) {
        throw new Error("Impossibile creare il contesto grafico per il PDF.");
      }

      // Base background color
      ctx.fillStyle = "#fdfdfb";
      ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);

      // Draw notebook lines / grids
      if (paperStyle === "lined" || paperStyle === "squared") {
        ctx.strokeStyle = "#d4e6f4";
        ctx.lineWidth = 1.5;
        
        if (paperStyle === "lined") {
          const lineGap = 48; // vertical line gap
          for (let y = 140; y < drawCanvas.height - 100; y += lineGap) {
            ctx.beginPath();
            ctx.moveTo(80, y);
            ctx.lineTo(drawCanvas.width - 80, y);
            ctx.stroke();
          }
        } else {
          // Squared cells grid
          const cellSize = 42;
          ctx.beginPath();
          for (let x = 80; x < drawCanvas.width - 80; x += cellSize) {
            ctx.moveTo(x, 140);
            ctx.lineTo(x, drawCanvas.height - 100);
          }
          for (let y = 140; y < drawCanvas.height - 100; y += cellSize) {
            ctx.moveTo(80, y);
            ctx.lineTo(drawCanvas.width - 80, y);
          }
          ctx.stroke();
        }

        // Standard Italian school left margin red vertical line
        ctx.strokeStyle = "#fcbec2";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(130, 0);
        ctx.lineTo(130, drawCanvas.height);
        ctx.stroke();
      }

      // Title header standard label
      ctx.fillStyle = "#4a5568";
      ctx.font = "bold 26px 'Inter', sans-serif";
      ctx.fillText(`ESERCIZIO DI SCRITTURA MULTILINGUE • STILE: ${writingStyle.toUpperCase()}`, 150, 70);

      ctx.fillStyle = "#a0aec0";
      ctx.font = "italic 16px 'Inter', sans-serif";
      ctx.fillText(`Lingua selezionata: ${activeLang.name} (${activeLang.nativeName}) | Generato il ${new Date().toLocaleDateString("it-IT")}`, 150, 95);

      // Select active display font based on styles
      let fontName = "Inter";
      if (writingStyle === "cursive") {
        switch (activeLang.id) {
          case "it": fontName = "Caveat"; break;
          case "ru": fontName = "Marck Script"; break;
          case "ar": fontName = "Aref Ruqaa"; break;
          case "zh": fontName = "Zhi Mang Xing"; break;
          case "ja": fontName = "Yuji Syuku"; break;
          case "ko": fontName = "Gaegu"; break;
          case "hi": fontName = "Yatra One"; break;
          case "th": fontName = "Mali"; break;
        }
      } else {
        switch (activeLang.id) {
          case "it": fontName = "Inter"; break;
          case "ru": fontName = "Inter"; break;
          case "ar": fontName = "Cairo"; break;
          case "zh": fontName = "Noto Sans SC"; break;
          case "ja": fontName = "Noto Sans JP"; break;
          case "ko": fontName = "Noto Sans KR"; break;
          case "hi": fontName = "Noto Sans Devanagari"; break;
          case "th": fontName = "Noto Sans Thai"; break;
        }
      }

      // Render Editor text
      ctx.fillStyle = "#1a202c";
      
      const drawText = editorText || "Nessun testo digitato";
      const startX = 160;
      let startY = 180;
      const maxWidth = drawCanvas.width - 240;

      // Wrap text helper (highly robust to prevent line cutting / overflow with dynamic spacing)
      const wrapTextHelper = (textToWrap: string, alignRight: boolean, fontSize: number, fontNameString: string, customLineHeight: number) => {
        ctx.font = `${fontSize}px '${fontNameString}', sans-serif`;
        const paras = textToWrap.split("\n");
        for (let p = 0; p < paras.length; p++) {
          const para = paras[p];
          if (para.trim() === "") {
            startY += customLineHeight;
            continue;
          }
          
          // Match CJK languages to wrap character-by-character
          const isCJK = /[\u4e00-\u9fa5\u3040-\u30ff\u31f0-\u31ff]/g.test(para);
          let currentLine = "";
          
          if (isCJK) {
            for (let i = 0; i < para.length; i++) {
              const char = para[i];
              const testLine = currentLine + char;
              if (ctx.measureText(testLine).width > maxWidth) {
                if (alignRight) {
                  ctx.textAlign = "right";
                  ctx.fillText(currentLine, drawCanvas.width - startX, startY);
                  ctx.textAlign = "left";
                } else {
                  ctx.fillText(currentLine, startX, startY);
                }
                currentLine = char;
                startY += customLineHeight;
              } else {
                currentLine = testLine;
              }
            }
          } else {
            const wordsList = para.split(" ");
            for (let i = 0; i < wordsList.length; i++) {
              const word = wordsList[i];
              const testLine = currentLine ? currentLine + " " + word : word;
              if (ctx.measureText(testLine).width > maxWidth) {
                if (alignRight) {
                  ctx.textAlign = "right";
                  ctx.fillText(currentLine, drawCanvas.width - startX, startY);
                  ctx.textAlign = "left";
                } else {
                  ctx.fillText(currentLine, startX, startY);
                }
                currentLine = word;
                startY += customLineHeight;
              } else {
                currentLine = testLine;
              }
            }
          }
          if (currentLine) {
            if (alignRight) {
              ctx.textAlign = "right";
              ctx.fillText(currentLine, drawCanvas.width - startX, startY);
              ctx.textAlign = "left";
            } else {
              ctx.fillText(currentLine, startX, startY);
            }
            startY += customLineHeight;
          }
        }
      };

      // Set elegant larger sizes: cursive fonts like Zhi Mang Xing, Caveat are scaled to 40px to stand out, print is 34px
      const primaryFontSize = writingStyle === "cursive" ? 42 : 35;
      const primaryLineHeight = 48; // Matches our lineGap exactly

      wrapTextHelper(drawText, activeLang.id === "ar", primaryFontSize, fontName, primaryLineHeight);

      // Draw Separator line
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(80, startY + 10);
      ctx.lineTo(drawCanvas.width - 80, startY + 10);
      ctx.stroke();

      // Render Translation Section if available
      startY += 50;
      if (translatedText) {
        ctx.fillStyle = "#2c5282";
        ctx.font = "bold 22px 'Inter', sans-serif";
        ctx.fillText(`TRADUZIONE IN ${targetLangName.toUpperCase()}:`, 150, startY);
        startY += 40;

        ctx.fillStyle = "#2d3748";
        // Find matching target lang font for translation display
        let translationFont = "Inter";
        const targetLangObj = SUPPORTED_LANGUAGES.find(l => l.name === targetLangName);
        if (targetLangObj) {
          if (writingStyle === "cursive") {
            switch (targetLangObj.id) {
              case "it": translationFont = "Caveat"; break;
              case "ru": translationFont = "Marck Script"; break;
              case "ar": translationFont = "Aref Ruqaa"; break;
              case "zh": translationFont = "Zhi Mang Xing"; break;
              case "ja": translationFont = "Yuji Syuku"; break;
              case "ko": translationFont = "Gaegu"; break;
              case "hi": translationFont = "Yatra One"; break;
              case "th": translationFont = "Mali"; break;
            }
          } else {
            switch (targetLangObj.id) {
              case "it": translationFont = "Inter"; break;
              case "ru": translationFont = "Inter"; break;
              case "ar": translationFont = "Cairo"; break;
              case "zh": translationFont = "Noto Sans SC"; break;
              case "ja": translationFont = "Noto Sans JP"; break;
              case "ko": translationFont = "Noto Sans KR"; break;
              case "hi": translationFont = "Noto Sans Devanagari"; break;
              case "th": translationFont = "Noto Sans Thai"; break;
            }
          }
        }

        const translationFontSize = writingStyle === "cursive" ? 36 : 30;
        const translationLineHeight = 42;
        wrapTextHelper(translatedText, targetLangObj?.id === "ar", translationFontSize, translationFont, translationLineHeight);
      }

      // Append user manual tracing brush on top of rendered PDF!
      const userCanvas = previewCanvasRef.current;
      if (userCanvas) {
        // Draw the user drawing layer scaled
        ctx.drawImage(userCanvas, 0, 140, drawCanvas.width, drawCanvas.height - 240);
      }

      // Document Footer Credit stamp
      ctx.fillStyle = "#718096";
      ctx.font = "italic 14px 'Inter', sans-serif";
      ctx.fillText("Editor Scrittura Multilingue - Esercitazioni Scolastiche & Traduzione istantanea", 150, drawCanvas.height - 60);

      // Convert full canvas layout sheet to PDF Image stream
      const imgData = drawCanvas.toDataURL("image/jpeg", 0.94);
      doc.addImage(imgData, "JPEG", 0, 0, 210, 297);
      doc.save(`scritto_${activeLang.id}_${writingStyle}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Errore durante l'esportazione in PDF. Assicurarsi di aver completato le impostazioni.");
    }
  };

  const lhForTranslation = (id?: string) => {
    return id === "ar" || id === "zh" || id === "ja" ? 38 : 34;
  };

  // Export as Plain UTF-8 Text segment
  const handleExportTXT = () => {
    const textSegment = `--- ESERCIZIO SCRITTURA MULTILINGUE ---
Lingua: ${activeLang.name}
Stile: ${writingStyle}
Data di redazione: ${new Date().toISOString()}

TESTO IN LINGUA ORIGINALE:
${editorText}

--------------------------------------
TRADUZIONE IN ${targetLangName.toUpperCase()}:
${translatedText}

--------------------------------------
ALLEGATI & LINK ASSOCIATI:
${linksList.map((m, i) => `${i+1}. [${m.type.toUpperCase()}] ${m.label || ""}: ${m.url}`).join("\n")}
`;

    const blob = new Blob([textSegment], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `scritto_multilingue_${activeLang.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Helper font class resolver
  const activeFontClass = () => {
    if (writingStyle === "cursive") {
      switch (activeLang.id) {
        case "it": return "font-latin-cursive";
        case "ru": return "font-russian-cursive text-[1.4rem]";
        case "ar": return "font-arabic-cursive text-[2.2rem]";
        case "zh": return "font-chinese-cursive text-[2rem]";
        case "ja": return "font-japanese-cursive text-[1.8rem]";
        case "ko": return "font-korean-cursive text-[1.8rem]";
        case "hi": return "font-hindi-cursive text-[1.8rem]";
        case "th": return "font-thai-cursive text-[1.8rem]";
        default: return "font-latin-cursive";
      }
    } else {
      switch (activeLang.id) {
        case "it": return "font-latin-print";
        case "ru": return "font-russian-print text-[1.2rem]";
        case "ar": return "font-arabic-print text-[1.4rem] leading-[2.4rem]";
        case "zh": return "font-chinese-print text-[1.3rem]";
        case "ja": return "font-japanese-print text-[1.3rem]";
        case "ko": return "font-korean-print text-[1.3rem]";
        case "hi": return "font-hindi-print text-[1.4rem]";
        case "th": return "font-thai-print text-[1.4rem]";
        default: return "font-latin-print";
      }
    }
  };

  // Translation display Font resolver
  const translatedFontClass = () => {
    const targetObj = SUPPORTED_LANGUAGES.find(l => l.name === targetLangName) || SUPPORTED_LANGUAGES[0];
    if (writingStyle === "cursive") {
      switch (targetObj.id) {
        case "it": return "font-latin-cursive";
        case "ru": return "font-russian-cursive text-[1.4rem]";
        case "ar": return "font-arabic-cursive text-[2.2rem]";
        case "zh": return "font-chinese-cursive text-[2rem]";
        case "ja": return "font-japanese-cursive text-[1.8rem]";
        case "ko": return "font-korean-cursive text-[1.8rem]";
        case "hi": return "font-hindi-cursive text-[1.8rem]";
        case "th": return "font-thai-cursive text-[1.8rem]";
        default: return "font-latin-cursive";
      }
    } else {
      switch (targetObj.id) {
        case "it": return "font-latin-print";
        case "ru": return "font-russian-print text-[1.2rem]";
        case "ar": return "font-arabic-print text-[1.4rem] leading-[2.4rem]";
        case "zh": return "font-chinese-print text-[1.3rem]";
        case "ja": return "font-japanese-print text-[1.3rem]";
        case "ko": return "font-korean-print text-[1.3rem]";
        case "hi": return "font-hindi-print text-[1.4rem]";
        case "th": return "font-thai-print text-[1.4rem]";
        default: return "font-latin-print";
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col antialiased">
      {/* 1. Global Navigation / Branded Sub-Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-xs shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-xs">
              <Languages className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Scuola Scrittura Multilingue
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Tastiera Virtuale • Esercizi di Corsivo e Stampatello • Live Translation
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-end md:self-center">
            {/* Realtime Local Timestamp Panel */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-mono text-slate-600 border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentTime || "Caricamento..."}</span>
            </div>

            {/* Quick helper indicator */}
            <div className="flex items-center gap-1 px-2.5 py-1.5 bg-yellow-50 text-yellow-800 rounded-lg text-xs font-medium border border-yellow-100">
              <HelpCircle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
              <span>Clicca le tastiere per comporre testi</span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Body Section */}
      <main className="max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start grow">
        
        {/* LEFT COLUMN: Input Control, Keypad layouts, Language switches (Lg: 7 cells) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* A. Language Selector & Target Configuration */}
          <div id="language-presets" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-500" /> Selezione Lingua di Scrittura
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  id={`btn-${lang.id}`}
                  onClick={() => {
                    setActiveLang(lang);
                    setPinyinInput("");
                    setJapaneseBuffer("");
                    setKoreanJamos([]);
                  }}
                  className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    activeLang.id === lang.id
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm ring-2 ring-blue-100"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                  }`}
                >
                  <span className="text-sm font-bold tracking-tight">{lang.nativeName}</span>
                  <span className="opacity-80 text-[10px] transform uppercase">{lang.name}</span>
                </button>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Cursive style or stampatello modifier */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Stile Carattere:</span>
                <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex gap-1">
                  <button
                    id="style-cursive"
                    onClick={() => setWritingStyle("cursive")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                      writingStyle === "cursive"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Corsivo Scolastico
                  </button>
                  <button
                    id="style-print"
                    onClick={() => setWritingStyle("print")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                      writingStyle === "print"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Stampatello
                  </button>
                </div>
              </div>

              {/* Lined status paper picker */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Quaderno:</span>
                <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex gap-1">
                  <button
                    id="paper-lined"
                    onClick={() => setPaperStyle("lined")}
                    className={`px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                      paperStyle === "lined" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                    }`}
                    title="Foglio a righe scolastiche"
                  >
                    Righe
                  </button>
                  <button
                    id="paper-squared"
                    onClick={() => setPaperStyle("squared")}
                    className={`px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                      paperStyle === "squared" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                    }`}
                    title="Foglio a quadretti"
                  >
                    Quadretti
                  </button>
                  <button
                    id="paper-blank"
                    onClick={() => setPaperStyle("blank")}
                    className={`px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                      paperStyle === "blank" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                    }`}
                    title="Foglio Bianco"
                  >
                    Bianco
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* B. Core Interactive Editor Container */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            
            <div className="flex items-center justify-between">
              <label htmlFor="multilang-editor" className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Type className="w-4 h-4 text-blue-500" /> Corpo dell'Editor di Testo 
                <span className="text-xs font-normal text-slate-400">({activeLang.name})</span>
              </label>

              {/* Character counting */}
              <span className="text-xs text-slate-400 font-medium">
                {editorText.length} caratteri
              </span>
            </div>

            {/* Editor field */}
            <textarea
              id="multilang-editor"
              ref={textareaRef}
              dir={activeLang.align}
              className={`w-full min-h-[160px] p-4 bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-100 rounded-xl resize-y transition-all ${activeFontClass()}`}
              placeholder={`Scrivi qui in ${activeLang.nativeName} usando la tastiera virtuale sottostante o la tastiera del tuo computer...`}
              value={editorText}
              onChange={(e) => setEditorText(e.target.value)}
            />

            {/* Special buffers if IME or Assemblers are building */}
            {(koreanJamos.length > 0 || pinyinInput || japaneseBuffer) && (
              <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r-xl flex flex-wrap items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-700">Compositore Attivo:</span>
                  
                  {activeLang.id === "ko" && (
                    <span className="px-2 py-1 bg-white border border-blue-200 rounded text-sm font-mono tracking-widest text-blue-800">
                      {koreanJamos.join(" + ")} → <strong className="text-blue-900">{assembleHangul(koreanJamos)}</strong>
                    </span>
                  )}

                  {activeLang.id === "zh" && (
                    <span className="px-2 py-1 bg-white border border-blue-200 rounded text-sm font-mono text-blue-800">
                      Pinyin: <strong className="text-blue-900 text-base">{pinyinInput}</strong>
                    </span>
                  )}

                  {activeLang.id === "ja" && (
                    <span className="px-2 py-1 bg-white border border-blue-200 rounded text-sm font-mono text-blue-800">
                      Kana: <strong className="text-blue-900 text-base">{japaneseBuffer}</strong>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {activeLang.id === "ko" && (
                    <button 
                      onClick={handleKoreanBackspace}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-xs text-slate-700 rounded border border-slate-300 font-medium cursor-pointer"
                    >
                      Cancella Jamo
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setKoreanJamos([]);
                      setPinyinInput("");
                      setJapaneseBuffer("");
                    }}
                    className="px-2 py-1 bg-red-50 hover:bg-red-100 text-xs text-red-600 rounded border border-red-200 font-semibold cursor-pointer"
                  >
                    Svuota buffer
                  </button>
                </div>
              </div>
            )}

            {/* Chinese IME candidate selectors */}
            {activeLang.id === "zh" && chineseCandidates.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <span className="text-[11px] uppercase tracking-wider font-bold text-amber-800 block mb-1.5">
                  Seleziona il carattere cinese corretto:
                </span>
                <div className="flex flex-wrap gap-2">
                  {chineseCandidates.map((char, idx) => (
                    <button
                      key={idx}
                      onClick={() => chooseChineseCandidate(char)}
                      className="px-4 py-2 bg-white hover:bg-amber-100 active:bg-amber-200 text-xl font-bold border border-amber-200 text-slate-800 rounded-lg cursor-pointer transition-all transform hover:scale-105"
                    >
                      {char}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Japanese IME candidate selectors */}
            {activeLang.id === "ja" && japaneseCandidates.length > 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-800 block mb-1.5">
                  Conversione Kanji / Katakana disponibili:
                </span>
                <div className="flex flex-wrap gap-2">
                  {japaneseCandidates.map((char, idx) => (
                    <button
                      key={idx}
                      onClick={() => chooseJapaneseCandidate(char)}
                      className="px-4 py-2 bg-white hover:bg-emerald-100 active:bg-emerald-200 text-lg font-bold border border-emerald-200 text-slate-800 rounded-lg cursor-pointer transition-all transform hover:scale-105"
                    >
                      {char}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* C. Dynamic Virtual Keyboard Container */}
          <div id="virtual-keyboard-section" className="bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-800">
            
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <span className="text-white text-xs font-bold tracking-widest flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-blue-400" /> TASTIERA VIRTUALE - {activeLang.nativeName.toUpperCase()}
              </span>
              
              <div className="flex items-center gap-2">
                {/* Global clear editor helper */}
                <button
                  onClick={() => {
                    if (confirm("Sei sicuro di voler svuotare interamente il testo dell'editor?")) {
                      setEditorText("");
                    }
                  }}
                  className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-900 rounded-md transition-all cursor-pointer"
                >
                  Pulisci Editor
                </button>
                
                {/* Qwerty layout customizer */}
                {(activeLang.id === "it" || activeLang.id === "ru" || activeLang.id === "zh") && (
                  <button
                    onClick={() => setIsShifted(prev => !prev)}
                    className={`px-3 py-1 rounded-md text-xs font-bold uppercase transition-all cursor-pointer ${
                      isShifted 
                        ? "bg-amber-500 text-slate-950" 
                        : "bg-slate-800 hover:bg-slate-700 text-white"
                    }`}
                  >
                    Shift [⇧]
                  </button>
                )}
              </div>
            </div>

            {/* D. Keyboard Panels Router */}
            <div className="flex flex-col gap-2">
              
              {/* Russian (Cyrillic standard) */}
              {activeLang.id === "ru" && (
                <div className="flex flex-col gap-1.5 animate-fade-in font-sans">
                  {(isShifted ? RU_KEYBOARD.shifted : RU_KEYBOARD.normal).map((row, rIdx) => (
                    <div key={rIdx} className="flex justify-center gap-1">
                      {row.map((char, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => handleKeyClick(char)}
                          className="flex-1 min-w-[28px] max-w-[56px] h-10 bg-slate-800 hover:bg-slate-700 active:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center"
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Arabic */}
              {activeLang.id === "ar" && (
                <div className="flex flex-col gap-1.5 animate-fade-in" dir="rtl">
                  {AR_KEYBOARD.map((row, rIdx) => (
                    <div key={rIdx} className="flex justify-center gap-1">
                      {row.map((char, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => handleKeyClick(char)}
                          className="flex-1 min-w-[28px] max-w-[56px] h-11 bg-slate-800 hover:bg-slate-700 active:bg-blue-500 text-white rounded-lg text-lg font-semibold transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Chinese Pinyin Input Interface */}
              {activeLang.id === "zh" && (
                <div className="flex flex-col gap-3 animate-fade-in">
                  
                  {/* Explaining IME guide line */}
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#22c55e] block mb-1">
                      Pinyin IME (Italian/Latin virtual keyboard used to trigger Chinese characters)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Scrivi lettere (es: &ldquo;wo&rdquo;, &ldquo;ni&rdquo;, &ldquo;hao&rdquo;) per far comparire il pannello dei simboli cinesi, oppure usa i blocchi rapidi sottostanti:
                    </p>
                  </div>

                  {/* Western layout to write Pinyin */}
                  <div className="flex flex-col gap-1.5">
                    {(isShifted ? IT_KEYBOARD.shifted : IT_KEYBOARD.normal).map((row, rIdx) => (
                      <div key={rIdx} className="flex justify-center gap-1">
                        {row.map((char, cIdx) => (
                          <button
                            key={cIdx}
                            onClick={() => {
                              // Instead of writing to editors directly, we accumulate in Pinyin buffer first
                              const cleanChar = char.toLowerCase();
                              if (/[a-z]/.test(cleanChar)) {
                                setPinyinInput(prev => prev + cleanChar);
                              } else {
                                handleKeyClick(char);
                              }
                            }}
                            className="flex-1 min-w-[28px] max-w-[56px] h-10 bg-slate-800 hover:bg-slate-700 active:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center"
                          >
                            {char}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Row of Common Fast phrases for Chinese */}
                  <div className="border-t border-slate-800 pt-3">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Frasi e Parole Rapide:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {ZH_QUICK_PHRASES.map((phrase, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            insertTextAtCursor(phrase);
                            setPinyinInput("");
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-300 border border-slate-700 hover:border-amber-500 rounded-md cursor-pointer transition-all"
                        >
                          {phrase}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* Japanese Kana */}
              {activeLang.id === "ja" && (
                <div className="flex flex-col gap-3 animate-fade-in">
                  
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#10b981]">
                      Japanese Hiragana IME layout
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Seleziona i Kana. Esempio testuale: にほん, わたし.
                    </p>
                  </div>

                  {/* Kanji / hiragana matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[180px] overflow-y-auto pr-1">
                    {JA_KANA_ROWS.map((row, rIdx) => (
                      <div key={rIdx} className="flex gap-1">
                        {row.slice(0, 5).map((char, cIdx) => (
                          <button
                            key={cIdx}
                            onClick={() => {
                              setJapaneseBuffer(prev => prev + char);
                            }}
                            className="flex-1 h-9 bg-slate-800 hover:bg-slate-700 active:bg-emerald-600 text-white rounded-md text-sm font-semibold transition-all cursor-pointer flex items-center justify-center shadow-xs"
                          >
                            {char}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Japanese Fast Phrases */}
                  <div className="border-t border-slate-800 pt-3">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Inserimento Veloce:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {JA_QUICK_PHRASES.map((phrase, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            insertTextAtCursor(phrase);
                            setJapaneseBuffer("");
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-xs font-bold text-emerald-300 border border-slate-700 rounded-md cursor-pointer transition-all"
                        >
                          {phrase}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* Korean Jamo Panel */}
              {activeLang.id === "ko" && (
                <div className="flex flex-col gap-3 animate-fade-in">
                  
                  <div className="bg-slate-950 p-2 border border-slate-800 rounded-lg flex justify-between items-center text-[11px]">
                    <span className="text-blue-400 font-bold">Tastiera Hangul auto-componibile</span>
                    <span className="text-slate-400">Componi lettere in blocchi sillabici automaticamente!</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Consonants list */}
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-1">CONSONANTI (초성/종성):</span>
                      <div className="grid grid-cols-5 gap-1">
                        {KO_KEYBOARD.consonants.map((con, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleKoreanInsert(con)}
                            className="h-8.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-sm font-semibold cursor-pointer active:bg-blue-600 transition-all flex items-center justify-center"
                          >
                            {con}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Vowels list */}
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-1">VOCALI (중성):</span>
                      <div className="grid grid-cols-5 gap-1">
                        {KO_KEYBOARD.vowels.map((vow, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleKoreanInsert(vow)}
                            className="h-8.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-sm font-semibold cursor-pointer active:bg-blue-600 transition-all flex items-center justify-center"
                          >
                            {vow}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Row of Common Fast phrases for Korean */}
                  <div className="border-t border-slate-800 pt-3">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Sillabe e parole rapide:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {KO_KEYBOARD.quickBlocks.map((phrase, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            insertTextAtCursor(phrase);
                            clearKoreanBuffer();
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-705 text-xs font-bold text-blue-300 border border-slate-700 rounded-md cursor-pointer transition-all"
                        >
                          {phrase}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* Hindi Layout */}
              {activeLang.id === "hi" && (
                <div className="flex flex-col gap-3 animate-fade-in max-h-[220px] overflow-y-auto">
                  {/* Vowels row */}
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block mb-1">VOCALI (Vowels):</span>
                    <div className="flex flex-wrap gap-1">
                      {HI_KEYBOARD.vowels.map((char, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleKeyClick(char)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-base rounded font-medium cursor-pointer flex-1 min-w-[32px] justify-center flex"
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Consonants list rows */}
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block mb-1">CONSONANTI (Consonants):</span>
                    <div className="flex flex-wrap gap-1">
                      {[...HI_KEYBOARD.consonants1, ...HI_KEYBOARD.consonants2, ...HI_KEYBOARD.consonants3, ...HI_KEYBOARD.consonants4].map((char, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleKeyClick(char)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-base rounded font-medium cursor-pointer flex-1 min-w-[35px] max-w-[50px] justify-center flex"
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Matras signs row */}
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block mb-1">MATRAS (Vowel Signs):</span>
                    <div className="flex flex-wrap gap-1">
                      {HI_KEYBOARD.matras.map((char, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleKeyClick(char)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-base rounded font-bold cursor-pointer flex-1 min-w-[30px] justify-center flex"
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Thai layout */}
              {activeLang.id === "th" && (
                <div className="flex flex-col gap-3 animate-fade-in max-h-[220px] overflow-y-auto">
                  {/* Thai consonants rows */}
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block mb-1">CONSONANTI THAI (Consonants):</span>
                    <div className="flex flex-col gap-1">
                      {TH_KEYBOARD.consonants.map((row, rIdx) => (
                        <div key={rIdx} className="flex gap-1 justify-center">
                          {row.map((char, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleKeyClick(char)}
                              className="flex-1 h-9 bg-slate-800 hover:bg-slate-700 text-white rounded text-sm font-semibold transition-all active:bg-blue-600 cursor-pointer flex items-center justify-center shadow-xs"
                            >
                              {char}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Simple vowels and accents representation */}
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block mb-1">VOCALI / TONI (Vowels & Tone Marks):</span>
                    <div className="flex flex-wrap gap-1">
                      {TH_KEYBOARD.vowels.map((char, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleKeyClick(char)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded cursor-pointer flex-1 min-w-[35px] text-center"
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Standard Italian / English layout */}
              {activeLang.id === "it" && (
                <div className="flex flex-col gap-1.5 animate-fade-in font-sans">
                  {(isShifted ? IT_KEYBOARD.shifted : IT_KEYBOARD.normal).map((row, rIdx) => (
                    <div key={rIdx} className="flex justify-center gap-1">
                      {row.map((char, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => handleKeyClick(char)}
                          className="flex-1 min-w-[28px] max-w-[56px] h-10 bg-slate-800 hover:bg-slate-700 active:bg-blue-650 text-white rounded-lg text-sm font-medium transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center"
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* Backspace, Space & Enter row */}
            <div className="grid grid-cols-12 gap-1.5 mt-3 border-t border-slate-800 pt-3">
              <button
                onClick={() => {
                  if (activeLang.id === "ko") {
                    handleKoreanBackspace();
                  } else if (pinyinInput) {
                    setPinyinInput(prev => prev.slice(0, -1));
                  } else if (japaneseBuffer) {
                    setJapaneseBuffer(prev => prev.slice(0, -1));
                  } else {
                    setEditorText(prev => prev.slice(0, -1));
                  }
                }}
                className="col-span-3 h-10 bg-red-950 hover:bg-red-900 border border-red-900 text-red-200 rounded-lg text-xs font-bold uppercase cursor-pointer flex items-center justify-center transition-all shadow-md"
              >
                ← Backspace
              </button>

              <button
                onClick={() => handleKeyClick(" ")}
                className="col-span-6 h-10 bg-slate-800 hover:bg-slate-750 active:bg-blue-600 border border-slate-700 text-white rounded-lg text-sm font-semibold tracking-wider cursor-pointer flex items-center justify-center transition-all shadow-md"
              >
                Spazio
              </button>

              <button
                onClick={() => handleKeyClick("\n")}
                className="col-span-3 h-10 bg-blue-900 hover:bg-blue-800 border border-blue-800 text-white rounded-lg text-xs font-bold uppercase cursor-pointer flex items-center justify-center transition-all shadow-md"
              >
                Invio ↵
              </button>
            </div>

          </div>

          {/* E. Image & External Link Attachment panel */}
          <div id="media-attachments-section" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-slate-500" /> Allegati e Link Multimediali
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Image insertion tool */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-600 block">Link Immagine (http/https):</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs rounded-lg focus:outline-hidden"
                    placeholder="https://example.com/logo.png"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                  <button
                    onClick={() => addLinkElement("image")}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Aggiungi
                  </button>
                </div>
              </div>

              {/* External web links */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-600 block">Sito o Risorsa Esterna:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs rounded-lg focus:outline-hidden"
                    placeholder="https://translate.google.com"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                  />
                  <button
                    onClick={() => addLinkElement("link")}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
                  >
                    <LinkIcon className="w-3.5 h-3.5" /> Collega
                  </button>
                </div>
              </div>

            </div>

            {/* List of active resource links */}
            {linksList.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <span className="text-xs font-bold text-slate-500 block mb-2">Risorse collegate nell'editor:</span>
                <div className="flex flex-wrap gap-2">
                  {linksList.map((media) => (
                    <div 
                      key={media.id}
                      className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-2 text-xs text-slate-700"
                    >
                      {media.type === "image" ? <ImageIcon className="w-3 h-3 text-blue-500" /> : <LinkIcon className="w-3 h-3 text-emerald-500" />}
                      <span className="font-semibold truncate max-w-[120px]">{media.label || media.url}</span>
                      <button
                        onClick={() => removeMedia(media.id)}
                        className="text-red-500 hover:text-red-700 font-bold ml-1 hover:bg-slate-200 px-1 rounded cursor-pointer"
                        title="Rimuovi"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* RIGHT COLUMN: Real-time ruled exercise sheet preview & Translation (Lg: 5 cells) */}
        <div className="lg:col-span-5 flex flex-col gap-6">

          {/* F. AI Translation Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" /> Traduzione Istantanea AI
              </h2>
              
              <div className="flex items-center gap-1">
                <input
                  id="instant-translate-toggle"
                  type="checkbox"
                  checked={instantTranslate}
                  onChange={(e) => setInstantTranslate(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
                />
                <label htmlFor="instant-translate-toggle" className="text-[10px] uppercase font-bold text-slate-400 cursor-pointer">
                  Automatica
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Traduci testo in:</span>
              <select
                id="target-language-select"
                value={targetLangName}
                onChange={(e) => setTargetLangName(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 text-xs rounded-lg font-bold text-blue-700 focus:outline-hidden"
              >
                <option value="Italiano">Italiano</option>
                <option value="Inglese">Inglese</option>
                <option value="Coreano">Coreano</option>
                <option value="Giapponese">Giapponese</option>
                <option value="Cinese">Cinese</option>
                <option value="Arabo">Arabo</option>
                <option value="Russo">Russo</option>
                <option value="Hindi">Hindi</option>
                <option value="Thai">Thai</option>
              </select>

              <button
                onClick={handleTranslate}
                disabled={isTranslating || !editorText.trim()}
                className="ml-auto px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-xs"
              >
                {isTranslating ? "Traduzione..." : "Traduci Ora"}
              </button>
            </div>

            {translationError && (
              <div className="text-xs text-red-600 font-semibold p-2.5 bg-red-50 border border-red-200 rounded-lg shadow-2xs flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">⚠️</span>
                  <span>Stato Traduzione AI</span>
                </div>
                <p className="text-[11px] text-red-600/90 font-medium leading-relaxed mt-0.5">
                  {translationError}
                </p>
              </div>
            )}

            {translationInfo && (
              <div className="text-xs text-emerald-700 font-semibold p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg shadow-2xs flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-emerald-800">
                  <span className="text-sm">💡</span>
                  <span>Dizionario Offline Scolastico</span>
                </div>
                <p className="text-[11px] text-emerald-700/90 font-medium leading-relaxed mt-0.5">
                  {translationInfo}
                </p>
              </div>
            )}
          </div>

          {/* G. Clean Paper Exercise sheet sheet representation */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Anteprima Quaderno ed Esercitazioni
              </span>

              {/* Painting tool switcher */}
              <button
                onClick={() => {
                  setIsDrawingMode(prev => !prev);
                  if (isDrawingMode) clearCanvas();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isDrawingMode 
                    ? "bg-amber-500 text-slate-950 shadow-xs" 
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Brush className="w-3.5 h-3.5" /> 
                {isDrawingMode ? "Disattivare Calligrafia" : "Esercitati con Penna"}
              </button>
            </div>

            {/* If Tracing brush is active, we show writing brush colors */}
            {isDrawingMode && (
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-fade-in shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Inchiostro:</span>
                  <div className="flex gap-1.5">
                    {["#0000ff", "#ff0000", "#1a202c", "#718096"].map((color) => (
                      <button
                        key={color}
                        onClick={() => setBrushColor(color)}
                        className={`w-5 h-5 rounded-full border border-white cursor-pointer ${
                          brushColor === color ? "ring-2 ring-blue-500 scale-110" : ""
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-500">Spessore:</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    className="w-16 cursor-pointer"
                    value={brushWidth}
                    onChange={(e) => setBrushWidth(parseInt(e.target.value))}
                  />
                  <span className="font-mono w-4">{brushWidth}px</span>
                </div>

                <button
                  onClick={clearCanvas}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                >
                  <RotateCcw className="w-3 h-3" /> Pulisci Tratto
                </button>
              </div>
            )}

            {/* Visual Lined paper sheet content container */}
            <div 
              id="ruled-exercise-sheet"
              className={`relative border border-slate-300 rounded-2xl py-6 pr-6 pl-16 shadow-paper min-h-[460px] flex flex-col justify-between overflow-hidden ${
                paperStyle === "lined" ? "lined-paper" : paperStyle === "squared" ? "squared-paper" : "bg-[#fcfcf9] !pl-6"
              }`}
            >
              
              {/* Ruled School Margins Indicator line */}
              {(paperStyle === "lined" || paperStyle === "squared") && (
                <div className="absolute top-0 bottom-0 left-12 w-[2px] bg-red-200 pointer-events-none" />
              )}

              {/* Calligraphy Brush drawing Canvas Layout overlay */}
              <canvas
                ref={previewCanvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className={`absolute inset-0 w-full h-full ${
                  isDrawingMode ? "cursor-crosshair pointer-events-auto z-10" : "pointer-events-none z-[1]"
                }`}
              />

              {/* Structured written text content rendering */}
              <div className="flex flex-col gap-4 relative z-[2]">
                <div>
                  <span className="text-[10px] tracking-widest text-slate-400 font-bold uppercase flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Compito Scuola Multilingue
                  </span>
                  
                  <div className={`mt-2 ${activeFontClass()}`}>
                    {editorText ? (
                      <p className="whitespace-pre-wrap leading-relaxed select-none break-words">
                        {editorText}
                      </p>
                    ) : (
                      <p className="text-slate-400 italic">
                        Il testo digitato nell'editor di sinistra apparirà istantaneamente qui simulando la scrittura vera e propria...
                      </p>
                    )}
                  </div>
                </div>

                {/* Live parsed and rendered image previews or external resource links! */}
                {linksList.length > 0 && (
                  <div className="mt-4 border-t border-slate-200/55 pt-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      Inclusioni Multimediali Allegati:
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {linksList.map((m) => (
                        <div key={m.id} className="bg-white/80 p-2 rounded-lg border border-slate-200/40 shadow-xs flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                            {m.type === "image" ? <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> : <LinkIcon className="w-3.5 h-3.5 text-emerald-500" />}
                            <span className="font-semibold">{m.label || m.url}</span>
                          </div>
                          
                          {m.type === "image" ? (
                            <img 
                              src={m.url} 
                              alt={m.label} 
                              className="w-full max-h-[160px] object-cover rounded-md"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                // Fallback for invalid/broken URLs
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <a 
                              href={m.url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-xs text-blue-600 hover:underline font-medium inline-flex items-center gap-1"
                            >
                              Visita link esterno <ArrowRight className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clean inline display layout for Instant translation */}
                {translatedText && (
                  <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-200/60">
                    <span className="text-[10px] uppercase font-bold text-blue-600/70 tracking-widest block mb-2">
                      Traduzione ({targetLangName})
                    </span>
                    <div className={translatedFontClass()}>
                      <p className="text-slate-700 whitespace-pre-wrap leading-relaxed select-none break-words">
                        {translatedText}
                      </p>
                    </div>
                  </div>
                )}

              </div>

              {/* Dynamic Page indicator footer line */}
              <div className="flex justify-between items-center mt-6 text-[10px] text-slate-400 border-t border-slate-100 pt-3 relative z-[2]">
                <span>PAGINA 1 • CLASSE MULTILINGUE</span>
                <span className="uppercase">{writingStyle} CARATTERI</span>
              </div>

            </div>
          </div>

          {/* H. Document Exporters action buttons */}
          <div id="export-actions-section" className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExportPDF}
              className="bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-red-100 text-white rounded-xl py-3 px-4 font-bold text-sm tracking-wide transition-all shadow-md hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Esporta in PDF
            </button>

            <button
              onClick={handleExportTXT}
              className="bg-amber-500 hover:bg-amber-600 focus:ring-4 focus:ring-amber-100 text-slate-950 rounded-xl py-3 px-4 font-bold text-sm tracking-wide transition-all shadow-md hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" /> Esporta in TXT (UTF-8)
            </button>
          </div>

        </div>

      </main>

      {/* Global Interactive info panel */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 px-6 mt-6 border-t border-slate-800 shrink-0 select-none">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-blue-400" />
            <span>© 2026 Scuola Scrittura Multilingue. Traduzione istantanea integrata tramite Gemini AI.</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span>Russo</span> • <span>Arabo</span> • <span>Cinese</span> • <span>Giapponese</span> • <span>Coreano</span> • <span>Hindi</span> • <span>Thai</span> • <span>Italiano</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
