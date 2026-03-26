import { DYNDATA } from "@/dynamic";

export function resolveDepVersion(depName: string, defaultResult?: string) { 
    let throwDirectly = false;
    try {
        const deps = DYNDATA.pnpmLock.importers['.'].dependencies;
        if (!deps) throw new TypeError('Invalid lock file');
        if (!Reflect.has(deps, depName)) {
            if (defaultResult) return defaultResult;
            throwDirectly = true;
            throw new Error('The dependency specified is not installed in the dependencies list.');
        }
        const version = deps[depName].version;
        if (!version || !(typeof version === 'string')) {
            if (defaultResult) return defaultResult;
            else throw new Error('Invalid version');
        }
        return version;
    }
    catch (e) {
        if (throwDirectly) throw e;
        if (defaultResult) return defaultResult;
        throw new Error('Unable to resolve dependency version', { cause: e });
    }
}

export function GetWellknownTarballDownloadUrl(package_name: string, version: string, registry = 'https://registry.npmjs.org/') {
    return (new URL(`${package_name}/-/${package_name}-${version}.tgz`, registry)).href;
}

export async function GetTarballDownloadUrl(package_name: string, version: string, allowFallback = false, registry = 'https://registry.npmjs.org/') {
    try {
        const res = await fetch(new URL(package_name, registry));
        if (!res.ok) {
            throw new Error(`Failed to fetch package info: HTTP ${res.status} ${res.statusText}`);
        }
        const info = await res.json();
        const pkg = info.versions[version];
        if (!pkg) {
            throw new Error(`Version ${version} not found for ${package_name}`);
        }
        const tarball = pkg.dist.tarball;
        if (!tarball || typeof tarball !== 'string') {
            throw new Error(`Tarball URL missing for ${package_name}@${version}`);
        }
        return tarball;
    } catch (e) {
        if (allowFallback) return GetWellknownTarballDownloadUrl(package_name, version, registry);
        throw e;
    }
}
