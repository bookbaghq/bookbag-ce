import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { messages, stream = true } = await request.json();

    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    const userContent = lastMessage?.content || '';

    if (!userContent.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    if (stream) {
      // Create a ReadableStream that calls the actual backend
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          let doneSent = false;
          try {
            // Make a request to the existing backend messageController
            const backendUrl = (await import('@/apiConfig.json')).default.ApiConfig.main;
            const backendResponse = await fetch(`${backendUrl}/bb-chat/api/message/sendUserStreaming`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
              },
              body: JSON.stringify({
                content: userContent,
                chatId: null, // New chat
                modelId: 1
              }),
            });

            if (!backendResponse.ok) {
              throw new Error(`Backend error: ${backendResponse.status}`);
            }

            // Stream the response from the backend
            const reader = backendResponse.body?.getReader();
            if (!reader) {
              throw new Error('No readable stream from backend');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                break;
              }

              // Decode the chunk
              const chunk = decoder.decode(value, { stream: true });
              console.log('Raw chunk from backend:', chunk);
              buffer += chunk;

              // Process complete lines
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.trim() === '') continue;

                console.log('Processing line:', line);

                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  console.log('Extracted data:', data);

                  if (data === '[DONE]') {
                    if (!doneSent) {
                      controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                      doneSent = true;
                    }
                    controller.close();
                    return;
                  }

                  try {
                    const parsed = JSON.parse(data);
                    console.log('Parsed JSON:', parsed);

                    // Handle different event types from the backend
                    if (parsed.type === 'aiChunk' && parsed.chunk) {
                      // Forward the AI chunk to frontend preserving all fields
                      console.log('Forwarding AI chunk:', parsed.chunk);
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsed)}\n\n`));
                      // Robust finalization: if server signaled end-of-stream chunk, finalize immediately
                      if (parsed.chunk === '__STREAM_END__') {
                        if (!doneSent) {
                          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                          doneSent = true;
                        }
                        controller.close();
                        return;
                      }
                    } else if (parsed.type === 'aiMessageComplete') {
                      // Send completion signal (only once)
                      if (!doneSent) {
                        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                        doneSent = true;
                      }
                      controller.close();
                      return;
                    } else if (parsed.type === 'error') {
                      throw new Error(parsed.error);
                    } else {
                      // Handle other types or unknown formats
                      console.log('Unknown parsed type:', parsed.type);
                    }
                  } catch (parseError) {
                    console.log('JSON parse failed, treating as plain text:', data);
                    // If it's not JSON, treat as plain text but clean it up
                    const cleanData = data.replace(/[^\x20-\x7E\s]/g, ''); // Remove non-printable characters
                    if (cleanData.trim()) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: cleanData })}\n\n`));
                    }
                  }
                } else {
                  // Handle lines that don't start with 'data: '
                  console.log('Non-data line:', line);
                  const cleanLine = line.replace(/[^\x20-\x7E\s]/g, ''); // Remove non-printable characters
                  if (cleanLine.trim()) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: cleanLine })}\n\n`));
                  }
                }
              }
            }

            // If we reach here without explicit completion, close the stream
            if (!doneSent) {
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              doneSent = true;
            }
            controller.close();

          } catch (error) {
            console.error('Error calling backend:', error);

            // Fallback to a simple response if backend fails
            const fallbackResponse = `I apologize, but I'm having trouble connecting to the AI backend right now. Your message was: "${userContent}". Please try again in a moment.`;
            const words = fallbackResponse.split(' ');

            let index = 0;
            const interval = setInterval(() => {
              if (index < words.length) {
                const word = words[index] + (index < words.length - 1 ? ' ' : '');
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: word })}\n\n`));
                index++;
              } else {
                if (!doneSent) {
                  controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                  doneSent = true;
                }
                controller.close();
                clearInterval(interval);
              }
            }, 100);
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    } else {
      // Non-streaming response - also call backend
      try {
        const backendUrl = (await import('@/apiConfig.json')).default.ApiConfig.main;
        const backendResponse = await fetch(`${backendUrl}/bb-chat/api/message/sendUser`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: userContent,
            chatId: null,
            modelId: 1
          }),
        });

        if (!backendResponse.ok) {
          throw new Error(`Backend error: ${backendResponse.status}`);
        }

        const result = await backendResponse.json();
        return NextResponse.json({
          content: result.content || result.message || 'No response from AI'
        });
      } catch (error) {
        console.error('Backend call failed:', error);
        return NextResponse.json({
          content: `I'm having trouble connecting to the AI backend. Your message was: "${userContent}"`
        });
      }
    }

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}