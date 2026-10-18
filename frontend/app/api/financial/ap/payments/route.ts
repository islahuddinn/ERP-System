import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    const response = await axios.get(`${API_BASE_URL}/financial/ap/payments`, {
      headers: {
        Authorization: `Bearer ${session?.accessToken}`,
      },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching payments:', error);
    const axiosError = error as any;
    const status = axiosError?.response?.status ?? 500;
    const payload = axiosError?.response?.data ?? { error: 'Failed to fetch payments' };
    return NextResponse.json(
      payload,
      { status }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();

    const response = await axios.post(`${API_BASE_URL}/financial/ap/payments`, body, {
      headers: {
        Authorization: `Bearer ${session?.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error creating payment:', error);
    const axiosError = error as any;
    const status = axiosError?.response?.status ?? 500;
    const payload = axiosError?.response?.data ?? { error: 'Failed to create payment' };
    return NextResponse.json(
      payload,
      { status }
    );
  }
}
