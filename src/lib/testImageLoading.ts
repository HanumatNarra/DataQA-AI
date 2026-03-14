// src/lib/testImageLoading.ts - Utility to test image loading and CSP compliance
export function testImageLoading(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      console.log(`[ImageTest] Successfully loaded image: ${url}`);
      resolve(true);
    };
    
    img.onerror = (error) => {
      console.error(`[ImageTest] Failed to load image: ${url}`, error);
      resolve(false);
    };
    
    // Set a timeout to avoid hanging
    setTimeout(() => {
      console.warn(`[ImageTest] Timeout loading image: ${url}`);
      resolve(false);
    }, 10000);
    
    img.src = url;
  });
}

// Test function to verify Supabase storage access
export async function testSupabaseImageAccess(storagePath: string): Promise<void> {
  try {
    const response = await fetch('/api/charts/signed-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storagePath,
        expiresIn: 3600,
      }),
    });

    if (!response.ok) {
      console.error('[ImageTest] Failed to get signed URL:', response.statusText);
      return;
    }

    const result = await response.json();
    
    if (!result.success) {
      console.error('[ImageTest] API error:', result.error);
      return;
    }

    console.log('[ImageTest] Testing image loading with signed URL:', result.signedUrl);
    const success = await testImageLoading(result.signedUrl);
    
    if (success) {
      console.log('[ImageTest] ✅ Image loading test passed');
    } else {
      console.log('[ImageTest] ❌ Image loading test failed');
    }
  } catch (error) {
    console.error('[ImageTest] Error testing image access:', error);
  }
}
