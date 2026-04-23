export default async function handler(req, res) {
    // CORS 및 기본 헤더 설정 (기존과 동일)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { action, stockCode, prompt, token } = req.body;
        const KIS = 'https://openapi.koreainvestment.com:9443';
        const APP_KEY = process.env.KIS_APPKEY; 
        const APP_SECRET = process.env.KIS_APPSECRET;

        // 1. 현재가 및 재무지표 조회 액션
        if (action === 'inquirePrice') {
            const r = await fetch(`${KIS}/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${stockCode}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': `Bearer ${token}`,
                    'appkey': APP_KEY,
                    'appsecret': APP_SECRET,
                    'tr_id': 'FHKST01010100' // 현재가 및 재무비율 포함 tr_id
                }
            });
            return res.status(200).json(await r.json());
        }

        // 2. AI 분석 액션 (수정된 부분)
        if (action === 'aiAnalysis') {
            const geminiKey = process.env.GEMINI_API_KEY;
            if (!geminiKey) return res.status(500).json({ error: 'API 키가 없습니다.' });

            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });
            const data = await r.json();
            return res.status(200).json(data);
        }

        // 기타 액션 (rank 등)은 기존 코드 유지...
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
