import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
        return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
        return NextResponse.json(
            { error: 'BLOB_READ_WRITE_TOKEN is not set. Add it to .env.local and restart the dev server.' },
            { status: 500 }
        );
    }

    try {
        const blob = await put(filename, request.body!, {
            access: 'public',
            token,
        });

        return NextResponse.json(blob);
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
