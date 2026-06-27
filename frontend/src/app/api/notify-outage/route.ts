import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, residentId } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Here we would typically interact with the Brevo API and our database
    // to store the subscription and ensure we don't duplicate subscriptions.
    
    // Example Brevo interaction (mocked)
    const brevoApiKey = process.env.BREVO_API_KEY;
    if (brevoApiKey) {
      // Create contact / add to outage notification list
      /*
      await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          attributes: { FIRSTNAME: name },
          listIds: [OUTAGE_LIST_ID],
          updateEnabled: true // prevents duplicate errors if already subscribed
        })
      });
      */
    }

    return NextResponse.json({ success: true, message: 'Subscribed to outage notifications' });
  } catch (error) {
    console.error('Notify Outage Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
