// Virtual keyboard character data and helper structures for each target language.

export interface LanguageKeyboard {
  id: string;
  name: string;
  nativeName: string;
  code: string;
  align: "ltr" | "rtl";
}

export const SUPPORTED_LANGUAGES: LanguageKeyboard[] = [
  { id: "it", name: "Italian/Latin", nativeName: "Italiano", code: "it", align: "ltr" },
  { id: "ko", name: "Korean", nativeName: "한국어", code: "ko", align: "ltr" },
  { id: "ja", name: "Japanese", nativeName: "日本語", code: "ja", align: "ltr" },
  { id: "zh", name: "Chinese", nativeName: "中文", code: "zh", align: "ltr" },
  { id: "ar", name: "Arabic", nativeName: "العربية", code: "ar", align: "rtl" },
  { id: "ru", name: "Russian", nativeName: "Русский", code: "ru", align: "ltr" },
  { id: "hi", name: "Hindi", nativeName: "हिन्दी", code: "hi", align: "ltr" },
  { id: "th", name: "Thai", nativeName: "ไทย", code: "th", align: "ltr" }
];

// Layouts of Russian keyboard
export const RU_KEYBOARD = {
  normal: [
    ["й", "ц", "у", "к", "е", "н", "г", "ш", "щ", "з", "х", "ъ"],
    ["ф", "ы", "в", "а", "п", "р", "о", "л", "д", "ж", "э"],
    ["я", "ч", "с", "м", "и", "т", "ь", "б", "ю", "."]
  ],
  shifted: [
    ["Й", "Ц", "У", "К", "Е", "Н", "Г", "Ш", "Щ", "З", "Х", "Ъ"],
    ["Ф", "Ы", "В", "А", "П", "Р", "О", "Л", "Д", "Ж", "Э"],
    ["Я", "Ч", "С", "М", "И", "Т", "Ь", "Б", "Ю", ","]
  ]
};

// Layouts of Arabic keyboard (RTL aligned keys)
export const AR_KEYBOARD = [
  ["ض", "ص", "ث", "ق", "ف", "غ", "ع", "ه", "خ", "ح", "ج", "د"],
  ["ش", "س", "ي", "ب", "ل", "ا", "ت", "ن", "م", "ك", "ط", "ئ"],
  ["ء", "ؤ", "ر", "لا", "ى", "ة", "و", "ز", "ظ", "،", "؟"]
];

// Hindi layout
export const HI_KEYBOARD = {
  vowels: ["अ", "आ", "इ", "ई", "उ", "ऊ", "ए", "ऐ", "ओ", "औ"],
  consonants1: ["क", "ख", "ग", "घ", "ङ", "च", "छ", "ज", "झ", "ञ"],
  consonants2: ["ट", "ठ", "ड", "ढ", "ण", "त", "थ", "द", "ध", "न"],
  consonants3: ["प", "फ", "ब", "भ", "म", "ย", "र", "ल", "व", "श"],
  consonants4: ["ष", "स", "ह", "क्ष", "त्र", "ज्ञ"],
  matras: ["ा", "ि", "ी", "ु", "ू", "े", "ै", "ो", "ौ", "ं", "ः", "्"]
};

// Thai keyboard
export const TH_KEYBOARD = {
  vowels: ["ะ", "า", "ิ", "ี", "ึ", "ื", "ุ", "ู", "เ", "แ", "โ", "ใ", "ไ", "็", "์"],
  consonants: [
    ["ก", "ข", "ค", "ฆ", "ง", "จ", "ฉ", "ช", "ซ"],
    ["ฌ", "ญ", "ฎ", "ฏ", "ฐ", "ฑ", "ฒ", "ณ", "ด"],
    ["ต", "ถ", "ท", "ธ", "น", "บ", "ป", "ผ", "ฝ"],
    ["พ", "ฟ", "ภ", "ม", "ย", "ร", "ล", "ว", "ส"],
    ["ห", "ฬ", "อ", "ฮ", "่", "้", "๊", "๋"]
  ]
};

// Italian / Latin QWERTY layout
export const IT_KEYBOARD = {
  normal: [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "é", "è"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ò", "à", "ù"],
    ["z", "x", "c", "v", "b", "n", "m", ",", ".", ";", "'", "-"]
  ],
  shifted: [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L", "ç", "°", "§"],
    ["Z", "X", "C", "V", "B", "N", "M", "<", ">", "?", "\"", "_"]
  ]
};

// Korean Jamo Keypad layout
export const KO_KEYBOARD = {
  consonants: ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ", "ㄲ", "ㄸ", "ㅃ", "ㅆ", "ㅉ"],
  vowels: ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"],
  quickBlocks: ["안녕하세요", "감사합니다", "한국어", "사랑해", "친구", "학교", "물", "밥", "선생님", "예", "아니요", "좋아"]
};

// Chinese IME (Latin style layout for typing pinyin, plus candidate selection dictionary)
export const ZH_PINYIN_DICT: { [key: string]: string[] } = {
  wo: ["我", "握", "窝", "沃", "卧"],
  ni: ["你", "尼", "泥", "逆", "拟", "呢"],
  hao: ["好", "号", "浩", "豪", "毫", "耗"],
  zhong: ["中", "重", "种", "终", "众", "钟"],
  guo: ["国", "果", "过", "锅", "郭", "活"],
  shi: ["是", "时", "十", "市", "师", "石", "试", "史", "室"],
  ren: ["人", "认", "任", "仁", "忍"],
  tai: ["太", "泰", "态", "台", "抬", "胎"],
  ri: ["日", "入", "荣"],
  ben: ["本", "奔", "笨", "杯"],
  han: ["韩", "汉", "寒", "汗", "喊", "含"],
  e: ["俄", "恶", "饿", "额", "阿"],
  he: ["和", "河", "喝", "盒", "贺", "何"],
  ai: ["爱", "哀", "矮", "挨", "埃"],
  shui: ["水", "睡", "税", "谁"],
  cha: ["茶", "差", "插", "查", "察"],
  xue: ["学", "雪", "靴", "穴"],
  xi: ["西", "喜", "细", "希", "吸", "洗", "习"],
  huan: ["欢", "幻", "还", "环", "换", "唤"],
  ying: ["英", "影", "迎", "赢", "硬", "鹰"],
  yu: ["语", "鱼", "雨", "玉", "遇", "育"],
  fa: ["法", "发", "罚", "乏"],
  wen: ["文", "问", "闻", "温", "稳"],
  xie: ["谢", "写", "鞋", "斜", "卸", "解"],
  zai: ["再", "在", "灾", "仔", "载"],
  jian: ["见", "建", "健", "简", "尖", "减"],
  me: ["么", "梅", "美", "每"],
  lao: ["老", "劳", "落", "捞"],
  jia: ["家", "加", "价", "假", "甲", "架"],
  guo_yu: ["国语", "汉语"],
  zhong_guo: ["中国"],
  yi_da_li: ["意大利"],
  xiao: ["小", "笑", "校", "消", "效"],
  da: ["大", "打", "达", "答"],
  shuo: ["说", "数", "刷"],
  ma: ["吗", "妈", "马", "骂", "码"]
};

// Common Chinese words for fast insert
export const ZH_QUICK_PHRASES = [
  "你好", "谢谢", "再见", "中国", "意大利", "我爱你", "对不起", "没关系", "中文", "学校", "老师", "学生"
];

// Japanese Kana Layout & Hiragana to Kanji suggestions
export const JA_KANA_ROWS = [
  ["あ", "い", "う", "え", "お", "ゃ", "ゅ", "ょ", "っ"],
  ["か", "き", "く", "け", "こ", "が", "ぎ", "ぐ", "げ", "ご"],
  ["さ", "し", "す", "せ", "そ", "ざ", "じ", "ず", "ぜ", "ぞ"],
  ["た", "ち", "つ", "て", "と", "だ", "ぢ", "づ", "で", "ど"],
  ["な", "に", "ぬ", "ね", "の", "〜", "？", "！", "。"],
  ["は", "ひ", "ふ", "へ", "ほ", "ば", "び", "ぶ", "べ", "ぼ", "ぱ", "ぴ", "ぷ", "ぺ", "ぽ"],
  ["ま", "み", "む", "め", "も", "、", "「", "」", "・"],
  ["や", "ゆ", "よ", "ら", "り", "る", "れ", "ろ"],
  ["わ", "を", "ん"]
];

export const JA_CONVERSION_DICT: { [key: string]: string[] } = {
  "こんにちは": ["こんにちは", "今日波"],
  "ありがとう": ["ありがとう", "有難う"],
  "にほん": ["日本", "にほん", "ニホン"],
  "にほんご": ["日本語", "にほんご"],
  "わたし": ["私", "わたし", "ワタシ"],
  "せんせい": ["先生", "せんせい"],
  "さくら": ["桜", "さくら", "サクラ"],
  "ともだち": ["友達", "ともだち"],
  "がくせい": ["学生", "がくせい"],
  "すし": ["寿司", "すし", "スシ"],
  "たべる": ["食べる", "たべる"],
  "いく": ["行く", "いく"],
  "みず": ["水", "みず"],
  "おちゃ": ["お茶", "おちゃ"],
  "ほん": ["本", "ほん"],
  "きょう": ["今日", "きょう"],
  "あした": ["明日", "あした"],
  "ねこ": ["猫", "ねこ", "ネコ"],
  "いぬ": ["犬", "いぬ", "イヌ"],
  "ただいま": ["ただいま"],
  "すみません": ["すみません", "済みません"],
  "あい": ["愛", "あい"]
};

export const JA_QUICK_PHRASES = [
  "こんにちは", "ありがとう", "すみません", "日本語", "イタリア", "さようなら", "はじめまして", "お元気ですか", "お茶", "私"
];

// Simple Korean Hangul composition builder.
// Hangul is structured as Initial (초성) + Medial (중성) + Final (종성)
// This is a basic visual Jamo-combiner. If they type Jamo combinables, we can map common combinations.
// E.g., ㄱ + ㅏ = 가. ㄴ + ㅕ + ㅇ = 녕.
// Rather than fully implementing complete keypress-by-keypress unicode state machine which is highly prone to edge cases,
// we will provide a beautiful Jamo clicking board. When "Auto-Assemble Mode" is on, we run a fast assembler for sequential inputs or offer pre-assembled blocks!
// Let's write a mini-assembler that merges adjacent Initial + Medial [+ Final] Jamos.
const CHOSEONG = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const JUNGSEONG = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"];
const JONGSEONG = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

export function assembleHangul(jamos: string[]): string {
  // Simple algorithm to assemble a sequence of Jamos (e.g., ["ㅇ", "ㅏ", "ㄴ", "ㄴ", "ㅕ", "ㅇ"]) into Hangul blocks ("안녕")
  let result = "";
  let i = 0;

  while (i < jamos.length) {
    const c1 = jamos[i];
    const c2 = jamos[i + 1];
    const c3 = jamos[i + 2];
    const c4 = jamos[i + 3];

    // Check if c1 is consonant (Initial) & c2 is vowel (Medial)
    const choIdx = CHOSEONG.indexOf(c1);
    const jungIdx = JUNGSEONG.indexOf(c2);

    if (choIdx !== -1 && jungIdx !== -1) {
      // We have at least Initial + Medial
      let jongIdx = 0; // Empty final by default
      let skipCount = 2;

      if (c3) {
        // Check if c3 is a valid Final consonant
        const tempJong = JONGSEONG.indexOf(c3);
        if (tempJong !== -1 && tempJong !== 0) {
          // It could be a final consonant. If c4 is a vowel though, c3 is likely the Initial of the next syllable!
          const nextIsVowel = c4 && JUNGSEONG.indexOf(c4) !== -1;
          if (!nextIsVowel) {
            jongIdx = tempJong;
            skipCount = 3;

            // Optional: Support double final consonant assembly (e.g., ㄱ+ㅅ = ㄳ, ㄴ+ㅈ = ㄵ)
            // But simple standard single/double final is already in the JONGSEONG list!
          }
        }
      }

      // Calculate complete unicode block: 0xAC00 + (Initial * 21 * 28) + (Medial * 28) + Final
      const charCode = 0xAC00 + (choIdx * 21 * 28) + (jungIdx * 28) + jongIdx;
      result += String.fromCharCode(charCode);
      i += skipCount;
    } else {
      // Just output c1 as is
      result += c1;
      i += 1;
    }
  }

  return result;
}
