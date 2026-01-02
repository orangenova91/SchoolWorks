import { NextResponse } from 'next/server';

/**
 * CORS 헤더를 추가한 응답 생성
 */
export function corsResponse(response: NextResponse, origin?: string): NextResponse {
  // Credentials를 사용할 때는 특정 origin을 지정해야 함
  const allowedOrigin = origin || '*';
  
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // origin이 지정된 경우에만 credentials 허용
  if (origin) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  return response;
}

/**
 * OPTIONS 요청에 대한 CORS 응답
 */
export function corsOptionsResponse(origin?: string): NextResponse {
  const response = new NextResponse(null, { status: 200 });
  return corsResponse(response, origin);
}

