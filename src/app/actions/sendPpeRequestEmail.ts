
'use server';

export async function sendPpeRequestEmail(ppeData: Record<string, any>) {
  const formData = new FormData();
  for (const key in ppeData) {
    if (ppeData[key] !== undefined && ppeData[key] !== null) {
      formData.append(key, ppeData[key].toString());
    }
  }

  try {
    const response = await fetch('https://script.google.com/macros/s/AKfycbx1hSgSunhkCaon1REaVbcPUnLmhKW9srvjL9IcV0X5IL1vz4pdbPo5YeX441BBKvrtDg/exec', {
      method: 'POST',
      body: formData,
    });
    
    // We don't need to process the response, but we can log it for debugging
    const textResponse = await response.text();
    console.log('Google Apps Script Response:', textResponse);

    return { success: true };
  } catch (error) {
    console.error('Failed to send notification via server action:', error);
    return { success: false, error: (error as Error).message };
  }
}
