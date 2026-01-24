declare global {
  interface Window {
    TMap: any;
  }
}

let loadPromise: Promise<void> | null = null;

export function loadTencentMap(key: string): Promise<void> {
  if (window.TMap) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    // Define global callback
    (window as any).initQQMap = () => {
      resolve();
    };

    const script = document.createElement('script');
    script.type = 'text/javascript';
    // Load GL version. Libraries 'service' includes Geocoder, Search, etc.
    script.src = `https://map.qq.com/api/gljs?v=1.exp&key=${key}&libraries=service&callback=initQQMap`;
    script.async = true;
    script.onerror = (err) => {
      loadPromise = null;
      reject(err);
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
