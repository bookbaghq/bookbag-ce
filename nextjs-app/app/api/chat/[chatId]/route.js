import { NextResponse } from 'next/server';

// GET /api/chat/{chatId} - Restore chat from database
export async function GET(request, { params }) {
  try {
    const { chatId } = params;
    
    if (!chatId) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }

    // Make request to backend to get chat data
    const backendUrl = (await import('@/apiConfig.json')).default.ApiConfig.main;
    console.log('Fetching chat from backend:', `${backendUrl}/bb-chat/api/chat/${chatId}`);
    
    const backendResponse = await fetch(`${backendUrl}/bb-chat/api/chat/${chatId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!backendResponse.ok) {
      if (backendResponse.status === 404) {
        return NextResponse.json(
          { error: 'Chat not found' },
          { status: 404 }
        );
      }
      throw new Error(`Backend error: ${backendResponse.status}`);
    }

    const chatData = await backendResponse.json();
    
    // Return chat data with messages array
    return NextResponse.json({
      chatId: chatData.id,
      title: chatData.title,
      messages: chatData.messages || [],
      createdAt: chatData.created_at,
      updatedAt: chatData.updated_at
    });

  } catch (error) {
    console.error('Error fetching chat:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}