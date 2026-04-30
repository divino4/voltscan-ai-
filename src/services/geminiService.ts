import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AnalysisResult {
  summary: string;
  components: {
    name: string;
    count: number;
    description: string;
  }[];
  compliance: string[];
  recommendations: string;
}

export async function analyzeBlueprint(base64Image: string, mimeType: string): Promise<string> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analise esta planta elétrica com precisão técnica.
    1. Identifique componentes principais (disjuntores, interruptores, tomadas, pontos de luz, quadros).
    2. Realize uma contagem aproximada se possível.
    3. Avalie a segurança e conformidade baseada na NBR 5410.
    4. Forneça um resumo da instalação.
    5. Dê recomendações técnicas para melhoria ou correção.
    
    Retorne a análise em formato Markdown profissional e em PORTUGUÊS, incluindo:
    - Um "Tabela de Componentes"
    - Uma "Avaliação de Segurança"
    - Uma "Conclusão Técnica"
    
    Seja preciso com a interpretação dos símbolos.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
    });

    return response.text || "Falha ao gerar análise.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
}
