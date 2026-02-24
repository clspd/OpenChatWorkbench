import router from '@/router'

export const NoPrevent = Symbol('NoPrevent');
const ks: Record<string, (ev: KeyboardEvent, key: string) => void | typeof NoPrevent> = {
    'Ctrl+J'() {
        router.push('/');
    },
};
export default ks;
