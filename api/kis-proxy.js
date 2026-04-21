// Vercel Serverless Function — KIS API 중계 서버
// Vercel은 export default function 형식 사용 (Netlify의 exports.handler와 다름)

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  // preflight 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { action, appkey, appsecret, token, params } = req.body;
    const KIS_BASE = 'https://openapi.koreainvestment.com:9443';

    // ── 토큰 발급 ──────────────────────────────────────────────
    if (action === 'getToken') {
      const kisRes = await fetch(KIS_BASE + '/oauth2/tokenP', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          appkey,
          appsecret,
        }),
      });
      const data = await kisRes.json();
      return res.status(kisRes.status).json(data);
    }

    // ── 거래량 상위 종목 조회 ───────────────────────────────────
    if (action === 'volumeRank') {
      const market = params?.market || 'KOSPI';
      const qs = new URLSearchParams({
        FID_COND_MRKT_DIV_CODE: market === 'KOSPI' ? 'J' : 'Q',
        FID_COND_SCR_DIV_CODE: '20171',
        FID_INPUT_ISCD: market === 'KOSPI' ? '0001' : '1001',
        FID_DIV_CLS_CODE: '0',
        FID_BLNG_CLS_CODE: '0',
        FID_TRGT_CLS_CODE: '111111111',
        FID_TRGT_EXLS_CLS_CODE: '000000',
        FID_INPUT_PRICE_1: '0',
        FID_INPUT_PRICE_2: '0',
        FID_VOL_CNT: '0',
        FID_INPUT_DATE_1: '0',
      }).toString();

      const kisRes = await fetch(
        KIS_BASE + '/uapi/domestic-stock/v1/quotations/volume-rank?' + qs,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            authorization: 'Bearer ' + token,
            appkey,
            appsecret,
            tr_id: 'FHPST01710000',
            custtype: 'P',
          },
        }
      );
      const data = await kisRes.json();
      return res.status(kisRes.status).json(data);
    }

    // ── 주식 현재가 조회 ────────────────────────────────────────
    if (action === 'inquirePrice') {
      const qs = new URLSearchParams({
        FID_COND_MRKT_DIV_CODE: 'J',
        FID_INPUT_ISCD: params?.stockCode,
      }).toString();

      const kisRes = await fetch(
        KIS_BASE + '/uapi/domestic-stock/v1/quotations/inquire-price?' + qs,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            authorization: 'Bearer ' + token,
            appkey,
            appsecret,
            tr_id: 'FHKST01010100',
            custtype: 'P',
          },
        }
      );
      const data = await kisRes.json();
      return res.status(kisRes.status).json(data);
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
