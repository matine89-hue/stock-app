// 🔥 [수정] 토큰 캐싱 추가
let cachedToken = '';
let tokenExpire = 0;

const KIS = 'https://openapi.koreainvestment.com:9443';

// 🔥 [수정] 토큰 자동 발급 함수
async function getToken(appkey, appsecret) {
  if (cachedToken && Date.now() < tokenExpire) {
    return cachedToken;
  }

  const r = await fetch(KIS + '/oauth2/tokenP', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey,
      appsecret
    })
  });

  const data = await r.json();

  cachedToken = data.access_token;
  tokenExpire = Date.now() + (data.expires_in - 60) * 1000;

  return cachedToken;
}

export default async function handler(req, res) {

  // 🔥 [유지] CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const body = req.body || {};
    const action    = body.action    || '';
    const market    = body.market    || 'KOSPI';
    const stockCode = body.stockCode || '';
    const prompt    = body.prompt    || '';

    // 🔥 [수정] 키를 서버 환경변수에서 가져옴
    const appkey    = process.env.KIS_APP_KEY;
    const appsecret = process.env.KIS_APP_SECRET;

    // 🔥 [수정] 토큰 자동 발급
    const token = await getToken(appkey, appsecret);

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

    // ── 1. 거래량 순위 조회
    if (action === 'volumeRank') {
      const isKospi = market === 'KOSPI';

      // 🔥 [핵심 수정] 시장코드 + 종목코드 수정
      const params = new URLSearchParams({
        FID_COND_MRKT_DIV_CODE:  isKospi ? 'J' : 'Q', // ← 수정됨
        FID_COND_SCR_DIV_CODE:   '20171',
        FID_INPUT_ISCD:          '0000',              // ← 수정됨
        FID_DIV_CLS_CODE:        '0',
        FID_BLNG_CLS_CODE:       '0',
        FID_TRGT_CLS_CODE:       '111111111',
        FID_TRGT_EXLS_CLS_CODE:  '000000',
        FID_INPUT_PRICE_1:       '0',
        FID_INPUT_PRICE_2:       '0',
        FID_VOL_CNT:             '0',
        FID_INPUT_DATE_1:        '0',
      });

      const r = await fetch(
        KIS + '/uapi/domestic-stock/v1/quotations/volume-rank?' + params.toString(),
        { method: 'GET', headers: kisHeader('FHPST01710000') }
      );

      return res.status(r.status).json(await r.json());
    }

    // ── 2. 현재가 조회
    if (action === 'inquirePrice') {
      const params = new URLSearchParams({
        FID_COND_MRKT_DIV_CODE: 'J',
        FID_INPUT_ISCD: stockCode,
      });

      const r = await fetch(
        KIS + '/uapi/domestic-stock/v1/quotations/inquire-price?' + params.toString(),
        { method: 'GET', headers: kisHeader('FHKST01010100') }
      );

      return res.status(r.status).json(await r.json());
    }

    // ── 3. AI 분석
    if (action === 'aiAnalysis') {
      const geminiKey = process.env.GEMINI_API_KEY || '';

      if (!geminiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY 설정 필요' });
      }

      const r = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + geminiKey,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
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
