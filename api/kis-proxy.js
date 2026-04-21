const fetch = require('node-fetch');

export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { action, appkey, appsecret, token, params } = req.body;

  try {
    // 1. 토큰 발급 요청
    if (action === 'getToken') {
      const response = await fetch('https://openapi.koreainvestment.com:9443/oauth2/tokenP', {
        method: 'POST',
        body: JSON.stringify({
          grant_type: 'client_credentials',
          appkey: appkey,
          appsecret: appsecret
        })
      });
      const data = await response.json();
      return res.status(200).json(data);
    }

    // 2. 거래량 순위 조회
    if (action === 'volumeRank') {
      const marketCode = params.market === 'KOSPI' ? '0001' : '1001';
      const response = await fetch(`https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/ranking/volume?FID_COND_MRKT_DIV_CODE=J&FID_COND_SCR_DIV_CODE=20173&FID_INPUT_ISCD=${marketCode}&FID_DIV_CLS_CODE=0&FID_BLNG_CLS_CODE=0&FID_TRGT_CLS_CODE=0&FID_TRGT_EXLS_CLS_CODE=0&FID_INPUT_PRICE_1=&FID_INPUT_PRICE_2=&FID_VOL_CNT=&FID_INPUT_DATE_1=`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`,
          'appkey': appkey,
          'appsecret': appsecret,
          'tr_id': 'FHPST01710000',
          'custtype': 'P'
        }
      });
      const data = await response.json();
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Invalid Action' });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
