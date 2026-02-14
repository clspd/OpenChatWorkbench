import { analytics_base_url } from "@/config";

// usage report
export async function sendUsageReport(data: string) {
    const response = await fetch(new URL('./usage-report', analytics_base_url), {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain',
        },
        body: data,
    });
    if (!response.ok) throw new Error(`Failed to send usage report: ${response.statusText}`);
}

