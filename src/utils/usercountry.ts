import { trace_info_url } from "@/config";

let country: string;

export async function GetUserCountry(useCache = true) {
    if (useCache && country) return country;
    const resp = await fetch(new URL(trace_info_url));
    if (!resp.ok) throw new Error(`Failed to get country: ${resp.status}`);
    const data = /^loc=(.+)$/m.exec(await resp.text())?.[1]?.toUpperCase();
    if (!data) throw new Error('Failed to extract country information');
    country = data;
    return data;
}

