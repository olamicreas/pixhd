import * as FileSystem from 'expo-file-system/legacy';

const SPACE_NAME = "Olamicreas/pixhd-backend";
const GRADIO_URL = `https://${SPACE_NAME.replace("/", "-").toLowerCase()}.hf.space`;
console.log(`[PixHD Network] Connecting to AI Backend at: ${GRADIO_URL}`);

// Health check to verify live backend link
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${GRADIO_URL}/api/predict`, {
      method: 'OPTIONS',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    // Any response (even 405) means the server is alive
    return true;
  } catch (err) {
    // Try a simple GET as fallback
    try {
      const res2 = await fetch(GRADIO_URL, { method: 'GET' });
      return res2.ok;
    } catch {
      console.warn(`[PixHD Network] Health check failed:`, err);
      return false;
    }
  }
}

async function uploadToGradio(imageUri: string): Promise<string> {
  const uploadRes = await FileSystem.uploadAsync(`${GRADIO_URL}/upload`, imageUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'files',
    mimeType: 'image/jpeg',
  });

  if (uploadRes.status !== 200) {
    throw new Error(`Failed to upload image to AI server (${uploadRes.status})`);
  }

  const uploadedFiles: string[] = JSON.parse(uploadRes.body);
  if (!uploadedFiles || uploadedFiles.length === 0) {
    throw new Error('AI server did not return an uploaded file path.');
  }

  return uploadedFiles[0];
}

// 4K Ultra Processing Upload Handler
export async function enhanceUltra4K(
  imageUri: string, 
  mode: string = 'ultra4k', 
  fidelity: number = 0.75,
  autoColor: boolean = false
): Promise<string> {
  const isHealthy = await checkBackendHealth();
  if (!isHealthy) {
    throw new Error('You are not connected to the internet, or the server is temporarily offline. Please check your network and try again.');
  }

  console.log(`[PixHD] Uploading image for mode=${mode}, fidelity=${fidelity}, autoColor=${autoColor}...`);

  // Step 1: Upload the image file to Gradio
  const serverPath = await uploadToGradio(imageUri);
  console.log(`[PixHD] Image uploaded: ${serverPath}`);

  // Step 2: Join the Gradio Queue
  const sessionHash = Math.random().toString(36).substring(2);
  const queueRes = await fetch(`${GRADIO_URL}/queue/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [
        { path: serverPath, meta: { _type: "gradio.FileData" } },
        mode,
        fidelity,
        autoColor,
      ],
      fn_index: 0,
      session_hash: sessionHash,
    }),
  });

  if (!queueRes.ok) {
    const errText = await queueRes.text();
    throw new Error(`Queue join failed (${queueRes.status}): ${errText}`);
  }

  // Step 3: Poll the queue for the completed result
  console.log(`[PixHD] Polling AI processing queue...`);
  const dataRes = await fetch(`${GRADIO_URL}/queue/data?session_hash=${sessionHash}`);
  const streamText = await dataRes.text();
  
  // Parse the Server-Sent Events (SSE) stream
  let result = null;
  let backendError = null;
  const lines = streamText.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const payload = JSON.parse(line.substring(6));
        if (payload.msg === 'process_completed') {
          if (!payload.success) {
            backendError = payload.output && payload.output.error 
              ? payload.output.error 
              : 'You have reached your free daily AI quota. Please try again in 24 hours.';
          } else {
            result = payload.output;
          }
        }
      } catch (e) {
        // Ignore parse errors on partial lines
      }
    }
  }

  if (backendError) {
    if (typeof backendError === 'string' && backendError.toLowerCase().includes('quota')) {
      throw new Error('You have reached your free daily AI quota. Please try again in 24 hours.');
    }
    throw new Error(`AI Server Error: ${backendError}`);
  }

  if (!result) {
    throw new Error(`AI processing failed. Stream output: ${streamText.substring(0, 200)}`);
  }

  console.log(`[PixHD] Prediction result:`, JSON.stringify(result).substring(0, 200));

  // Step 4: Extract the output image URL
  // Gradio returns: { data: [{ url: "https://...", path: "..." }] }  or  { data: ["/file=..."] }
  if (!result || !result.data || result.data.length === 0) {
    throw new Error('The AI engine returned an empty response. Please try again.');
  }

  let imageUrl: string;
  const output = result.data[0];

  if (typeof output === 'string') {
    // Direct URL or path
    imageUrl = output.startsWith('http') ? output : `${GRADIO_URL}/${output.replace(/^\//, '')}`;
  } else if (output && output.url) {
    // FileData object with url
    imageUrl = output.url;
  } else if (output && output.path) {
    // FileData object with only path
    imageUrl = `${GRADIO_URL}/file=${output.path}`;
  } else {
    throw new Error('Could not parse the enhanced image URL from the AI engine.');
  }

  console.log(`[PixHD] Downloading enhanced image from: ${imageUrl}`);

  // Step 4: Download the processed image back to the device
  const localOutputUri = `${FileSystem.documentDirectory}pixhd_enhanced_${Date.now()}.jpg`;
  const downloadResult = await FileSystem.downloadAsync(imageUrl, localOutputUri);

  if (downloadResult.status !== 200) {
    throw new Error(`Failed to download the enhanced image (HTTP ${downloadResult.status}).`);
  }

  console.log(`[PixHD] Enhanced image saved to: ${downloadResult.uri}`);
  return downloadResult.uri;
}
