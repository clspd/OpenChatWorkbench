import { useAppStatePersistStore } from '@/stores/appStatePersist';
import DOMPurify from 'dompurify';
import type { Config } from 'dompurify';

export function getSafeHTML(unsafe: string, config?: Config, allowProjectDefaultConfig = true) {
    if (!config && allowProjectDefaultConfig) {
        config = useAppStatePersistStore().domPurifCfg;
    }
    return DOMPurify.sanitize(unsafe, config);
}
