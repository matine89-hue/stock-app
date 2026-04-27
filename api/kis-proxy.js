export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const body      = req.body || {};
  const action    = body.action    || '';
  const appkey    = body.appkey    || '';
  const appsecret = body.appsecret || '';
  const token     = body.token     || '';
  const market    = body.market    || 'KOSPI';
  const stockCode = body.stockCode || '';
  const prompt    = body.prompt    || '';
  const KIS       = 'https://openapi.koreainvestment.com:9443';

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

  try {
    // ── 1. 토큰 발급
    if (action === 'getToken') {
      const r = await fetch(KIS + '/oauth2/tokenP', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_type: 'client_credentials', appkey, appsecret }),
      });
      return res.status(r.status).json(await r.json());
    }

    // ── 2. 거래량 순위
    if (action === 'volumeRank') {
      const isKospi = (market === 'KOSPI');
      const p = new URLSearchParams({
        FID_COND_MRKT_DIV_CODE:  'J',
        FID_COND_SCR_DIV_CODE:   '20171',
        FID_INPUT_ISCD:          isKospi ? '0001' : '1001',
        FID_DIV_CLS_CODE:        '0',
        FID_BLNG_CLS_CODE:       '0',
        FID_TRGT_CLS_CODE:       '111111111',
        FID_TRGT_EXLS_CLS_CODE:  '000000',
        FID_INPUT_PRICE_1:       '0',
        FID_INPUT_PRICE_2:       '0',
        FID_VOL_CNT:             '0',
        FID_INPUT_DATE_1:        '0',
      });
      const r = await fetch(KIS + '/uapi/domestic-stock/v1/quotations/volume-rank?' + p.toString(),
        { method: 'GET', headers: kisHeader('FHPST01710000') });
      return res.status(r.status).json(await r.json());
    }

    // ── 3. 현재가 + 재무지표
    if (action === 'inquirePrice') {
      const p = new URLSearchParams({
        FID_COND_MRKT_DIV_CODE: 'J',
        FID_INPUT_ISCD: stockCode,
      });
      const r = await fetch(KIS + '/uapi/domestic-stock/v1/quotations/inquire-price?' + p.toString(),
        { method: 'GET', headers: kisHeader('FHKST01010100') });
      return res.status(r.status).json(await r.json());
    }

    // ── 4. 일별 시세 (과거 5거래일 종가)
    if (action === 'dailyPrice') {
      const today = new Date();
      const pad = function(n) { return n < 10 ? '0' + n : '' + n; };
      // 10거래일 전 날짜로 조회 (주말 감안)
      const from = new Date(today);
      from.setDate(from.getDate() - 14);
      const fromStr = from.getFullYear() + pad(from.getMonth()+1) + pad(from.getDate());
      const toStr   = today.getFullYear() + pad(today.getMonth()+1) + pad(today.getDate());
      const p = new URLSearchParams({
        FID_COND_MRKT_DIV_CODE: 'J',
        FID_INPUT_ISCD: stockCode,
        FID_INPUT_DATE_1: fromStr,
        FID_INPUT_DATE_2: toStr,
        FID_PERIOD_DIV_CODE: 'D',
        FID_ORG_ADJ_PRC: '0',
      });
      const r = await fetch(KIS + '/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice?' + p.toString(),
        { method: 'GET', headers: kisHeader('FHKST03010100') });
      return res.status(r.status).json(await r.json());
    }

    // ── 5. Gemini AI 분석 (v1beta + gemini-2.5-flash)
    if (action === 'aiAnalysis') {
      const geminiKey = process.env.GEMINI_API_KEY || '';
      if (!geminiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY 환경변수 미설정' });
      }
      const r = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + geminiKey,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 600, temperature: 0.7 },
          }),
        }
      );
      const d = await r.json();
      return res.status(r.status).json(d);
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
