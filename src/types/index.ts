export interface Message {

}

export interface ProviderConfig {
    id: string
    name: string
    api_key: string
    baseURL: string
    requestPath: string
    enabled: boolean
}

export interface ModelConfig {
    id: string
    provider_id: string
    max_tokens: number
    enabled: boolean
}