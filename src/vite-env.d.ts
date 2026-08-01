/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_USE_MOCK: string;
    readonly VITE_API_BASE_URL: string;
    
    readonly VITE_LIBRARY_ID: string;
    readonly VITE_LIBRARY_NAME: string;
    readonly VITE_LIBRARY_ADDRESS: string;
    readonly VITE_LIBRARY_SHORT_ADDRESS: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}