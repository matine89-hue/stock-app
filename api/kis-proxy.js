export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const { action, appkey, appsecret, token, market } = req.body;

  try {
    const isToken = action === 'getToken';
    // 거래량 순위 URL (FID_INPUT_ISCD: 0001은 코스피, 1001은 코스닥)
    const url = isToken 
      ? 'https://openapi.koreainvestment.com:9443/oauth2/tokenP'
      : `https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/ranking/volume?FID_COND_MRKT_DIV_CODE=J&FID_COND_SCR_DIV_CODE=20173&FID_INPUT_ISCD=${market === 'KOSDAQ' ? '1001' : '0001'}&FID_DIV_CLS_CODE=0&FID_BLNG_CLS_CODE=0&FID_TRGT_CLS_CODE=0&FID_TRGT_EXLS_CLS_CODE=0&FID_INPUT_PRICE_1=&FID_INPUT_PRICE_2=&FID_VOL_CNT=&FID_INPUT_DATE_1=`;

    const response = await fetch(url, {
      method: isToken ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(isToken ? {} : {
          'authorization': `Bearer ${token}`,
          'appkey': appkey,
          'appsecret': appsecret,
          'tr_id': 'FHPST01710000',
          'custtype': 'P'
        })
      },
      body: isToken ? JSON.stringify({ grant_type: 'client_credentials', appkey, appsecret }) : null
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
