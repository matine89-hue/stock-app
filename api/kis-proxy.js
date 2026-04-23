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
        // kis-proxy.js 내 
if (action === 'inquirePrice') {
  // 프론트에서 넘어온 appkey, appsecret, token을 사용하도록 유지
  const r = await fetch(KIS + '/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=' + stockCode, {
    method: 'GET',
    headers: {
      'authorization': 'Bearer ' + token,
      'appkey': appkey,
      'appsecret': appsecret,
      'tr_id': 'FHKST01010100'
    }
  });
  const resData = await r.json();
  return res.status(200).json(resData);
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
