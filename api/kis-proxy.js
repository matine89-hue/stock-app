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

    // 공통 KIS 헤더
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

    // ── 1. 토큰 발급 ─────────────────────────────────────────────
    if (action === 'getToken') {
      const r = await fetch(KIS + '/oauth2/tokenP', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_type: 'client_credentials', appkey, appsecret }),
      });
      const d = await r.json();
      return res.status(r.status).json(d);
    }

    // ── 2. 거래량 순위 조회 ───────────────────────────────────────
    // 코스피: FID_COND_MRKT_DIV_CODE=J, FID_INPUT_ISCD=0000
    // 코스닥: FID_COND_MRKT_DIV_CODE=Q, FID_INPUT_ISCD=0000
    if (action === 'volumeRank') {
      const isKospi = market === 'KOSPI';
      const params = new URLSearchParams({
        FID_COND_MRKT_DIV_CODE:  isKospi ? 'J' : 'Q',
        FID_COND_SCR_DIV_CODE:   '20171',
        FID_INPUT_ISCD:          '0000',
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
      const d = await r.json();
      return res.status(r.status).json(d);
    }

    // ── 3. 주식 현재가 + 재무지표 조회 ───────────────────────────
    // 코스피·코스닥 모두 FID_COND_MRKT_DIV_CODE=J (ETF/ETN 포함)
    if (action === 'inquirePrice') {
      const params = new URLSearchParams({
        FID_COND_MRKT_DIV_CODE: 'J',
        FID_INPUT_ISCD: stockCode,
      });
      const r = await fetch(
        KIS + '/uapi/domestic-stock/v1/quotations/inquire-price?' + params.toString(),
        { method: 'GET', headers: kisHeader('FHKST01010100') }
      );
      const d = await r.json();
      return res.status(r.status).json(d);
    }

    // ── 4. Claude AI 분석 ─────────────────────────────────────────
    if (action === 'aiAnalysis') {
      const apiKey = process.env.ANTHROPIC_API_KEY || '';
      if (!apiKey) {
        return res.status(500).json({ error: 'ANTHROPIC_API_KEY 환경변수가 Vercel에 설정되지 않았습니다.' });
      }
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const d = await r.json();
      return res.status(r.status).json(d);
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
