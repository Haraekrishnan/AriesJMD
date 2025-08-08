
'use server';

export async function sendPpeRequestEmail(ppeData: Record<string, any>) {
  const formData = new FormData();
  for (const key in ppeData) {
    if (ppeData[key] !== undefined && ppeData[key] !== null) {
      formData.append(key, ppeData[key].toString());
    }
  }

  try {
    // We use 'no-cors' mode because Apps Script web apps can be tricky with CORS pre-flight requests.
    // Since we are just sending data and not expecting a response back to the client, this is a safe
    // and reliable way to ensure the request goes through without being blocked by browser CORS policy.
    const response = await fetch('https://script.google.com/macros/s/AKfycbx1hSgSunhkCaon1REaVbcPUnLmhKW9srvjL9IcV0X5IL1vz4pdbPo5YeX441BBKvrtDg/exec', {
      method: 'POST',
      body: formData,
      mode: 'no-cors',
    });
    
    // We cannot read the response in no-cors mode, but we can log that the request was sent.
    console.log('PPE request notification sent to Google Apps Script.');

    return { success: true };
  } catch (error) {
    console.error('Failed to send notification via server action:', error);
    return { success: false, error: (error as Error).message };
  }
}

    