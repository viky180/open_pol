import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        nodes: [],
        edges: [],
        message: 'Network graph API is not implemented yet.',
    });
}
