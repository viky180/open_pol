import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const BUCKET = 'party-icon-images';

function getFileExtension(filename: string): string {
    const dotIndex = filename.lastIndexOf('.');
    if (dotIndex === -1) return 'png';
    return filename.slice(dotIndex + 1).toLowerCase();
}

function isAllowedImageMime(mime: string): boolean {
    return ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'].includes(mime);
}

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    if (!isAllowedImageMime(file.type)) {
        return NextResponse.json({ error: 'Only JPG, PNG, WEBP, GIF, and SVG images are allowed' }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: 'Image size must be 2MB or less' }, { status: 400 });
    }

    const extension = getFileExtension(file.name);
    const safeExtension = /^[a-z0-9]+$/.test(extension) ? extension : 'png';
    const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExtension}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const admin = createAdminClient();
    const { error: uploadError } = await admin.storage
        .from(BUCKET)
        .upload(filePath, buffer, {
            contentType: file.type,
            upsert: false,
        });

    if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = admin.storage.from(BUCKET).getPublicUrl(filePath);
    const url = publicUrlData.publicUrl;

    return NextResponse.json({ url }, { status: 201 });
}
