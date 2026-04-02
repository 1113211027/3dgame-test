export default async function handler(req, res) {
    // 1. 設定 CORS 標頭，允許你的 Vercel 網域
    const allowedOrigins = ['https://vtuber-3dgame.vercel.app'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin) || (origin && origin.includes('localhost'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: '伺服器設定錯誤：找不到 API Key' });

    try {
        const { contents, systemPrompt, knowledgeBase } = req.body;
        if (!contents || !Array.isArray(contents)) return res.status(400).json({ error: '無效對話格式' });

        const safeSystemPrompt = systemPrompt || "你是一個專業的 AI 虛擬助教，回答要簡短生動。";
        const fullSystemInstruction = `${safeSystemPrompt}\n\n【重要指示】\n為了正確解析動作，請務必只回傳 JSON 格式文字：\n{\n  "reply": "文字",\n  "expression": "neutral",\n  "specialAction": "none",\n  "actionDuration": 3\n}\n\n【知識庫內容】\n${knowledgeBase || ""}`;

        const geminiPayload = {
            contents: contents,
            systemInstruction: { parts: [{ text: fullSystemInstruction }] },
            tools: [{ googleSearch: {} }] 
        };

        const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(googleApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload)
        });

        const data = await response.json();
        
        // 如果 Gemini 官方回傳錯誤，把錯誤傳給前端顯示
        if (!response.ok) return res.status(response.status).json(data);
        
        return res.status(200).json(data);
        
    } catch (error) {
        console.error('API 錯誤:', error);
        return res.status(500).json({ error: '伺服器發生未預期的錯誤' });
    }
}
