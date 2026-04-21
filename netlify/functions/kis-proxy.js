
// Netlify Serverless Function — KIS API 중계 서버
// 브라우저 → 이 함수 → KIS API 순서로 호출됨
// CORS 문제를 우회하는 핵심 파일

exports.handler = async (event) => {
  // CORS 허용 헤더
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // OPTIONS preflight 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const { action, appkey, appsecret, token, params } = body;

    const KIS_BASE = 'https://openapi.koreainvestment.com:9443';

    // ── 토큰 발급 ──────────────────────────────────────────────
    if (action === 'getToken') {
      const res = await fetch(KIS_BASE + '/oauth2/tokenP', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          appkey: appkey,
          appsecret: appsecret,
        }),
      });
      const data = await res.json();
      return {
        statusCode: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      };
    }

    // ── 거래량 순위 조회 ────────────────────────────────────────
    if (action === 'volumeRank') {
      const market = params.market || 'KOSPI';
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

      const res = await fetch(
        KIS_BASE + '/uapi/domestic-stock/v1/quotations/volume-rank?' + qs,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            authorization: 'Bearer ' + token,
            appkey: appkey,
            appsecret: appsecret,
            tr_id: 'FHPST01710000',
            custtype: 'P',
          },
        }
      );
      const data = await res.json();
      return {
        statusCode: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      };
    }

    // ── 주식 현재가 조회 ────────────────────────────────────────
    if (action === 'inquirePrice') {
      const qs = new URLSearchParams({
        FID_COND_MRKT_DIV_CODE: 'J',
        FID_INPUT_ISCD: params.stockCode,
      }).toString();

      const res = await fetch(
        KIS_BASE + '/uapi/domestic-stock/v1/quotations/inquire-price?' + qs,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            authorization: 'Bearer ' + token,
            appkey: appkey,
            appsecret: appsecret,
            tr_id: 'FHKST01010100',
            custtype: 'P',
          },
        }
      );
      const data = await res.json();
      return {
        statusCode: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      };
    }

    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unknown action: ' + action }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
