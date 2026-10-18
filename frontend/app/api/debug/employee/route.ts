import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Employee creation debug endpoint',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    apiBaseUrl: process.env.NEXT_PUBLIC_API_URL,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headers = Object.fromEntries(request.headers.entries());
    
    return NextResponse.json({
      message: 'Employee creation debug - POST received',
      timestamp: new Date().toISOString(),
      body: body,
      headers: {
        authorization: headers.authorization ? 'Bearer [TOKEN]' : 'Missing',
        'x-tenant-id': headers['x-tenant-id'] || 'Missing',
        'content-type': headers['content-type'],
      },
      receivedAt: new Date().toISOString()
    });
  } catch (error) {
    const err = error as any;
    return NextResponse.json({
      error: 'Failed to parse request body',
      message: err?.message || 'Invalid request body'
    }, { status: 400 });
  }
}
