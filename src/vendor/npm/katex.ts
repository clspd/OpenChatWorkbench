import { GetWellknownTarballDownloadUrl, resolveDepVersion } from "@/utils/npmutil";
import { LoadVendor } from "../loader";

let chosenCDN: string | undefined;

const KaTeX_package = 'katex';
const KaTeX_version = resolveDepVersion('katex', '0.16.43');
const KaTeX_files = {
    main: 'dist/katex.mjs',
    css: 'dist/katex.min.css',
};

const cdnList = [
    'https://cdn.jsdelivr.net/npm/{p}@{v}/',
    'https://unpkg.com/{p}@{v}/',
];

const tarballList = [
    GetWellknownTarballDownloadUrl(KaTeX_package, KaTeX_version),
    GetWellknownTarballDownloadUrl(KaTeX_package, KaTeX_version, 'https://registry.npmmirror.com/'),
];

export let KaTeX_CSS: string;

export async function load_katex(): Promise<typeof import('katex')> { 
    return await LoadVendor(
        KaTeX_package,
        KaTeX_version,
        tarballList,
        cdnList,
        false,
        KaTeX_files.main,
        {
            path: KaTeX_files.css,
            get result() { return KaTeX_CSS },
            set result(value) { KaTeX_CSS = value },
        }
    );
}

