import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for parsing JSON bodies
app.use(express.json({ limit: "10mb" }));

// Initialize Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY is not defined in the environment. Translation will be mocked.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// MULTILINGUAL OFFLINE DICTIONARY FOR GRACEFUL FALLBACK (QUOTA 429 SHIELD)
const OFFLINE_DICTIONARY: { [key: string]: { [lang: string]: string } } = {
  "ciao": {
    "italiano": "Ciao",
    "inglese": "Hello / Hi",
    "coreano": "안녕하세요 (Annyeonghaseyo)",
    "giapponese": "こんにちは (Konnichiwa)",
    "cinese": "你好 (Nǐ hǎo)",
    "arabo": "مرحبا (Marhaban)",
    "russo": "Привет (Privet)",
    "hindi": "नमस्ते (Namaste)",
    "thai": "สวัสดี (Sawatdee)"
  },
  "buongiorno": {
    "italiano": "Buongiorno",
    "inglese": "Good morning",
    "coreano": "좋은 아침입니다 (Joeun achim)",
    "giapponese": "おはようございます (Ohayou gozaimasu)",
    "cinese": "早上好 (Zǎoshang hǎo)",
    "arabo": "صباح الخير (Sabah al-khair)",
    "russo": "Доброе утро (Dobroye utro)",
    "hindi": "सुप्रभात (Suprabhat)",
    "thai": "อรุณสวัสดิ์ (Arun sawat)"
  },
  "grazie": {
    "italiano": "Grazie",
    "inglese": "Thank you",
    "coreano": "감사합니다 (Gamsahabnida)",
    "giapponese": "ありがとう (Arigatou)",
    "cinese": "谢谢 (Xièxiè)",
    "arabo": "شكرا (Shukran)",
    "russo": "Спасибо (Spasibo)",
    "hindi": "धन्यवाद (Dhanyavaad)",
    "thai": "ขอบคุณ (Khob khun)"
  },
  "grazie mille": {
    "italiano": "Grazie mille",
    "inglese": "Thank you very much",
    "coreano": "대단히 감사합니다 (Daedanhi gamsahabnida)",
    "giapponese": "本当にありがとうございます (Hontouni arigatou gozaimasu)",
    "cinese": "非常感谢 (Fēicháng gǎnxiè)",
    "arabo": "شكرا جزيلا (Shukran jazeelan)",
    "russo": "Большое спасибо (Bolshoye spasibo)",
    "hindi": "बहुत-बहुत धन्यवाद (Bahut-bahut dhanyavaad)",
    "thai": "ขอบคุณมาก (Khob khun mak)"
  },
  "scuola": {
    "italiano": "Scuola",
    "inglese": "School",
    "coreano": "학교 (Hakgyo)",
    "giapponese": "学校 (Gakkou)",
    "cinese": "学校 (Xuéxiào)",
    "arabo": "مدرسة (Madrasah)",
    "russo": "Школа (Shkola)",
    "hindi": "विद्यालय (Vidyalay)",
    "thai": "โรงเรียน (Rong rian)"
  },
  "studente": {
    "italiano": "Studente",
    "inglese": "Student",
    "coreano": "학생 (Haksaeng)",
    "giapponese": "学生 (Gakusei)",
    "cinese": "学生 (Xuéshēng)",
    "arabo": "طالب (Talib)",
    "russo": "Ученик (Uchenik)",
    "hindi": "छात्र (Chhaatrh)",
    "thai": "นักเรียน (Nak rian)"
  },
  "maestro": {
    "italiano": "Maestro / Insegnante",
    "inglese": "Teacher",
    "coreano": "선생님 (Seonsaengnim)",
    "giapponese": "先生 (Sensei)",
    "cinese": "老师 (Lǎoshī)",
    "arabo": "معلم (Mu'allim)",
    "russo": "Учитель (Uchitel)",
    "hindi": "शिक्षक (Shikshak)",
    "thai": "ครู (Khru)"
  },
  "amico": {
    "italiano": "Amico",
    "inglese": "Friend",
    "coreano": "친구 (Chingu)",
    "giapponese": "友達 (Tomodachi)",
    "cinese": "朋友 (Péngyǒu)",
    "arabo": "صديق (Sadiq)",
    "russo": "Друг (Drug)",
    "hindi": "दोस्त (Dost)",
    "thai": "เพื่อน (Phuean)"
  },
  "arrivederci": {
    "italiano": "Arrivederci",
    "inglese": "Goodbye",
    "coreano": "안녕히 계세요 (Annyeonghi gyeseyo)",
    "giapponese": "さようなら (Sayounara)",
    "cinese": "再见 (Zàijiàn)",
    "arabo": "مع السلامة (Ma'a salama)",
    "russo": "До свидания (Do svidaniya)",
    "hindi": "अलविदा (Alvida)",
    "thai": "ลาก่อน (La kon)"
  },
  "ti amo": {
    "italiano": "Ti amo",
    "inglese": "I love you",
    "coreano": "사랑해 (Saranghae)",
    "giapponese": "愛してる (Aishiteru)",
    "cinese": "我爱你 (Wǒ ài nǐ)",
    "arabo": "أحبك (Uhibbuki)",
    "russo": "Я тебя люблю (Ya tebya lyublyu)",
    "hindi": "मैं तुमसे प्यार करता हूँ (Main tumse pyar karta hoon)",
    "thai": "ฉันรักคุณ (Chan rak khun)"
  },
  "scusa": {
    "italiano": "Scusa",
    "inglese": "Sorry / Excuse me",
    "coreano": "미안합니다 (Mianhabnida)",
    "giapponese": "すみません (Sumimasen)",
    "cinese": "对不起 (Duìbùqǐ)",
    "arabo": "عذرا (Uthran)",
    "russo": "Извините (Izvinite)",
    "hindi": "माफ़ कीजिये (Maaf kijiye)",
    "thai": "ขอโทษ (Kho thot)"
  },
  "si": {
    "italiano": "Sì",
    "inglese": "Yes",
    "coreano": "네 (Ne)",
    "giapponese": "はい (Hai)",
    "cinese": "是的 (Shì de)",
    "arabo": "نعم (Na'am)",
    "russo": "Да (Da)",
    "hindi": "हाँ (Haan)",
    "thai": "ใช่ (Chai)"
  },
  "no": {
    "italiano": "No",
    "inglese": "No",
    "coreano": "아니요 (Aniyo)",
    "giapponese": "いいえ (Iie)",
    "cinese": "不 (Bù)",
    "arabo": "لا (La)",
    "russo": "Нет (Net)",
    "hindi": "नहीं (Nahin)",
    "thai": "ไม่ (Mai)"
  },
  "acqua": {
    "italiano": "Acqua",
    "inglese": "Water",
    "coreano": "물 (Mul)",
    "giapponese": "水 (Mizu)",
    "cinese": "水 (Shuǐ)",
    "arabo": "ماء (Maa')",
    "russo": "Вода (Voda)",
    "hindi": "पानी (Paani)",
    "thai": "น้ำ (Nam)"
  },
  "bene": {
    "italiano": "Bene",
    "inglese": "Well / Good",
    "coreano": "좋아요 (Joh-ayo)",
    "giapponese": "大丈夫 (Daijoubu)",
    "cinese": "好 (Hǎo)",
    "arabo": "جيد (Jayyid)",
    "russo": "Хорошо (Khorosho)",
    "hindi": "अच्छा (Achha)",
    "thai": "ดี (Di)"
  },
  "come stai?": {
    "italiano": "Come stai?",
    "inglese": "How are you?",
    "coreano": "어떻게 지내세요? (Eotteohke jinaeseyo?)",
    "giapponese": "お元気ですか？ (Ogenki desu ka?)",
    "cinese": "你好吗？ (Nǐ hǎo ma?)",
    "arabo": "كيف حالك؟ (Kayfa haluka?)",
    "russo": "Как дела? (Kak dela?)",
    "hindi": "आप कैसे हैं? (Aap kaise hain?)",
    "thai": "สบายดีไหม? (Sabai di mai?)"
  },
  "buonasera": {
    "italiano": "Buonasera",
    "inglese": "Good evening",
    "coreano": "좋은 저녁입니다 (Joeun jeonyeog)",
    "giapponese": "こんばんは (Konbanwa)",
    "cinese": "晚上好 (Wǎnshàng hǎo)",
    "arabo": "مساء الخير (Masa'a al-khair)",
    "russo": "Добрый вечер (Dobryy vecher)",
    "hindi": "शुभ संध्या (Shubh sandhya)",
    "thai": "สวัสดีตอนเย็น (Sawatdee ton yen)"
  },
  "buonanotte": {
    "italiano": "Buonanotte",
    "inglese": "Good night",
    "coreano": "안녕히 주무세요 (Annyeonghi jumuseyo)",
    "giapponese": "おやすみなさい (Oyasuminasai)",
    "cinese": "晚安 (Wǎn'ān)",
    "arabo": "تصبح على خير (Tusbih 'ala khair)",
    "russo": "Спокойной ночи (Spokoynoy nochi)",
    "hindi": "शुभ रात्रि (Shubh raatri)",
    "thai": "ราตรีสวัสดิ์ (Ratri sawat)"
  },
  "gatto": {
    "italiano": "Gatto",
    "inglese": "Cat",
    "coreano": "고양이 (Goyangi)",
    "giapponese": "猫 (Neko)",
    "cinese": "猫 (Māo)",
    "arabo": "قطة (Qittah)",
    "russo": "Кот (Kot)",
    "hindi": "बिल्ली (Billi)",
    "thai": "แมว (Maeow)"
  },
  "cane": {
    "italiano": "Cane",
    "inglese": "Dog",
    "coreano": "개 (Gae)",
    "giapponese": "犬 (Inu)",
    "cinese": "狗 (Gǒu)",
    "arabo": "كلب (Kalb)",
    "russo": "Собака (Sobaka)",
    "hindi": "कुत्ता (Kutta)",
    "thai": "สุนัข (Sunakh)"
  },
  "quaderno": {
    "italiano": "Quaderno",
    "inglese": "Notebook",
    "coreano": "공책 (Gongchaek)",
    "giapponese": "ノート (Nōto)",
    "cinese": "笔记本 (Bǐjìběn)",
    "arabo": "دفتر (Daftar)",
    "russo": "Тетрадь (Tetrad')",
    "hindi": "नोटबुक (Notebook)",
    "thai": "สมุดบันทึก (Samut ban thuek)"
  },
  "penna": {
    "italiano": "Penna",
    "inglese": "Pen",
    "coreano": "펜 (Pen)",
    "giapponese": "ペン (Pen)",
    "cinese": "笔 (Bǐ)",
    "arabo": "قلم (Qalam)",
    "russo": "Ручка (Ruchka)",
    "hindi": "पेन (Pen)",
    "thai": "ปากกา (Pakka)"
  },
  "libro": {
    "italiano": "Libro",
    "inglese": "Book",
    "coreano": "책 (Chaek)",
    "giapponese": "本 (Hon)",
    "cinese": "书 (Shū)",
    "arabo": "كتاب (Kitab)",
    "russo": "Книга (Kniga)",
    "hindi": "किताब (Kitab)",
    "thai": "หนังสือ (Nang sue)"
  }
};

// Find matching terms from any language to target selection
function translateOffline(text: string, targetLang: string): string | null {
  const normText = text.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
  const targetKey = targetLang.toLowerCase();

  // If text is blank
  if (!normText) return null;

  // 1. Direct match looking for custom definitions
  for (const [itKey, langs] of Object.entries(OFFLINE_DICTIONARY)) {
    // Check key (italiano)
    if (itKey === normText) {
      return langs[targetKey] || langs["italiano"];
    }
    // Check all values in this key
    for (const [lang, val] of Object.entries(langs)) {
      // Clean up bracket annotations
      const cleanVal = val.split(" (")[0].toLowerCase().trim();
      const rawValClean = val.toLowerCase().trim();
      if (cleanVal === normText || rawValClean === normText || rawValClean.includes(normText)) {
        return langs[targetKey] || langs["italiano"];
      }
    }
  }

  // 2. Word-by-word matching fallback
  const words = text.split(/\s+/);
  if (words.length > 0) {
    const matched = words.map(word => {
      const cleanWord = word.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
      if (!cleanWord) return word;

      for (const [itKey, langs] of Object.entries(OFFLINE_DICTIONARY)) {
        if (itKey === cleanWord) {
          return langs[targetKey]?.split(" (")[0] || word;
        }
        for (const [lang, val] of Object.entries(langs)) {
          const cleanVal = val.split(" (")[0].toLowerCase().trim();
          if (cleanVal === cleanWord) {
            return langs[targetKey]?.split(" (")[0] || word;
          }
        }
      }
      return word; // untranslated
    });

    // Check if we matched at least one word, to avoid looking completely generic
    const anyMatched = matched.some((val, idx) => val !== words[idx]);
    if (anyMatched) {
      return matched.join(" ");
    }
  }

  return null;
}

// Translate API Endpoint
app.get("/api/proxy-image", async (req, res) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl) {
    return res.status(400).send("Missing url parameter");
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "image/jpeg";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(buffer);
  } catch (error: any) {
    console.error("Proxy image server error:", error);
    res.status(500).send("Error proxying image");
  }
});

// Translate API Endpoint
app.post("/api/translate", async (req, res) => {
  const { text, sourceLang, targetLang } = req.body;

  if (!text || !targetLang) {
    return res.status(400).json({ error: "Missing required fields: text, targetLang" });
  }

  try {
    const ai = getGeminiClient();
    if (process.env.GEMINI_API_KEY) {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Translate the following text into ${targetLang}. 
The source language is ${sourceLang || "auto-detected"}.
CRITICAL INSTRUCTIONS:
- Return ONLY the direct translation, with absolutely no preamble, explanation, or notes.
- If there are hyperlinks or image markdown syntax (such as [text](url) or ![alt](url) or http links), keep them completely unchanged. Do not translate the URL paths, and keep the exact structural format. 
- Maintain paragraphs, line breaks, and list formatting perfectly.

Text to translate:
${text}`,
      });

      const translatedText = response.text || "";
      return res.json({ translated: translatedText.trim() });
    } else {
      // Graceful fallback for local development without key
      const localTrans = translateOffline(text, targetLang);
      if (localTrans) {
        return res.json({
          translated: localTrans,
          fallback: true,
          info: "Tradotto offline usando il dizionario scolastico precaricato."
        });
      }
      return res.json({
        translated: `[MOCK TRANSLATION to ${targetLang}] ${text}`,
        warning: "GEMINI_API_KEY is missing. This is a local mock response."
      });
    }
  } catch (error: any) {
    console.error("Translation Gemini API Error:", error);
    
    // Check if it is a Quota/Rate Limit (429) or other API exception
    const errorStr = typeof error === "object" ? JSON.stringify(error) : String(error);
    const isQuotaExceeded = errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("limit") || errorStr.includes("quota");

    if (isQuotaExceeded) {
      // 429 SHIELD: Attempt to fetch from our local offline dictionary
      const localTrans = translateOffline(text, targetLang);
      if (localTrans) {
        return res.json({
          translated: localTrans,
          fallback: true,
          info: "Tradotto offline con successo usando il Dizionario Scolastico della scuola, in quanto i server globali di Google Traduttore sono momentaneamente sovraccarichi."
        });
      } else {
        // Return a structured JSON so the client knows it was a rate limit and can render a beautiful UI component
        return res.status(429).json({ 
          error: "RESOURCE_EXHAUSTED",
          message: "Il limite di traduzioni al minuto è stato superato. Attendi 30 secondi prima di riprovare, oppure scrivi termini scolastici semplici (es: 'Ciao', 'Buongiorno', 'Grazie', 'Scuola', 'Libro', 'Studente') che sono coperti istantaneamente dal Dizionario Offline incorporato!"
        });
      }
    }

    res.status(500).json({ error: error?.message || "An error occurred during translation" });
  }
});

async function startServer() {
  // Vite Middleware Setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
