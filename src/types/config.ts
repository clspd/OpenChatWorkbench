export interface ProviderConfig {
    id: string
    name: string
    api_key: string
    baseURL: string
    requestPath: string
    enabled: boolean
    enableResponsesAPI?: boolean
    pathOfResponsesAPI?: string
}

export interface ModelConfig {
    provider_id: string
    id: string
    enabled: boolean
}

