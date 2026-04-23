import axios from "axios";
import { config } from "../config.js";
import createLogger from "../logger.js";

const logger = createLogger("RefinementService");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const refineMock = async (text) => {
  await delay(100);
  return text
    .toUpperCase()
    .replace(/0/g, "O")
    .replace(/1/g, "I")
    .replace(/3/g, "E");
};

// 🔥 GEMINI API CALL
export const refineTextWithGemini = async (text) => {
  // Validate config
  if (!config.GEMINI_API_KEY) {
    logger.warn("GEMINI_API_KEY not configured, using mock refinement");
    return refineMock(text);
  }

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.GEMINI_MODEL}:generateContent`,
      {
        contents: [
          {
            parts: [
              {
                text: `Kamu adalah sistem penerjemah bahasa isyarat untuk konteks medis.

Input adalah hasil deteksi gesture tangan berupa huruf tanpa spasi (noisy dan tidak sempurna).
Anggap ini adalah kalimat dari pasien yang ingin menyampaikan keluhan ke dokter.
            
Tugas:
- Susun ulang huruf menjadi kalimat Bahasa Indonesia yang alami
- Gunakan konteks medis (keluhan pasien)
- Perbaiki typo / kesalahan deteksi
- Jangan menambahkan informasi yang tidak ada
- Jangan memberikan penjelasan
            
Output:
- HANYA 1 kalimat yang jelas dan mudah dipahami dokter
            
Input:
"${text}"`,
              },
            ],
          },
        ],
      },
      {
        params: {
          key: config.GEMINI_API_KEY,
        },
        timeout: 10000,
      },
    );

    const refined =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text || text;
    logger.debug("Gemini refined:", refined);
    return refined.trim();
  } catch (error) {
    logger.error("Gemini API error, falling back to mock:", error.message);
    return refineMock(text);
  }
};

export const refineText = async (text) => {
  if (!text || !config.ENABLE_REFINEMENT) {
    return text;
  }

  try {
    logger.debug("Refining text:", text);
    const refined = await refineTextWithGemini(text);
    logger.debug("Text refined:", refined);
    return refined;
  } catch (error) {
    logger.error("Error refining text:", error.message);
    return text;
  }
};

export default {
  refineText,
  refineTextWithGemini,
};
