import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

type Context = {
  params: {
    id: string;
  };
};

export async function GET(_request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = context.params;
    const response = await axios.get(`${API_BASE_URL}/financial/ap/payments/${id}`, {
      headers: {
        Authorization: `Bearer ${session?.accessToken}`,
      },
    });
    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error fetching payment:", error);
    const axiosError = error as any;
    const status = axiosError?.response?.status ?? 500;
    const payload = axiosError?.response?.data ?? { error: "Failed to fetch payment" };
    return NextResponse.json(payload, { status });
  }
}
