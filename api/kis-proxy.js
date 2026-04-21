export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const { action, appkey, appsecret, token, market } = req.body;

  try {
    if (action === 'getToken') {
      const response = await fetch('https://openapi.koreainvestment.com:9443/oauth2/tokenP', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_type: 'client_credentials', appkey, appsecret })
      });
      return res.status(200).json(await response.json());
    }

    if (action === 'volumeRank') {
      const isDaq = market === 'KOSDAQ';
      // 장중 데이터 요청 (URL 끝에 파라미터 확인)
      const url = `https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/ranking/volume?FID_COND_MRKT_DIV_CODE=J&FID_COND_SCR_DIV_CODE=20173&FID_INPUT_ISCD=${isDaq ? '1001' : '0001'}&FID_DIV_CLS_CODE=0&FID_BLNG_CLS_CODE=0&FID_TRGT_CLS_CODE=0&FID_TRGT_EXLS_CLS_CODE=0&FID_INPUT_PRICE_1=&FID_INPUT_PRICE_2=&FID_VOL_CNT=&FID_INPUT_DATE_1=`;
      
      const response = await fetch(url, {
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${token}`,
          'appkey': appkey,
          'appsecret': appsecret,
          'tr_id': 'FHPST01710000',
          'custtype': 'P'
        }
      });
      const result = await response.json();
      return res.status(200).json(result);
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
