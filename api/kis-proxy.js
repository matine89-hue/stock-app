export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const body = req.body || {};
    const action    = body.action    || '';
    const appkey    = body.appkey    || '';
    const appsecret = body.appsecret || '';
    const token     = body.token     || '';
    const market    = body.market    || 'KOSPI';
    const stockCode = body.stockCode || '';
    const prompt    = body.prompt    || '';

    const KIS = 'https://openapi.koreainvestment.com:9443';

    function kisHeader(trId) {
      return {
        'Content-Type': 'application/json; charset=utf-8',
        'authorization': 'Bearer ' + token,
        'appkey': appkey,
        'appsecret': appsecret,
        'tr_id': trId,
        'custtype': 'P',
      };
    }

    // ✅ 1. 토큰 발급 (정상)
    if (action === 'getToken') {
      const r = await fetch(KIS + '/oauth2/tokenP', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          appkey,
          appsecret
        }),
      });
      return res.status(r.status).json(await r.json());
    }

    // ✅ 2. 거래량 순위 (핵심 수정)
    if (action === 'volumeRank') {
      const isKospi = market === 'KOSPI';

      const params = new URLSearchParams({
        // 🔥 시장코드 수정
        FID_COND_MRKT_DIV_CODE: isKospi ? 'J' : 'Q',

        FID_COND_SCR_DIV_CODE: '20171',

        // 🔥 핵심 수정 (0000)
        FID_INPUT_ISCD: '0000',

        FID_DIV_CLS_CODE: '0',
        FID_BLNG_CLS_CODE: '0',
        FID_TRGT_CLS_CODE: '111111111',
        FID_TRGT_EXLS_CLS_CODE: '000000',
        FID_INPUT_PRICE_1: '0',
        FID_INPUT_PRICE_2: '0',
        FID_VOL_CNT: '0',
        FID_INPUT_DATE_1: '0',
      });

      const r = await fetch(
        KIS + '/uapi/domestic-stock/v1/quotations/volume-rank?' + params.toString(),
        {
          method: 'GET',

          // 🔥 TR_ID 수정
          headers: kisHeader('FHPST01710000'),
        }
      );

      return res.status(r.status).json(await r.json());
    }

    // ✅ 3. 현재가 조회 (정상)
    if (action === 'inquirePrice') {
      const params = new URLSearchParams({
        FID_COND_MRKT_DIV_CODE: 'J',
        FID_INPUT_ISCD: stockCode,
      });

      const r = await fetch(
        KIS + '/uapi/domestic-stock/v1/quotations/inquire-price?' + params.toString(),
        {
          method: 'GET',
          headers: kisHeader('FHKST01010100'),
        }
      );

      return res.status(r.status).json(await r.json());
    }

    // ✅ 4. AI 분석 (그대로 유지)
    if (action === 'aiAnalysis') {
      const geminiKey = process.env.GEMINI_API_KEY || '';

      if (!geminiKey) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY 환경변수 없음'
        });
      }

      const r = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + geminiKey,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: 500,
              temperature: 0.7
            },
          }),
        }
      );

      return res.status(r.status).json(await r.json());
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
