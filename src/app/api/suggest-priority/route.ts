import { NextRequest, NextResponse } from 'next/server';
import { suggestTaskPriority } from '@/ai/flows/suggest-task-priority';

export async function POST(req: NextRequest) {
  try {
    const { title, description } = await req.json();

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const result = await suggestTaskPriority({ title, description });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in suggest-priority API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
