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
    
    const response = await axios.get(
      `${API_BASE_URL}/financial/ap/vendors/${context.params.id}`,
      {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      },
    );
    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error fetching vendor:", error);
    const axiosError = error as any;
    const status = axiosError?.response?.status ?? 500;
    const payload = axiosError?.response?.data ?? { error: "Failed to fetch vendor" };
    return NextResponse.json(payload, { status });
  }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const cleanedBody = {
      ...(body?.name ? { name: String(body.name).trim() } : {}),
      ...(body?.email ? { email: String(body.email).trim() } : {}),
      ...(body?.phone ? { phone: String(body.phone).trim() } : {}),
      ...(body?.address ? { address: String(body.address).trim() } : {}),
    };

    const response = await axios.put(
      `${API_BASE_URL}/financial/ap/vendors/${context.params.id}`,
      cleanedBody,
      {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );
    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error updating vendor:", error);
    const axiosError = error as any;
    const status = axiosError?.response?.status ?? 500;
    const payload = axiosError?.response?.data ?? { error: "Failed to update vendor" };
    return NextResponse.json(payload, { status });
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions);
    
    const response = await axios.delete(
      `${API_BASE_URL}/financial/ap/vendors/${context.params.id}`,
      {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      },
    );
    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error deleting vendor:", error);
    const axiosError = error as any;
    const status = axiosError?.response?.status ?? 500;
    const payload = axiosError?.response?.data ?? { error: "Failed to delete vendor" };
    return NextResponse.json(payload, { status });
  }
}
