import { useConfigStore } from "@/stores/configStore";

export function GetProviderRequestUrl(providerId: string, requestPath: string): string {
    const provider = useConfigStore().getProviderById(providerId)
    if (!provider) {
        throw new Error(`Provider ${providerId} not found`)
    }
    const baseUrl = (provider.baseURL.endsWith('/') ? provider.baseURL : provider.baseURL + '/')
    if (requestPath.startsWith('/')) {
        requestPath = '.' + requestPath
    }
    try {
        const url = new URL(requestPath, baseUrl)
        return url.href
    } catch (error) {
        throw new Error(`Invalid request path ${requestPath} for provider ${providerId}`)
    }
}
